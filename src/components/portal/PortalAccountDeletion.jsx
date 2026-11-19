import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Loader2, AlertTriangle, ShieldAlert, Clock, CheckCircle2 } from "lucide-react";

// حذف حساب الموظف من داخل التطبيق — متطلب App Store 5.1.1(v).
// الطلب يمرّ على منشأة الموظف (الموارد البشرية) ولا يُغلق الحساب إلا بموافقتها،
// فلا تُحذف حسابات الموظفين على رأس العمل بالخطأ، ويُتحقق من انتهاء العلاقة التعاقدية.
export default function PortalAccountDeletion({ session, isAr }) {
  const t = isAr
    ? {
        title: "حذف حسابي",
        note: "حذف الحساب لا يُنفَّذ فوراً: يُرسَل طلبك إلى الموارد البشرية في منشأتك للمراجعة، ولا يُغلق حسابك إلا بعد موافقتها. إن ضغطت بالخطأ يمكن للمنشأة رفض الطلب ويبقى حسابك كما هو. سجل العمل والرواتب يبقى لدى المنشأة التزاماً بنظام العمل السعودي.",
        btn: "طلب حذف حسابي",
        dialogTitle: "تأكيد طلب حذف الحساب",
        warn1: "لن يُحذف حسابك فوراً: يُرسَل الطلب إلى الموارد البشرية في منشأتك للمراجعة.",
        warn2: "يبقى وصولك إلى بوابة الموظف فعّالاً حتى يتم البت في طلبك.",
        warn3: "عند الموافقة يُلغى وصولك نهائياً، ويبقى سجل التوظيف والرواتب لدى المنشأة التزاماً نظامياً.",
        confirmL: "اكتب كلمة «حذف» للتأكيد",
        confirmPh: "حذف",
        word: "حذف",
        cancel: "إلغاء",
        send: "إرسال الطلب",
        sending: "جارٍ الإرسال…",
        done: "تم إرسال طلبك إلى منشأتك — سيُغلق حسابك بعد موافقتها، وحسابك يعمل حتى ذلك الحين.",
        pending: "طلب حذف حسابك مسجّل وبانتظار موافقة منشأتك — حسابك ما زال يعمل.",
        foot: "يُراجع الطلب من الموارد البشرية في منشأتك.",
        fail: "تعذّر إرسال الطلب، حاول مرة أخرى.",
      }
    : {
        title: "Delete my account",
        note: "Deletion is not immediate: your request goes to your organisation's HR for review, and your account is only closed once they approve. If you pressed by mistake, they can reject the request and your account stays as it is. Employment and payroll records stay with the organisation as required by Saudi labour law.",
        btn: "Request account deletion",
        dialogTitle: "Confirm deletion request",
        warn1: "Your account is not deleted now: the request is sent to your organisation's HR for review.",
        warn2: "Your employee portal access stays active until your request is decided.",
        warn3: "If approved, your access is removed permanently; employment and payroll records stay with the organisation as required by law.",
        confirmL: "Type “delete” to confirm",
        confirmPh: "delete",
        word: "delete",
        cancel: "Cancel",
        send: "Send request",
        sending: "Sending…",
        done: "Your request was sent to your organisation — your account is closed once they approve, and keeps working until then.",
        pending: "Your deletion request is recorded and awaiting your organisation's approval — your account still works.",
        foot: "The request is reviewed by HR in your organisation.",
        fail: "Couldn't send the request, please try again.",
      };

  const [state, setState] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const res = await base44.functions.invoke("portalData", {
        token: session.token, employee_id: session.employee_id, action: "account_delete_status",
      });
      const data = res?.data || res;
      if (data?.ok) setState(data);
    } catch { /* تبقى البطاقة صامتة عند تعذر الجلب */ }
  };
  useEffect(() => { if (session?.token) load(); }, [session?.token]);

  const canConfirm = confirmText.trim().toLowerCase() === t.word.toLowerCase();

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const res = await base44.functions.invoke("portalData", {
        token: session.token, employee_id: session.employee_id, action: "account_delete_request", confirm: true,
      });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || "fail");
      setOpen(false);
      setDone(true);
    } catch (e) {
      setErr(e?.message || t.fail);
    } finally { setBusy(false); }
  };

  if (!session) return null;
  const already = done || state?.request?.status === "pending";

  return (
    <div className="mt-6 bg-white rounded-2xl border border-rose-100 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><Trash2 size={18} /></span>
        <h3 className="font-semibold text-foreground">{t.title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.note}</p>

      {err && <div className="text-sm rounded-lg p-3 bg-rose-50 text-rose-700 border border-rose-100">{err}</div>}

      {already ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-2 text-amber-800 text-sm">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> {done ? t.done : t.pending}
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => { setConfirmText(""); setErr(""); setOpen(true); }}
            className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
            <Trash2 size={16} /> {t.btn}
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => (!o && !busy ? setOpen(false) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700"><AlertTriangle size={18} /> {t.dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2 text-xs leading-relaxed text-rose-900">
              {[t.warn1, t.warn2, t.warn3].map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.confirmL}</Label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={t.confirmPh} disabled={busy} />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock size={13} /> {t.foot}
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