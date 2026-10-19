import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

// حذف نهائي للمنشأة الملغاة — من بوابة المالك فقط، وبعد الإلغاء فقط.
// الهدف: تحرير الرقم الموحّد والبريد والجوال ليتمكن العميل من الاشتراك مجدداً بنفس البيانات،
// فيُسجَّل له سجل جديد بتاريخ تسجيل جديد ويبدأ التخزين عليه من تاريخ الاشتراك الجديد.
// مشروط بألا تكون للمنشأة بيانات مخزّنة في جداره (لا موظفون ولا اشتراكات مدفوعة).
export default function DeleteTenantDialog({ open, onClose, tenant, isAr, session, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!open || !tenant) return null;

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const res = await base44.functions.invoke("portalData", {
        token: session.token, employee_id: session.employee_id,
        action: "owner_delete_tenant", tenant_id: tenant.id,
      });
      const d = res?.data || res;
      if (!d?.ok) throw new Error(d?.error || "fail");
      if (onDeleted) await onDeleted();
      onClose();
    } catch (e) {
      const m = String(e?.message || e);
      setErr(
        m.includes("has_data")
          ? (isAr
            ? "لا يمكن الحذف النهائي: لهذه المنشأة بيانات مخزّنة في جداره (موظفون أو اشتراكات مدفوعة). البيانات المحفوظة لا تُحذف."
            : "Cannot delete: this client has stored data in Jadara (employees or paid subscriptions). Stored data is never deleted.")
          : m.includes("not_cancelled")
            ? (isAr
              ? "الحذف النهائي متاح للمنشآت الملغاة فقط — ألغِ الحساب أولاً ثم اختر استرجاع أو حذف نهائي."
              : "Permanent delete is available for cancelled clients only — cancel the account first.")
            : m
      );
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !busy ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <Trash2 size={18} /> {isAr ? "حذف نهائي — " : "Permanent delete — "}{tenant.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 text-sm">
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2 text-xs leading-relaxed text-rose-900">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? "يُحذف سجل المنشأة نهائياً من بوابة المالك مع بياناتها وعروض أسعارها، ويتحرّر رقمها الموحّد وبريدها وجوالها — فيتمكن العميل من الاشتراك مجدداً بنفس البيانات، ويُسجَّل له سجل جديد بتاريخ تسجيل جديد يبدأ التخزين عليه من تاريخ الاشتراك الجديد."
                  : "The client record is permanently removed with its data and quotes, and its unified number, email and phone are freed — the client can subscribe again with the same details and gets a fresh record dated from the new subscription."}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? "لا يمكن التراجع عن هذا الإجراء. وإذا كانت للمنشأة بيانات مخزّنة في جداره (موظفون أو اشتراكات مدفوعة) فلا يُنفَّذ الحذف."
                  : "This action cannot be undone. If the client has stored data in Jadara (employees or paid subscriptions), deletion is not performed."}
              </span>
            </div>
          </div>
          {err && (
            <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {err}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => (busy ? null : onClose())} disabled={busy}>{isAr ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={submit} disabled={busy} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            {isAr ? "تأكيد الحذف النهائي" : "Confirm permanent delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}