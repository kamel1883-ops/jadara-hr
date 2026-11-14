import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, RotateCcw, Volume2, CheckCircle2, Circle, ArrowRight, ArrowLeft, Link2, Video, ListChecks, Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// مشغّل الدرس: فيديو مسجّل إن وُجد، وإلا عرض حي من شاشات النظام الحقيقية مع تعليق صوتي عربي
export default function CoursePlayer({
  lesson, video, isAdmin, generating, onEditVideo, onGenerateVoice,
  completed, onToggleComplete, onPrev, onNext, hasPrev, hasNext,
}) {
  const scenes = lesson.scenes;
  const routes = lesson.sceneRoutes || lesson.routes.map((r) => r.path);
  const audioUrl = video?.audio_url || "";
  const audioRef = useRef(null);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const currentRoute = routes[Math.min(scene, routes.length - 1)] || lesson.routes[0].path;

  const stopAll = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    if (audioRef.current) audioRef.current.pause();
    setPlaying(false);
  };

  useEffect(() => {
    stopAll();
    setScene(0);
    setProgress(0);
  }, [lesson.key]);

  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch {} }, []);

  // بدون ملف صوتي: نقدّم المشاهد بوتيرة ثابتة أثناء النطق
  useEffect(() => {
    if (!playing || audioUrl) return;
    const timer = setInterval(() => setScene((s) => Math.min(scenes.length - 1, s + 1)), 9000);
    return () => clearInterval(timer);
  }, [playing, audioUrl, scenes.length]);

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    setProgress(Math.round((a.currentTime / a.duration) * 100));
    const next = Math.min(scenes.length - 1, Math.floor((a.currentTime / a.duration) * scenes.length));
    setScene(next);
  };

  const toggle = () => {
    if (audioUrl) {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) { a.play().catch(() => setPlaying(false)); setPlaying(true); }
      else { a.pause(); setPlaying(false); }
      return;
    }
    if (playing) { stopAll(); return; }
    if (!supported) return;
    const u = new SpeechSynthesisUtterance(lesson.narration);
    u.lang = "ar-SA";
    u.rate = 0.92;
    const arVoice = window.speechSynthesis.getVoices().find((v) => /^ar/i.test(v.lang));
    if (arVoice) u.voice = arVoice;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setPlaying(true); } catch { setPlaying(false); }
  };

  const ordered = useMemo(() => scenes.map((s, i) => ({ text: s, route: routes[i] || routes[0] })), [lesson.key]);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="bg-gradient-to-l from-violet-600 to-indigo-600 text-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/80">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5">الدرس {lesson.no}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5">{lesson.duration}</span>
          {video?.video_url ? (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 flex items-center gap-1"><Video size={12} /> فيديو مسجّل</span>
          ) : (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 flex items-center gap-1"><Mic size={12} /> عرض حي من النظام</span>
          )}
        </div>
        <h2 className="mt-2 text-xl sm:text-2xl font-bold leading-snug">{lesson.title}</h2>
        <p className="mt-1 text-sm text-white/85">{lesson.desc}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {lesson.routes.map((r) => (
            <Button key={r.path} asChild size="sm" variant="secondary" className="h-8 rounded-full text-[13px]">
              <Link to={r.path}>افتح {r.label} <ArrowLeft size={14} /></Link>
            </Button>
          ))}
        </div>
      </div>

      {video?.video_url ? (
        <div className="bg-black">
          <video key={video.video_url} src={video.video_url} controls playsInline className="w-full aspect-video" />
        </div>
      ) : (
        <div>
          {/* نافذة النظام الحقيقية — تتنقل تلقائياً مع التعليق الصوتي */}
          <div className="border-b bg-muted/40 px-3 py-1.5 flex items-center gap-2" dir="ltr">
            <span className="flex gap-1">
              <i className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <i className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="flex-1 truncate rounded-md bg-card border px-2 py-1 text-[12px] text-muted-foreground">
              jadara-hr.com{currentRoute}
            </span>
            <Link to={currentRoute} className="text-[12px] font-semibold text-violet-600 hover:underline" dir="rtl">فتح</Link>
          </div>
          <div className="relative bg-card">
            <iframe
              key={currentRoute + scene}
              src={currentRoute}
              title={`شاشة النظام — ${currentRoute}`}
              className="w-full aspect-video bg-white"
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5 text-[11.5px] text-muted-foreground">
            <span>عرض حي لشاشة النظام — تتنقل تلقائياً مع التعليق الصوتي.</span>
            <Link to={currentRoute} className="font-semibold text-violet-600 hover:underline">فتح الشاشة كاملة</Link>
          </div>

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={onTimeUpdate}
              onEnded={() => { setPlaying(false); setProgress(100); }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              preload="metadata"
            />
          )}

          <div className="p-4 sm:p-5 space-y-4">
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-violet-700 dark:text-violet-300">
                  <Volume2 size={16} /> تعليق صوتي عربي — لهجة سعودية
                </div>
                <div className="text-[12px] text-muted-foreground">المشهد {scene + 1} من {scenes.length}</div>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div className="h-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button onClick={toggle} disabled={!audioUrl && !supported} className="h-9 gap-1.5">
                  {playing ? <><Pause size={15} /> إيقاف</> : <><Play size={15} /> تشغيل</>}
                </Button>
                <Button
                  variant="outline" size="sm" className="h-9 gap-1.5"
                  onClick={() => { stopAll(); setProgress(0); setScene(0); }}
                >
                  <RotateCcw size={14} /> من البداية
                </Button>
                {isAdmin && !audioUrl && (
                  <Button variant="secondary" size="sm" className="h-9 gap-1.5" onClick={onGenerateVoice} disabled={generating}>
                    {generating ? <><Loader2 size={14} className="animate-spin" /> جارٍ التوليد…</> : <><Mic size={14} /> توليد التعليق الصوتي</>}
                  </Button>
                )}
                {!audioUrl && (
                  <span className="text-[12px] text-muted-foreground">
                    {supported ? "الصوت الحالي من المتصفح — التوليد يعطي صوتاً أوضح وأثبت." : "المتصفح لا يدعم النطق، اقرأ الخطوات بالأسفل."}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold"><ListChecks size={16} /> خطوات الدرس</div>
              <ol className="space-y-1.5">
                {ordered.map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setScene(i)}
                      className={cn(
                        "w-full text-right flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[13.5px] leading-relaxed transition-colors",
                        i === scene ? "bg-violet-50 border-violet-300 font-semibold dark:bg-violet-500/10 dark:border-violet-500/40" : "bg-card hover:bg-muted"
                      )}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">{i + 1}</span>
                      <span className="min-w-0 flex-1">{item.text}</span>
                      <span className="mt-0.5 shrink-0 text-[11px] text-muted-foreground" dir="ltr">{item.route}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onPrev} disabled={!hasPrev}>
            <ArrowRight size={14} /> السابق
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onNext} disabled={!hasNext}>
            التالي <ArrowLeft size={14} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[13px]" onClick={onEditVideo}>
              <Link2 size={14} /> {video?.video_url ? "تعديل رابط الفيديو" : "إضافة رابط الفيديو"}
            </Button>
          )}
          <Button
            size="sm"
            variant={completed ? "secondary" : "outline"}
            className={cn("h-8 gap-1 text-[13px]", completed && "text-emerald-700 dark:text-emerald-300")}
            onClick={onToggleComplete}
          >
            {completed ? <><CheckCircle2 size={14} /> مكتمل</> : <><Circle size={14} /> علّمه كمكتمل</>}
          </Button>
        </div>
      </div>
    </div>
  );
}