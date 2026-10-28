import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { base44 } from "@/api/base44Client";
import { todayISO } from "@/lib/hr";
import { useI18n } from "@/lib/i18n";
import { writeRecordToVault, VAULT_MODULES } from "@/lib/vaultGeneric";

const empty = {
  position_title: "", department: "", current_holder_id: "", current_holder_name: "",
  position_status: "active", successor_id: "", successor_name: "",
  readiness_level: "development_needed", development_plan: "", development_deadline: "",
  risk_of_loss: "medium", impact_of_loss: "medium", last_updated: todayISO(), notes: "",
};

export default function SuccessionForm({ open, employees, editing, onClose, onSaved }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    edit: "تعديل خطة تعاقب", add: "خطة تعاقب جديدة",
    title: "المسمى الوظيفي (المنصب الحرج)", dept: "الإدارة", holder: "الشاغل الحالي", chooseEmp: "اختر الموظف",
    posStatus: "حالة المركز", active: "مستقر", atRisk: "عرضة للمغادرة", leaving: "في طريقه للمغادرة", vacant: "شاغر",
    successor: "المرشح البديل", chooseSucc: "اختر المرشح",
    readiness: "مستوى الجاهزية", readyNow: "جاهز الآن", ready12: "جاهز خلال 1-2 سنة", ready35: "جاهز خلال 3-5 سنوات", devNeeded: "يحتاج تطوير",
    risk: "خطر المغادرة", impact: "أثر المغادرة", low: "منخفض", med: "متوسط", high: "مرتفع",
    devPlan: "خطة التطوير للمرشح البديل", deadline: "موعد إنجاز التطوير", notes: "ملاحظات",
    cancel: "إلغاء", save: "حفظ الخطة", saving: "جارٍ الحفظ...",
  } : {
    edit: "Edit succession plan", add: "New succession plan",
    title: "Job title (critical role)", dept: "Department", holder: "Current holder", chooseEmp: "Select employee",
    posStatus: "Position status", active: "Stable", atRisk: "At risk", leaving: "Leaving", vacant: "Vacant",
    successor: "Successor", chooseSucc: "Select successor",
    readiness: "Readiness level", readyNow: "Ready now", ready12: "Ready in 1-2 years", ready35: "Ready in 3-5 years", devNeeded: "Development needed",
    risk: "Risk of loss", impact: "Impact of loss", low: "Low", med: "Medium", high: "High",
    devPlan: "Successor development plan", deadline: "Development deadline", notes: "Notes",
    cancel: "Cancel", save: "Save plan", saving: "Saving...",
  };

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (editing) setForm({ ...empty, ...editing }); else setForm({ ...empty }); }, [editing, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const empName = (id) => { const e = employees.find((x) => x.id === id); return e ? `${e.employee_number} - ${e.position}` : ""; };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    // خطة التطوير + الملاحظات حسّاسة → تُخزّن في الخزنة السعودية
    const vaultData = { development_plan: form.development_plan, notes: form.notes };
    const successionRef = editing?.succession_ref
      ? await writeRecordToVault(VAULT_MODULES.succession, editing.succession_ref, vaultData)
      : await writeRecordToVault(VAULT_MODULES.succession, null, vaultData);
    const payload = {
      ...form,
      succession_ref: successionRef || editing?.succession_ref || "",
      development_plan: successionRef ? "" : form.development_plan,
      notes: successionRef ? "" : form.notes,
      current_holder_name: empName(form.current_holder_id) || form.current_holder_name,
      successor_name: empName(form.successor_id) || form.successor_name,
      last_updated: todayISO(),
    };
    try {
      if (editing?.id) await base44.entities.SuccessionPlan.update(editing.id, payload);
      else await base44.entities.SuccessionPlan.create(payload);
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? t.edit : t.add}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.title}><Input value={form.position_title} onChange={(e) => set("position_title", e.target.value)} required /></Field>
            <Field label={t.dept}><Input value={form.department} onChange={(e) => set("department", e.target.value)} /></Field>
            <Field label={t.holder}>
              <MobileSelect value={form.current_holder_id} onValueChange={(v) => set("current_holder_id", v)} placeholder={t.chooseEmp}>
                {employees.map((e) => <MobileSelectItem key={e.id} value={e.id}>{e.employee_number} - {e.position}</MobileSelectItem>)}
              </MobileSelect>
            </Field>
            <Field label={t.posStatus}>
              <MobileSelect value={form.position_status} onValueChange={(v) => set("position_status", v)}>
                <MobileSelectItem value="active">{t.active}</MobileSelectItem><MobileSelectItem value="at_risk">{t.atRisk}</MobileSelectItem><MobileSelectItem value="leaving">{t.leaving}</MobileSelectItem><MobileSelectItem value="vacant">{t.vacant}</MobileSelectItem>
              </MobileSelect>
            </Field>
            <Field label={t.successor}>
              <MobileSelect value={form.successor_id} onValueChange={(v) => set("successor_id", v)} placeholder={t.chooseSucc}>
                {employees.map((e) => <MobileSelectItem key={e.id} value={e.id}>{e.employee_number} - {e.position}</MobileSelectItem>)}
              </MobileSelect>
            </Field>
            <Field label={t.readiness}>
              <MobileSelect value={form.readiness_level} onValueChange={(v) => set("readiness_level", v)}>
                <MobileSelectItem value="ready_now">{t.readyNow}</MobileSelectItem><MobileSelectItem value="ready_1_2_years">{t.ready12}</MobileSelectItem><MobileSelectItem value="ready_3_5_years">{t.ready35}</MobileSelectItem><MobileSelectItem value="development_needed">{t.devNeeded}</MobileSelectItem>
              </MobileSelect>
            </Field>
            <Field label={t.risk}>
              <MobileSelect value={form.risk_of_loss} onValueChange={(v) => set("risk_of_loss", v)}>
                <MobileSelectItem value="low">{t.low}</MobileSelectItem><MobileSelectItem value="medium">{t.med}</MobileSelectItem><MobileSelectItem value="high">{t.high}</MobileSelectItem>
              </MobileSelect>
            </Field>
            <Field label={t.impact}>
              <MobileSelect value={form.impact_of_loss} onValueChange={(v) => set("impact_of_loss", v)}>
                <MobileSelectItem value="low">{t.low}</MobileSelectItem><MobileSelectItem value="medium">{t.med}</MobileSelectItem><MobileSelectItem value="high">{t.high}</MobileSelectItem>
              </MobileSelect>
            </Field>
          </div>
          <Field label={t.devPlan}><Textarea value={form.development_plan} onChange={(e) => set("development_plan", e.target.value)} rows={3} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.deadline}><Input type="date" value={form.development_deadline} onChange={(e) => set("development_deadline", e.target.value)} /></Field>
            <Field label={t.notes}><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button>
            <Button type="submit" disabled={saving || !form.position_title}>{saving ? t.saving : t.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (<div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>);
}