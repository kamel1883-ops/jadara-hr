import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePortalI18n, usePortalT } from "@/lib/portalI18n";
import { formatCurrency } from "@/lib/hr";

const empty = { amount: "", reason: "", installment_count: 1 };

export default function LoanRequestForm({ open, onClose, onSaved, employee, portalCreate }) {
  usePortalI18n();
  const t = usePortalT("loanForm");

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(empty); }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const amount = Number(form.amount) || 0;
  const installments = Math.max(1, Number(form.installment_count) || 1);
  const monthly = installments ? Math.round((amount / installments) * 100) / 100 : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (amount <= 0) return;
    setSaving(true);
    try {
      const payload = {
        employee_id: employee.id, employee_user_id: employee.user_id || "",
        employee_name: employee.full_name || "",
        amount, reason: form.reason, installment_count: installments, monthly_installment: monthly,
        requested_amount: amount, requested_installments: installments,
        request_date: new Date().toISOString().slice(0, 10),
        status: "pending_manager", manager_status: "pending", hr_status: "pending", finance_status: "pending",
      };
      if (portalCreate) await portalCreate(payload);
      else {
        await base44.entities.LoanRequest.create(payload);
        // تنبيه المدير المباشر ببريد بوجود طلب سلفة ينتظر موافقته
        try { await base44.functions.invoke("notifyApprover", { type: "loan", employeeId: employee.id, employeeName: employee.full_name, employeeNationalId: employee.national_id || "", employeeNumber: employee.employee_number || "", position: employee.position || "", details: `سلفة بمبلغ ${amount} على ${installments} قسط`, status: "pending_manager" }); } catch {}
      }
      onSaved?.(); onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t.title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {t.emp}: <b className="text-foreground">{employee?.full_name}</b>{employee?.national_id ? <><br /><span className="text-xs tabular-nums" dir="ltr">{employee.national_id}</span></> : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.amountL}</Label>
            <Input type="number" min={0} value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.installmentL}</Label>
            <Input type="number" min={1} value={form.installment_count} onChange={(e) => set("installment_count", e.target.value)} />
          </div>
          {amount > 0 && (
            <div className="text-xs text-muted-foreground bg-slate-50 rounded-lg p-3">{t.note(monthly, installments)}</div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.reason}</Label>
            <Textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t.cancel}</Button>
            <Button type="submit" disabled={saving || amount <= 0}>
              {saving && <Loader2 size={16} className="animate-spin ml-2" />} {t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}