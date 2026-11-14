import { createClientFromRequest } from "npm:@base44/sdk@0.8.56";
import { Stagehand } from "npm:@browserbasehq/stagehand@3.7.3";
import "npm:zod@4.4.0";

// Capture the real browser compositor, not recreated UI or generated footage.
// This first capture verifies video export on the public site before using a demo account.
export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch((error) => error.status === 401 ? null : Promise.reject(error));
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const session = await base44.asServiceRole.browser.getSession({ sessionTimeoutSeconds: 180 });
  let stagehand, socket, page;
  let phase = "open_browser";
  let frameFailure = null;
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
    stagehand = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: { cdpUrl: session.connectionUrl },
      model: { modelName: "openai/gpt_6_luna", apiKey: token, baseURL, headers, openaiEndpointFormat: "chat" },
      disablePino: true,
    });
    await stagehand.init();
    page = stagehand.context.pages()[0];
    await page.setViewportSize(1280, 720);
    await page.goto("https://jadarahr.base44.app", { waitUntil: "load", timeoutMs: 45000 });
    await pause(2500);
    const source = await page.evaluate(() => ({ title: document.title, text: document.body.innerText.slice(0, 350), url: location.href }));
    if (!source.text.includes("جداره") && !source.text.includes("Jadara")) throw new Error("The actual app did not load; refusing to record a substitute page.");

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
    const { targetInfos } = await send("Target.getTargets");
    const target = targetInfos.find((item) => item.type === "page" && item.url === page.url());
    if (!target) throw new Error("Actual app browser target was not found");
    targetSession = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true })).sessionId;
    await send("Page.enable", {}, targetSession);

    phase = "encode_real_frames";
    const encoderPage = await stagehand.context.newPage();
    await encoderPage.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const chunks = [];
      const mimeType = "video/webm;codecs=vp8";
      if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error("WebM recording is unavailable");
      const stream = canvas.captureStream(15);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3500000 });
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      window.courseCapture = { canvas, context: canvas.getContext("2d"), recorder, stream, chunks };
    });
    const paint = (data) => encoderPage.evaluate(async (jpeg) => {
      const image = new Image();
      image.src = `data:image/jpeg;base64,${jpeg}`;
      await image.decode();
      window.courseCapture.context.drawImage(image, 0, 0, 1280, 720);
    }, data);
    await paint((await send("Page.captureScreenshot", { format: "jpeg", quality: 85 }, targetSession)).data);
    await encoderPage.evaluate(() => window.courseCapture.recorder.start(500));
    let frames = 0;
    let queue = Promise.resolve();
    drawFrame = ({ data, sessionId }) => {
      queue = queue.then(async () => {
        await paint(data);
        frames += 1;
        await send("Page.screencastFrameAck", { sessionId }, targetSession);
      }).catch((error) => { frameFailure = error; });
    };
    await send("Target.activateTarget", { targetId: target.targetId });
    await send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 }, targetSession);
    const startedAt = Date.now();
    await pause(1800);
    for (let step = 0; step < 14; step += 1) {
      await page.scroll(640, 420, 0, 100);
      await pause(250);
      if (frameFailure) throw frameFailure;
    }
    await pause(1800);
    await send("Page.stopScreencast", {}, targetSession);
    await queue;
    if (frameFailure) throw frameFailure;
    if (frames < 10) throw new Error("Too few live browser frames were received; no recording will be delivered.");
    const encoded = await encoderPage.evaluate(async () => {
      const capture = window.courseCapture;
      await new Promise((resolve) => { capture.recorder.onstop = resolve; capture.recorder.stop(); });
      capture.stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(capture.chunks, { type: "video/webm" });
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { base64: dataUrl.split(",")[1], size: blob.size };
    });
    phase = "save_recording";
    if (encoded.size < 10000) throw new Error("Recording output was empty or incomplete");
    const bytes = Uint8Array.from(atob(encoded.base64), (character) => character.charCodeAt(0));
    const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
      file: new File([bytes], "jadara-real-screen-capture.webm", { type: "video/webm" }),
    });
    return Response.json({ file_uri: uploaded.file_uri, frames, duration_seconds: Math.round((Date.now() - startedAt) / 1000), bytes: encoded.size, recorded_page: source.url, content: "Actual public landing page only; not a completed company-workflow lesson." });
  } catch (error) {
    const debug_screenshots = [];
    if (page) {
      const image = await page.screenshot({ type: "png" }).catch(() => null);
      if (image) {
        const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: new File([image], "recording-checkpoint.png", { type: "image/png" }) });
        debug_screenshots.push({ label: phase, file_uri: uploaded.file_uri });
      }
    }
    return Response.json({ error: error.message.replace(/wss?:\/\/\S+/g, "[browser connection]"), phase, debug_screenshots }, { status: 500 });
  } finally {
    socket?.close();
    await stagehand?.close().catch(() => {});
    await session.end();
  }
}