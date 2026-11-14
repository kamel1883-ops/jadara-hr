import React from "react";
import { CheckCircle2, PlayCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { COURSE_GROUPS, COURSE_LESSONS } from "@/lib/courseContent";

// قائمة الدروس مجمّعة حسب المسار — تبقى ملتصقة أعلى الشاشة على سطح المكتب
export default function LessonNav({ activeKey, completed, onSelect }) {
  return (
    <div className="rounded-2xl border bg-card p-3 max-h-[46vh] overflow-y-auto lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
      <div className="px-2 pb-2 text-sm font-bold text-muted-foreground">فيديوهات الدورة</div>
      <div className="space-y-3">
        {COURSE_GROUPS.map((group) => {
          const lessons = COURSE_LESSONS.filter((l) => l.group === group.id);
          if (!lessons.length) return null;
          return (
            <div key={group.id}>
              <div className="px-2 py-1 text-[13px] font-semibold text-violet-700 dark:text-violet-300">{group.ar}</div>
              <div className="space-y-1">
                {lessons.map((lesson) => {
                  const active = lesson.key === activeKey;
                  const done = completed.includes(lesson.key);
                  return (
                    <button
                      key={lesson.key}
                      onClick={() => onSelect(lesson.key)}
                      className={cn(
                        "w-full flex items-start gap-2.5 rounded-xl border px-2.5 py-2 text-right transition-colors",
                        active
                          ? "bg-violet-50 border-violet-300 dark:bg-violet-500/10 dark:border-violet-500/40"
                          : "border-transparent hover:bg-muted"
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        {done ? (
                          <CheckCircle2 size={17} className="text-emerald-600" />
                        ) : (
                          <PlayCircle size={17} className={active ? "text-violet-600" : "text-muted-foreground"} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold leading-snug">
                          {lesson.no}. {lesson.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                          <Clock size={11} /> {lesson.duration}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}