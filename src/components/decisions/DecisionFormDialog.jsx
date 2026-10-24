import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { translateTo7 } from "@/lib/translate7";

const TYPES = [
  { v: "appointment" }, { v: "transfer" }, { v: "promotion" }, { v: "assignment" },
  { v: "secondment" }, { v: "exemption" }, { v: "reward" }, { v: "deduction" },
  { v: "warning" }, { v: "termination" }, { v: "policy" }, { v: "circular" }, { v: "other" },
];

export default function DecisionFormDialog({ open, onClose, onSaved, employees, departments }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "إصدار قرار إداري", type: "نوع القرار", titleL: "عنوان القرار", body: "نص القرار",
    target: "نطاق الإرسال", all: "جميع الموظفين", dept: "قسم محدد", managers: "مدراء الأقسام فقط", emp: "موظف محدد",
    chooseDept: "اختر الإدارة", chooseEmp: "اختر الموظف", issued: "تاريخ الإصدار", effective: "تاريخ النفاذ",
    translating: "جارٍ الترجمة إلى 7 لغات…", save: "إصدار القرار وإرساله", cancel: "إلغاء",
    errTitle: "أدخل عنواناً ونصاً للقرار", errTarget: "حدّد نطاق الإرسال",
    types: { appointment: "تعيين", transfer: "نقل", promotion: "ترقية", assignment: "تكليف", secondment: "إعارة", exemption: "إعفاء", reward: "مكافأة", deduction: "خصم", warning: "إنذار", termination: "إنهاء", policy: "سياسة", circular: "تعميم", other: "قرار" },
  } : {
    title: "Issue administrative decision", typeL: "Decision type", type: "Decision type", titleL: "Decision title", body: "Decision body",
    target: "Send scope", all: "All employees", dept: "Specific department", managers: "Department managers only", emp: "Specific employee",
    chooseDept: "Select department", chooseEmp: "Select employee", issued: "Issue date", effective: "Effective date",
    translating: "Translating into 7 languages…", save: "Issue & send decision", cancel: "Cancel",
    errTitle: "Enter a title and body", errTarget: "Select the send scope",
    types: { appointment: "Appointment", transfer: "Transfer", promotion: "Promotion", assignment: "Assignment", secondment: "Secondment", exemption: "Exemption", reward: "Reward", deduction: "Deduction", warning: "Warning", termination: "Termination", policy: "Policy", circular: "Circular", other: "Decision" },
  };

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ decision_type: "other", title: "", body: "", target: "all", department: "", employee_id: "", issued_date: today, effective_date: today });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (open) { setErr(""); setForm((f) => ({ ...f, issued_date: today, effective_date: today })); } }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) { setErr(t.errTitle); return; }
    if (form.target === "department" && !form.department) { setErr(t.errTarget); return; }
    if (form.target === "employee" && !form.employee_id) { setErr(t.errTarget); return; }
    setBusy(true); setErr("");
    try {
      const tr = await translateTo7(form.title, form.body);
      const emp = employees.find((e) => e.id === form.employee_id) || null;
      // تسلسل رقمي يبدأ من 1 — يبحث عن أعلى رقم متسلسل موجود ويزيد عليه
      const existing = await base44.entities.AdminDecision.list("-issued_date", 5000);
      let maxSeq = 0;
      (existing || []).forEach((d) => {
        const m = String(d.decision_number || "").match(/^DEC-(\d+)$/);
        if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
      });
      const number = `DEC-${maxSeq + 1}`;
      const payload = {
        decision_number: number,
        decision_type: form.decision_type,
        title: form.title.trim(),
        body: form.body.trim(),
        i18n: JSON.stringify(tr),
        target: form.target,
        department: form.target === "department" ? form.department : "",
        employee_id: form.target === "employee" ? form.employee_id : "",
        employee_name: emp?.full_name || "",
        employee_user_id: emp?.user_id || "",
        issued_date: form.issued_date || today,
        effective_date: form.effective_date || form.issued_date || today,
        status: "issued",
      };
      const me = await base44.auth.me().catch(() => null);
      if (me?.full_name) payload.created_by_name = me.full_name;
      const created = await base44.entities.AdminDecision.create(payload);
      if (onSaved) onSaved(created);
      onClose();
    } catch (e) {
      setErr(e?.message || "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t.title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t.type}</Label>
              <Select value={form.decision_type} onValueChange={(v) => set("decision_type", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((x) => <SelectItem key={x.v} value={x.v}>{t.types[x.v]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t.target}</Label>
              <Select value={form.target} onValueChange={(v) => set("target", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="department">{t.dept}</SelectItem>
                  <SelectItem value="managers">{t.managers}</SelectItem>
                  <SelectItem value="employee">{t.emp}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">{t.titleL}</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{t.body}</Label>
            <Textarea className="mt-1 min-h-[140px]" value={form.body} onChange={(e) => set("body", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t.issued}</Label>
              <Input type="date" dir="ltr" className="mt-1" value={form.issued_date} onChange={(e) => set("issued_date", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t.effective}</Label>
              <Input type="date" dir="ltr" className="mt-1" value={form.effective_date} onChange={(e) => set("effective_date", e.target.value)} />
            </div>
          </div>
          {form.target === "department" && (
            <div>
              <Label className="text-xs">{t.chooseDept}</Label>
              <Select value={form.department} onValueChange={(v) => set("department", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t.chooseDept} /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {form.target === "employee" && (
            <div>
              <Label className="text-xs">{t.chooseEmp}</Label>
              <Select value={form.employee_id} onValueChange={(v) => set("employee_id", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t.chooseEmp} /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} · {e.department || ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {busy && <div className="flex items-center gap-2 text-xs text-violet-600"><Loader2 className="animate-spin" size={14} /> {t.translating}</div>}
          {err && <div className="text-xs text-rose-600">{err}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>{t.cancel}</Button>
          <Button onClick={submit} disabled={busy} className="gap-2">{busy ? <Loader2 className="animate-spin" size={15} /> : null}{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}