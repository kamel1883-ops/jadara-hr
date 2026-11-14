import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// إضافة رابط الفيديو المسجّل للدرس — يُحفظ في قاعدة البيانات فيظهر لكل مستخدمي البوابة
export default function VideoLinkDialog({ open, onClose, lesson, existing, onSaved }) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setUrl(existing?.video_url || ""); setError(""); }
  }, [open, existing]);

  const save = async () => {
    const value = url.trim();
    if (value && !/^https?:\/\//i.test(value)) { setError("الرابط يجب أن يبدأ بـ http أو https"); return; }
    setSaving(true);
    setError("");
    try {
      const me = await base44.auth.me().catch(() => null);
      const payload = {
        lesson_key: lesson.key,
        lesson_title: lesson.title,
        video_url: value,
        duration_label: lesson.duration,
        updated_by_name: me?.full_name || "",
      };
      const saved = existing?.id
        ? await base44.entities.CourseLesson.update(existing.id, payload)
        : await base44.entities.CourseLesson.create(payload);
      onSaved(saved || payload);
      onClose();
    } catch (e) {
      setError("تعذّر الحفظ، عاود المحاولة.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>فيديو الدرس: {lesson.title}</DialogTitle>
          <DialogDescription>
            الصق رابط الفيديو (MP4 أو رابط مشاركة مباشر). اتركه فارغاً لإظهار الشرح الصوتي التفاعلي.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input dir="ltr" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}