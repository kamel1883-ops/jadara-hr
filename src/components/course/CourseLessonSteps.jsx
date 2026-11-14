import React from "react";
import { ListChecks } from "lucide-react";

export default function CourseLessonSteps({ lesson }) {
  return (
    <div className="p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><ListChecks size={16} /> الإجراءات المطلوب توثيقها في التسجيل</h3>
      <ol className="space-y-2">
        {lesson.scenes.map((text, index) => (
          <li key={`${lesson.key}:${index}`} className="flex items-start gap-2 rounded-lg border p-3 text-sm leading-relaxed">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{index + 1}</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}