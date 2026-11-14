import { createClientFromRequest } from "npm:@base44/sdk@0.8.56";
import { Stagehand } from "npm:@browserbasehq/stagehand@3.7.3";
import "npm:zod@4.4.0";
import { secrets } from "base44:runtime";
import { prepareRecording, paintRecording, finishRecording } from "./media.ts";
import { lessonScenes, showScene } from "./scenes.ts";

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
  if (!lessons.length || lessons.length > 3 || lessons.some(lesson => !lessonScenes[lesson.key])) return Response.json({ error: "Select 1 to 3 known course lessons" }, { status: 400 });
  const records = await base44.asServiceRole.entities.CourseLesson.filter({ lesson_key: { $in: lessons.map(lesson => lesson.key) } }, { limit: 50 });
  const mediaByKey = new Map(records.items.map(record => [record.lesson_key, record]));
  if (lessons.some(lesson => !mediaByKey.get(lesson.key)?.audio_url)) return Response.json({ error: "Each lesson needs saved narration" }, { status: 400 });

  let stagehand, socket, page, canvasPage, session;
  let phase = "demo_sign_in";
  try {
    const token = await login(APP_URL);
    session = await base44.asServiceRole.browser.getSession({ sessionTimeoutSeconds: 280 });
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
    await canvasPage.goto('data:text/html,<title>course-media-encoder</title>', { waitUntil: 'load' });
    const encoderTargets = (await send('Target.getTargets')).targetInfos;
    const encoderTarget = encoderTargets.find(item => item.type === 'page' && item.url.includes('course-media-encoder'));
    if (!encoderTarget) throw new Error('Media encoder target not found');
    const encoderSession = (await send('Target.attachToTarget', { targetId: encoderTarget.targetId, flatten: true })).sessionId;
    let queue = Promise.resolve();
    let frameFailure = null;
    let pointer = { x: 820, y: 350 };
    const results = [];
    for (const lesson of lessons) {
      const record = mediaByKey.get(lesson.key);
      phase = `narration:${lesson.key}`;
      const audioResponse = await fetch(record.audio_url, { signal: AbortSignal.timeout(30000) });
      if (!audioResponse.ok) throw new Error(`Narration download failed (${audioResponse.status})`);
      const audioBytes = new Uint8Array(await audioResponse.arrayBuffer());
      let audioString = '';
      for (let i = 0; i < audioBytes.length; i += 32768) audioString += String.fromCharCode(...audioBytes.subarray(i, i + 32768));
      const prepared = await prepareRecording(canvasPage, btoa(audioString));
      const scenes = lessonScenes[lesson.key];
      if (prepared.narrationSeconds > 85) throw new Error('Narration exceeds recording time limit');
      phase = `record:${lesson.key}`;
      pointer = await showScene(page, send, targetSession, APP_URL, scenes[0]);
      await send('Target.activateTarget', { targetId: target.targetId });
      frameFailure = null;
      drawFrame = ({ data, sessionId }) => {
        queue = queue.then(async () => {
          await paintRecording(canvasPage, data, pointer);
          await send('Page.screencastFrameAck', { sessionId }, targetSession);
        }).catch(error => { frameFailure = error; });
      };
      await paintRecording(canvasPage, (await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, targetSession)).data, pointer);
      const activation = await send('Runtime.evaluate', { expression: 'window.courseCapture.audioContext.resume().then(() => window.courseCapture.audioContext.state)', userGesture: true, awaitPromise: true, returnByValue: true }, encoderSession);
      if (activation.result?.value !== 'running') throw new Error('Narration playback could not start');
      await send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 }, targetSession);
      await canvasPage.evaluate(() => { const c = window.courseCapture; c.recorder.start(1000); c.source.start(0.25); });
      const startedAt = Date.now();
      const slotMs = prepared.narrationSeconds * 1000 / scenes.length;
      for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
        if (sceneIndex) pointer = await showScene(page, send, targetSession, APP_URL, scenes[sceneIndex]);
        const remaining = startedAt + slotMs * (sceneIndex + 1) - Date.now();
        if (remaining > 0) await pause(remaining);
        await paintRecording(canvasPage, (await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, targetSession)).data, pointer);
        if (frameFailure) throw frameFailure;
      }
      await pause(Math.max(500, startedAt + prepared.narrationSeconds * 1000 + 600 - Date.now()));
      await send('Page.stopScreencast', {}, targetSession);
      await queue;
      drawFrame = null;
      if (frameFailure) throw frameFailure;
      phase = `validate:${lesson.key}`;
      const encoded = await finishRecording(canvasPage);
      const bytes = Uint8Array.from(atob(encoded.base64), character => character.charCodeAt(0));
      const extension = encoded.type === 'video/mp4' ? 'mp4' : 'webm';
      const uploaded = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file: new File([bytes], `${lesson.key}-with-audio-${Date.now()}.${extension}`, { type: encoded.type }) });
      const publicResponse = await fetch(uploaded.file_url, { signal: AbortSignal.timeout(30000) });
      if (!publicResponse.ok || !String(publicResponse.headers.get('content-type')).startsWith('video/')) throw new Error('Public recording is not a direct video file');
      const publicBytes = new Uint8Array(await publicResponse.arrayBuffer());
      if (publicBytes.length !== bytes.length || publicBytes.some((value, index) => value !== bytes[index])) throw new Error('Uploaded recording differs from validated file');
      const seconds = Math.round(encoded.seconds);
      const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      const checks = { audioVerified: encoded.audioVerified, videoVerified: encoded.videoVerified, audioRms: encoded.audioRms, seconds, frames: encoded.frames, width: encoded.width, height: encoded.height, publicDownloadVerified: true, type: encoded.type, verifiedAt: new Date().toISOString() };
      await base44.asServiceRole.entities.CourseLesson.update(record.id, { video_url: uploaded.file_url, duration_label: label, note: JSON.stringify(checks), updated_by_name: user.full_name || '' });
      results.push({ lesson_key: lesson.key, video_url: uploaded.file_url, ...checks, saved: true });
    }
    return Response.json({ recorded: results });
  } catch (error) {
    return Response.json({ error: error.message.replace(/wss?:\/\/\S+/g, "[browser connection]"), phase }, { status: 500 });
  } finally {
    socket?.close();
    await stagehand?.close().catch(() => {});
    await session?.end();
  }
}