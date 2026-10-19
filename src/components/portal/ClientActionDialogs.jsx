import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {   Loader2, Check, CalendarPlus, CalendarClock, Printer, X, Pause, Ban, Play, RotateCcw, BadgeCheck, Crown, FlaskConical, Download, Mail, FileSignature, FileText, Link2, Users, Trash2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import ConfirmSubscriptionDialog from "./ConfirmSubscriptionDialog";
import RenewYearDialog from "./RenewYearDialog";
import DeleteTenantDialog from "./DeleteTenantDialog";
import { renderToPdfBlob } from "@/lib/pdfDocs";
import QuoteDoc from "@/components/docs/QuoteDoc";
import { StoredDocButton } from "@/components/VaultDocLink";
import { PRICING_TIERS_AR, PRICING_TIERS_EN, tierForCount } from "@/lib/pricing";
import { PROVIDER_BANK } from "@/lib/providerIdentity";

// ——— أدوات مساعدة مشتركة ———
export function daysLeft(date) {
  if (!date) return 0;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}

// حساب المالك دائم مدى الحياة — لا يُنهى ولا يُعلّق.
export function isOwnerTenant(x) {
  return /\u0627\u0644\u0645\u0627\u0644\u0643|\(owner\)/i.test(x?.name || "");
}

// رابط واتساب لمراسلة العميل بعرض السعر وبيانات التحويل واستلام إثبات التحويل.
export function waLink(t, isAr) {
  const raw = String(t.contact_phone || "").replace(/\D/g, "");
  let num = raw;
  if (num.startsWith("0")) num = "966" + num.slice(1);
  else if (num && !num.startsWith("966")) num = "966" + num;
  const amount = Number(t.quoted_amount) || 0;
  const disc = Number(t.discount_percent) || 0;
  const code = String(t.discount_code || "").trim();
  // تفاصيل الخصم: السعر الأصل، الرمز ونسبته، قيمة الخصم، ثم المبلغ بعد الخصم — حتى يكون العرض شاملاً وواضحاً للعميل.
  const baseAnnual = disc > 0 && amount > 0 ? Math.round(amount / (1 - disc / 100)) : amount;
  const discAmount = disc > 0 ? Math.max(0, baseAnnual - amount) : 0;
  const priceLines = isAr
    ? [
        `• السعر السنوي للباقة: ${baseAnnual.toLocaleString()} ريال`,
        ...(disc > 0 ? [
          `• قيمة الخصم${code ? ` (كود ${code})` : ""} — ${disc}%: - ${discAmount.toLocaleString()} ريال`,
          `• الإجمالي بعد الخصم: ${amount.toLocaleString()} ريال`,
        ] : []),
      ]
    : [
        `• Annual price: ${baseAnnual.toLocaleString()} SAR`,
        ...(disc > 0 ? [
          `• Discount${code ? ` (code ${code})` : ""} — ${disc}%: - ${discAmount.toLocaleString()} SAR`,
          `• Total after discount: ${amount.toLocaleString()} SAR`,
        ] : []),
      ];
  const lines = isAr ? [
    `السلام عليكم ${t.contact_name || ""}،`,
    `نسعد بكم في منصة «جداره» لإدارة الموارد البشرية.`,
    ``,
    `عرض السعر لمنشأتكم «${t.name}»:`,
    `• شريحة الاشتراك: ${t.pricing_tier || "—"}`,
    `• عدد الموظفين المتوقع: ${t.employee_count || 0}`,
    ...priceLines,
    // صلاحية العرض 48 ساعة — تُرسل مع العروض المدفوعة فقط (طلبات التجربة المجانية بلا صلاحية)
    ...(amount > 0 ? [`صلاحية هذا العرض 48 ساعة من تاريخ الإصدار.`] : []),
    ``,
    `بيانات التحويل البنكي:`,
    `المستفيد: ${PROVIDER_BANK.beneficiaryAr}`,
    `البنك: ${PROVIDER_BANK.bankAr}`,
    `الآيبان: ${PROVIDER_BANK.iban}`,
    `رقم الحساب: ${PROVIDER_BANK.account}`,
    ``,
    `يرجى إجراء التحويل وإرسال إثباته هنا لتفعيل اشتراككم.`,
    `شاكرين لكم، فريق جداره.`,
  ] : [
    `Hello ${t.contact_name || ""},`,
    `Welcome to Jadara HR Management platform.`,
    ``,
    `Annual subscription quote for «${t.name}»:`,
    `• Tier: ${t.pricing_tier || "—"}`,
    `• Expected employees: ${t.employee_count || 0}`,
    ...priceLines,
    ...(amount > 0 ? [`This quotation is valid for 48 hours from the issue date.`] : []),
    ``,
    `Bank transfer details:`,
    `Beneficiary: ${PROVIDER_BANK.beneficiaryEn}`,
    `Bank: ${PROVIDER_BANK.bankEn}`,
    `IBAN: ${PROVIDER_BANK.iban}`,
    `Account: ${PROVIDER_BANK.account}`,
    ``,
    `Please transfer and send the proof here to activate your subscription.`,
  ];
  return `https://wa.me/${num}?text=${encodeURIComponent(lines.join("\n"))}`;
}

// ——— تأكيد التعاقد وتفعيل الاشتراك ———
export function ActivateDialog({ open, onClose, tenant, isAr, t, onDone }) {
  const [saving, setSaving] = useState(false);
  const defaultEnd = () => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };
  const [end, setEnd] = useState("");
  const [amount, setAmount] = useState("");
  useEffect(() => {
    if (open && tenant) { setEnd(defaultEnd()); setAmount(String(tenant.quoted_amount || "")); }
  }, [open, tenant]);

  const submit = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await onDone({
        subscription_end: end,
        amount: Number(amount) || 0,
      });
      onClose();
    } catch (e) {
      // الخطأ يُرفع ليعالجه المُستدعي
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isAr ? "تأكيد التعاقد وتفعيل الاشتراك" : "Confirm contract & activate"} — {tenant?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3.5 text-sm">
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-1">
            <Row k={isAr ? "جهة الاتصال" : "Contact"} v={tenant?.contact_name || "—"} />
            <Row k={isAr ? "البريد" : "Email"} v={tenant?.contact_email || "—"} />
            <Row k={isAr ? "الهاتف" : "Phone"} v={tenant?.contact_phone || "—"} />
            <Row k={isAr ? "الرقم الموحد" : "Unified no."} v={tenant?.unified_number || "—"} />
            <Row k={isAr ? "عدد الموظفين" : "Employees"} v={tenant?.employee_count || 0} />
            <Row k={isAr ? "الشريحة" : "Tier"} v={tenant?.pricing_tier || "—"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{isAr ? "المبلغ (ر.س)" : "Amount (SAR)"}</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{isAr ? "نهاية الاشتراك" : "Subscription end"}</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} dir="ltr" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{isAr ? "بالتأكيد يتم تسجيل عميلة مدفوعة سنوية وتحويل المنشأة إلى (فعّال)." : "Confirms a paid annual subscription and marks the tenant active."}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{isAr ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={submit} disabled={saving || !amount || !end} className="gap-1.5">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {isAr ? "تأكيد وتفعيل" : "Confirm & activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ——— تمديد فترة التجربة ———
export function ExtendTrialDialog({ open, onClose, tenant, isAr, t, onDone }) {
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState("7");
  useEffect(() => { if (open) setDays("7"); }, [open]);

  const submit = async () => {
    if (!tenant || Number(days) <= 0) return;
    setSaving(true);
    try { await onDone({ days: Number(days) }); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{isAr ? "تمديد فترة التجربة" : "Extend trial"} — {tenant?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground bg-slate-50 border border-border rounded-lg p-3">
            {isAr ? "الحالية تنتهي في: " : "Current trial ends: "}<span className="font-medium">{tenant?.trial_end || "—"}</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{isAr ? "عدد أيام التمديد" : "Days to extend"}</Label>
            <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} min={1} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{isAr ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={submit} disabled={saving || Number(days) <= 0} className="gap-1.5">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />} {isAr ? "تمديد" : "Extend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ——— بطاقة العميل القابلة للطباعة PDF + لوحة التحكم الكاملة ———
export function ClientInfoDialog({ open, onClose, tenant, isAr, t, onAction, busyId, session, onRefresh }) {
  const [days, setDays] = useState("7");
  const [amount, setAmount] = useState("");
  const [end, setEnd] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState(null); // { ok, text } نتيجة تغيير البريد inline
  const [emailBusy, setEmailBusy] = useState(false);
  const [fixUnified, setFixUnified] = useState("");
  const [fixMsg, setFixMsg] = useState(null);
  const [fixBusy, setFixBusy] = useState(false);
  const [dupBusy, setDupBusy] = useState(false);
  const [dupMsg, setDupMsg] = useState(null);
  const [apprBusy, setApprBusy] = useState(false);
  const [apprMsg, setApprMsg] = useState(null); // نتيجة اعتماد حساب المسؤول الحالي
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [orphans, setOrphans] = useState(null);
  const [picked, setPicked] = useState({});
  const [orphLoading, setOrphLoading] = useState(false);
  const [orphBusy, setOrphBusy] = useState(false);
  const callPortal = useCallback(async (action, extra = {}) => {
    const res = await base44.functions.invoke("portalData", { token: session.token, employee_id: session.employee_id, action, ...extra });
    const d = res?.data || res;
    if (!d?.ok) {
      const err = new Error(d?.error || "fail");
      // تفاصيل الرفض: اسم المنشأة صاحبة البريد/الرقم + سبب فشل الدعوة من الخادم
      Object.assign(err, { tenant_name: String(d?.tenant_name || ""), detail: String(d?.detail || "") });
      throw err;
    }
    return d;
  }, [session?.token, session?.employee_id]);
  const loadOrphans = async () => {
    setOrphLoading(true);
    try { const d = await callPortal("owner_list_orphans"); setOrphans(d.orphans || []); setPicked({}); }
    catch (e) { setOrphans([]); }
    finally { setOrphLoading(false); }
  };
  const linkOrphans = async () => {
    const ids = Object.keys(picked).filter((k) => picked[k]);
    if (!ids.length) return;
    setOrphBusy(true);
    try {
      await callPortal("owner_link_orphans", { tenant_id: tenant.id, employee_ids: ids });
      setPicked({}); setOrphans(null);
      if (onRefresh) await onRefresh();
    } catch (e) { alert(e?.message || "fail"); }
    finally { setOrphBusy(false); }
  };
  // تغيير بريد المنشأة — نتيجة inline بدل alert: يعتمد الحساب الموجود بنفس البريد
  // (من عرض سعر/تجربة سابقة) أو يدعو جديداً، ويترجم أسباب الرفض لرسالة عربية واضحة.
  const changeEmail = async () => {
    const em = newEmail.trim().toLowerCase();
    if (!em) return;
    setEmailMsg(null);
    setEmailBusy(true);
    try {
      const d = await callPortal("owner_change_email", { tenant_id: tenant.id, new_email: em });
      setEmailMsg({ ok: true, text: isAr
        ? (d.same ? "البريد مطابق للبريد الحالي — لا حاجة للتغيير." : `تم ربط المنشأة بالبريد ${em} واعتماده مسؤول الدخول.`)
        : (d.same ? "Email already matches." : `Tenant re-linked to ${em} as the admin account.`) });
      setNewEmail("");
      if (onRefresh) await onRefresh();
    } catch (e) {
      const code = String(e?.message || e || "");
      const map = {
        email_admin_of_other_tenant: isAr
          ? `هذا البريد مسؤول لمنشأة أخرى فعّالة${e?.tenant_name ? ` (${e.tenant_name})` : ""} — إما اشتراك مدفوع أو تجربة لم تنتهِ بعد. غيّر بريداً آخر أو أعد تفعيل المنشأة الأخرى لاحقاً.`
          : "This email administers another live tenant — pick a different email.",
        invite_failed: (isAr ? "تعذّر إنشاء حساب بهذا البريد — تأكد من صحة البريد وحاول مرة أخرى." : "Could not create an account for this email — verify it and retry.")
          + (e?.detail ? (isAr ? ` سبب الرفض من النظام: ${e.detail}` : ` Server reason: ${e.detail}`) : ""),
        invalid_unified: isAr ? "الرقم الموحد غير صالح — يجب أن يبدأ بـ 7 وطوله 8–12 خانة." : "Invalid unified number.",
        unified_used_by_other: isAr
          ? `الرقم الموحد مسجّل لمنشأة أخرى${e?.tenant_name ? ` (${e.tenant_name})` : ""} — لا يمكن اختطافه.`
          : "Unified number belongs to another tenant.",
      };
      setEmailMsg({ ok: false, text: map[code] || (isAr ? `تعذّر تغيير البريد: ${code}` : `Failed: ${code}`) });
    } finally {
      setEmailBusy(false);
    }
  };
  // تصحيح الرقم الموحد — ينقل موظفي الرقم القديم كاملاً إلى الرقم الصحيح.
  const applyFixUnified = async () => {
    const nu = fixUnified.replace(/\D/g, "");
    if (!/^7\d{7,11}$/.test(nu)) {
      setFixMsg({ ok: false, text: isAr ? "الرقم الموحد غير صالح — يبدأ بـ 7 وطوله 8–12 خانة." : "Invalid unified number." });
      return;
    }
    setFixMsg(null);
    setFixBusy(true);
    try {
      const d = await callPortal("owner_fix_unified", { tenant_id: tenant.id, new_unified: nu });
      setFixMsg({ ok: true, text: isAr
        ? `تم تصحيح الرقم الموحد إلى ${nu}${d.relinked ? ` وتمت إعادة ربط ${d.relinked} موظف(ة)` : ""}.`
        : `Unified number fixed to ${nu}${d.relinked ? `, ${d.relinked} employee(s) relinked` : ""}.` });
      setFixUnified("");
      if (onRefresh) await onRefresh();
    } catch (e) {
      const code = String(e?.message || e || "");
      setFixMsg({ ok: false, text: code === "unified_used_by_other"
        ? (isAr ? "الرقم الموحد مسجّل لمنشأة أخرى — لا يمكن اختطافه." : "Number belongs to another tenant.")
        : (isAr ? `تعذّر التصحيح: ${code}` : `Failed: ${code}`) });
    } finally {
      setFixBusy(false);
    }
  };
  // اعتماد حساب المسؤول الحالي — تفعيل دخول المنشأة عبر بوابة الشركات (/app).
  // يرفع حساب بريد المنشأة الحالي إلى مسؤول؛ يُستخدم إن كان العميل مسجّلاً لكن
  // دخوله مرفوض أو يُحوَّل لبوابة الموظف (لأن دوره العام user وليس admin).
  const approveAdmin = async () => {
    setApprBusy(true); setApprMsg(null);
    try {
      await callPortal("owner_approve_admin", { tenant_id: tenant.id, approve: true });
      setApprMsg({ ok: true, text: isAr
        ? `تم اعتماد ${tenant.admin_email || tenant.contact_email || "حساب المنشأة"} كمسؤول — يدخل الآن مساحة العمل /app مباشرة.`
        : "Approved as company admin — /app access is now enabled." });
      if (onRefresh) await onRefresh();
    } catch (e) {
      const code = String(e?.message || e || "");
      setApprMsg({ ok: false, text: code === "no_pending"
        ? (isAr ? "لا يوجد بريد مسؤول مسجل لهذه المنشأة — استخدم قسم تغيير البريد أولاً لربط بريد جديد." : "No admin email on this tenant — use the email change section first.")
        : (isAr ? `تعذّر الاعتماد: ${code}` : `Failed: ${code}`) });
    } finally { setApprBusy(false); }
  };
  // حذف المنشآت المكرّرة (نفس الرقم الموحد) — يبقي هذه المنشأة وحدها.
  const deleteDuplicates = async () => {
    if (!window.confirm(isAr
      ? "حذف كل منشأة أخرى بنفس الرقم الموحد؟ تبقى بيانات الموظفين محفوظة ولن تُحذف."
      : "Delete every other tenant with the same unified number? Employee records are kept.")) return;
    setDupBusy(true); setDupMsg(null);
    try {
      const d = await callPortal("owner_delete_duplicates", { tenant_id: tenant.id });
      setDupMsg({ ok: true, text: isAr ? `تم حذف ${d.deleted} سجل مكرر — بقيت هذه المنشأة وحدها.` : `${d.deleted} duplicate(s) deleted.` });
      if (onRefresh) await onRefresh();
    } catch (e) {
      setDupMsg({ ok: false, text: isAr ? `تعذّر الحذف: ${e?.message || e}` : `Failed: ${e?.message || e}` });
    } finally { setDupBusy(false); }
  };
  useEffect(() => {
    if (open && tenant) {
      setDays("7");
      setAmount(String(tenant.quoted_amount || ""));
      setNewEmail("");
      setEmailMsg(null); setFixUnified(""); setFixMsg(null); setDupMsg(null); setApprMsg(null); setEmailBusy(false); setFixBusy(false); setApprBusy(false);
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setFullYear(d.getFullYear() + 1);
      setEnd(d.toISOString().slice(0, 10));
      setConfirmOpen(false);
      setRenewOpen(false);
      setOrphans(null); setPicked({});
    }
  }, [open, tenant]);
  if (!open || !tenant) return null;

  // توليد نسخة من عرض السعر المُقدَّم للعميل وتنزيلها كـ PDF — مطابقة لما رآه العميل.
  const downloadQuote = async () => {
    if (!tenant) return;
    setQuoteBusy(true);
    try {
      const tier = tenant.employee_count ? tierForCount(tenant.employee_count, isAr ? PRICING_TIERS_AR : PRICING_TIERS_EN) : null;
      const blob = await renderToPdfBlob(
        <QuoteDoc
          company={tenant}
          quoteNo={tenant.contract_quote_no || ""}
          date={(tenant.created_date || "").slice(0, 10)}
          tier={tier}
          amount={Number(tenant.quoted_amount) || 0}
          discountPercent={Number(tenant.discount_percent) || 0}
          discountCode={tenant.discount_code || ""}
          isAr={isAr}
        />
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Jadara-Quote-${tenant.contract_quote_no || tenant.unified_number || "quote"}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); try { a.remove(); } catch (e) {} }, 1200);
    } catch (e) {
      // تجاهل
    } finally {
      setQuoteBusy(false);
    }
  };
  const owner = isOwnerTenant(tenant);
  const status = tenant.status;
  const busy = busyId === tenant.id;
  const lifetime = isAr ? "مدى الحياة" : "Lifetime";
  const rows = [
    [isAr ? "اسم المنشأة / الشركة" : "Company", tenant.name],
    [isAr ? "الرقم الوطني الموحد للمنشآت" : "National Unified No.", tenant.unified_number],
    [isAr ? "الشخص المسؤول" : "Responsible person", tenant.contact_name],
    [isAr ? "رقم الجوال" : "Phone", tenant.contact_phone],
    [isAr ? "البريد الإلكتروني" : "Email", tenant.contact_email],
    [isAr ? "المدينة" : "City", tenant.city],
    [isAr ? "القطاع / النشاط" : "Industry", tenant.industry],
    [isAr ? "عدد الموظفين" : "Employees", tenant.employee_count],
    [isAr ? "شريحة الاشتراك" : "Pricing tier", tenant.pricing_tier],
    [isAr ? "المبلغ المعروض" : "Quoted amount", tenant.quoted_amount ? `${Number(tenant.quoted_amount).toLocaleString()} ${isAr ? "ر.س" : "SAR"}` : "—"],
    [isAr ? "كود الخصم" : "Discount", tenant.discount_code ? `${tenant.discount_code} (${tenant.discount_percent || 0}%)` : "—"],
    [isAr ? "نوع الطلب" : "Lead", tenant.lead_source === "quote" ? (isAr ? "طلب عرض سعر" : "Quote request") : (isAr ? "تسجيل تجربة" : "Trial sign-up")],
    [isAr ? "الحالة" : "Status", owner ? lifetime : status],
    [isAr ? "بداية التجربة" : "Trial start", owner ? lifetime : (tenant.trial_start || "—")],
    [isAr ? "نهاية التجربة" : "Trial end", owner ? lifetime : (tenant.trial_end || "—")],
    [isAr ? "نهاية الاشتراك" : "Subscription end", owner ? lifetime : (tenant.subscription_end || "—")],
    [isAr ? "تأكيد التعاقد" : "Contract", owner ? lifetime : (tenant.contract_confirmed ? (isAr ? "مؤكّد" : "Confirmed") : (isAr ? "غير مؤكد" : "Not confirmed"))],
    [isAr ? "تاريخ التسجيل" : "Registered", (tenant.created_date || "").slice(0, 10)],
  ];
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/50">
      <div className="max-w-3xl mx-auto my-6 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="no-print flex items-center justify-between gap-3 p-4 border-b border-border bg-white">
          <div className="flex items-center gap-2 font-semibold">{isAr ? "بيانات العميل" : "Client info"} — {tenant.name}</div>
          <div className="flex items-center gap-2">
            {Number(tenant.quoted_amount) > 0 && (
              <button type="button" onClick={downloadQuote} disabled={quoteBusy}
                className="inline-flex items-center gap-1.5 text-sm h-9 px-3 rounded-md border border-input bg-transparent hover:bg-accent text-emerald-700 disabled:opacity-60">
                {quoteBusy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} {isAr ? "تنزيل عرض السعر (PDF)" : "Download Quote"}
              </button>
            )}
            {tenant.contract_pdf_url && (
              <StoredDocButton value={tenant.contract_pdf_url} isAr={isAr}
                 className="inline-flex items-center gap-1.5 text-sm h-9 px-3 rounded-md border border-input bg-transparent hover:bg-accent text-violet-700">
                <Download size={14} /> {isAr ? "تنزيل العقد (PDF)" : "Download Contract"}
              </StoredDocButton>
            )}
            {tenant.invoice_pdf_url && (
              <StoredDocButton value={tenant.invoice_pdf_url} isAr={isAr}
                 className="inline-flex items-center gap-1.5 text-sm h-9 px-3 rounded-md border border-input bg-transparent hover:bg-accent text-indigo-700">
                <FileSignature size={14} /> {isAr ? "تنزيل الفاتورة (PDF)" : "Invoice"}
              </StoredDocButton>
            )}
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5"><Printer size={14} /> {isAr ? "طباعة PDF" : "Print PDF"}</Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="h-9 w-9 p-0"><X size={16} /></Button>
          </div>
        </div>
        <div className="print-client p-8">
          <div className="flex items-center justify-between gap-3 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><Crown className="text-violet-700" size={22} /></div>
              <div>
                <div className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>جداره لإدارة الموارد البشرية</div>
                <div className="text-xs text-slate-500">{isAr ? "بيانات العميل المسجّل" : "Registered client info"}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 text-left">{new Date().toISOString().slice(0, 10)}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm py-6">
            {rows.map(([k, v], i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-dashed border-slate-200 pb-1">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-800 truncate max-w-[60%]" dir="ltr">{v == null || v === "" ? "—" : v}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
            {isAr ? "تم استلام هذه البيانات عبر بوابة تسجيل التجربة أو طلب عرض سعر في منصة جداره" : "Data received via Jadara trial sign-up or quote request portal"}
          </div>
        </div>
        {!owner && (
        <div className="no-print p-5 border-t border-border bg-slate-50 space-y-4">
          {/* تغيير بريد المنشأة — عند فقدان البريد الأصلي — يبقى الحساب وكل البيانات عبر الرقم الموحد */}
          <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
            <div className="text-sm font-medium flex items-center gap-1.5"><Mail size={15} className="text-blue-600" /> {isAr ? "تغيير بريد المنشأة (عند فقدان البريد)" : "Change tenant email (lost email)"}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{isAr ? "يربط المنشأة بحساب موجود بنفس البريد (من عرض سعر أو اشتراك سابق — حتى لو انتهت التجربة ولم تشترك المنشأة فالبريد يُقبل) أو يدعو بريداً جديداً كمسؤول، ويعتمده لتسجيل الدخول. يُمنع فقط البريد الخاص بمنشأة أخرى فعّالة (اشتراك أو تجربة لم تنتهِ). كل البيانات تبقى محفوظة عبر الرقم الموحد." : "Links the tenant to an existing account with the same email (from a prior quote or subscription — even if the trial ended without subscribing, the email is accepted) or invites a new admin. Only emails administering another live tenant are blocked. All data stays via the unified number."}</div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1 flex-1 min-w-[180px]">
                <Label className="text-xs text-muted-foreground">{isAr ? "البريد الجديد" : "New email"}</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-9" placeholder="new@company.com" dir="ltr" />
              </div>
              <Button size="sm" onClick={changeEmail} disabled={emailBusy || busy || !newEmail.trim()} className="gap-1.5">
                {emailBusy ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />} {isAr ? "ربط البريد الجديد" : "Re-link email"}
              </Button>
            </div>
            {emailMsg && (
              <div className={cn("text-xs rounded-lg px-3 py-2 leading-relaxed", emailMsg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200")}>{emailMsg.text}</div>
            )}
          </div>
          {/* اعتماد حساب المسؤول الحالي — تفعيل دخول المنشأة عبر بوابة الشركات */}
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <div className="text-sm font-medium flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-600" /> {isAr ? "تفعيل دخول المنشأة (اعتماد المسؤول)" : "Enable company login (approve admin)"}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{isAr ? "إن كان العميل مسجّلاً بهذا البريد لكن دخوله عبر بوابة الشركات مرفوض أو يُحوَّل لبوابة الموظف — ارفع حسابه إلى مسؤول ليُعتمد الدخول لمساحة العمل. لا يغيّر البريد ولا الرقم الموحد." : "If the client is registered with this email but company-portal sign-in is refused or redirects them — promote the account to admin so workspace access is approved. Does not change the email or unified number."}</div>
            <Button size="sm" onClick={approveAdmin} disabled={apprBusy || busy} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              {apprBusy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} {isAr ? "اعتماد المسؤول وتفعيل الدخول" : "Approve admin access"}
            </Button>
            {apprMsg && (
              <div className={cn("text-xs rounded-lg px-3 py-2 leading-relaxed", apprMsg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200")}>{apprMsg.text}</div>
            )}
          </div>
          {/* تصحيح الرقم الموحد + حذف التكرارات — إصلاح أثر الخطأ السابق في رقم المنشأة */}
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
            <div className="text-sm font-medium flex items-center gap-1.5"><Link2 size={15} className="text-amber-600" /> {isAr ? "تصحيح الرقم الموحد وتنظيف التكرارات" : "Fix unified number & remove duplicates"}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{isAr ? "إن سُجّل رقم المنشأة الموحد خطأ: صحّحه هنا — تُنقل كل بيانات موظفي الرقم القديم إلى الرقم الصحيح تلقائياً. ثم احذف أي منشأة مكرّرة بنفس الرقم لتبقى منشأة واحدة فقط." : "If the tenant's unified number was recorded wrongly: fix it here — all employees under the old number move to the correct one. Then delete any duplicate tenant sharing the number."}</div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1 flex-1 min-w-[180px]">
                <Label className="text-xs text-muted-foreground">{isAr ? "الرقم الموحد الصحيح (10 خانات تبدأ بـ7)" : "Correct unified no. (10 digits, starts with 7)"}</Label>
                <Input value={fixUnified} onChange={(e) => setFixUnified(e.target.value.replace(/\D/g, ""))} className="h-9" placeholder="7XXXXXXXXX" dir="ltr" maxLength={12} />
              </div>
              <Button size="sm" onClick={applyFixUnified} disabled={fixBusy || busy || fixUnified.length < 8} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                {fixBusy ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />} {isAr ? "تصحيح الرقم وربط الموظفين" : "Fix number & relink"}
              </Button>
              {Number(tenant.dup_count) > 1 && (
                <Button size="sm" variant="outline" onClick={deleteDuplicates} disabled={dupBusy} className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50">
                  {dupBusy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} {isAr ? `حذف التكرارات (${Number(tenant.dup_count) - 1})` : `Delete duplicates (${Number(tenant.dup_count) - 1})`}
                </Button>
              )}
            </div>
            {fixMsg && (
              <div className={cn("text-xs rounded-lg px-3 py-2 leading-relaxed", fixMsg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200")}>{fixMsg.text}</div>
            )}
            {dupMsg && (
              <div className={cn("text-xs rounded-lg px-3 py-2 leading-relaxed", dupMsg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200")}>{dupMsg.text}</div>
            )}
          </div>
          {/* ربط الموظفين غير المرتبطين — دقة العدّ 100% بالرقم الموحد */}
          <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm font-medium flex items-center gap-1.5"><Link2 size={15} className="text-violet-600" /> {isAr ? "ربط الموظفين بالرقم الموحد" : "Link employees by unified number"}</div>
              <div className="text-xs text-muted-foreground">{isAr ? "العدّ الحالي" : "Count"}: <b className="text-violet-700">{tenant.employees_active_count ?? 0}</b> / {tenant.employees_total_count ?? 0}</div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">{isAr ? "يعرض الموظفين غير المرتبطين بأي منشأة (بدون رقم موحد أو برقم غير مطابق) ليحدّد المالك من يتبع لهذه المنشأة فيُربط برقمها الموحد — يضمن دقة العدّ 100% دون اختلاط بين العملاء." : "Shows employees not linked to any tenant so the owner can assign them here — guarantees a 100% accurate count with no cross-client mixing."}</div>
            {orphans === null ? (
              <Button size="sm" variant="outline" onClick={loadOrphans} disabled={orphLoading} className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-100">
                {orphLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />} {isAr ? "عرض الموظفين غير المرتبطين" : "Show unlinked employees"}
              </Button>
            ) : orphans.length === 0 ? (
              <div className="text-xs text-emerald-700 flex items-center gap-1.5"><Check size={13} /> {isAr ? "لا يوجد موظفون غير مرتبطين — العدّ دقيق." : "No unlinked employees — count is accurate."}</div>
            ) : (
              <div className="space-y-2">
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-white divide-y divide-border">
                  {orphans.map((o) => (
                    <label key={o.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={!!picked[o.id]} onChange={(e) => setPicked((p) => ({ ...p, [o.id]: e.target.checked }))} className="h-4 w-4 accent-violet-600 shrink-0" />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="text-sm font-medium truncate">{o.full_name || "—"}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{o.employee_number || "—"} · {o.department || "—"} · {o.position || "—"}</div>
                      </div>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border shrink-0", o.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200")}>{o.status === "active" ? (isAr ? "نشط" : "Active") : o.status}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">{Object.values(picked).filter(Boolean).length} {isAr ? "محدّد" : "selected"}</div>
                  <Button size="sm" onClick={linkOrphans} disabled={orphBusy || !Object.values(picked).some(Boolean)} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
                    {orphBusy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} {isAr ? "ربط المحدّدين بهذه المنشأة" : "Link selected"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          {status === "trial" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <FlaskConical size={16} className="text-amber-600 shrink-0" />
                <span className="text-sm font-medium">{isAr ? "تفعيل تجربة فقط (30 يوم)" : "Activate trial only (30 days)"}</span>
                <Button size="sm" onClick={() => onAction(tenant.id, "owner_activate_trial")} disabled={busy} className="gap-1.5 ms-auto">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {isAr ? "تفعيل" : "Activate"}
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium me-1">{isAr ? "تمديد التجربة:" : "Extend trial:"}</span>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} className="w-24 h-9" min={1} />
              <span className="text-xs text-muted-foreground">{isAr ? "يوم" : "days"}</span>
                <Button size="sm" onClick={() => onAction(tenant.id, "owner_extend_trial", { days: Number(days) })} disabled={busy} className="gap-1.5">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />} {isAr ? "تمديد" : "Extend"}
                </Button>
              </div>
            </div>
          )}
          {(status === "trial" || status === "expired" || status === "active") && (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-medium">{isAr ? "تجديد سنوي (تسجيل الإيراد)" : "Annual renewal (record revenue)"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? "حدد الفترة والمبلغ وارفع الإيصال — يُسجَّل إيراد واحد لهذه الفترة دون تكرار." : "Set the period, amount and receipt — one revenue entry per period, never duplicated."}
                  </div>
                </div>
                <Button size="sm" onClick={() => setRenewOpen(true)} disabled={busy} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CalendarClock size={14} /> {isAr ? "تجديد سنوي" : "Renew year"}
                </Button>
              </div>
            </div>
          )}
          {(status === "trial" || status === "expired" || status === "active") && (
            <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-medium">{isAr ? "توليد / إعادة توليد العقد والفاتورة" : "Generate / re-generate contract & invoice"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? "إجراء منفصل لا يُسجّل أي إيراد — يمكنك تكراره في أي وقت سواء جدّدت للعميل أو لا." : "Separate action, records no revenue — repeat any time, whether the client renewed or not."}
                  </div>
                </div>
                <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={busy} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
                  <BadgeCheck size={14} /> {isAr ? "توليد المستندات" : "Generate documents"}
                </Button>
              </div>
            </div>
          )}
          {(status === "trial" || status === "active") && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onAction(tenant.id, "owner_suspend")} disabled={busy} className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />} {isAr ? "إيقاف مؤقت" : "Suspend"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onAction(tenant.id, "owner_cancel")} disabled={busy} className="gap-1.5 text-rose-600">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} {isAr ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          )}
          {status === "expired" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onAction(tenant.id, "owner_restore")} disabled={busy} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {isAr ? "استرجاع من الإيقاف" : "Restore"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onAction(tenant.id, "owner_cancel")} disabled={busy} className="gap-1.5 text-rose-600">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} {isAr ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          )}
          {status === "cancelled" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onAction(tenant.id, "owner_restore")} disabled={busy} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} {isAr ? "استرجاع العميل" : "Restore client"}
              </Button>
              {/* الحذف النهائي: يُحرّر رقم المنشأة الموحّد لتشترك مجدداً بنفس البيانات */}
              <Button size="sm" variant="outline" onClick={() => setDelOpen(true)} disabled={busy} className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50">
                <Trash2 size={14} /> {isAr ? "حذف نهائي" : "Permanent delete"}
              </Button>
            </div>
          )}
        </div>
        )}
      </div>
      <ConfirmSubscriptionDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); if (onRefresh) onRefresh(); }}
        tenant={tenant}
        isAr={isAr}
        session={session}
        onSaved={() => { if (onRefresh) onRefresh(); }}
      />
      <RenewYearDialog
        open={renewOpen}
        onClose={() => { setRenewOpen(false); if (onRefresh) onRefresh(); }}
        tenant={tenant}
        isAr={isAr}
        session={session}
        onSaved={() => { if (onRefresh) onRefresh(); }}
      />
      <DeleteTenantDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        tenant={tenant}
        isAr={isAr}
        session={session}
        onDeleted={async () => { if (onRefresh) await onRefresh(); onClose(); }}
      />
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium truncate">{v}</span>
    </div>
  );
}