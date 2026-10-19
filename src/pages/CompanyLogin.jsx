import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Lock, Hash, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import TurnstileWidget from "@/components/TurnstileWidget";
import AssistantAvatar from "@/components/AssistantAvatar";
import { useNativeGate } from "@/components/NativeAppNotice";
import { useI18n } from "@/lib/i18n";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function CompanyLogin() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const navigate = useNavigate();
  const { gate, notice } = useNativeGate();
  const t = isAr
    ? {
        title: "بوابة الشركات",
        subtitle: "الدخول مخصص للمنشآت — البريد + الرقم الوطني الموحد للمنشآت + كلمة المرور",
        email: "البريد الإلكتروني",
        unified: "الرقم الوطني الموحد للمنشآت (10 خانات تبدأ بـ7)",
        password: "كلمة المرور",
        forgot: "نسيت كلمة المرور؟",
        signing: "جارٍ التحقق وتسجيل الدخول...",
        submit: "دخول المنشأة",
        errUnified: "الرقم الوطني الموحد للمنشآت يجب أن تكون 10 خانات تبدأ بـ7",
        errCreds: "بيانات المنشأة غير مطابقة. تأكد من البريد والرقم الوطني الموحد للمنشآت.",
        errLogin: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        noAccount: "ليس لديك حساب منشأة بعد؟",
        register: "سجّل حسابك",
        noTrialYet: "لم تطلب عرض سعر؟",
        create: "اطلب عرض سعر",
        back: "العودة للرئيسية",
      }
    : {
        title: "Company Portal",
        subtitle: "Sign-in for organizations — Email + National Unified Number + Password",
        email: "Email",
        unified: "National Unified Number (10 digits, starts with 7)",
        password: "Password",
        forgot: "Forgot password?",
        signing: "Verifying and signing in...",
        submit: "Sign in",
        errUnified: "National Unified Number must be 10 digits starting with 7",
        errCreds: "Organization credentials do not match. Verify email and National Unified Number.",
        errLogin: "Invalid email or password",
        noAccount: "Don't have a company account?",
        register: "Register your account",
        noTrialYet: "Haven't requested a quote?",
        create: "Request a quote",
        back: "Back to home",
      };

  const [email, setEmail] = useState("");
  const [unified, setUnified] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const u = unified.replace(/\D/g, "");
    if (!/^7\d{9}$/.test(u)) { setError(t.errUnified); return; }
    const em = email.trim().toLowerCase();
    if (!captchaToken) { setError(isAr ? "أكّد أنك لست روبوت" : "Please verify you're human"); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("verifyTenantCredentials", {
        email: em,
        unified_number: u,
        turnstileToken: captchaToken,
      });
      if (!res?.data?.valid) { setError(t.errCreds); return; }
      await base44.auth.loginViaEmailPassword(em, password);
      // بعد الدخول: ادخل التطبيق (وليس صفحة الهبوط العامة) ما لم يوجد returnTo صريح.
      window.location.href = returnTo && returnTo !== "/" ? returnTo : "/app";
    } catch (err) {
      setError(err?.message || t.errLogin);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <AssistantAvatar mode="public" tone="dark" lang={lang} />
    <AuthLayout
      icon={Building2}
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <div className="flex flex-col items-center gap-1.5">
          <span>{t.noAccount}{" "}
            <button type="button" onClick={() => gate(() => navigate("/company-register"))} className="text-primary font-medium hover:underline">{t.register}</button>
          </span>
          <Link to="/" className="text-xs text-muted-foreground hover:underline">{t.back}</Link>
        </div>
      }
    >
      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-email">{t.email}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="company-email" type="email" autoComplete="email" autoFocus placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="company-unified">{t.unified}</Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="company-unified" inputMode="numeric" autoComplete="off" placeholder="7XXXXXXXX"
              value={unified} onChange={(e) => setUnified(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="pl-10 h-12" dir="ltr" required />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="company-password">{t.password}</Label>
            <Link to="/company-forgot-password" className="text-xs text-primary hover:underline">{t.forgot}</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="company-password" type="password" autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <TurnstileWidget onToken={setCaptchaToken} className="mt-2" />
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !captchaToken}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.signing}</>) : t.submit}
        </Button>
      </form>
    </AuthLayout>
    {notice}
    </>
  );
}