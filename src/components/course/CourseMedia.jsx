import React, { useEffect, useState } from "react";
import { Video, Loader2 } from "lucide-react";

export default function CourseMedia({ lesson, video }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setLoading(true); setFailed(false); }, [lesson.key, video?.video_url]);
  return (
    <div>
      {video?.video_url ? (
        <div className="relative bg-muted">
          <video key={`${lesson.key}:${video.video_url}`} src={video.video_url} controls playsInline preload="metadata"
            aria-label={`تسجيل شاشة: ${lesson.title}`} className="w-full aspect-video"
            onLoadedData={() => setLoading(false)} onWaiting={() => setLoading(true)}
            onCanPlay={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); }} />
          {loading && !failed && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-foreground bg-background/80"><Loader2 size={20} className="animate-spin" /> جارٍ تحميل التسجيل…</div>}
          {failed && <p role="alert" className="p-4 text-sm text-destructive">تعذّر تشغيل التسجيل. يلزم رابط مباشر لملف MP4 أو WebM، وليس رابط صفحة مشاركة.</p>}
        </div>
      ) : (
        <div className="border-b bg-muted/30 p-6 sm:p-8 text-center space-y-3">
          <Video size={36} className="mx-auto text-muted-foreground" />
          <h3 className="font-bold">لم يُضف تسجيل شاشة لهذا الدرس بعد</h3>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">هذا الدرس يحتاج فيديو متصلاً لإجراءات فعلية من واجهات جداره، بمؤشر الماوس وبيانات تجريبية معزولة. الشرح الصوتي والخطوات المكتوبة ليسا بديلاً عن تسجيل الشاشة.</p>
        </div>
      )}
      {video?.audio_url && <div className="p-4 border-b">
        <audio key={`${lesson.key}:${video.audio_url}`} src={video.audio_url} controls preload="metadata" className="w-full" aria-label={`التعليق الصوتي: ${lesson.title}`} />
      </div>}
    </div>
  );
}