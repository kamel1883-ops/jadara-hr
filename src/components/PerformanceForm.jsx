import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { base44 } from "@/api/base44Client";
import { todayISO } from "@/lib/hr";
import { useI18n } from "@/lib/i18n";
import { writeRecordToVault, VAULT_MODULES } from "@/lib/vaultGeneric";
import VaultAttachments from "@/components/VaultAttachments";

const empty = {
  employee_id: "", review_period: "annual", period_year: new Date().getFullYear(),
  review_type: "annual", goals: "", goals_rating: 0, competencies_rating: 0,
  values_rating: 0, overall_rating: 0, strengths: "", improvements: "",
  personal_goals: "", behaviors: "", tasks_coverage: "", tasks_amendments: "",
  recommendation: "none", target_grade: "", promotion_ready: false,
  review_date: todayISO(), next_review_date: "", status: "draft", notes: "", documents: [],
};

export default function PerformanceForm({ open, employees, editing, user, onClose, onSaved }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    edit: "تعديل تقييم الأداء", add: "تقييم أداء جديد",
    emp: "الموظف", chooseEmp: "اختر الموظف",
    revType: "نوع المراجعة", annualT: "سنوي", midyearT: "نصف سنوي", probationT: "فترة التجربة", goalT: "تحديد الأهداف",
    period: "فترة التقييم", annualP: "سنوي", midyearP: "نصف سنوي", probationP: "تجربة", q1: "الربع الأول", q2: "الربع الثاني", q3: "الربع الثالث",
    year: "السنة", goals: "الأهداف والمخرجات",
    goalSection: "إطار تحديد الأهداف", personalGoals: "الأهداف الشخصية", behaviors: "السلوكيات المهنية", tasksCoverage: "تغطية المهام والإنجاز", tasksAmend: "تعديل وتطوير المهام",
    goalsR: "تقييم الأهداف", compR: "تقييم الكفاءات", valuesR: "تقييم القيم",
    strengths: "نقاط القوة", improvements: "فرص التحسين",
    rec: "التوصية", recNone: "بدون", recMaintain: "إبقاء على الوضع", recPromote: "ترقية", recBonus: "حافز", recWarn: "إنذار", recTerminate: "إنهاء",
    targetGrade: "الدرجة المستهدفة (للمسار الوظيفي)", targetPh: "مثال: مدير قسم",
    revDate: "تاريخ التقييم", nextRev: "التقييم القادم", status: "الحالة",
    sDraft: "مسودة", sSubmitted: "مُرسلة", sAcknowledged: "معتمدة من الموظف", sCompleted: "مكتملة",
    ready: "جاهز للترقية", cancel: "إلغاء", save: "حفظ التقييم", saving: "جارٍ الحفظ...",
    reviewerDefault: "المدير",
    attach: "مرفقات التقييم (اختياري)",
  } : {
    edit: "Edit performance review", add: "New performance review",
    emp: "Employee", chooseEmp: "Select employee",
    revType: "Review type", annualT: "Annual", midyearT: "Mid-year", probationT: "Probation", goalT: "Goal setting",
    period: "Review period", annualP: "Annual", midyearP: "Mid-year", probationP: "Probation", q1: "Q1", q2: "Q2", q3: "Q3",
    year: "Year", goals: "Goals & outcomes",
    goalSection: "Goal setting framework", personalGoals: "Personal goals", behaviors: "Professional behaviors", tasksCoverage: "Tasks coverage & delivery", tasksAmend: "Tasks amendment & development",
    goalsR: "Goals rating", compR: "Competencies rating", valuesR: "Values rating",
    strengths: "Strengths", improvements: "Improvement areas",
    rec: "Recommendation", recNone: "None", recMaintain: "Maintain", recPromote: "Promote", recBonus: "Bonus", recWarn: "Warn", recTerminate: "Terminate",
    targetGrade: "Target grade (career path)", targetPh: "e.g. Section manager",
    revDate: "Review date", nextRev: "Next review", status: "Status",
    sDraft: "Draft", sSubmitted: "Submitted", sAcknowledged: "Acknowledged by employee", sCompleted: "Completed",
    ready: "Promotion ready", cancel: "Cancel", save: "Save review", saving: "Saving...",
    reviewerDefault: "Manager",
    attach: "Review attachments (optional)",
  };

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (editing) setForm({ ...empty, ...editing }); else setForm({ ...empty }); }, [editing, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    const emp = employees.find((x) => x.id === form.employee_id) || {};
    const overall = form.overall_rating || Math.round(((Number(form.goals_rating) + Number(form.competencies_rating) + Number(form.values_rating)) / 3) * 100) / 100;
    // نصوص التقييم الحسّاسة → تُخزّن في الخزنة السعودية، Base44 يحتفظ بالتقييمات الرقمية والبيانات الوصفية
    const vaultData = {
      goals: form.goals, personal_goals: form.personal_goals, behaviors: form.behaviors,
      tasks_coverage: form.tasks_coverage, tasks_amendments: form.tasks_amendments,
      strengths: form.strengths, improvements: form.improvements, notes: form.notes,
      goals_rating: Number(form.goals_rating), competencies_rating: Number(form.competencies_rating),
      values_rating: Number(form.values_rating), overall_rating: overall,
      // مرفقات التقييم (خطابات/شهادات/أدلة) تُخزَّن في الخزنة داخل نفس سجل التقييم
      documents: form.documents || [],
    };
    const perfRef = editing?.perf_ref
      ? await writeRecordToVault(VAULT_MODULES.performance, editing.perf_ref, vaultData)
      : await writeRecordToVault(VAULT_MODULES.performance, null, vaultData);
    // المرفقات تُخزَّن في الخزنة فقط — تُستبعد من حمولة Base44 حتى لا تخرج من داخل المملكة
    const { documents: _docs, ...restForm } = form; // eslint-disable-line no-unused-vars
    const payload = {
      ...restForm, period_year: Number(form.period_year), goals_rating: Number(form.goals_rating), competencies_rating: Number(form.competencies_rating), values_rating: Number(form.values_rating), overall_rating: overall,
      employee_name: emp.employee_number ? `${emp.employee_number} - ${emp.position}` : emp.position,
      department: emp.department || "", current_grade: emp.job_grade || "",
      reviewer_id: user?.id || "", reviewer_name: user?.full_name || t.reviewerDefault,
      perf_ref: perfRef || editing?.perf_ref || "",
      goals: perfRef ? "" : form.goals,
      personal_goals: perfRef ? "" : form.personal_goals,
      behaviors: perfRef ? "" : form.behaviors,
      tasks_coverage: perfRef ? "" : form.tasks_coverage,
      tasks_amendments: perfRef ? "" : form.tasks_amendments,
      strengths: perfRef ? "" : form.strengths,
      improvements: perfRef ? "" : form.improvements,
      notes: perfRef ? "" : form.notes,
    };
    try {
      if (editing?.id) await base44.entities.Performance.update(editing.id, payload);
      else await base44.entities.Performance.create(payload);
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? t.edit : t.add}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.emp}>
              <MobileSelect value={form.employee_id} onValueChange={(v) => set("employee_id", v)} placeholder={t.chooseEmp}>
                
                {employees.map((e) => <MobileSelectItem key={e.id} value={e.id}>{e.employee_number} - {e.position}</MobileSelectItem>)}
              </MobileSelect>
            </Field>
            <Field label={t.revType}>
              <MobileSelect value={form.review_type} onValueChange={(v) => set("review_type", v)}>
                
                <MobileSelectItem value="annual">{t.annualT}</MobileSelectItem><MobileSelectItem value="midyear">{t.midyearT}</MobileSelectItem><MobileSelectItem value="probation">{t.probationT}</MobileSelectItem><MobileSelectItem value="goal_setting">{t.goalT}</MobileSelectItem>
              </MobileSelect>
            </Field>
            <Field label={t.period}>
              <MobileSelect value={form.review_period} onValueChange={(v) => set("review_period", v)}>
                
                <MobileSelectItem value="annual">{t.annualP}</MobileSelectItem><MobileSelectItem value="midyear">{t.midyearP}</MobileSelectItem><MobileSelectItem value="probation">{t.probationP}</MobileSelectItem><MobileSelectItem value="Q1">{t.q1}</MobileSelectItem><MobileSelectItem value="Q2">{t.q2}</MobileSelectItem><MobileSelectItem value="Q3">{t.q3}</MobileSelectItem>
              </MobileSelect>
            </Field>
            <Field label={t.year}><Input type="number" value={form.period_year} onChange={(e) => set("period_year", e.target.value)} /></Field>
          </div>

          <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
            <div className="text-xs font-semibold text-violet-700">{t.goalSection}</div>
            <Field label={t.personalGoals}><Textarea value={form.personal_goals} onChange={(e) => set("personal_goals", e.target.value)} rows={2} /></Field>
            <Field label={t.behaviors}><Textarea value={form.behaviors} onChange={(e) => set("behaviors", e.target.value)} rows={2} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t.tasksCoverage}><Textarea value={form.tasks_coverage} onChange={(e) => set("tasks_coverage", e.target.value)} rows={2} /></Field>
              <Field label={t.tasksAmend}><Textarea value={form.tasks_amendments} onChange={(e) => set("tasks_amendments", e.target.value)} rows={2} /></Field>
            </div>
          </div>

          <Field label={t.goals}><Textarea value={form.goals} onChange={(e) => set("goals", e.target.value)} rows={3} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.strengths}><Textarea value={form.strengths} onChange={(e) => set("strengths", e.target.value)} rows={2} /></Field>
            <Field label={t.improvements}><Textarea value={form.improvements} onChange={(e) => set("improvements", e.target.value)} rows={2} /></Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <RatingField label={t.goalsR} value={form.goals_rating} onChange={(v) => set("goals_rating", v)} />
            <RatingField label={t.compR} value={form.competencies_rating} onChange={(v) => set("competencies_rating", v)} />
            <RatingField label={t.valuesR} value={form.values_rating} onChange={(v) => set("values_rating", v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t.rec}>
              <MobileSelect value={form.recommendation} onValueChange={(v) => set("recommendation", v)}>
                
                <MobileSelectItem value="none">{t.recNone}</MobileSelectItem><MobileSelectItem value="maintain">{t.recMaintain}</MobileSelectItem><MobileSelectItem value="promote">{t.recPromote}</MobileSelectItem><MobileSelectItem value="bonus">{t.recBonus}</MobileSelectItem><MobileSelectItem value="warn">{t.recWarn}</MobileSelectItem><MobileSelectItem value="terminate">{t.recTerminate}</MobileSelectItem>
              </MobileSelect>
            </Field>
            <Field label={t.targetGrade}><Input value={form.target_grade} onChange={(e) => set("target_grade", e.target.value)} placeholder={t.targetPh} /></Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t.revDate}><Input type="date" value={form.review_date} onChange={(e) => set("review_date", e.target.value)} /></Field>
            <Field label={t.nextRev}><Input type="date" value={form.next_review_date} onChange={(e) => set("next_review_date", e.target.value)} /></Field>
            <Field label={t.status}>
              <MobileSelect value={form.status} onValueChange={(v) => set("status", v)}>
                
                <MobileSelectItem value="draft">{t.sDraft}</MobileSelectItem><MobileSelectItem value="submitted">{t.sSubmitted}</MobileSelectItem><MobileSelectItem value="acknowledged">{t.sAcknowledged}</MobileSelectItem><MobileSelectItem value="completed">{t.sCompleted}</MobileSelectItem>
              </MobileSelect>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.promotion_ready} onCheckedChange={(v) => set("promotion_ready", v)} />
            {t.ready}
          </label>

          <Field label={t.attach}>
            <VaultAttachments
              value={form.documents}
              onChange={(v) => set("documents", v)}
              isAr={isAr}
              empRef={employees.find((e) => e.id === form.employee_id)?.emp_ref || null}
              docType="performance_attachment"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button>
            <Button type="submit" disabled={saving || !form.employee_id}>{saving ? t.saving : t.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (<div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>);
}
function RatingField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label} ({value}/5)</Label>
      <Input type="number" min={0} max={5} step={0.5} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}