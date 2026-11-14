import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Link2, Video } from "lucide-react";
import CourseMedia from "@/components/course/CourseMedia";
import CourseLessonSteps from "@/components/course/CourseLessonSteps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// لا تُعرض واجهات حية أو مشاهد اصطناعية كبديل لتسجيل الشاشة.
export default function CoursePlayer({
  lesson, video, isAdmin, generating, onEditVideo, onGenerateVoice,
  completed, onToggleComplete, onPrev, onNext, hasPrev, hasNext,
}) {

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="bg-gradient-to-l from-violet-600 to-indigo-600 text-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/80">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5">الدرس {lesson.no}</span>
          {video?.video_url && video?.duration_label && <span className="rounded-full bg-white/15 px-2.5 py-0.5">{video.duration_label}</span>}
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 flex items-center gap-1"><Video size={12} /> {video?.video_url ? "تسجيل شاشة" : "بانتظار تسجيل الشاشة"}</span>
        </div>
        <h2 className="mt-2 text-xl sm:text-2xl font-bold leading-snug">{lesson.title}</h2>
        <p className="mt-1 text-sm text-white/85">{lesson.desc}</p>
        {isAdmin && <div className="mt-3 flex flex-wrap gap-2">
          {lesson.routes.map((r) => (
            <Button key={r.path} asChild size="sm" variant="secondary" className="h-8 rounded-full text-[13px]">
              <Link to={r.path}>افتح {r.label} <ArrowLeft size={14} /></Link>
            </Button>
          ))}
        </div>}
      </div>

      <CourseMedia key={lesson.key} lesson={lesson} video={video} isAdmin={isAdmin} generating={generating} onGenerateVoice={onGenerateVoice} />
      <CourseLessonSteps lesson={lesson} />

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