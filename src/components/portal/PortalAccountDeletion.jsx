import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Loader2, AlertTriangle, ShieldAlert, Clock, CheckCircle2 } from "lucide-react";
import { portalSession } from "@/lib/portalSession";

// حذف حساب الموظف من داخل التطبيق — متطلب App Store 5.1.1(v).
// الحذف يُلغي الوصول إلى بوابة الموظف فوراً (كلمة المرور والرموز وربط حساب التطبيق)
// ويسجّل طلباً لمسؤول المنشأة لإتلاف البيانات الشخصية غير المشمولة بحفظ نظامي.
export default function PortalAccountDeletion({ session, isAr, onDeleted }) {
  const t = isAr
    ? {
        title: "حذف حسابي",
        note: "يمكنك حذف حسابك في بوابة الموظف من هنا في أي وقت. يُلغى وصولك فوراً، ويُبلَّغ مسؤول منشأتك لإتلاف بياناتك الشخصية. سجل العمل والرواتب يبقى محفوظاً لدى المنشأة التزاماً بنظام العمل السعودي.",
        btn: "حذف حسابي نهائياً",
        dialogTitle: "تأكيد حذف الحساب",
        warn1: "سيُلغى دخولك إلى بوابة الموظف فوراً ولن تستطيع تسجيل الدخول مرة أخرى.",
        warn2: "ستُحذف كلمة المرور ورموز الاستعادة وربط حساب التطبيق.",
        warn3: "سجل التوظيف والرواتب والالتزامات النظامية يبقى لدى المنشأة، وتُتلف بياناتك الشخصية الأخرى.",
        confirmL: "اكتب كلمة «حذف» للتأكيد",
        confirmPh: "حذف",
        word: "حذف",
        cancel: "إلغاء",
        send: "حذف حسابي",
        sending: "جارٍ الحذف…",
        done: "تم حذف حسابك وإلغاء وصولك. سيتم تسجيل خروجك الآن.",
        pending: "طلب حذف حسابك مسجّل — وصولك إلى البوابة موقوف.",
        fail: "تعذّر إتمام الطلب، حاول مرة أخرى.",
      }
    : {
        title: "Delete my account",
        note: "You can delete your employee portal account here at any time. Access is revoked immediately and your organisation's admin is notified to erase your personal data. Employment and payroll records stay with the organisation as required by Saudi labour law.",
        btn: "Delete my account",
        dialogTitle: "Confirm account deletion",
        warn1: "Your portal access is revoked immediately and you will not be able to sign in again.",
        warn2: "Your password, recovery codes and app account link are removed.",
        warn3: "Employment, payroll and statutory records stay with the organisation; your other personal data is erased.",
        confirmL: "Type “delete” to confirm",
        confirmPh: "delete",
        word: "delete",
        cancel: "Cancel",
        send: "Delete my account",
        sending: "Deleting…",
        done: "Your account is deleted and access revoked. Signing you out now.",
        pending: "Your account deletion request is recorded — portal access is disabled.",
        fail: "Couldn't complete the request, please try again.",
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
      // تُنهى الجلسة محلياً بعد عرض التأكيد — الحساب نفسه أُغلق على الخادم.
      setTimeout(() => { portalSession.clear(); onDeleted?.(); }, 2400);
    } catch (e) {
      setErr(e?.message || t.fail);
    } finally { setBusy(false); }
  };

  if (!session) return null;
  const already = done || state?.request?.status === "pending" || state?.portal_enabled === false;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-rose-100 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><Trash2 size={18} /></span>
        <h3 className="font-semibold text-foreground">{t.title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.note}</p>

      {err && <div className="text-sm rounded-lg p-3 bg-rose-50 text-rose-700 border border-rose-100">{err}</div>}

      {already ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-2 text-emerald-800 text-sm">
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
              <Clock size={13} /> {isAr ? "الحذف فوري ولا يمكن التراجع عنه من البوابة." : "Deletion is immediate and cannot be undone from the portal."}
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