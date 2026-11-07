import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2, Clock, XCircle, ShieldAlert } from "lucide-react";

// بوابة الموظف — طلب حذف المنشأة بالكامل.
// الطلب لا يحذف شيئاً: يُعتمد من بوابة المالك، وهناك يُنفّذ الحذف النهائي
// (سجل المنشأة + كل الموظفين + مستنداتهم وكل ما يخصهم).
export default function PortalCompanyDeletion({ session, isAr }) {
  const t = isAr ? {
    title: "حذف المنشأة بالكامل",
    note: "يُرسل طلبك إلى بوابة المالك للمراجعة والاعتماد. لا يُحذف أي شيء قبل موافقته.",
    noCompany: "لا يوجد سجل منشأة مرتبط بملفك الوظيفي بعد.",
    pendingTitle: "طلب حذف المنشأة قيد اعتماد المالك",
    pendingBody: (d) => `سُجّل الطلب بتاريخ ${d}. لم يُحذف أي شيء بعد: تبقى المنشأة وكل الموظفين والمستندات كما هي حتى يعتمد المالك الطلب من بوابته.`,
    rejectedTitle: "تم رفض طلب الحذف",
    rejectedBody: "أبقى المالك المنشأة وبياناتها. يمكنك تقديم طلب جديد إن لزم.",
    ownerNote: "ملاحظة المالك",
    btn: "حذف المنشأة بالكامل",
    dialogTitle: "تأكيد طلب حذف المنشأة بالكامل",
    warn1: "الطلب يُرسل إلى بوابة المالك، ولا يُحذف أي شيء قبل اعتماده.",
    warn2: "بعد اعتماد المالك يُحذف نهائياً: سجل المنشأة، وكل الموظفين وملفاتهم، وكل المستندات والبيانات المرتبطة بهم (الحضور، الإجازات، السلف، الرواتب، التراخيص، المستندات) بما فيها البيانات المخزّنة في الخزنة السعودية.",
    warn3: "الإجراء نهائي ولا يمكن التراجع عنه، ويفقد كل حسابات المنشأة الوصول إلى النظام.",
    reasonL: "سبب طلب الحذف (اختياري)",
    confirmL: (n) => `للتأكيد اكتب اسم المنشأة كما هو: ${n}`,
    confirmPh: "اسم المنشأة",
    cancel: "إلغاء",
    send: "إرسال الطلب للمالك",
    sending: "جارٍ الإرسال…",
    done: "تم إرسال طلب الحذف إلى بوابة المالك للاعتماد.",
    fail: "تعذّر إرسال الطلب — حاول مرة أخرى.",
    blocked: "طلب حذف المنشأة غير متاح لحساب مالك المنصة.",
  } : {
    title: "Delete the company entirely",
    note: "Your request goes to the owner portal for review and approval. Nothing is deleted before the owner approves it.",
    noCompany: "No company record is linked to your employee file yet.",
    pendingTitle: "Deletion request awaiting owner approval",
    pendingBody: (d) => `Recorded on ${d}. Nothing has been deleted: the company, every employee and all documents stay intact until the owner approves it in the owner portal.`,
    rejectedTitle: "Deletion request rejected",
    rejectedBody: "The owner kept the company and its data. You may submit a new request if needed.",
    ownerNote: "Owner note",
    btn: "Delete the company entirely",
    dialogTitle: "Confirm full company deletion request",
    warn1: "The request goes to the owner portal; nothing is deleted before approval.",
    warn2: "Once approved, permanently deleted: the company record, every employee and file, and all related documents and data (attendance, leaves, loans, payroll, licenses, documents) including data kept in the Saudi vault.",
    warn3: "This is final and cannot be undone, and every account of the company loses access.",
    reasonL: "Reason for deletion (optional)",
    confirmL: (n) => `To confirm, type the company name exactly: ${n}`,
    confirmPh: "Company name",
    cancel: "Cancel",
    send: "Send request to the owner",
    sending: "Sending…",
    done: "The deletion request was sent to the owner portal for approval.",
    fail: "Could not send the request — please try again.",
    blocked: "Company deletion requests are not available for the platform owner account.",
  };

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [request, setRequest] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = async () => {
    if (!session) return;
    try {
      const res = await base44.functions.invoke("tenantDeletion", {
        token: session.token, employee_id: session.employee_id, action: "portal_status",
      });
      const d = res?.data || res;
      setTenant(d?.tenant || null);
      setRequest(d?.request || null);
      setBlocked(!!d?.blocked);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [session?.token]);

  const companyName = String(tenant?.name || "").trim();
  const canConfirm = !!companyName && confirmText.trim() === companyName;

  const submit = async () => {
    if (!canConfirm) return;
    setBusy(true); setMsg({ type: "", text: "" });
    try {
      const res = await base44.functions.invoke("tenantDeletion", {
        token: session.token, employee_id: session.employee_id, action: "portal_request", reason: reason.trim(),
      });
      const d = res?.data || res;
      if (!d?.ok) throw new Error(d?.error || "fail");
      setRequest(d.request || null);
      setOpen(false); setReason(""); setConfirmText("");
      setMsg({ type: "ok", text: t.done });
    } catch {
      setMsg({ type: "err", text: t.fail });
    } finally { setBusy(false); }
  };

  if (loading) return null;

  const pending = request?.status === "pending";
  const rejected = request?.status === "rejected";

  return (
    <div className="mt-6 bg-white rounded-2xl border border-rose-100 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><Trash2 size={18} /></span>
        <h3 className="font-semibold text-foreground">{t.title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.note}</p>

      {msg.text && (
        <div className={`text-sm rounded-lg p-3 leading-relaxed ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>{msg.text}</div>
      )}

      {!companyName ? (
        <div className="rounded-xl border border-input bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <ShieldAlert size={14} className="shrink-0 mt-0.5" /> {t.noCompany}
        </div>
      ) : pending ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm"><Clock size={16} /> {t.pendingTitle}</div>
          <p className="text-xs text-amber-900/80 leading-relaxed">{t.pendingBody(request.requested_date || "—")}</p>
        </div>
      ) : (
        <>
          {rejected && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm"><XCircle size={16} /> {t.rejectedTitle}</div>
              <p className="text-xs text-rose-900/80 leading-relaxed">{t.rejectedBody}</p>
              {request.review_note ? <p className="text-xs text-rose-900/80"><b>{t.ownerNote}:</b> {request.review_note}</p> : null}
            </div>
          )}
          {blocked ? (
            <div className="rounded-xl border border-input bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" /> {t.blocked}
            </div>
          ) : (
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => { setMsg({ type: "", text: "" }); setConfirmText(""); setReason(""); setOpen(true); }}
                className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                <Trash2 size={16} /> {t.btn}
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={(o) => (!o && !busy ? setOpen(false) : null)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700"><AlertTriangle size={18} /> {t.dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2 text-xs leading-relaxed text-rose-900">
              {[t.warn1, t.warn2, t.warn3].map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.reasonL}</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} disabled={busy} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.confirmL(companyName)}</Label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={t.confirmPh} disabled={busy} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>{t.cancel}</Button>
            <Button type="button" onClick={submit} disabled={busy || !canConfirm} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              {busy ? t.sending : t.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}