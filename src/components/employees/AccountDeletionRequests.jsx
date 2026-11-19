import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// طلبات حذف حسابات الموظفين — تصل من بوابة الموظف ولا تُنفّذ إلا بقرار المنشأة.
// الموافقة تُغلق حساب الموظف نهائياً؛ الرفض يُبقي الحساب يعمل (حالة الضغط بالخطأ).
export default function AccountDeletionRequests() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "طلبات حذف حسابات الموظفين",
    note: "لا يُغلق حساب أي موظف إلا بعد موافقتك. تأكد من انتهاء العلاقة التعاقدية قبل الموافقة — إن كان الطلب بالخطأ فاضغط رفض.",
    empty: "لا توجد طلبات حالياً.",
    loading: "جارٍ التحميل…",
    requestedOn: "تاريخ الطلب",
    approve: "الموافقة وحذف الحساب",
    reject: "رفض الطلب",
    approveTitle: "تأكيد حذف حساب الموظف",
    approveWarn: "سيُغلق حساب الموظف في بوابة الموظف نهائياً: تُلغى كلمة المرور ورموز الاستعادة وربط حساب التطبيق، ولن يستطيع تسجيل الدخول مرة أخرى. سجل التوظيف والرواتب يبقى لدى المنشأة التزاماً نظامياً.",
    rejectTitle: "رفض طلب حذف الحساب",
    rejectNote: "سبب الرفض (اختياري — يظهر للموظف)",
    cancel: "إلغاء",
    working: "جارٍ التنفيذ…",
    done: "تم إغلاق حساب الموظف وحُذف وصوله إلى البوابة.",
    rejectedOk: "تم رفض الطلب — حساب الموظف يعمل كما هو.",
    fail: "تعذّر تنفيذ العملية — حاول مرة أخرى.",
    onDuty: "الموظف على رأس العمل — تأكد أن العلاقة التعاقدية انتهت قبل الموافقة.",
    left: "العلاقة التعاقدية منتهية",
  } : {
    title: "Employee account deletion requests",
    note: "No employee account is closed without your approval. Confirm the employment relationship has ended before approving — reject if the request was a mistake.",
    empty: "No requests right now.",
    loading: "Loading…",
    requestedOn: "Requested on",
    approve: "Approve & delete account",
    reject: "Reject request",
    approveTitle: "Confirm employee account deletion",
    approveWarn: "The employee's portal account is closed permanently: password, recovery codes and app account link are removed, and they can no longer sign in. Employment and payroll records stay with the organisation as required by law.",
    rejectTitle: "Reject deletion request",
    rejectNote: "Reason (optional — shown to the employee)",
    cancel: "Cancel",
    working: "Working…",
    done: "The employee account is closed and portal access removed.",
    rejectedOk: "Request rejected — the employee account still works.",
    fail: "The operation failed — please try again.",
    onDuty: "This employee is still active — confirm the employment relationship has ended before approving.",
    left: "Employment relationship has ended",
  };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke("employeeAccountDeletion", { action: "list" });
      const d = res?.data || res;
      setRows((d?.requests || []).filter((r) => r.status === "pending"));
    } catch { /* تبقى البطاقة صامتة عند تعذر الجلب */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (action) => {
    const target = action === "approve" ? approving : rejecting;
    if (!target) return;
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const res = await base44.functions.invoke("employeeAccountDeletion", {
        action, request_id: target.id, note: note.trim(),
      });
      const d = res?.data || res;
      if (!d?.ok) throw new Error(d?.error || "fail");
      setMsg({ type: "ok", text: action === "approve" ? t.done : t.rejectedOk });
      setApproving(null); setRejecting(null); setNote("");
      await load();
    } catch {
      setMsg({ type: "err", text: t.fail });
    } finally { setBusy(false); }
  };

  if (loading) return null;
  if (rows.length === 0 && !msg.text) return null;

  return (
    <div className="mt-4 bg-white rounded-2xl border border-rose-100 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><Trash2 size={18} /></span>
          {t.title}
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">{rows.length}</span>
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 max-w-2xl">{t.note}</p>
      </div>

      {msg.text && (
        <div className={`text-sm rounded-lg p-3 leading-relaxed ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>{msg.text}</div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t.empty}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const active = r.employee?.status === "active";
            return (
              <div key={r.id} className="rounded-xl border border-border p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{r.employee_name || "—"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {isAr ? "الرقم الوظيفي" : "Employee no."}: {r.employee_number || "—"}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    <Clock size={11} /> {t.requestedOn}: {r.requested_at || "—"}
                  </span>
                </div>

                {r.employee ? (
                  <div className={`text-xs rounded-lg p-2.5 flex items-start gap-2 leading-relaxed ${active ? "bg-amber-50 text-amber-800 border border-amber-100" : "bg-emerald-50 text-emerald-800 border border-emerald-100"}`}>
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>{active ? t.onDuty : t.left}{r.employee.termination_date ? ` · ${r.employee.termination_date}` : ""}</span>
                  </div>
                ) : null}

                {r.note ? <div className="text-xs text-muted-foreground leading-relaxed"><b className="text-foreground">{isAr ? "ملاحظة الموظف" : "Employee note"}:</b> {r.note}</div> : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => { setNote(""); setMsg({ type: "", text: "" }); setApproving(r); }}
                    className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
                    <Trash2 size={14} /> {t.approve}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setNote(""); setMsg({ type: "", text: "" }); setRejecting(r); }} className="gap-1.5">
                    <XCircle size={14} /> {t.reject}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* الموافقة */}
      <Dialog open={!!approving} onOpenChange={(o) => (!o && !busy ? setApproving(null) : null)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700"><AlertTriangle size={18} /> {t.approveTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs leading-relaxed text-rose-900 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{t.approveWarn}</span>
            </div>
            <div className="text-sm font-semibold">{approving?.employee_name || "—"}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)} disabled={busy}>{t.cancel}</Button>
            <Button onClick={() => decide("approve")} disabled={busy} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {busy ? t.working : t.approve}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* الرفض */}
      <Dialog open={!!rejecting} onOpenChange={(o) => (!o && !busy ? setRejecting(null) : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.rejectTitle}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm font-semibold">{rejecting?.employee_name || "—"}</div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.rejectNote}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} disabled={busy} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={busy}>{t.cancel}</Button>
            <Button onClick={() => decide("reject")} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} {busy ? t.working : t.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}