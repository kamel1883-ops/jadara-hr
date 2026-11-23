import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserPlus, KeyRound, Loader2, ArrowRight, Fingerprint } from "lucide-react";
import {
  passkeySupported, platformAuthenticatorAvailable,
  registerPasskey, loginWithPasskey, passkeyHint,
} from "@/lib/passkey";
import { cn } from "@/lib/utils";
import { usePortalI18n, usePortalT, portalDir } from "@/lib/portalI18n";

// بطاقة مصادقة بوابة الموظف — ثلاثة تبويبات:
// دخول (إقامة + كلمة مرور)، إنشاء حساب (إقامة + ميلاد مرة واحدة + كلمة مرور)،
// نسيت كلمة المرور (إقامة → رمز بالبريد → كلمة مرور جديدة).

function errText(t, err) {
  const e = String(err || "").toLowerCase();
  if (!e) return t.invalid;
  if (e.includes("rate_limited")) return t.rateLimited;
  if (e.includes("needs_registration")) return t.needsReg;
  if (e.includes("inactive")) return t.inactive;
  if (e.includes("owner_use_owner_portal")) return t.ownerPortal;
  if (e.includes("already_registered")) return t.alreadyReg;
  if (e.includes("no_birth_date")) return t.noBirthDate;
  if (e.includes("not_matched")) return t.notMatched;
  if (e.includes("weak_password")) return t.weak;
  if (e.includes("no_email")) return t.noEmail;
  if (e.includes("email_failed")) return t.emailFailed;
  if (e.includes("invalid_code")) return t.invalidCode;
  if (e.includes("expired_code")) return t.expiredCode;
  if (e.includes("locked")) return t.locked;
  if (e.includes("captcha")) return t.captchaReq;
  if (e.includes("invalid_credentials")) return t.invalid;
  return e;
}

export default function PortalAuthCard({ onAuthenticated }) {
  const { lang } = usePortalI18n();
  const t = usePortalT("portalAuth");
  const isRtl = portalDir(lang) === "rtl";

  const [mode, setMode] = useState("login");
  const [nid, setNid] = useState("");
  const [pwd, setPwd] = useState("");
  const [birth, setBirth] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [info, setInfo] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpUid, setOtpUid] = useState("");

  // ── الدخول السريع (بصمة/وجه/رمز الجهاز) ─────────────────────────────
  // بعد دخول ناجح بكلمة المرور نعرض تفعيله مرة واحدة؛ ويظهر زر «دخول سريع»
  // في شاشة الدخول إذا كان الجهاز مسجلاً مسبقاً.
  const hint = passkeyHint.load();
  const [canQuick, setCanQuick] = useState(!!hint);
  const [offerRegister, setOfferRegister] = useState(null); // { token, nationalId }
  const [quickBusy, setQuickBusy] = useState(false);

  const passkeyLabels = isRtl
    ? {
        quick: "دخول سريع بالبصمة أو رمز الجهاز",
        quickHint: "استخدم البصمة أو الوجه أو رمز شاشة جهازك — بدون كلمة مرور.",
        enable: "تفعيل الدخول السريع",
        enableHint: "فعّل البصمة أو الوجه أو رمز شاشة جهازك للدخول مباشرة في المرة القادمة.",
        later: "لاحقاً",
        enabled: "تم تفعيل الدخول السريع على هذا الجهاز.",
        failed: "تعذّر التحقق من الجهاز. يمكنك الدخول بكلمة المرور.",
        cancelled: "أُلغي التحقق من الجهاز.",
        unsupported: "جهازك أو متصفحك لا يدعم الدخول السريع.",
      }
    : {
        quick: "Quick sign-in with biometrics or device passcode",
        quickHint: "Use your fingerprint, face or device passcode — no password needed.",
        enable: "Enable quick sign-in",
        enableHint: "Use your fingerprint, face or device passcode to sign in next time.",
        later: "Later",
        enabled: "Quick sign-in is now enabled on this device.",
        failed: "Could not verify this device. You can sign in with your password.",
        cancelled: "Device verification was cancelled.",
        unsupported: "Your device or browser does not support quick sign-in.",
      };

  const doEnablePasskey = async () => {
    if (!offerRegister) return;
    setQuickBusy(true); setMsg({ type: "", text: "" }); setInfo("");
    try {
      const ok = await platformAuthenticatorAvailable();
      if (!ok) { setMsg({ type: "err", text: passkeyLabels.unsupported }); return; }
      const out = await registerPasskey({
        base44,
        portalToken: offerRegister.token,
        nationalId: offerRegister.nationalId,
      });
      if (out?.ok) {
        const pending = offerRegister.pending;
        setOfferRegister(null);
        setCanQuick(true);
        setInfo(passkeyLabels.enabled);
        if (pending) onAuthenticated(pending);
      } else {
        setMsg({ type: "err", text: out?.message || passkeyLabels.failed });
      }
    } catch (e) {
      const name = String(e?.name || "");
      setMsg({ type: "err", text: name === "NotAllowedError" ? passkeyLabels.cancelled : passkeyLabels.failed });
    } finally { setQuickBusy(false); }
  };

  const doQuickLogin = async () => {
    const h = passkeyHint.load();
    if (!h) { setCanQuick(false); return; }
    setQuickBusy(true); setMsg({ type: "", text: "" }); setInfo("");
    try {
      const out = await loginWithPasskey({
        base44,
        nationalId: h.nationalId,
        credentialId: h.credentialId,
      });
      if (out?.ok) {
        setQuickBusy(false);
        onAuthenticated({
          token: out.token,
          employee_id: out.employee.id,
          employee: out.employee,
          org: out.org,
          expires_at: out.expires_at,
        });
        return;
      }
      setMsg({ type: "err", text: passkeyLabels.failed });
    } catch (e) {
      const name = String(e?.name || "");
      setMsg({ type: "err", text: name === "NotAllowedError" ? passkeyLabels.cancelled : (e?.message || passkeyLabels.failed) });
    } finally { setQuickBusy(false); }
  };

  const switchMode = (m) => {
    setMode(m);
    setMsg({ type: "", text: "" });
    setInfo("");
    setOtpSent(false);
    setOtp("");
    if (m !== "forgot") { setPwd(""); setConfirm(""); }
    setBirth("");
  };

  const header =
    mode === "login"
      ? { icon: <ShieldCheck size={22} className="text-violet-600" />, title: t.cardTitle, desc: t.cardDesc }
      : mode === "register"
      ? { icon: <UserPlus size={22} className="text-violet-600" />, title: t.regTitle, desc: t.regDesc }
      : { icon: <KeyRound size={22} className="text-violet-600" />, title: t.forgotTitle, desc: t.forgotDesc };

  const doLogin = async (e) => {
    e.preventDefault();
    const id = nid.trim();
    if (!id || !pwd) return;
    setBusy(true); setMsg({ type: "", text: "" }); setInfo("");
    try {
      const res = await base44.functions.invoke("verifyEmployeePortal", {
        national_id: id, password: pwd,
      });
      const data = res?.data || res;
      if (data?.ok) {
        // بعد دخول ناجح: نعرض تفعيل الدخول السريع أولاً إن كان الجهاز يدعمه،
        // ثم نكمل الدخول عند التفعيل أو عند اختيار «لاحقاً».
        const supported = passkeySupported() && await platformAuthenticatorAvailable();
        if (supported) {
          setOfferRegister({
            token: data.token,
            nationalId: id,
            pending: {
              token: data.token,
              employee_id: data.employee.id,
              employee: data.employee,
              org: data.org,
              expires_at: data.expires_at,
            },
          });
        } else {
          onAuthenticated({
            token: data.token,
            employee_id: data.employee.id,
            employee: data.employee,
            org: data.org,
            expires_at: data.expires_at,
          });
        }
        setNid(""); setPwd("");
      } else {
        setMsg({ type: "err", text: errText(t, data?.error) });
      }
    } catch (err) {
      setMsg({ type: "err", text: errText(t, err?.response?.data?.error || err?.message) });
    } finally { setBusy(false); }
  };

  const doRegister = async (e) => {
    e.preventDefault();
    const id = nid.trim();
    if (!id || !birth || !pwd) return;
    if (pwd.length < 6) { setMsg({ type: "err", text: t.weak }); return; }
    if (pwd !== confirm) { setMsg({ type: "err", text: t.mismatch }); return; }
    setBusy(true); setMsg({ type: "", text: "" }); setInfo("");
    try {
      const res = await base44.functions.invoke("registerEmployeePortal", {
        national_id: id, birth_date: birth, new_password: pwd,
      });
      const data = res?.data || res;
      if (data?.ok) {
        setNid(""); setBirth(""); setPwd(""); setConfirm("");
        setMode("login");
        setInfo(t.regSuccess);
      } else {
        setMsg({ type: "err", text: errText(t, data?.error) });
      }
    } catch (err) {
      setMsg({ type: "err", text: errText(t, err?.response?.data?.error || err?.message) });
    } finally { setBusy(false); }
  };

  const doSendOtp = async (e) => {
    e.preventDefault();
    const id = nid.trim();
    if (!id) return;
    setBusy(true); setMsg({ type: "", text: "" }); setInfo("");
    try {
      const res = await base44.functions.invoke("employeeForgotPassword", {
        national_id: id,
      });
      const data = res?.data || res;
      if (data?.ok) {
        setOtpSent(true);
        setOtpUid(id);
        setInfo(t.otpSent(data.email_hint || ""));
      } else {
        setMsg({ type: "err", text: errText(t, data?.error) });
      }
    } catch (err) {
      setMsg({ type: "err", text: errText(t, err?.response?.data?.error || err?.message) });
    } finally { setBusy(false); }
  };

  const doReset = async (e) => {
    e.preventDefault();
    const id = otpUid || nid.trim();
    if (!id || !otp || !pwd) return;
    if (pwd.length < 6) { setMsg({ type: "err", text: t.weak }); return; }
    if (pwd !== confirm) { setMsg({ type: "err", text: t.mismatch }); return; }
    setBusy(true); setMsg({ type: "", text: "" }); setInfo("");
    try {
      const res = await base44.functions.invoke("employeeResetPassword", {
        national_id: id, otp_code: otp, new_password: pwd,
      });
      const data = res?.data || res;
      if (data?.ok) {
        setNid(""); setOtp(""); setPwd(""); setConfirm(""); setOtpSent(false);
        setMode("login");
        setInfo(t.resetSuccess);
      } else {
        setMsg({ type: "err", text: errText(t, data?.error) });
      }
    } catch (err) {
      setMsg({ type: "err", text: errText(t, err?.response?.data?.error || err?.message) });
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-border p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          {header.icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">{header.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{header.desc}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-border">
        {[["login", t.tabLogin], ["register", t.tabRegister], ["forgot", t.tabForgot]].map(([m, label]) => (
          <button key={m} type="button" onClick={() => switchMode(m)}
            className={cn("px-3 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap",
              mode === m ? "border-violet-500 text-violet-700" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {info && (
        <div className="mb-4 text-sm rounded-lg p-3 bg-emerald-50 text-emerald-700 leading-relaxed border border-emerald-100">{info}</div>
      )}
      {msg.text && (
        <div className={cn("mb-4 text-sm rounded-lg p-3 leading-relaxed",
          msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{msg.text}</div>
      )}

      {mode === "login" && canQuick && (
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
          <Button type="button" onClick={doQuickLogin} disabled={quickBusy} className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
            {quickBusy ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
            {passkeyLabels.quick}
          </Button>
          <p className="mt-2 text-[11px] text-violet-800 leading-relaxed">{passkeyLabels.quickHint}</p>
        </div>
      )}

      {offerRegister && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-900 leading-relaxed mb-2">{passkeyLabels.enableHint}</p>
          <div className="flex gap-2">
            <Button type="button" onClick={doEnablePasskey} disabled={quickBusy} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {quickBusy ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
              {passkeyLabels.enable}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={quickBusy}
              onClick={() => {
                const pending = offerRegister?.pending;
                setOfferRegister(null);
                if (pending) onAuthenticated(pending);
              }}
            >
              {passkeyLabels.later}
            </Button>
          </div>
        </div>
      )}

      {mode === "login" && (
        <form onSubmit={doLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.idLabel}</Label>
            <Input value={nid} onChange={(e) => setNid(e.target.value)} placeholder={t.idPh} required disabled={busy} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.pwdLabel}</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder={t.pwdPh} required disabled={busy} dir="ltr" />
          </div>
          <Button type="submit" disabled={busy} className="gap-2 w-full">
            {busy && <Loader2 size={16} className="animate-spin" />}{t.loginBtn}
          </Button>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={doRegister} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.idLabel}</Label>
            <Input value={nid} onChange={(e) => setNid(e.target.value)} placeholder={t.idPh} required disabled={busy} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.birthLabel}</Label>
            <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} required disabled={busy} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.newPwdLabel}</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder={t.newPwdPh} required disabled={busy} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.confirmPwdLabel}</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={busy} dir="ltr" />
          </div>
          <Button type="submit" disabled={busy} className="gap-2 w-full">
            {busy && <Loader2 size={16} className="animate-spin" />}{t.regBtn}
          </Button>
        </form>
      )}

      {mode === "forgot" && !otpSent && (
        <form onSubmit={doSendOtp} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.idLabel}</Label>
            <Input value={nid} onChange={(e) => setNid(e.target.value)} placeholder={t.idPh} required disabled={busy} dir="ltr" />
          </div>
          <Button type="submit" disabled={busy} className="gap-2 w-full">
            {busy && <Loader2 size={16} className="animate-spin" />}{t.sendOtpBtn}
          </Button>
        </form>
      )}

      {mode === "forgot" && otpSent && (
        <form onSubmit={doReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.otpLabel}</Label>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" required disabled={busy} dir="ltr" inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.newPwdLabel}</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder={t.newPwdPh} required disabled={busy} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.confirmPwdLabel}</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={busy} dir="ltr" />
          </div>
          <Button type="submit" disabled={busy} className="gap-2 w-full">
            {busy && <Loader2 size={16} className="animate-spin" />}{t.resetBtn}
          </Button>
          <button type="button" onClick={() => { setOtpSent(false); setInfo(""); setMsg({ type: "", text: "" }); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowRight size={14} style={{ transform: isRtl ? "none" : "scaleX(-1)" }} /> {t.back}
          </button>
        </form>
      )}
    </div>
  );
}