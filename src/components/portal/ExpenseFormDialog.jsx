import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Loader2 } from "lucide-react";
import { EXPENSE_CATEGORIES, RECURRENCES } from "@/lib/finance";
import { formatCurrency } from "@/lib/hr";
import { writeRecordToVault, readRecordFromVault, VAULT_MODULES } from "@/lib/vaultGeneric";

const empty = {
  name: "", category: "other", amount: "", recurrence: "monthly",
  expense_date: new Date().toISOString().slice(0, 10), end_date: "", vendor: "",
  partner_name: "", commission_percent: "", base_amount: "", revenue_ref: "",
  is_fixed: false, renewal_date: "",
  status: "active", notes: "",
};

// نموذج إدخال/تعديل مصروف — يشمل حالة العمولة (نسبة % من مبلغ بيع) بحساب تلقائي للمبلغ
export default function ExpenseFormDialog({ open, onClose, onSave, expense, revenues = [], isAr }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (expense && expense.expense_ref) {
      // عند التحرير: جلب الملاحظات الحسّاسة من الخزنة (فارغة في Base44 للسجلات المحمية)
      readRecordFromVault(VAULT_MODULES.expenses, expense.expense_ref).then((v) => {
        setForm({ ...empty, ...expense, notes: v?.notes ?? expense.notes, vendor: v?.vendor ?? expense.vendor, partner_name: v?.partner_name ?? expense.partner_name });
      }).catch(() => setForm({ ...empty, ...expense }));
    } else {
      setForm(expense ? { ...empty, ...expense } : empty);
    }
  }, [expense, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isCommission = form.category === "commission" || form.category === "partner_share";
  const commissionAmount = Number(
    ((Number(form.base_amount) || 0) * (Number(form.commission_percent) || 0) / 100).toFixed(2)
  );

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // ملاحظات المصروف الحسّاسة (بيانات المزوّد/الشريك) → تُخزّن في الخزنة السعودية
      const vaultData = { notes: form.notes, vendor: form.vendor, partner_name: form.partner_name };
      const expenseRef = expense?.expense_ref
        ? await writeRecordToVault(VAULT_MODULES.expenses, expense.expense_ref, vaultData)
        : await writeRecordToVault(VAULT_MODULES.expenses, null, vaultData);
      await onSave({
        ...form,
        expense_ref: expenseRef || expense?.expense_ref || "",
        notes: expenseRef ? "" : form.notes,
        amount: isCommission ? commissionAmount : Number(form.amount) || 0,
        commission_percent: Number(form.commission_percent) || 0,
        base_amount: Number(form.base_amount) || 0,
        recurrence: isCommission ? "one_time" : form.recurrence,
        is_fixed: !isCommission && !!form.is_fixed,
        renewal_date: !isCommission && form.is_fixed ? (form.renewal_date || form.expense_date) : "",
        end_date: form.is_fixed ? "" : form.end_date,
      });
      onClose?.();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? (isAr ? "تعديل مصروف" : "Edit expense") : (isAr ? "إضافة مصروف" : "Add expense")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{isAr ? "اسم المصروف" : "Expense name"}</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required
              placeholder={isAr ? "مثال: اشتراك IONOS VPS" : "e.g. IONOS VPS"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "نوع المصروف" : "Category"}</Label>
              <MobileSelect value={form.category} onValueChange={(v) => set("category", v)}>
                {EXPENSE_CATEGORIES.map((c) => <MobileSelectItem key={c.key} value={c.key}>{isAr ? c.ar : c.en}</MobileSelectItem>)}
              </MobileSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "التكرار" : "Recurrence"}</Label>
              <MobileSelect value={isCommission ? "one_time" : form.recurrence} onValueChange={(v) => set("recurrence", v)} disabled={isCommission}>
                {RECURRENCES.map((r) => <MobileSelectItem key={r.key} value={r.key}>{isAr ? r.ar : r.en}</MobileSelectItem>)}
              </MobileSelect>
            </div>
          </div>

          {isCommission ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-3">
              <p className="text-[11px] text-amber-900">
                {isAr
                  ? "إدخال يدوي لمرة واحدة — سجّل النسبة ومبلغ البيع وتاريخ المعاملة."
                  : "One-time manual entry — record the share, sale amount and transaction date."}
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "اسم المستفيد / المسوّق" : "Beneficiary / partner"}</Label>
                <Input value={form.partner_name} onChange={(e) => set("partner_name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "الإيراد / العميل المرتبط" : "Related revenue / client"}</Label>
                <MobileSelect value={form.revenue_ref || "manual"} placeholder={isAr ? "اختر إيراداً" : "Pick a revenue"} onValueChange={(v) => {
                  if (v === "manual") { set("revenue_ref", ""); return; }
                  const r = revenues.find((x) => x.id === v);
                  set("revenue_ref", r?.tenant_name || "");
                  set("base_amount", Number(r?.amount) || 0);
                }}>
                  <MobileSelectItem value="manual">{isAr ? "إدخال يدوي" : "Manual entry"}</MobileSelectItem>
                  {revenues.map((r) => (
                    <MobileSelectItem key={r.id} value={r.id}>{r.tenant_name} — {formatCurrency(r.amount)}</MobileSelectItem>
                  ))}
                </MobileSelect>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? "مبلغ البيع" : "Sale amount"}</Label>
                  <Input type="number" value={form.base_amount} onChange={(e) => set("base_amount", e.target.value)} dir="ltr" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? "النسبة %" : "Share %"}</Label>
                  <Input type="number" step="0.1" value={form.commission_percent} onChange={(e) => set("commission_percent", e.target.value)} dir="ltr" placeholder="15" required />
                </div>
              </div>
              <div className="text-sm font-bold text-amber-800">
                {isAr ? "قيمة العمولة:" : "Commission:"} {formatCurrency(commissionAmount)}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "المبلغ (ريال)" : "Amount (SAR)"}</Label>
                <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} dir="ltr" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "الجهة / المزوّد" : "Vendor"}</Label>
                <Input value={form.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder={isAr ? "مثال: IONOS" : "e.g. IONOS"} />
              </div>
            </div>
          )}

          {!isCommission && (
            <div className="rounded-xl border border-[#0B2545]/15 bg-[#0B2545]/[0.04] p-3 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.is_fixed}
                  onChange={(e) => { set("is_fixed", e.target.checked); if (e.target.checked && form.recurrence === "one_time") set("recurrence", "yearly"); }}
                  className="mt-1 accent-[#0B2545]" />
                <span>
                  <span className="text-sm font-semibold">{isAr ? "مصروف ثابت (دومين / بريد / سيرفر)" : "Fixed cost (domain / email / server)"}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {isAr
                      ? "يتجدد تلقائياً في تاريخ التجديد بلا تاريخ توقف، ويُخصم في ذلك التاريخ سواء وُجد إيراد أو لا — وإن لم يوجد إيراد يظهر الصافي بالسالب."
                      : "Renews automatically on its renewal date with no stop date, and is charged then whether revenue exists or not — with no revenue the net shows negative."}
                  </span>
                </span>
              </label>
              {form.is_fixed && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? "تاريخ التجديد" : "Renewal date"}</Label>
                  <Input type="date" lang={isAr ? "ar" : "en"} value={form.renewal_date || form.expense_date}
                    onChange={(e) => set("renewal_date", e.target.value)} required />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{isCommission ? (isAr ? "تاريخ المعاملة" : "Transaction date") : (isAr ? "تاريخ المصروف / بداية التكرار" : "Date / recurrence start")}</Label>
              <Input type="date" lang={isAr ? "ar" : "en"} value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} required />
            </div>
            {!isCommission && !form.is_fixed && form.recurrence !== "one_time" && (
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "تاريخ التوقف (اختياري)" : "Stop date (optional)"}</Label>
                <Input type="date" lang={isAr ? "ar" : "en"} value={form.end_date || ""} onChange={(e) => set("end_date", e.target.value)} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "الحالة" : "Status"}</Label>
              <MobileSelect value={form.status} onValueChange={(v) => set("status", v)}>
                <MobileSelectItem value="active">{isAr ? "سارٍ" : "Active"}</MobileSelectItem>
                <MobileSelectItem value="stopped">{isAr ? "متوقف" : "Stopped"}</MobileSelectItem>
              </MobileSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "ملاحظات" : "Notes"}</Label>
              <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />} {isAr ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}