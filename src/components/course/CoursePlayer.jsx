import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, RotateCcw, Volume2, CheckCircle2, Circle, ArrowRight, ArrowLeft, Link2, Video, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const splitSentences = (text) =>
  (text || "").split(/(?<=[.؟!…])\s+/).map((s) => s.trim()).filter(Boolean);

// مشغّل الدرس: يعرض الفيديو المسجّل إن وُجد، وإلا يقرأ النص الصوتي بالعربية مع إبراز المشهد الحالي
export default function CoursePlayer({ lesson, video, isAdmin, onEditVideo, completed, onToggleComplete, onPrev, onNext, hasPrev, hasNext }) {
  const parts = useMemo(() => splitSentences(lesson.narration), [lesson.key]);
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stopVoice = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    setPlaying(false);
    setIdx(-1);
  };

  useEffect(() => {
    stopVoice();
    return () => { try { window.speechSynthesis.cancel(); } catch {} };
  }, [lesson.key]);

  const play = () => {
    if (!supported) return;
    try { window.speechSynthesis.cancel(); } catch {}
    let i = Math.max(idx, 0);
    const speakNext = () => {
      if (i >= parts.length) { setPlaying(false); setIdx(-1); return; }
      setIdx(i);
      const u = new SpeechSynthesisUtterance(parts[i]);
      u.lang = "ar-SA";
      u.rate = 1;
      const arVoice = window.speechSynthesis.getVoices().find((v) => /^ar/i.test(v.lang));
      if (arVoice) u.voice = arVoice;
      u.onend = () => { i += 1; speakNext(); };
      u.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(u);
    };
    setPlaying(true);
    speakNext();
  };

  const activeScene = idx < 0 ? -1 : Math.min(lesson.scenes.length - 1, Math.floor((idx / Math.max(parts.length, 1)) * lesson.scenes.length));
  const progress = idx < 0 ? (playing ? 0 : 0) : Math.round(((idx + 1) / parts.length) * 100);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="bg-gradient-to-l from-violet-600 to-indigo-600 text-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/80">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5">الدرس {lesson.no}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5">{lesson.duration}</span>
          {video?.video_url && <span className="rounded-full bg-white/15 px-2.5 py-0.5 flex items-center gap-1"><Video size={12} /> فيديو مسجّل</span>}
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
        <div className="p-4 sm:p-5 space-y-4">
          <div className="rounded-xl border bg-muted/40 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-violet-700 dark:text-violet-300">
                <Volume2 size={16} /> الشرح الصوتي التفاعلي
              </div>
              <div className="text-[12px] text-muted-foreground">
                {activeScene >= 0 ? `المشهد ${activeScene + 1} من ${lesson.scenes.length}` : `${parts.length} مقطعاً صوتياً`}
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div className="h-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              {parts.map((p, i) => (
                <span key={i} className={cn(i === idx ? "font-bold text-violet-700 dark:text-violet-300" : "text-muted-foreground")}>
                  {p}{" "}
                </span>
              ))}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button onClick={playing ? stopVoice : play} disabled={!supported} className="h-9 gap-1.5">
                {playing ? <><Pause size={15} /> إيقاف</> : <><Play size={15} /> تشغيل الشرح</>}
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={stopVoice} disabled={idx < 0}>
                <RotateCcw size={14} /> من البداية
              </Button>
              {!supported && <span className="text-[12px] text-destructive">المتصفح لا يدعم النطق — اقرأ النص أدناه.</span>}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold"><ListChecks size={16} /> خطوات الدرس</div>
            <ol className="space-y-1.5">
              {lesson.scenes.map((scene, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[13.5px] leading-relaxed transition-colors",
                    i === activeScene ? "bg-violet-50 border-violet-300 font-semibold dark:bg-violet-500/10 dark:border-violet-500/40" : "bg-card"
                  )}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">{i + 1}</span>
                  {scene}
                </li>
              ))}
            </ol>
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