import { createClientFromRequest } from "npm:@base44/sdk@0.8.56";
import { Stagehand } from "npm:@browserbasehq/stagehand@3.7.3";
import "npm:zod@4.4.0";
import { secrets } from "base44:runtime";

// يسجّل مقاطع شاشة حقيقية من النظام نفسه بحساب المنشأة التجريبية.
// لا رسم واجهات، ولا إعادة تمثيل: كل إطار هو ما يعرضه المتصفح فعلاً.
const APP_URL = "https://jadarahr.base44.app";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login(appUrl) {
  const email = String(secrets.get("TRAINING_DEMO_EMAIL") || "").trim().toLowerCase();
  const problems = [];
  if (!email.includes("@")) problems.push("لا يحتوي على علامة @");
  if ((email.match(/@/g) || []).length > 1) problems.push("يحتوي أكثر من علامة @");
  if (/\s/.test(email)) problems.push("يحتوي مسافة");
  if (/[^\x00-\x7F]/.test(email)) problems.push("يحتوي حروفاً غير لاتينية");
  if (!(email.split("@")[1] || "").includes(".")) problems.push("نطاق البريد بلا نقطة");
  if (problems.length) throw new Error(`بيانات الحساب التجريبي غير صالحة: ${problems.join("، ")}`);
  const response = await fetch(`${appUrl}/api/apps/${secrets.get("BASE44_APP_ID")}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: secrets.get("TRAINING_DEMO_PASSWORD") }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`Demo sign-in failed (${response.status})`);
  return data.access_token;
}

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch((error) => error.status === 401 ? null : Promise.reject(error));
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const lessons = Array.isArray(body.lessons) ? body.lessons : [];
  if (!lessons.length) return Response.json({ error: "lessons is required" }, { status: 400 });
  if (lessons.length > 4) return Response.json({ error: "At most 4 lessons per run" }, { status: 400 });

  const token = await login(APP_URL);
  const session = await base44.asServiceRole.browser.getSession({ sessionTimeoutSeconds: 280 });
  let stagehand, socket, page, canvasPage;
  let phase = "open_browser";
  try {
    const { baseURL, token: gatewayToken, headers } = base44.asServiceRole.aiGateway.connection();
    stagehand = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: { cdpUrl: session.connectionUrl },
      model: { modelName: "openai/gpt_6_luna", apiKey: gatewayToken, baseURL, headers, openaiEndpointFormat: "chat" },
      disablePino: true,
    });
    await stagehand.init();
    page = stagehand.context.pages()[0];
    await page.setViewportSize(1280, 720);
    await page.addInitScript((accessToken) => {
      try {
        window.localStorage.setItem("base44_access_token", accessToken);
        window.localStorage.setItem("token", accessToken);
      } catch {}
    }, token);

    phase = "connect_capture";
    socket = new WebSocket(session.connectionUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Browser capture connection timed out")), 15000);
      socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Browser capture connection failed")); }, { once: true });
    });
    let id = 0;
    const pending = new Map();
    let targetSession;
    let drawFrame;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const call = pending.get(message.id);
        pending.delete(message.id);
        clearTimeout(call.timer);
        if (message.error) call.reject(new Error(message.error.message));
        else call.resolve(message.result);
      } else if (message.method === "Page.screencastFrame" && message.sessionId === targetSession && drawFrame) {
        drawFrame(message.params);
      }
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const callId = ++id;
      const timer = setTimeout(() => { pending.delete(callId); reject(new Error(`Capture operation timed out: ${method}`)); }, 15000);
      pending.set(callId, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: callId, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

    phase = "open_app";
    await page.goto(`${APP_URL}/app`, { waitUntil: "load", timeoutMs: 45000 });
    await pause(4000);
    const state = await page.evaluate(() => ({ path: location.pathname, text: document.body.innerText.slice(0, 400) }));
    if (state.path !== "/app") throw new Error(`Demo account could not enter the workspace (${state.path})`);

    const { targetInfos } = await send("Target.getTargets");
    const target = targetInfos.find((item) => item.type === "page" && item.url.startsWith(APP_URL));
    if (!target) throw new Error("Logged-in browser target was not found");
    targetSession = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true })).sessionId;
    await send("Page.enable", {}, targetSession);

    phase = "prepare_encoder";
    canvasPage = await stagehand.context.newPage();
    await canvasPage.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const mimeType = "video/webm;codecs=vp8";
      if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error("WebM recording is unavailable");
      const stream = canvas.captureStream(15);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3500000 });
      window.courseCapture = { canvas, context: canvas.getContext("2d"), recorder, stream, chunks: [] };
      recorder.ondataavailable = (event) => { if (event.data.size) window.courseCapture.chunks.push(event.data); };
    });
    const paint = (data) => canvasPage.evaluate(async (jpeg) => {
      const image = new Image();
      image.src = `data:image/jpeg;base64,${jpeg}`;
      await image.decode();
      window.courseCapture.context.drawImage(image, 0, 0, 1280, 720);
    }, data);

    const results = [];
    await send("Target.activateTarget", { targetId: target.targetId });
    await send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 }, targetSession);
    let queue = Promise.resolve();
    let frameFailure = null;
    drawFrame = ({ data, sessionId }) => {
      queue = queue.then(async () => {
        await paint(data);
        await send("Page.screencastFrameAck", { sessionId }, targetSession);
      }).catch((error) => { frameFailure = error; });
    };
    await paint((await send("Page.captureScreenshot", { format: "jpeg", quality: 82 }, targetSession)).data);
    await canvasPage.evaluate(() => window.courseCapture.recorder.start(500));

    for (const lesson of lessons) {
      if (frameFailure) throw frameFailure;
      const paths = (Array.isArray(lesson.paths) ? lesson.paths : []).filter((p) => typeof p === "string" && p.startsWith("/"));
      if (!paths.length) { results.push({ lesson_key: lesson.key, error: "No paths" }); continue; }
      await canvasPage.evaluate(() => { window.courseCapture.chunks.length = 0; });
      await send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 }, targetSession);
      await pause(600);
      const startedAt = Date.now();
      for (const path of paths) {
        await page.goto(`${APP_URL}${path}`, { waitUntil: "load", timeoutMs: 40000 });
        await pause(2000);
        await page.scroll(640, 420, 0, 90);
        await pause(500);
        await page.scroll(640, 420, 0, -90);
        await pause(900);
      }
      await send("Page.stopScreencast", {}, targetSession);
      await queue;
      await pause(400);
      const encoded = await canvasPage.evaluate(async () => {
        const capture = window.courseCapture;
        const blob = new Blob(capture.chunks.slice(), { type: "video/webm" });
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return { base64: dataUrl.split(",")[1], size: blob.size };
      });
      if (encoded.size < 8000) { results.push({ lesson_key: lesson.key, error: "Empty recording" }); continue; }
      const bytes = Uint8Array.from(atob(encoded.base64), (character) => character.charCodeAt(0));
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const uploaded = await base44.asServiceRole.integrations.Core.UploadPublicFile({
        file: new File([bytes], `${lesson.key}-${Date.now()}.webm`, { type: "video/webm" }),
      });
      const existing = await base44.asServiceRole.entities.CourseLesson.filter({ lesson_key: lesson.key }, { limit: 1 });
      const payload = {
        lesson_key: lesson.key,
        lesson_title: lesson.title || "",
        video_url: uploaded.file_url,
        duration_label: `${seconds} ثانية`,
        updated_by_name: user.full_name || "",
      };
      const saved = existing.items[0]
        ? await base44.asServiceRole.entities.CourseLesson.update(existing.items[0].id, payload)
        : await base44.asServiceRole.entities.CourseLesson.create(payload);
      results.push({ lesson_key: lesson.key, video_url: uploaded.file_url, seconds, saved: !!saved });
    }
    if (frameFailure) throw frameFailure;
    return Response.json({ recorded: results });
  } catch (error) {
    return Response.json({ error: error.message.replace(/wss?:\/\/\S+/g, "[browser connection]"), phase }, { status: 500 });
  } finally {
    socket?.close();
    await stagehand?.close().catch(() => {});
    await session.end();
  }
}