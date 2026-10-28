import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DiscountManager from "@/components/portal/DiscountManager";
import ClientsManager from "@/components/portal/ClientsManager";
import SurveysManager from "@/components/portal/SurveysManager";
import FinanceManager from "@/components/portal/FinanceManager";
import AffiliatesManager from "@/components/portal/AffiliatesManager";
import SupportTicketsManager from "@/components/portal/SupportTicketsManager";
import DeletionRequestsManager from "@/components/portal/DeletionRequestsManager";
import StrategicPlan from "@/pages/StrategicPlan";
import Logo from "@/components/Logo";
import LanguageToggle from "@/components/LanguageToggle";
import OwnerNotificationsBell from "@/components/portal/OwnerNotificationsBell";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, ShieldCheck, Loader2, LogOut, ArrowRight, LogIn, KeyRound, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { portalSession } from "@/lib/portalSession";
import TurnstileWidget from "@/components/TurnstileWidget";

// بوابة المالك الذاتية — مستقلة عن بوابة الموظف. خاص بالمالك فقط (role_level = "owner")
// لإدارة العملاء والاشتراكات. الدخول برقم الإقامة وتاريخ الميلاد (نفس آلية التحقق).
export default function OwnerPortal() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    brandSub: "بوابة المالك الذاتية",
    back: "العودة للموقع", logout: "خروج",
    gTitle: "دخول بوابة المالك", gSubtitle: "بوابة خاصة بمالك منصة جداره فقط",
    gDesc: "أدخل رقم إقامتك وتاريخ ميلادك للتحقق. خاص بالمالك لإدارة العملاء والعقود وكودات الخصم، دون أي خدمات الموظف.",
    gIdLabel: "رقم الإقامة / الهوية الوطنية", gIdPh: "مثال: 2345678901",
    gBirthLabel: "تاريخ الميلاد", gBtn: "دخول البوابة",
    gFail: "البيانات غير مطابقة لسجل مالك مسجّل في النظام.",
    gInactive: "حالتك لا تسمح بالدخول للبوابة.",
    gCaptcha: "يرجى إكمال التحقق البشري أولاً.",
    gNote: "هذه البوابة خاصة بمالك النظام فقط.",
    notOwnerTitle: "هذه ليست صلاحيتك",
    notOwnerDesc: "هذه البوابة مخصّصة لمالك النظام فقط. إن كنت موظفاً فاستخدم بوابة الموظف.",
    goEmployee: "الانتقال إلى بوابة الموظف",
    loading: "جارٍ التحقق…",
  } : {
    brandSub: "Owner Self‑Service Portal",
    back: "Back to site", logout: "Sign out",
    gTitle: "Owner portal sign-in", gSubtitle: "For the Jadara platform owner only",
    gDesc: "Enter your Iqama/National ID number and your date of birth. Owner-only portal to manage clients, contracts and discount codes, no employee services.",
    gIdLabel: "Iqama / National ID number", gIdPh: "e.g. 2345678901",
    gBirthLabel: "Date of birth", gBtn: "Sign in",
    gFail: "These credentials do not match a registered owner.",
    gInactive: "Your status does not allow portal access.",
    gCaptcha: "Please complete the human verification first.",
    gNote: "This portal is for the system owner only.",
    notOwnerTitle: "Not your portal",
    notOwnerDesc: "This portal is for the system owner only. If you are an employee, use the employee portal.",
    goEmployee: "Go to employee portal",
    loading: "Verifying…",
  };

  const [session, setSession] = useState(() => portalSession.load());
  const [employee, setEmployee] = useState(session?.employee || null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("clients");

  // عند وجود جلسة محفوظة، نُتحقق منها خادمياً ونُحدّث بيانات المالك (role_level)
  // من المصدر — الجلسات القديمة قد تفتقد role_level أو تكون منتهية/بسرّ مُستبدل.
  // إن كان الرمز غير صالح نُفرغ الجلسة ليعود المالك لشاشة الدخول بدل التعليق.
  useEffect(() => {
    if (!session) return;
    setRefreshing(true);
    base44.functions.invoke("portalData", {
      token: session.token, employee_id: session.employee_id, action: "fetch",
    }).then((res) => {
      const d = res?.data || res;
      if (d?.ok && d.employee) {
        const updated = { ...session, employee: d.employee };
        portalSession.save(updated);
        setSession(updated);
        setEmployee(d.employee);
      } else if (d?.error === "invalid_session") {
        portalSession.clear();
        setSession(null); setEmployee(null);
      }
    }).catch(() => {}).finally(() => setRefreshing(false));
  }, [session?.token, session?.employee_id]);

  const [nid, setNid] = useState("");
  const [birth, setBirth] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [mode, setMode] = useState("login"); // login | forgot | reset
  const [password, setPassword] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [rCode, setRCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [capKey, setCapKey] = useState(0);
  const resetCaptcha = () => { setCaptchaToken(""); setCapKey((k) => k + 1); };

  const pt = isAr ? {
    pwLabel: "كلمة المرور", pwPh: "••••••••",
    forgot: "نسيت كلمة المرور؟",
    back: "العودة للدخول",
    forgotDesc: "أدخل رقم إقامتك وتاريخ ميلادك وبريدك الإلكتروني، وسنرسل رمز تحقق إلى بريدك.",
    emailLabel: "البريد الإلكتروني", emailPh: "owner@example.com",
    sendCode: "إرسال الرمز", codeSent: "تم إرسال رمز التحقق إلى بريدك الإلكتروني.",
    resetDesc: "أدخل الرمز الذي وصلك وكلمة المرور الجديدة.",
    codeLabel: "رمز التحقق (6 أرقام)", codePh: "123456",
    newPwLabel: "كلمة المرور الجديدة", newPwPh: "6 أحرف على الأقل",
    confirmPwLabel: "تأكيد كلمة المرور",
    mismatch: "كلمتا المرور غير متطابقتين.", weakPw: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
    resetBtn: "تعيين كلمة المرور",
    resetOk: "تم تعيين كلمة المرور بنجاح. يمكنك الدخول الآن.",
    setupHint: "أول مرة؟ استخدم «نسيت كلمة المرور» لضبط كلمة المرور الأولى.",
    setupRequired: "لم تُضبط كلمة المرور بعد. استخدم «نسيت كلمة المرور» لضبطها.",
    wrongPw: "كلمة المرور غير صحيحة.",
    codeExpired: "انتهت صلاحية الرمز.", codeInvalid: "رمز غير صحيح.",
  } : {
    pwLabel: "Password", pwPh: "••••••••",
    forgot: "Forgot password?", back: "Back to sign in",
    forgotDesc: "Enter your Iqama, birth date and email — we'll send a verification code.",
    emailLabel: "Email", emailPh: "owner@example.com",
    sendCode: "Send code", codeSent: "Verification code sent to your email.",
    resetDesc: "Enter the code you received and your new password.",
    codeLabel: "Verification code (6 digits)", codePh: "123456",
    newPwLabel: "New password", newPwPh: "At least 6 characters",
    confirmPwLabel: "Confirm password",
    mismatch: "Passwords don't match.", weakPw: "Password must be at least 6 characters.",
    resetBtn: "Set password",
    resetOk: "Password set successfully. You can sign in now.",
    setupHint: "First time? Use \"Forgot password\" to set your initial password.",
    setupRequired: "No password set yet. Use \"Forgot password\" to set it.",
    wrongPw: "Incorrect password.", codeExpired: "Code expired.", codeInvalid: "Invalid code.",
  };

  const apiErrText = (err, fallback) => err?.response?.data?.error || err?.message || fallback;

  const handleLogin = async (e) => {
    e.preventDefault();
    const id = nid.trim(), bd = birth.trim();
    if (!id || !bd || !password || !captchaToken) return;
    setSigningIn(true); setMsg({ type: "", text: "" });
    try {
      const res = await base44.functions.invoke("verifyOwnerLogin", {
        iqama: id, birth_date: bd, password, captcha_token: captchaToken,
      });
      const data = res?.data || res;
      if (data?.ok) {
        portalSession.save({ token: data.token, employee_id: data.employee.id, employee: data.employee, org: data.org, expires_at: data.expires_at });
        setSession(portalSession.load()); setEmployee(data.employee);
        setNid(""); setBirth(""); setPassword("");
      } else {
        const m = data?.error === "setup_required" ? pt.setupRequired : data?.error === "wrong_password" ? pt.wrongPw : data?.error === "captcha" ? t.gCaptcha : t.gFail;
        setMsg({ type: "err", text: m });
        resetCaptcha();
      }
    } catch (err) { setMsg({ type: "err", text: apiErrText(err, t.gFail) }); resetCaptcha(); }
    finally { setSigningIn(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    const id = nid.trim(), bd = birth.trim();
    if (!id || !bd || !fEmail.trim() || !captchaToken) return;
    setSigningIn(true); setMsg({ type: "", text: "" });
    try {
      const res = await base44.functions.invoke("ownerForgotPassword", {
        iqama: id, birth_date: bd, email: fEmail.trim(), captcha_token: captchaToken,
      });
      const data = res?.data || res;
      if (data?.ok) { setMsg({ type: "ok", text: pt.codeSent }); setMode("reset"); resetCaptcha(); }
      else if (data?.error === "email_failed") { setMsg({ type: "err", text: isAr ? "تعذّر إرسال الرمز — تأكد أن بريد المالك مسجّل كمستخدم في التطبيق، ثم أعد المحاولة." : "Could not send the code — ensure the owner email is a registered app user, then retry." }); resetCaptcha(); }
      else if (data?.error === "captcha") { setMsg({ type: "err", text: t.gCaptcha }); resetCaptcha(); }
      else { setMsg({ type: "err", text: t.gFail }); resetCaptcha(); }
    } catch (err) { setMsg({ type: "err", text: apiErrText(err, t.gFail) }); resetCaptcha(); }
    finally { setSigningIn(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) { setMsg({ type: "err", text: pt.weakPw }); return; }
    if (newPw !== newPw2) { setMsg({ type: "err", text: pt.mismatch }); return; }
    if (!captchaToken) return;
    setSigningIn(true); setMsg({ type: "", text: "" });
    try {
      const res = await base44.functions.invoke("ownerResetPassword", { reset_code: rCode.trim(), new_password: newPw, captcha_token: captchaToken });
      const data = res?.data || res;
      if (data?.ok) { setMsg({ type: "ok", text: pt.resetOk }); setMode("login"); setRCode(""); setNewPw(""); setNewPw2(""); setPassword(""); resetCaptcha(); }
      else { setMsg({ type: "err", text: data?.error === "expired_code" ? pt.codeExpired : data?.error === "captcha" ? t.gCaptcha : pt.codeInvalid }); resetCaptcha(); }
    } catch (err) { setMsg({ type: "err", text: apiErrText(err, isAr ? "خطأ." : "Error.") }); resetCaptcha(); }
    finally { setSigningIn(false); }
  };

  const handleLogout = () => {
    portalSession.clear();
    setSession(null); setEmployee(null);
    setMsg({ type: "", text: "" });
  };

  const isOwner = employee?.role_level === "owner";

  const Header = () => (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-[#F6F3FC] to-[#EFE9F8] text-[#2A2340] border-b border-[#E2D6F4]">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo tone="dark" size={40} />
          <span className="hidden sm:inline text-sm text-[#6B5E8C] border-r border-[#E2D6F4] pr-3">{t.brandSub}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* إشعارات المالك = إشعارات العمل فقط (تجارب/اشتراكات/مدفوعات) — لا موظفين ولا منشآت */}
          <OwnerNotificationsBell isAr={isAr} align={isAr ? "left" : "right"} />
          <LanguageToggle />
          <Link to="/" className="text-sm text-[#6B5E8C] hover:text-[#2A2340] px-3 py-2 rounded-lg hidden sm:block hover:bg-white/60 transition">{t.back}</Link>
          {session && (
            <button type="button" onClick={handleLogout} className="text-sm bg-white/70 hover:bg-white border border-[#E8DEF7] text-[#6B5E8C] hover:text-[#2A2340] px-3 py-2 rounded-lg flex items-center gap-1.5 transition">
              <LogOut size={15} /> {t.logout}
            </button>
          )}
        </div>
      </div>
    </header>
  );

  // ——— شاشة الدخول ———
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F6F3FC] to-[#EFE9F8]">
        <Header />
        <div className="max-w-xl mx-auto px-5 py-12">
          <div className="bg-white rounded-2xl border border-border p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                <Crown size={22} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold">{t.gTitle}</h3>
                <p className="text-xs text-muted-foreground">{t.gSubtitle}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-5">{t.gDesc}</p>
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t.gIdLabel}</Label>
                  <Input value={nid} onChange={(e) => setNid(e.target.value)} placeholder={t.gIdPh} required disabled={signingIn} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.gBirthLabel}</Label>
                  <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} required disabled={signingIn} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>{pt.pwLabel}</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={pt.pwPh} required disabled={signingIn} dir="ltr" />
                </div>
                <TurnstileWidget key={`cap-${capKey}`} onToken={setCaptchaToken} />
                {msg.text && (
                  <div className={cn("text-sm rounded-lg p-3 leading-relaxed", msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{msg.text}</div>
                )}
                <Button type="submit" disabled={signingIn || !captchaToken} className="gap-2 w-full">
                  {signingIn ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} {t.gBtn}
                </Button>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => { setMode("forgot"); setMsg({ type: "", text: "" }); resetCaptcha(); }} className="text-xs text-violet-600 hover:underline">{pt.forgot}</button>
                </div>
                <p className="text-xs text-amber-600 leading-relaxed">{pt.setupHint}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.gNote}</p>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="rounded-lg bg-violet-50 text-violet-700 text-xs p-3 leading-relaxed">{pt.forgotDesc}</div>
                <div className="space-y-1.5">
                  <Label>{t.gIdLabel}</Label>
                  <Input value={nid} onChange={(e) => setNid(e.target.value)} placeholder={t.gIdPh} required disabled={signingIn} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.gBirthLabel}</Label>
                  <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} required disabled={signingIn} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>{pt.emailLabel}</Label>
                  <Input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder={pt.emailPh} required disabled={signingIn} dir="ltr" />
                </div>
                <TurnstileWidget key={`cap-forgot-${capKey}`} onToken={setCaptchaToken} />
                {msg.text && (
                  <div className={cn("text-sm rounded-lg p-3 leading-relaxed", msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{msg.text}</div>
                )}
                <Button type="submit" disabled={signingIn || !captchaToken} className="gap-2 w-full">
                  {signingIn ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} {pt.sendCode}
                </Button>
                <button type="button" onClick={() => { setMode("login"); setMsg({ type: "", text: "" }); resetCaptcha(); }} className="text-xs text-muted-foreground hover:underline">{pt.back}</button>
              </form>
            )}

            {mode === "reset" && (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="rounded-lg bg-violet-50 text-violet-700 text-xs p-3 leading-relaxed">{pt.resetDesc}</div>
                <TurnstileWidget key={`cap-reset-${capKey}`} onToken={setCaptchaToken} />
                <div className="space-y-1.5">
                  <Label>{pt.codeLabel}</Label>
                  <Input value={rCode} onChange={(e) => setRCode(e.target.value)} placeholder={pt.codePh} required disabled={signingIn} dir="ltr" inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label>{pt.newPwLabel}</Label>
                  <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={pt.newPwPh} required disabled={signingIn} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>{pt.confirmPwLabel}</Label>
                  <Input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} required disabled={signingIn} dir="ltr" />
                </div>
                {msg.text && (
                  <div className={cn("text-sm rounded-lg p-3 leading-relaxed", msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{msg.text}</div>
                )}
                <Button type="submit" disabled={signingIn || !captchaToken} className="gap-2 w-full">
                  {signingIn ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} {pt.resetBtn}
                </Button>
                <button type="button" onClick={() => { setMode("login"); setMsg({ type: "", text: "" }); resetCaptcha(); }} className="text-xs text-muted-foreground hover:underline">{pt.back}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ——— جلسة لكن نتحقق من صلاحية المالك ———
  if (session && !employee?.role_level) {
    return (
      <div className="min-h-screen bg-[#F8F6FC]">
        <Header />
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
          {refreshing && <Loader2 className="animate-spin" size={24} />}
          <p className="text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  // ——— جلسة لكن صلاحية غير مالك ———
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F6F3FC] to-[#EFE9F8]">
        <Header />
        <div className="max-w-xl mx-auto px-5 py-16">
          <div className="bg-white rounded-2xl border border-border p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={26} className="text-rose-500" />
            </div>
            <h3 className="font-semibold text-lg">{t.notOwnerTitle}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t.notOwnerDesc}</p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              <Link to="/portal">
                <Button variant="outline" className="gap-2"><ArrowRight size={16} /> {t.goEmployee}</Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout} className="gap-2"><LogOut size={16} /> {t.logout}</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ——— لوحة المالك ——— العملاء والعقود + كودات الخصم
  const tabCls = (k) => cn("px-4 py-2 rounded-full text-sm font-semibold border transition",
    tab === k ? "bg-gradient-to-l from-[#7C5CE6] to-[#A78BFA] text-white border-transparent shadow-sm shadow-violet-300/40" : "bg-white border-[#E8DEF7] text-[#4A3F66] hover:border-[#C9B8EE] hover:text-[#2A2340]");
  return (
    <div className="min-h-screen bg-[#F8F6FC]">
      <Header />
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setTab("clients")} className={tabCls("clients")}>{isAr ? "العملاء والعقود" : "Clients & Contracts"}</button>
          <button onClick={() => setTab("surveys")} className={tabCls("surveys")}>{isAr ? "استبيانات العميل" : "CX Surveys"}</button>
          <button onClick={() => setTab("finance")} className={tabCls("finance")}>{isAr ? "العمليات المالية" : "Finance"}</button>
          <button onClick={() => setTab("affiliates")} className={tabCls("affiliates")}>{isAr ? "شركاء التسويق" : "Affiliates"}</button>
          <button onClick={() => setTab("discounts")} className={tabCls("discounts")}>{isAr ? "كودات الخصم" : "Discount Codes"}</button>
          <button onClick={() => setTab("support")} className={tabCls("support")}>{isAr ? "الدعم الفني" : "Tech Support"}</button>
          <button onClick={() => setTab("deletion")} className={tabCls("deletion")}>{isAr ? "طلبات حذف المنشآت" : "Deletion Requests"}</button>
          <button onClick={() => setTab("strategy")} className={tabCls("strategy")}>{isAr ? "الخطة الاستراتيجية" : "Strategic Plan"}</button>
        </div>
        {tab === "clients" ? <ClientsManager session={session} />
          : tab === "surveys" ? <SurveysManager session={session} />
          : tab === "affiliates" ? <AffiliatesManager session={session} isAr={isAr} />
          : tab === "finance" ? <FinanceManager session={session} isAr={isAr} />
          : tab === "strategy" ? <StrategicPlan session={session} />
          : tab === "support" ? <SupportTicketsManager session={session} isAr={isAr} />
          : tab === "deletion" ? <DeletionRequestsManager session={session} isAr={isAr} />
          : <DiscountManager session={session} />}
      </div>
    </div>
  );
}