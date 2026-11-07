import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

export default function JobFormDialog({ open, onOpenChange, onSaved, job }) {
  const { toast } = useToast();
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    edit: "تعديل وظيفة", add: "وظيفة جديدة",
    title: "المسمى الوظيفي *", prof: "المهنة", grade: "الدرجة الوظيفية",
    type: "نوع الوظيفة", full: "دوام كامل", part: "دوام جزئي", cont: "عقد",
    natReq: "المطلوب", any: "الجميع", saudi: "سعودي", resident: "مقيم",
    salary: "الراتب (ريال)", vac: "عدد الشواغر", dept: "الإدارة",
    qual: "المؤهلات المطلوبة", tasks: "المهام والمسؤوليات",
    jd: "الوصف الوظيفي (Job Description)",
    gen: "توليد بالذكاء الاصطناعي", gening: "توليد...",
    jdPh: "الوصف الوظيفي — يمكنك توليده تلقائياً أو كتابته يدوياً",
    jdHint: "يكون الوصف المولّد قابلاً للتعديل: أضف المهام أو احذفها يدوياً قبل الحفظ.",
    status: "الحالة", open: "شاغرة", closed: "مغلقة",
    needTitle: "يرجى إدخال المسمى الوظيفي", needTitleFirst: "أدخل المسمى الوظيفي أولاً",
    genOk: "تم توليد الوصف الوظيفي", genFail: "تعذر التوليد", saveFail: "تعذر الحفظ",
    upd: "تم تحديث الوظيفة", created: "تم إنشاء الوظيفة",
    cancel: "إلغاء", save: "حفظ", saving: "جارٍ الحفظ...",
  } : {
    edit: "Edit job", add: "New job",
    title: "Job title *", prof: "Profession", grade: "Job grade",
    type: "Job type", full: "Full-time", part: "Part-time", cont: "Contract",
    natReq: "Required", any: "Any", saudi: "Saudi", resident: "Resident",
    salary: "Salary (SAR)", vac: "Vacancies", dept: "Department",
    qual: "Required qualifications", tasks: "Tasks & responsibilities",
    jd: "Job description",
    gen: "Generate with AI", gening: "Generating...",
    jdPh: "Job description — generate automatically or type manually",
    jdHint: "The generated description is editable — add or remove tasks manually before saving.",
    status: "Status", open: "Open", closed: "Closed",
    needTitle: "Please enter the job title", needTitleFirst: "Enter the job title first",
    genOk: "Job description generated", genFail: "Generation failed", saveFail: "Save failed",
    upd: "Job updated", created: "Job created",
    cancel: "Cancel", save: "Save", saving: "Saving...",
  };
  const isEdit = !!job;
  const empty = { title: "", profession: "", job_type: "full_time", grade: "", salary: 0, nationality_req: "any", qualifications: "", tasks: "", vacancy_count: 1, department: "", status: "open", description: "" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (job) setForm({ ...empty, ...job }); else setForm(empty); }, [job, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.title) { toast({ title: t.needTitleFirst, variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const prompt = `أنت خبير موارد بشرية. اكتب وصفاً وظيفياً كاملاً واحترافياً باللغة العربية للوظيفة التالية:\nالمسمى: ${form.title}\nالمهنة: ${form.profession}\nالدرجة: ${form.grade}\nنوع الوظيفة: ${form.job_type}\nالراتب: ${form.salary}\nالمطلوب: ${form.nationality_req}\nالمؤهلات: ${form.qualifications}\nالمهام: ${form.tasks}\nيتضمن: ملخص الوظيفة، المسؤوليات والمهام التفصيلية، المؤهلات والمهارات المطلوبة، الشروط والضوابط.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      set("description", typeof res === "string" ? res : JSON.stringify(res));
      toast({ title: t.genOk });
    } catch (e) { toast({ title: t.genFail, description: e.message, variant: "destructive" }); }
    finally { setGenerating(false); }
  };

  const save = async () => {
    if (!form.title) { toast({ title: t.needTitle, variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { ...form, salary: Number(form.salary) || 0, vacancy_count: Number(form.vacancy_count) || 1 };
      if (isEdit) await base44.entities.Job.update(job.id, payload);
      else await base44.entities.Job.create(payload);
      toast({ title: isEdit ? t.upd : t.created });
      onSaved?.();
      onOpenChange(false);
    } catch (e) { toast({ title: t.saveFail, description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? t.edit : t.add}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label>{t.title}</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t.prof}</Label><Input value={form.profession} onChange={(e) => set("profession", e.target.value)} /></div>
            <div><Label>{t.grade}</Label><Input value={form.grade} onChange={(e) => set("grade", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t.type}</Label>
              <MobileSelect value={form.job_type} onValueChange={(v) => set("job_type", v)}>
                <MobileSelectItem value="full_time">{t.full}</MobileSelectItem>
                <MobileSelectItem value="part_time">{t.part}</MobileSelectItem>
                <MobileSelectItem value="contract">{t.cont}</MobileSelectItem>
              </MobileSelect>
            </div>
            <div><Label>{t.natReq}</Label>
              <MobileSelect value={form.nationality_req} onValueChange={(v) => set("nationality_req", v)}>
                <MobileSelectItem value="any">{t.any}</MobileSelectItem>
                <MobileSelectItem value="saudi">{t.saudi}</MobileSelectItem>
                <MobileSelectItem value="resident">{t.resident}</MobileSelectItem>
              </MobileSelect>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>{t.salary}</Label><Input type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} /></div>
            <div><Label>{t.vac}</Label><Input type="number" value={form.vacancy_count} onChange={(e) => set("vacancy_count", e.target.value)} /></div>
            <div><Label>{t.dept}</Label><Input value={form.department} onChange={(e) => set("department", e.target.value)} /></div>
          </div>
          <div><Label>{t.qual}</Label><Textarea rows={2} value={form.qualifications} onChange={(e) => set("qualifications", e.target.value)} /></div>
          <div><Label>{t.tasks}</Label><Textarea rows={2} value={form.tasks} onChange={(e) => set("tasks", e.target.value)} /></div>
          <div className="flex items-center justify-between">
            <Label>{t.jd}</Label>
            <Button size="sm" variant="outline" onClick={generate} disabled={generating}><Sparkles size={14} />{generating ? t.gening : t.gen}</Button>
          </div>
          <Textarea rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t.jdPh} />
          <p className="text-xs text-muted-foreground">{t.jdHint}</p>
          <div><Label>{t.status}</Label>
            <MobileSelect value={form.status} onValueChange={(v) => set("status", v)} className="w-40">
              <MobileSelectItem value="open">{t.open}</MobileSelectItem>
              <MobileSelectItem value="closed">{t.closed}</MobileSelectItem>
            </MobileSelect>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button onClick={save} disabled={saving}>{saving ? t.saving : t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}