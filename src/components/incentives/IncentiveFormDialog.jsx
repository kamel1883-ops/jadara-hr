import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { translateTo7 } from "@/lib/translate7";

const TYPES = [
  { v: "bonus" }, { v: "cash_reward" }, { v: "allowance_grant" },
  { v: "gift" }, { v: "recognition" }, { v: "other" },
];

export default function IncentiveFormDialog({ open, onClose, onSaved, employees, departments }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "إصدار حافز/مكافأة", type: "نوع الحافز", titleL: "عنوان الحافز", body: "بيان الحافز",
    amount: "المبلغ (ريال)", target: "نطاق المنح", all: "جميع الموظفين", dept: "قسم محدد", emp: "موظف محدد",
    chooseDept: "اختر الإدارة", chooseEmp: "اختر الموظف", granted: "تاريخ المنح", payroll: "يُضمَّن مع الراتب القادم",
    translating: "جارٍ الترجمة إلى 7 لغات…", save: "منح الحافز وإرساله", cancel: "إلغاء",
    errTitle: "أدخل عنواناً وبياناً للحافز", errTarget: "حدّد نطاق المنح", errAmount: "أدخل مبلغاً صالحاً",
    types: { bonus: "مكافأة", cash_reward: "مكافأة نقدية", allowance_grant: "بدل مخصص", gift: "هدية", recognition: "تقدير", other: "حافز" },
  } : {
    title: "Issue incentive/reward", type: "Incentive type", titleL: "Incentive title", body: "Incentive statement",
    amount: "Amount (SAR)", target: "Grant scope", all: "All employees", dept: "Specific department", emp: "Specific employee",
    chooseDept: "Select department", chooseEmp: "Select employee", granted: "Grant date", payroll: "Include in next payroll",
    translating: "Translating into 7 languages…", save: "Grant & send incentive", cancel: "Cancel",
    errTitle: "Enter a title and statement", errTarget: "Select the grant scope", errAmount: "Enter a valid amount",
    types: { bonus: "Bonus", cash_reward: "Cash reward", allowance_grant: "Allowance grant", gift: "Gift", recognition: "Recognition", other: "Incentive" },
  };

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ incentive_type: "bonus", title: "", body: "", amount: "0", target: "employee", department: "", employee_id: "", granted_date: today, payroll_included: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (open) { setErr(""); } }, [open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) { setErr(t.errTitle); return; }
    if (form.target === "department" && !form.department) { setErr(t.errTarget); return; }
    if (form.target === "employee" && !form.employee_id) { setErr(t.errTarget); return; }
    const amt = Number(form.amount) || 0;
    if (amt <= 0) { setErr(t.errAmount); return; }
    setBusy(true); setErr("");
    try {
      const tr = await translateTo7(form.title, form.body);
      const emp = employees.find((e) => e.id === form.employee_id) || null;
      const number = `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      const payload = {
        incentive_number: number,
        incentive_type: form.incentive_type,
        title: form.title.trim(),
        body: form.body.trim(),
        i18n: JSON.stringify(tr),
        amount: amt,
        target: form.target,
        department: form.target === "department" ? form.department : "",
        employee_id: form.target === "employee" ? form.employee_id : "",
        employee_name: emp?.full_name || "",
        employee_user_id: emp?.user_id || "",
        granted_date: form.granted_date || today,
        status: "granted",
        payroll_included: !!form.payroll_included,
      };
      const me = await base44.auth.me().catch(() => null);
      if (me?.full_name) payload.created_by_name = me.full_name;
      const created = await base44.entities.Incentive.create(payload);
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
              <div className="mt-1">
                <MobileSelect value={form.incentive_type} onValueChange={(v) => set("incentive_type", v)}>
                  {TYPES.map((x) => <MobileSelectItem key={x.v} value={x.v}>{t.types[x.v]}</MobileSelectItem>)}
                </MobileSelect>
              </div>
            </div>
            <div>
              <Label className="text-xs">{t.target}</Label>
              <div className="mt-1">
                <MobileSelect value={form.target} onValueChange={(v) => set("target", v)}>
                  <MobileSelectItem value="all">{t.all}</MobileSelectItem>
                  <MobileSelectItem value="department">{t.dept}</MobileSelectItem>
                  <MobileSelectItem value="employee">{t.emp}</MobileSelectItem>
                </MobileSelect>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">{t.titleL}</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{t.body}</Label>
            <Textarea className="mt-1 min-h-[110px]" value={form.body} onChange={(e) => set("body", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t.amount}</Label>
              <Input type="number" dir="ltr" className="mt-1" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t.granted}</Label>
              <Input type="date" dir="ltr" className="mt-1" value={form.granted_date} onChange={(e) => set("granted_date", e.target.value)} />
            </div>
          </div>
          {form.target === "department" && (
            <div>
              <Label className="text-xs">{t.chooseDept}</Label>
              <div className="mt-1">
                <MobileSelect value={form.department} onValueChange={(v) => set("department", v)} placeholder={t.chooseDept}>
                  {departments.map((d) => <MobileSelectItem key={d} value={d}>{d}</MobileSelectItem>)}
                </MobileSelect>
              </div>
            </div>
          )}
          {form.target === "employee" && (
            <div>
              <Label className="text-xs">{t.chooseEmp}</Label>
              <div className="mt-1">
                <MobileSelect value={form.employee_id} onValueChange={(v) => set("employee_id", v)} placeholder={t.chooseEmp}>
                  {employees.map((e) => <MobileSelectItem key={e.id} value={e.id}>{e.full_name} · {e.department || ""}</MobileSelectItem>)}
                </MobileSelect>
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!form.payroll_included} onChange={(e) => set("payroll_included", e.target.checked)} className="w-4 h-4" />
            {t.payroll}
          </label>
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