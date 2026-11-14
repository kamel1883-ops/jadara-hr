export async function prepareRecording(page, audioBase64) {
  return page.evaluate(async (base64) => {
    const audioContext = new AudioContext();
    const audioBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const audioBuffer = await audioContext.decodeAudioData(audioBytes.buffer);
    const samples = audioBuffer.getChannelData(0);
    let energy = 0;
    for (let i = 0; i < samples.length; i += 100) energy += samples[i] * samples[i];
    const rms = Math.sqrt(energy / Math.ceil(samples.length / 100));
    if (audioBuffer.duration < 3 || rms < 0.001) throw new Error('Narration is empty or silent');
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    document.body.replaceChildren(canvas);
    const destination = audioContext.createMediaStreamDestination();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer; source.connect(destination);
    const canvasStream = canvas.captureStream(15);
    const stream = new MediaStream([...canvasStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
    const mimeType = ['video/mp4;codecs=avc1.42001E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp8,opus'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('No supported audio/video encoder');
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 });
    const capture = { audioContext, audioBuffer, source, stream, canvasStream, destination, canvas, context: canvas.getContext('2d'), recorder, chunks: [], ended: false, frames: 0, rms, mimeType };
    source.onended = () => { capture.ended = true; };
    recorder.ondataavailable = event => { if (event.data.size) capture.chunks.push(event.data); };
    window.courseCapture = capture;
    return { narrationSeconds: audioBuffer.duration, rms, mimeType, audioTracks: stream.getAudioTracks().length, videoTracks: stream.getVideoTracks().length };
  }, audioBase64);
}

export async function paintRecording(page, jpeg, pointer = { x: 800, y: 350 }) {
  return page.evaluate(async ({ jpeg, pointer }) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${jpeg}`;
    await image.decode();
    const c = window.courseCapture;
    c.context.drawImage(image, 0, 0, 1280, 720);
    c.context.save(); c.context.translate(pointer.x, pointer.y);
    c.context.beginPath(); c.context.moveTo(0, 0); c.context.lineTo(0, 20); c.context.lineTo(5, 15); c.context.lineTo(10, 24); c.context.lineTo(14, 22); c.context.lineTo(9, 13); c.context.lineTo(17, 13); c.context.closePath();
    c.context.fillStyle = '#151923'; c.context.strokeStyle = '#ffffff'; c.context.lineWidth = 2; c.context.fill(); c.context.stroke(); c.context.restore();
    c.frames++;
  }, { jpeg, pointer });
}

export async function finishRecording(page) {
  return page.evaluate(async () => {
    const c = window.courseCapture;
    await new Promise((resolve, reject) => {
      c.recorder.onstop = resolve;
      c.recorder.onerror = event => reject(new Error(event.error?.message || 'Encoder failed'));
      c.recorder.stop();
    });
    const blob = new Blob(c.chunks, { type: c.mimeType.split(';')[0] });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.length < 10000 || c.frames < 3 || !c.ended) throw new Error('Recording incomplete');
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.src = url;
    const metadata = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Recorded video cannot be decoded')), 15000);
      video.onloadeddata = () => { clearTimeout(timer); resolve({ width: video.videoWidth, height: video.videoHeight, seconds: video.duration }); };
      video.onerror = () => { clearTimeout(timer); reject(new Error('Recorded video is corrupt')); };
      video.load();
    });
    if (metadata.width !== 1280 || metadata.height !== 720) throw new Error('Recorded video has no picture');
    const decodedAudio = await c.audioContext.decodeAudioData(bytes.buffer.slice(0));
    const samples = decodedAudio.getChannelData(0);
    let energy = 0;
    for (let i = 0; i < samples.length; i += 100) energy += samples[i] * samples[i];
    const audioRms = Math.sqrt(energy / Math.ceil(samples.length / 100));
    if (audioRms < 0.001 || decodedAudio.duration < c.audioBuffer.duration - 1.5) throw new Error('Recorded audio missing or truncated');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
    });
    video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url);
    c.stream.getTracks().forEach(track => track.stop()); c.canvasStream.getTracks().forEach(track => track.stop());
    await c.audioContext.close();
    return { base64: dataUrl.split(',')[1], size: bytes.length, type: blob.type, seconds: decodedAudio.duration, audioRms, frames: c.frames, width: metadata.width, height: metadata.height, audioVerified: true, videoVerified: true };
  });
}