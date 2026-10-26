import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Trash2, KeyRound, Loader2, CheckCircle2, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// المستخدمون الإضافيون للمنشأة (حتى 4):
// مسؤول الموارد البشرية يضيف الاسم + البريد بنفس الرقم الموحّد، فيسجّل المفوّض
// حسابه بنفسه من صفحة تسجيل المنشأة (/company-register) بنفس البريد والرقم
// الموحّد ويحصل فوراً على كامل الصلاحيات — معزولاً تماماً على منشأته فقط.
// استعادة كلمة المرور وتغييرها من صفحة الدخول /company-forgot-password
// بنفس البريد والرقم الموحّد، أو بزر إرسال رابط الاستعادة أدناه.

const MAX_MEMBERS = 4;

export default function CompanyUsers({ unified }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "المستخدمون الإضافيون للمنشأة",
    note: "أضف حتى 4 مستخدمين مفوّضين بنفس الرقم الموحّد — كل مستخدم يحصل على كامل صلاحيات بوابة الشركات ولا يرى إلا منشأتك فقط. بعد الإضافة، يسجّل المفوّض حسابه بنفسه من صفحة تسجيل المنشأة بنفس البريد والرقم الموحّد.",
    name: "اسم المفوّض",
    email: "البريد الإلكتروني",
    add: "إضافة مستخدم",
    adding: "جارٍ الإضافة...",
    empty: "لا يوجد مستخدمون إضافيون بعد.",
    active: "نشط",
    inactive: "موقوف",
    pending: "بانتظار التسجيل",
    linked: "مسجّل",
    deactivate: "إيقاف",
    activate: "تفعيل",
    remove: "حذف",
    sendReset: "إرسال رابط استعادة",
    resetSent: "أُرسل رابط الاستعادة إلى البريد.",
    limit: "الحد الأقصى 4 مستخدمين إضافيين نشطين.",
    dup: "هذا البريد مضاف مسبقاً.",
    badEmail: "أدخل بريداً إلكترونياً صحيحاً.",
    noUnified: "احفظ الرقم الموحّد للمنشأة أولاً.",
    confirmDelete: "حذف هذا المستخدم نهائياً؟ لن يتمكن من دخول بوابة الشركات.",
    count: (n) => `${n} / ${MAX_MEMBERS}`,
  } : {
    title: "Extra company users",
    note: "Add up to 4 delegated users under the same unified number — each gets full company-portal permissions and only ever sees your company. After adding, the delegate registers himself on the company register page with the same email and unified number.",
    name: "Delegate name",
    email: "Email",
    add: "Add user",
    adding: "Adding...",
    empty: "No extra users yet.",
    active: "Active",
    inactive: "Suspended",
    pending: "Pending registration",
    linked: "Registered",
    deactivate: "Suspend",
    activate: "Activate",
    remove: "Delete",
    sendReset: "Send recovery link",
    resetSent: "Recovery link sent to the email.",
    limit: "Maximum 4 active extra users.",
    dup: "This email is already added.",
    badEmail: "Enter a valid email address.",
    noUnified: "Save the company unified number first.",
    confirmDelete: "Delete this user permanently? They will lose company-portal access.",
    count: (n) => `${n} / ${MAX_MEMBERS}`,
  };

  const un = String(unified || "").trim();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = async () => {
    if (!un) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.TenantMember.filter({ unified_number: un }, "-created_date", 50);
      setMembers(Array.isArray(list) ? list : (list?.items || []));
    } catch { setMembers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [un]);

  const activeCount = members.filter((m) => m.active !== false).length;

  const add = async () => {
    setMsg({ type: "", text: "" });
    const em = email.trim().toLowerCase();
    if (!un) { setMsg({ type: "err", text: t.noUnified }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { setMsg({ type: "err", text: t.badEmail }); return; }
    if (activeCount >= MAX_MEMBERS) { setMsg({ type: "err", text: t.limit }); return; }
    if (members.some((m) => String(m.email || "").trim().toLowerCase() === em)) { setMsg({ type: "err", text: t.dup }); return; }
    setBusy(true);
    try {
      let uid = "";
      try { uid = String((await base44.auth.me())?.id || ""); } catch {}
      await base44.entities.TenantMember.create({
        unified_number: un,
        email: em,
        name: name.trim(),
        active: true,
        created_by_user_id: uid,
      });
      setName(""); setEmail("");
      await load();
      setMsg({ type: "ok", text: isAr ? "تمت الإضافة — أبلغ المفوّض بالتسجيل من صفحة تسجيل المنشأة بنفس البريد والرقم الموحّد." : "Added — ask the delegate to register on the company register page with the same email and unified number." });
    } catch (e) {
      setMsg({ type: "err", text: e?.message || t.badEmail });
    } finally { setBusy(false); }
  };

  const toggle = async (m) => {
    setMsg({ type: "", text: "" });
    if (m.active === false) {
      if (activeCount >= MAX_MEMBERS) { setMsg({ type: "err", text: t.limit }); return; }
    }
    try {
      await base44.entities.TenantMember.update(m.id, { active: m.active === false });
      await load();
    } catch (e) { setMsg({ type: "err", text: e?.message || "" }); }
  };

  const remove = async (m) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await base44.entities.TenantMember.delete(m.id);
      await load();
    } catch (e) { setMsg({ type: "err", text: e?.message || "" }); }
  };

  const sendReset = async (m) => {
    setMsg({ type: "", text: "" });
    try {
      await base44.auth.resetPasswordRequest(String(m.email || "").trim().toLowerCase());
      setMsg({ type: "ok", text: t.resetSent });
    } catch (e) { setMsg({ type: "err", text: e?.message || "" }); }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-[#2e2448]/10 flex items-center justify-center text-[#2e2448]"><Users size={18} /></span>
        <h3 className="font-semibold text-foreground">{t.title}</h3>
        <span className="ms-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-muted tabular-nums">{t.count(activeCount)}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.note}</p>

      {msg.text && (
        <div className={`text-sm rounded-lg p-3 leading-relaxed ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700"}`}>{msg.text}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{t.name}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{t.email}</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" disabled={busy} />
        </div>
        <div className="flex items-end">
          <Button onClick={add} disabled={busy || loading || activeCount >= MAX_MEMBERS} className="gap-2 w-full sm:w-auto">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} {busy ? t.adding : t.add}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> ...</div>
      ) : members.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2.5 bg-slate-50/40">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{m.name || m.email}</div>
                <div className="text-xs text-muted-foreground truncate" dir="ltr">{m.email}</div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${m.active === false ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                {m.active === false ? t.inactive : t.active}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
                {m.user_id ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {m.user_id ? t.linked : t.pending}
              </span>
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="outline" size="sm" onClick={() => toggle(m)}>
                  {m.active === false ? t.activate : t.deactivate}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => sendReset(m)} className="gap-1">
                  <KeyRound size={14} /> {t.sendReset}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(m)} className="text-rose-600 hover:text-rose-700">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
