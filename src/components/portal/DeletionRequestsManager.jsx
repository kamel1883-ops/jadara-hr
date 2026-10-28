import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2, Clock, CheckCircle2, XCircle, RefreshCw, Users } from "lucide-react";

// بوابة المالك — طلبات حذف حسابات المنشآت.
// لا يُحذف أي شيء قبل اعتماد المالك هنا؛ وبعد الاعتماد يُنفّذ حذف نهائي للمنشأة
// وكل الموظفين المرتبطين بها وكل بياناتهم.
export default function DeletionRequestsManager({ session, isAr }) {
  const t = isAr ? {
    title: "طلبات حذف حسابات المنشآت",
    note: "طلب الحذف لا يحذف شيئاً بحد ذاته. الاعتماد هنا ينفّذ حذفاً نهائياً للمنشأة وكل موظفيها وبياناتهم — ولا يمكن التراجع.",
    empty: "لا توجد طلبات حذف حالياً.",
    loading: "جارٍ التحميل…",
    pending: "بانتظار الاعتماد",
    approved: "معتمد — تم الحذف",
    rejected: "مرفوض",
    employees: "موظف",
    unified: "الرقم الموحد",
    requester: "مقدم الطلب",
    reason: "سبب الطلب",
    requestedOn: "تاريخ الطلب",
    approve: "اعتماد الحذف النهائي",
    reject: "رفض الطلب",
    approveTitle: "تأكيد الحذف النهائي للمنشأة",
    approveWarn: "سيُحذف نهائياً: سجل المنشأة، وكل الموظفين المسجلين عليها، وكل البيانات المرتبطة (حضور، إجازات، سلف، رواتب، مستندات) بما فيها سجلات الخزنة السعودية. لا يمكن التراجع.",
    approveConfirm: (n) => `للتأكيد اكتب اسم المنشأة: ${n}`,
    rejectTitle: "رفض طلب الحذف",
    rejectNote: "ملاحظة للمنشأة (اختياري)",
    cancel: "إلغاء",
    working: "جارٍ التنفيذ…",
    rejectWorking: "جارٍ الرفض…",
    done: "تم تنفيذ الحذف النهائي للمنشأة وبياناتها.",
    rejectedOk: "تم رفض الطلب — بقيت المنشأة وبياناتها.",
    fail: "تعذّر تنفيذ العملية — حاول مرة أخرى.",
    ownerNote: "ملاحظة المالك",
  } : {
    title: "Company deletion requests",
    note: "A request deletes nothing by itself. Approving here performs permanent deletion of the company, all its employees and their data — it cannot be undone.",
    empty: "No deletion requests right now.",
    loading: "Loading…",
    pending: "Awaiting approval",
    approved: "Approved — deleted",
    rejected: "Rejected",
    employees: "employees",
    unified: "Unified number",
    requester: "Requested by",
    reason: "Reason",
    requestedOn: "Requested on",
    approve: "Approve permanent delete",
    reject: "Reject request",
    approveTitle: "Confirm permanent company deletion",
    approveWarn: "Permanently deleted: the company record, every employee registered under it, and all related data (attendance, leaves, loans, payroll, documents) including Saudi vault records. This cannot be undone.",
    approveConfirm: (n) => `To confirm, type the company name: ${n}`,
    rejectTitle: "Reject deletion request",
    rejectNote: "Note for the company (optional)",
    cancel: "Cancel",
    working: "Working…",
    rejectWorking: "Rejecting…",
    done: "Permanent deletion of the company and its data is complete.",
    rejectedOk: "Request rejected — the company and its data were kept.",
    fail: "The operation failed — please try again.",
    ownerNote: "Owner note",
  };

  const args = { token: session?.token, employee_id: session?.employee_id };
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke("tenantDeletion", { ...args, action: "owner_list" });
      const d = res?.data || res;
      setRows(Array.isArray(d?.requests) ? d.requests : []);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { if (session) load(); }, [session?.token]);

  const approve = async () => {
    if (!approving) return;
    if (confirmText.trim() !== String(approving.company_name || "").trim()) return;
    const id = approving.id;
    const prev = rows;
    // تحديث متفائل: يظهر الطلب معتمداً فوراً، ويُرجَع للخلف إن فشل التنفيذ
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "approved" } : x)));
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const res = await base44.functions.invoke("tenantDeletion", { ...args, action: "owner_approve", request_id: id, note: note.trim() });
      const d = res?.data || res;
      if (!d?.ok) throw new Error(d?.error || "fail");
      setMsg({ type: "ok", text: t.done });
      setApproving(null); setConfirmText(""); setNote("");
      await load();
    } catch {
      setRows(prev);
      setMsg({ type: "err", text: t.fail });
    } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!rejecting) return;
    const id = rejecting.id;
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "rejected", review_note: note.trim() } : x)));
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const res = await base44.functions.invoke("tenantDeletion", { ...args, action: "owner_reject", request_id: id, note: note.trim() });
      const d = res?.data || res;
      if (!d?.ok) throw new Error(d?.error || "fail");
      setMsg({ type: "ok", text: t.rejectedOk });
      setRejecting(null); setNote("");
      await load();
    } catch {
      setRows(prev);
      setMsg({ type: "err", text: t.fail });
    } finally { setBusy(false); }
  };

  const statusBadge = (s) => s === "pending"
    ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><Clock size={11} /> {t.pending}</span>
    : s === "approved"
      ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={11} /> {t.approved}</span>
      : <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"><XCircle size={11} /> {t.rejected}</span>;

  const sorted = [...rows].sort((a, b) => {
    const rank = (s) => (s === "pending" ? 0 : 1);
    return rank(a.status) - rank(b.status);
  });

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Trash2 size={18} className="text-rose-600" /> {t.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1 max-w-2xl">{t.note}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw size={14} /> {isAr ? "تحديث" : "Refresh"}</Button>
      </div>

      {msg.text && (
        <div className={`text-sm rounded-lg p-3 leading-relaxed ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>{msg.text}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center"><Loader2 size={16} className="animate-spin" /> {t.loading}</div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t.empty}</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{r.company_name || "—"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">{r.unified_number || "—"}</div>
                </div>
                {statusBadge(r.status)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><div className="text-muted-foreground">{t.employees}</div><div className="font-semibold tabular-nums inline-flex items-center gap-1"><Users size={12} /> {r.employees_count || 0}</div></div>
                <div><div className="text-muted-foreground">{t.requestedOn}</div><div className="font-semibold tabular-nums" dir="ltr">{r.requested_date || "—"}</div></div>
                <div className="col-span-2"><div className="text-muted-foreground">{t.requester}</div><div className="font-semibold truncate">{r.requested_by_name || "—"} <span className="text-muted-foreground font-normal" dir="ltr">{r.requested_by_email || ""}</span></div></div>
              </div>
              {r.reason ? <div className="text-xs text-muted-foreground leading-relaxed"><b className="text-foreground">{t.reason}:</b> {r.reason}</div> : null}
              {r.status !== "pending" && r.review_note ? (
                <div className="text-xs text-muted-foreground leading-relaxed"><b className="text-foreground">{t.ownerNote}:</b> {r.review_note}</div>
              ) : null}
              {r.status === "pending" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => { setConfirmText(""); setNote(""); setMsg({ type: "", text: "" }); setApproving(r); }}
                    className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
                    <Trash2 size={14} /> {t.approve}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setNote(""); setMsg({ type: "", text: "" }); setRejecting(r); }} className="gap-1.5">
                    <XCircle size={14} /> {t.reject}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* اعتماد الحذف النهائي */}
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
            <div className="text-sm">
              <b>{approving?.company_name}</b>
              <span className="text-muted-foreground"> · {approving?.employees_count || 0} {t.employees}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.approveConfirm(approving?.company_name || "")}</Label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} disabled={busy} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)} disabled={busy}>{t.cancel}</Button>
            <Button onClick={approve} disabled={busy || confirmText.trim() !== String(approving?.company_name || "").trim()} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} {busy ? t.working : t.approve}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* رفض الطلب */}
      <Dialog open={!!rejecting} onOpenChange={(o) => (!o && !busy ? setRejecting(null) : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.rejectTitle}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm"><b>{rejecting?.company_name}</b></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.rejectNote}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} disabled={busy} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={busy}>{t.cancel}</Button>
            <Button onClick={reject} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} {busy ? t.rejectWorking : t.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}