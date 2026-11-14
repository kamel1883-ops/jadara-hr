import React, { useEffect, useState } from "react";
import { Video, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CourseMedia({ lesson, video, isAdmin, generating, onGenerateVoice }) {
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
      <div className="p-4 space-y-3 border-b">
        {video?.audio_url && <div className="space-y-2">
          <p className="text-xs text-muted-foreground">التعليق الصوتي المنفصل فقط، ليس فيديو تعليمياً. لا يعمل تلقائياً مع التسجيل.</p>
          <audio key={`${lesson.key}:${video.audio_url}`} src={video.audio_url} controls preload="metadata" className="w-full" aria-label={`التعليق الصوتي: ${lesson.title}`} />
        </div>}
        {isAdmin && !video?.audio_url && <Button variant="secondary" size="sm" onClick={onGenerateVoice} disabled={generating}>
          {generating ? <><Loader2 size={14} className="animate-spin" /> جارٍ التوليد…</> : <><Mic size={14} /> توليد التعليق الصوتي فقط</>}
        </Button>}
      </div>
    </div>
  );
}