import { base44 } from "@/api/base44Client";

// توليد تعليق صوتي عربي واحد متصل لكل درس (ملف MP3 محفوظ) — أوضح بكثير من نطق المتصفح
export async function generateLessonVoice(lesson, existing) {
  const res = await base44.integrations.Core.GenerateSpeech({
    text: lesson.narration,
    language_code: "ar",
    voice: "river",
  });
  const url = res?.url || res?.data?.url;
  if (!url) throw new Error("لم يُرجع التوليد رابطاً صوتياً");

  const me = await base44.auth.me().catch(() => null);
  const payload = {
    lesson_key: lesson.key,
    lesson_title: lesson.title,
    audio_url: url,
    updated_by_name: me?.full_name || "",
  };
  if (existing?.video_url) payload.video_url = existing.video_url;
  return existing?.id
    ? await base44.entities.CourseLesson.update(existing.id, payload)
    : await base44.entities.CourseLesson.create(payload);
}