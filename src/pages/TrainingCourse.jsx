import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { GraduationCap, Video, CheckCircle2, Sparkles, Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COURSE_LESSONS } from "@/lib/courseContent";
import { generateLessonVoice } from "@/lib/courseVoice";
import CoursePublicHeader from "@/components/course/CoursePublicHeader";
import LessonNav from "@/components/course/LessonNav";
import CoursePlayer from "@/components/course/CoursePlayer";
import VideoLinkDialog from "@/components/course/VideoLinkDialog";

const PROGRESS_KEY = "jadara_course_progress";

export default function TrainingCourse() {
  const [activeKey, setActiveKey] = useState(COURSE_LESSONS[0].key);
  const [completed, setCompleted] = useState([]);
  const [videos, setVideos] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bulk, setBulk] = useState({ running: false, done: 0 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) setCompleted(JSON.parse(raw) || []);
    } catch {}

  }, []);

  const { data: courseData, isLoading: mediaLoading, error: mediaError } = useQuery({
    queryKey: ["public-course-media"],
    queryFn: async () => {
      const user = await base44.auth.me().catch((error) => error.status === 401 ? null : Promise.reject(error));
      const { items } = await base44.entities.CourseLesson.filter(
        { lesson_key: { $in: COURSE_LESSONS.map((l) => l.key) } },
        { sort: "-updated_date", limit: 100 }
      );
      return { items, isAdmin: user?.role === "admin" };
    },
  });

  useEffect(() => {
    if (!courseData) return;
    const map = {};
    courseData.items.forEach((record) => { if (!map[record.lesson_key]) map[record.lesson_key] = record; });
    setVideos(map);
    setIsAdmin(courseData.isAdmin);
  }, [courseData]);

  const lesson = useMemo(() => COURSE_LESSONS.find((l) => l.key === activeKey) || COURSE_LESSONS[0], [activeKey]);
  const index = COURSE_LESSONS.findIndex((l) => l.key === lesson.key);
  const savedVoices = Object.values(videos).filter((v) => v?.audio_url).length;
  const { data: recordedLessons, refetch: refreshRecordingCount } = useQuery({
    queryKey: ["course-recording-count"],
    queryFn: () => base44.entities.CourseLesson.count({
      lesson_key: { $in: COURSE_LESSONS.map((l) => l.key) },
      video_url: { $exists: true, $ne: "" },
    }),
  });

  const persist = (keys) => {
    setCompleted(keys);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(keys)); } catch {}
  };

  const toggleComplete = () => {
    persist(
      completed.includes(lesson.key)
        ? completed.filter((k) => k !== lesson.key)
        : [...completed, lesson.key]
    );
  };

  const go = (offset) => {
    const next = COURSE_LESSONS[index + offset];
    if (next) setActiveKey(next.key);
  };

  const onSaved = (record) => {
    if (!record?.lesson_key) return;
    setVideos((prev) => ({ ...prev, [record.lesson_key]: record }));
    refreshRecordingCount();
  };

  const generateCurrent = async () => {
    setGenerating(true);
    try {
      const saved = await generateLessonVoice(lesson, videos[lesson.key]);
      onSaved(saved || { lesson_key: lesson.key, audio_url: "" });
    } catch {
      // يبقى النطق من المتصفح كبديل
    } finally {
      setGenerating(false);
    }
  };

  // توليد أصوات كل الدروس مرة واحدة (يُحفظ كل صوت فوراً فلا يتكرر التوليد)
  const generateAll = async () => {
    setBulk({ running: true, done: 0 });
    let done = 0;
    for (const l of COURSE_LESSONS) {
      if (!videos[l.key]?.audio_url) {
        try {
          const saved = await generateLessonVoice(l, videos[l.key]);
          if (saved?.audio_url) setVideos((prev) => ({ ...prev, [l.key]: saved }));
        } catch {}
      }
      done += 1;
      setBulk({ running: true, done });
    }
    setBulk({ running: false, done });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-5">
      <CoursePublicHeader />
      <div className="rounded-2xl border bg-gradient-to-l from-violet-50 via-card to-amber-50 dark:from-violet-500/10 dark:via-card dark:to-amber-500/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow">
            <GraduationCap size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">الدورة التدريبية</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {COURSE_LESSONS.length} درساً باللهجة السعودية تشرح كل أقسام إدارة الشركة: التوظيف وملفات الموظفين،
              الحضور والبصمات والإجازات، الرواتب والسلف، المركبات والتراخيص، الأداء والمغادرة ونهاية الخدمة.
              متاحة للجميع بدون اشتراك أو حساب أو تسجيل دخول. تظهر حالة كل درس إلى أن يُضاف تسجيله الفعلي.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
          <div className="rounded-xl border bg-card px-3 py-2 flex items-center gap-2">
            <Video size={15} className="text-primary" /> تسجيلات الشاشة المتاحة: {recordedLessons ?? "…"} من {COURSE_LESSONS.length}
          </div>
          <div className="rounded-xl border bg-card px-3 py-2 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" /> أكملت {completed.length} من {COURSE_LESSONS.length}
          </div>
          <div className="rounded-xl border bg-card px-3 py-2 flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" /> ابدأ من المقدمة ثم بالترتيب
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={generateAll}
              disabled={bulk.running}
            >
              {bulk.running ? (
                <><Loader2 size={14} className="animate-spin" /> توليد الأصوات {bulk.done}/{COURSE_LESSONS.length}</>
              ) : (
                <><Mic size={14} /> توليد صوت كل الدروس ({savedVoices}/{COURSE_LESSONS.length} جاهز)</>
              )}
            </Button>
          )}
        </div>
      </div>

      {mediaLoading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> جارٍ تحميل مواد الدورة…</p>}
      {mediaError && <p role="alert" className="text-sm text-destructive">تعذّر تحميل مواد الدورة. أعد تحميل الصفحة للمحاولة مجدداً.</p>}
      <div className="grid gap-4 lg:grid-cols-[290px_1fr]">
        <LessonNav activeKey={activeKey} completed={completed} onSelect={setActiveKey} />
        <CoursePlayer
          lesson={lesson}
          video={videos[lesson.key]}
          isAdmin={isAdmin}
          generating={generating}
          onGenerateVoice={generateCurrent}
          onEditVideo={() => setDialogOpen(true)}
          completed={completed.includes(lesson.key)}
          onToggleComplete={toggleComplete}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          hasPrev={index > 0}
          hasNext={index < COURSE_LESSONS.length - 1}
        />
      </div>

      <VideoLinkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        lesson={lesson}
        existing={videos[lesson.key]}
        onSaved={onSaved}
      />
      </div>
    </div>
  );
}