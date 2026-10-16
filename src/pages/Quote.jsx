import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Logo from "@/components/Logo";
import LanguageToggle from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Loader2, ArrowLeft, Copy, Check, MessageCircle, ShieldCheck, AlertTriangle, Building2, Sparkles, UserPlus, Banknote } from "lucide-react";
import { PRICING_TIERS_AR, PRICING_TIERS_EN, tierForCount } from "@/lib/pricing";
import TurnstileWidget from "@/components/TurnstileWidget";
import { isNativeApp, NativeAppBlocked } from "@/components/NativeAppNotice";
import { getReferral } from "@/lib/referral";
import { PROVIDER_BANK, IBAN_CERT_URL } from "@/lib/providerIdentity";
import ProviderStamp from "@/components/docs/ProviderStamp";

const WHATSAPP_NUMBER = "0594700782";
const WHATSAPP_LINK = "https://wa.me/966594700782";
const SALES_EMAIL = "info@jadara-hr.com";

const featuresAr = [
  "إدارة الموظفين", "الحضور والانصراف (بصمة ذاتية)", "إدارة الإجازات والموافقات",
  "رحلات العمل والانتداب", "إدارة الرواتب", "التأمينات الاجتماعية (GOSI)",
  "نهاية الخدمة", "إدارة الأداء", "التخطيط التعاقبي", "الهيكل التنظيمي",
  "تخطيط القوة العاملة", "تحليلات الموارد البشرية", "إدارة الأسطول والمركبات",
  "تراخيص المنشأة الحكومية", "التكاملات الذكية", "بوابة تجربة العميل",
  "سياسة العمل والإنذارات الذكية", "بوابة الموظف الذاتية",
];
const featuresEn = [
  "Employee Management", "Attendance & Self Check-in", "Leaves & Approvals",
  "Business Trips & Deputation", "Payroll", "GOSI (Social Insurance)",
  "End of Service", "Performance Management", "Succession Planning",
  "Organization Structure", "Workforce Planning", "HR Analytics",
  "Fleet & Vehicles", "Government Licenses", "Smart Integrations",
  "Client Trial Portal", "Labor Policy & Smart Warnings", "Employee Self-Service Portal",
];

const empty = { name: "", commercial_register: "", industry: "", contact_name: "", contact_email: "", contact_phone: "", unified_number: "", city: "", discount_code: "", employee_count: "" };

export default function Quote() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const location = useLocation();
  const t = isAr ? {
    pageTitle: "عرض سعر — الاشتراك السنوي",
    barBack: "العودة للرئيسية", barPrint: "طباعة / حفظ PDF",
    formTitle: "بيانات المنشأة", formSub: "أدخل بيانات منشأتك لتوليد عرض سعر رسمي مع بيانات التحويل البنكي.",
    company: "اسم المنشأة *", industry: "القطاع / النشاط", contact: "اسم الشخص المسؤول",
    phone: "الهاتف *", email: "البريد الإلكتروني *", unified: "الرقم الوطني الموحد للمنشآت (10 خانات تبدأ بـ7) *", city: "المدينة",
    generate: "توليد عرض السعر", errForm: "الرجاء إدخال اسم المنشأة وبريد إلكتروني صحيح والرقم الوطني الموحد للمنشآت (10 خانات تبدأ بـ7) وعدد موظفين متوقع",
    errGeneric: "تعذّر توليد العرض، حاول مرة أخرى", secure: "بياناتك آمنة ولن تُباع لأي طرف ثالث",
    to: "إلى", quoteNo: "رقم العرض", date: "التاريخ", planTitle: "الاشتراك السنوي — منصة جداره",
    planDesc: "باقة واحدة متكاملة تشمل كل ميزات المنصة:", includes: "تشمل الباقة:",
    planTier: "شريحة الاشتراك", planTierRange: "نطاق الموظفين", planPrice: "السعر السنوي للباقة",
    renewNote: "يتجدد الاشتراك سنوياً بنفس قيمة شريحتك (حسب عدد الموظفين وقت التجديد).",
    headcountLabel: "عدد الموظفين المتوقع *", headcountHint: (tier, price) => `شريحتك: ${tier} — السعر السنوي: ${price.toLocaleString()} ريال`,
    headcountRequired: "أدخل عدد الموظفين المتوقع لحساب سعر الباقة تلقائياً",
    errCaptcha: "أكّد أنك لست روبوت",
    errPhone: "رقم الهاتف يجب أن يكون 10 أرقام على الأقل (مثال: 05XXXXXXXX)",
    beneficiary: "اسم المستفيد", bank: "البنك", iban: "رقم الآيبان (IBAN)", account: "رقم الحساب",
    copy: "نسخ الآيبان", copied: "تم النسخ",
    transferTitle: "تفعيل الاشتراك عبر التحويل البنكي",
    transferNote: "حول المبلغ الموضّح أعلاه إلى حسابنا البنكي في بنك STC، ثم أرسل صورة إيصال التحويل عبر واتساب إلى رقم الدعم الفني. سيتم تأكيد اشتراكك وتفعيل الحساب خلال 24 ساعة.",
    sendReceipt: "أرسل إيصال التحويل على واتساب لتفعيل الحساب",
    waSupport: "الدعم الفني (واتساب)",
    openWhatsApp: "إرسال عبر واتساب الآن",
    bankSection: "بيانات التحويل البنكي",
    amountDue: "المبلغ المستحق (سنوياً)",
    sigName: "المدير العام — وليد حسن القروص",
    stamp: "جداره لإدارة الموارد البشرية",
    discCode: "كود الخصم (اختياري)",
    beforeDiscLabel: "القيمة الإجمالية قبل الخصم",
    discBadge: "نسبة الخصم", discApplied: "قيمة الخصم المُخصومة",
    netLabel: "المبلغ بعد الخصم",
    emailNotice: "تنويه مهم",
    emailNoticeBody: "الرقم الوطني الموحد للمنشآت (10 خانات تبدأ بـ7) هو معرّف منشأتكم الرسمي في المنصة. عند إتمام التحويل، سجّلوا في بوابة الشركات بهذا الرقم الوطني الموحّد وبنفس البريد المسجل هنا لتفعيل اشتراككم وإدارة حسابكم.",
    activateTitle: "أنشئ حسابك وكلمة مرورك للدخول لبوابة الشركات",
    activateNote: "تجربتك المجانية مفعّلة بالرقم الموحّد المسجّل وأنتقل المبلغ بانتظار تأكيد التحويل. أنشئ حسابك بنفس البريد والرقم الموحّد الآن لتدخل بوابة الشركات وتستفيد من كل المميزات — حتى يصلك تأكيد الاشتراك السنوي مع العقد والفاتورة من فريقنا.",
    activateBtn: "إنشاء الحساب والدخول للبوابة",
    activateHint: "بوابة الشركات تتيح: إدارة الموظفين، الحضور والرواتب، الإجازات والسلف، نهاية الخدمة، التحليلات، وكل ميزات جداره.",
    portalNote: "العميل يظهر تلقائياً في بوابة المالك، وعند وصول إيصال التحويل عبر واتساب يؤكد المالك الاشتراك ويولّد العقد والفاتورة ويُرسلهما لك.",
    trialFormSub: "أدخل بيانات منشأتك لإطلاق فترة التجربة المجانية 30 يوماً — بدون أي رسوم أو بطاقة ائتمان.",
    buyFormSub: "أدخل بيانات منشأتك لتوليد عرض سعر رسمي مع بيانات التحويل البنكي ورقم الدعم لتفعيل الاشتراك.",
    trialSubmit: "تأكيد إرسال طلب التجربة",
    buySubmit: "توليد عرض السعر",
    trialHeadcountNote: "عدد الموظفين يُساعدنا على تجهيز بيئة تجربتك — لن تُفرض أي رسوم خلال الـ 30 يوماً.",
    step1Badge: "الخطوة 1 من 2",
    trialDoneTitle: "تم تأكيد طلب تجربتك بنجاح",
    trialDoneNote: "تم إنشاء تجربتك المجانية لمدة 30 يوماً بالرقم الوطني الموحد المسجّل. أنشئ حسابك وكلمة مرورك الآن للدخول إلى بوابة الشركات والاستفادة من كل مميزات المنصة.",
    crDoc: "صورة من السجل التجاري",
    crDocHint: "إلزامي: يُرجى إرفاق صورة واضحة من السجل التجاري السعودي. يتم التحقق آلياً من أن الرقم الموحّد في الصورة يطابق الرقم الموحّد المُدخل لتأكيد ملكية المنشأة ومنع التسجيل بأرقام غير صحيحة.",
    errCrDoc: "إرفاق صورة من السجل التجاري إلزامي للتحقق من ملكية الرقم الموحّد",
    uploading: "جارٍ رفع السجل التجاري والتحقق منه...",
    uploadFail: "تعذّر رفع صورة السجل التجاري، حاول مرة أخرى",
  } : {
    pageTitle: "Quotation — Annual Subscription",
    barBack: "Back to home", barPrint: "Print / Save PDF",
    formTitle: "Company details", formSub: "Enter your company data to generate an official quotation with bank transfer details.",
    company: "Company name *", industry: "Sector / Activity", contact: "Responsible person",
    phone: "Phone *", email: "Email *", unified: "National Unified Number (10 digits, starts with 7) *", city: "City",
    generate: "Generate quotation", errForm: "Please enter a company name, a valid email, the National Unified Number (10 digits starting with 7), and the expected employee count",
    errGeneric: "Could not generate the quote, try again", secure: "Your data is safe and never sold to third parties",
    to: "To", quoteNo: "Quote no.", date: "Date", planTitle: "Annual Subscription — Jadara Platform",
    planDesc: "One integrated package including every feature of the platform:", includes: "The package includes:",
    planTier: "Subscription tier", planTierRange: "Headcount range", planPrice: "Annual package price",
    renewNote: "The subscription renews annually at your tier's value (based on headcount at renewal).",
    headcountLabel: "Expected employees count *", headcountHint: (tier, price) => `Your tier: ${tier} — Annual: ${price.toLocaleString()} SAR`,
    headcountRequired: "Enter the expected employee count to auto-calculate the package price",
    errCaptcha: "Please verify you're human",
    errPhone: "Phone number must be at least 10 digits (e.g. 05XXXXXXXX)",
    beneficiary: "Beneficiary", bank: "Bank", iban: "IBAN", account: "Account number",
    copy: "Copy IBAN", copied: "Copied",
    transferTitle: "Activate the subscription via bank transfer",
    transferNote: "Transfer the amount shown above to our STC Bank account, then send the transfer receipt photo via WhatsApp to our support number. Your subscription will be confirmed and account activated within 24 hours.",
    sendReceipt: "Send the transfer receipt on WhatsApp to activate your account",
    waSupport: "Support (WhatsApp)",
    openWhatsApp: "Send via WhatsApp now",
    bankSection: "Bank transfer details",
    amountDue: "Amount due (annual)",
    sigName: "General Manager — Walid Hassan Al-Qarous",
    stamp: "Jadara HR Management",
    discCode: "Discount code (optional)",
    beforeDiscLabel: "Total before discount",
    discBadge: "Discount rate", discApplied: "Deducted discount value",
    netLabel: "Amount after discount",
    emailNotice: "Important",
    emailNoticeBody: "The National Unified Number (10 digits starting with 7) is your organization's official identifier on the platform. After the transfer, register in the Companies portal with this National Unified Number and the same email entered here to activate your subscription and manage your account.",
    activateTitle: "Create your account & password to enter the company portal",
    activateNote: "Your free trial is active with your registered unified number; the transfer is pending confirmation. Create your account now with the same email and unified number to enter the company portal and enjoy every feature until you receive the subscription contract and invoice from our team.",
    activateBtn: "Create account & enter the portal",
    activateHint: "The company portal gives you: employee management, attendance & payroll, leaves & loans, end of service, analytics, and every Jadara feature.",
    portalNote: "The customer shows up automatically in the owner portal; when the transfer receipt arrives via WhatsApp, the owner confirms the subscription, generates the contract and invoice, and sends them to you.",
    trialFormSub: "Enter your company data to launch your 30-day free trial — no fees, no credit card.",
    buyFormSub: "Enter your company data to generate an official quotation with bank transfer details and support number for activation.",
    trialSubmit: "Confirm trial request",
    buySubmit: "Generate quotation",
    trialHeadcountNote: "The employee count helps us set up your trial environment — no fees during the 30 days.",
    step1Badge: "Step 1 of 2",
    trialDoneTitle: "Your trial request is confirmed",
    trialDoneNote: "Your 30-day free trial was created with your registered National Unified Number. Create your account and password now to enter the company portal and enjoy every platform feature.",
    crDoc: "Commercial Register image",
    crDocHint: "Required: please attach a clear image of the Saudi Commercial Register. The unified number in the image is automatically verified to match the entered number, confirming establishment ownership and preventing registration with incorrect numbers.",
    errCrDoc: "Attaching a Commercial Register image is required to verify ownership of the unified number",
    uploading: "Uploading and verifying the Commercial Register...",
    uploadFail: "Could not upload the Commercial Register image, try again",
  };

  const incoming = location.state?.company || null;
  const [company, setCompany] = useState(incoming);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(!!incoming);
  const [copied, setCopied] = useState(false);
  const [discount, setDiscount] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [contractProof, setContractProof] = useState(null);
  const [captcha, setCaptcha] = useState("");
  const [crFile, setCrFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [mode] = useState(() => (new URLSearchParams(location.search).get("tier") ? "buy" : "trial"));

  const pickTier = (tier) => {
    setSelectedTier(tier);
    set("employee_count", String(tier.min));
    setTimeout(() => document.getElementById("quote-company-form")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };
  const [quoteNo, setQuoteNo] = useState(() => "JQ" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + Math.floor(100 + Math.random() * 900));
  const quoteDate = new Date().toISOString().slice(0, 10);
  const matchedTier = company?.employee_count ? tierForCount(company.employee_count, isAr ? PRICING_TIERS_AR : PRICING_TIERS_EN) : null;
  const amount = discount ? discount.amount : (matchedTier ? matchedTier.yearly : 0);
  const isCustomT = matchedTier ? !!matchedTier.custom : false;
  const totalYear1 = amount;
  const baseAnnual = matchedTier ? Number(matchedTier.yearly) || 0 : 0;
  const discountAmount = Math.max(0, baseAnnual - amount);

  // تعبئة رمز الشريك تلقائياً إن وصل العميل عبر رابط الشريك (?ref=CODE) — ويبقى قابلاً للتعديل يدوياً
  useEffect(() => {
    const ref = getReferral();
    if (ref) setForm((f) => (f.referral_code ? f : { ...f, referral_code: ref }));
  }, []);

  useEffect(() => {
    if (incoming && !registered) {
      base44.functions.invoke("createTrial", { ...incoming, referral_code: getReferral() || undefined }).then((res) => { setRegistered(true); setTenantId(res?.tenant_id || null); setContractProof(res?.contract_proof || null); }).catch(() => {});
    }
  }, []);

  // عند القدوم من صفحة الهبوط بزر "شراء الباقة" — تحديد الشريحة المختارة مسبقاً وتعبئة عددها ليعكس السعر.
  useEffect(() => {
    if (company) return;
    const tierId = new URLSearchParams(location.search).get("tier");
    if (!tierId) return;
    const found = (isAr ? PRICING_TIERS_AR : PRICING_TIERS_EN).find((tt) => tt.id === tierId);
    if (found) {
      setSelectedTier(found);
      setForm((f) => (f.employee_count ? f : { ...f, employee_count: String(found.min) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isNativeApp()) {
    return (
      <NativeAppBlocked
        title={isAr ? "هذه الخدمة غير متاحة داخل التطبيق" : "This service is not available in-app"}
        subtitle={isAr ? "لطلب عرض سعر أو تفعيل التجربة أو الاشتراك، يرجى فتح المنصة من متصفح الكمبيوتر أو اللابتوب على العنوان jadara-hr.com" : "To request a quote, start a trial, or subscribe, please open the platform from a desktop or laptop browser at jadara-hr.com"}
      />
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const name = form.name.trim();
    const email = form.contact_email.trim();
    const unified = form.unified_number.trim();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !/^7\d{7,11}$/.test(unified) || !Number(form.employee_count) || Number(form.employee_count) <= 0) { setErr(t.errForm); return; }
    const phoneDigits = (form.contact_phone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10) { setErr(t.errPhone); return; }
    if (!captcha) { setErr(t.errCaptcha); return; }
    if (!crFile) { setErr(t.errCrDoc); return; }
    setSubmitting(true);
    setUploading(true);
    try {
      // رفع صورة السجل التجاري أولاً للتحقق منها في الخادم
      let crDocUrl = "";
      try {
        const up = await base44.integrations.Core.UploadFile({ file: crFile });
        crDocUrl = up?.file_url || "";
      } catch (_) {
        setErr(t.uploadFail);
        setUploading(false);
        setSubmitting(false);
        return;
      }
      if (!crDocUrl) {
        setErr(t.errCrDoc);
        setUploading(false);
        setSubmitting(false);
        return;
      }
      const res = await base44.functions.invoke("createTrial", { ...form, commercial_register_doc_url: crDocUrl, lead_source: mode === "trial" ? "trial" : "quote", discount_code: form.discount_code?.trim() || undefined, referral_code: (form.referral_code?.trim() || getReferral()) || undefined, captcha_token: captcha });
      const pct = Number(res?.discount_percent) || 0;
      setDiscount(pct > 0 ? { percent: pct, amount: Number(res?.quoted_amount) || 0, code: form.discount_code.trim() } : null);
      setTenantId(res?.tenant_id || null);
      setContractProof(res?.contract_proof || null);
      if (res?.contract_quote_no) setQuoteNo(res.contract_quote_no);
      setRegistered(true);
      setCompany(form);
    } catch (error) {
      setErr(error?.response?.data?.error || error?.message || t.errGeneric);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const copyIban = async () => {
    try { await navigator.clipboard.writeText(PROVIDER_BANK.iban); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (_) {}
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const features = isAr ? featuresAr : featuresEn;

  // بطاقة الباقة والسعر — مشتركة بين عرضي الشراء والتجربة/طلب عرض السعر،
  // حتى يحصل العميل في كل الحالات على طباعة توضح الخصم: السعر الأصل، الرمز ونسبته، قيمة الخصم، والمبلغ بعد الخصم.
  const pricingCard = (
    <div className="py-6 border-t border-border">
      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 space-y-3">
        {/* رأس الباقة */}
        <div className="flex items-baseline justify-between gap-3 pb-2 border-b border-violet-200/70">
          <div>
            <div className="font-medium">{matchedTier ? matchedTier.tier : t.planTier}</div>
            <div className="text-sm text-muted-foreground">{matchedTier ? matchedTier.range : t.planTierRange}</div>
          </div>
          <div className="text-sm text-muted-foreground">{company?.employee_count ? `${company.employee_count} ${isAr ? "موظفاً" : "employees"}` : ""}</div>
        </div>

        {/* ١) القيمة الإجمالية قبل الخصم */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-medium">{t.beforeDiscLabel}</div>
          <div className={discount ? "text-lg text-muted-foreground line-through" : "text-2xl font-extrabold text-violet-700"}>
            {baseAnnual.toLocaleString()} {isAr ? "ريال" : "SAR"}
          </div>
        </div>

        {/* ٢) نسبة الخصم وقيمته */}
        {discount && (
          <div className="flex items-baseline justify-between gap-3 pt-3 border-t border-violet-200/70">
            <div>
              <div className="font-medium">{t.discBadge} {discount.percent}% — {discount.code}</div>
              <div className="text-sm text-muted-foreground">{t.discApplied}</div>
            </div>
            <div className="text-lg font-extrabold text-rose-600">- {discountAmount.toLocaleString()} {isAr ? "ريال" : "SAR"}</div>
          </div>
        )}

        {/* ٣) المبلغ بعد الخصم = المبلغ المطلوب للسنة الأولى */}
        <div className="flex items-baseline justify-between gap-3 -mx-5 -mb-5 px-5 py-4 bg-violet-100/80 rounded-b-2xl border-t-2 border-violet-300">
          <div className="font-extrabold text-violet-900 text-base">{t.netLabel} ({isAr ? "إجمالي السنة الأولى" : "Year 1 total"})</div>
          <div className="text-2xl font-extrabold text-violet-900">{isCustomT ? (isAr ? "تأثير خاص" : "Custom") : `${totalYear1.toLocaleString()} ${isAr ? "ريال" : "SAR"}`}</div>
        </div>
        <div className="text-sm text-muted-foreground pt-3">{t.renewNote}</div>
      </div>
    </div>
  );

  // —— نموذج بيانات المنشأة
  if (!company) {
    return (
      <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
          <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
            <Link to="/"><Logo size={40} /></Link>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <Link to="/" className="text-base text-muted-foreground hover:text-foreground">{t.barBack}</Link>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-5 py-10">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#8E24AA] bg-violet-100 rounded-full px-3 py-1 mb-3"><span className="w-1.5 h-1.5 rounded-full bg-[#8E24AA]" /> {t.step1Badge}</div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t.formTitle}</h1>
          <p className="text-muted-foreground mt-2">{mode === "trial" ? t.trialFormSub : t.buyFormSub}</p>
          {mode === "buy" && selectedTier && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-200 text-[#8E24AA] px-4 py-2 text-base">
              <Sparkles size={14} /> {isAr ? `${selectedTier.tier} — ${selectedTier.yearly.toLocaleString()} ريال / سنوياً` : `${selectedTier.tier} — ${selectedTier.yearly.toLocaleString()} SAR / year`}
            </div>
          )}
          <form id="quote-company-form" onSubmit={submit} className="bg-white border border-border rounded-2xl p-6 mt-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t.company} value={form.name} onChange={(v) => set("name", v)} required />
              <Field label={t.industry} value={form.industry} onChange={(v) => set("industry", v)} />
              <Field label={t.city} value={form.city} onChange={(v) => set("city", v)} />
              <Field label={t.contact} value={form.contact_name} onChange={(v) => set("contact_name", v)} />
              <Field label={t.unified} value={form.unified_number} onChange={(v) => set("unified_number", v.replace(/\D/g, ""))} required />
              <Field label={t.phone} value={form.contact_phone} onChange={(v) => set("contact_phone", v)} required />
            </div>
            <Field label={t.email} value={form.contact_email} onChange={(v) => set("contact_email", v)} type="email" required />
            <Field label={t.headcountLabel} value={form.employee_count} onChange={(v) => set("employee_count", v.replace(/\D/g, ""))} required />
            {mode === "trial" ? (
              <div className="text-sm text-muted-foreground flex items-start gap-2"><Sparkles size={13} className="text-[#8E24AA] mt-0.5 shrink-0" /> {t.trialHeadcountNote}</div>
            ) : (() => { const pt2 = form.employee_count ? tierForCount(form.employee_count, isAr ? PRICING_TIERS_AR : PRICING_TIERS_EN) : null; return pt2 ? <div className="text-base rounded-xl bg-violet-50 border border-violet-200 text-[#8E24AA] px-4 py-3">{t.headcountHint(pt2.tier, pt2.yearly)}</div> : <div className="text-sm text-muted-foreground">{t.headcountRequired}</div>; })()}
            <div className="text-sm flex gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div><b>{t.emailNotice}:</b> {t.emailNoticeBody}</div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.discCode}</Label>
              <Input value={form.discount_code || ""} onChange={(e) => set("discount_code", e.target.value.toUpperCase())} placeholder="JADARA100" />
            </div>
            {/* رمز الشريك المسوّق — يوثّق رسمياً أن العميل جاء عن طريق شريك محدد (يظهر للمالك في قسم العملاء) */}
            <div className="space-y-1.5">
              <Label>{isAr ? "رمز الشريك المسوّق (اختياري)" : "Partner referral code (optional)"}</Label>
              <Input value={form.referral_code || ""} onChange={(e) => set("referral_code", e.target.value.toUpperCase())} placeholder="JD-XXXXXX" className="font-mono" />
              <p className="text-sm text-muted-foreground">
                {isAr ? "إن وصلك رمز من أحد شركاء جداره المسوّقين، اكتبه هنا ليُسجّل رسمياً أن اشتراكك جاء عن طريقه." : "If a Jadara marketing partner gave you a code, enter it so their referral is officially recorded."}
              </p>
            </div>
            {/* إرفاق صورة السجل التجاري — إلزامي للتحقق من ملكية الرقم الموحّد */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">{t.crDoc} <span className="text-rose-600">*</span></Label>
              <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-4">
                <input
                  id="cr-doc"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => { const f = e.target.files?.[0] || null; setCrFile(f); setErr(""); }}
                  className="block w-full text-base text-muted-foreground file:mr-3 file:ml-0 file:rounded-lg file:border-0 file:bg-[#8E24AA] file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-[#7E22CE] cursor-pointer"
                />
                {crFile && <div className="text-sm text-emerald-700 mt-2 flex items-center gap-1"><Check size={13} /> {crFile.name}</div>}
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t.crDocHint}</p>
              </div>
            </div>
            <TurnstileWidget onToken={setCaptcha} className="flex justify-center" />
            {err && <div className="text-base text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 whitespace-pre-line">{err}</div>}
            <Button type="submit" disabled={submitting || uploading || !captcha} className="gap-2 min-w-[200px] bg-[#8E24AA] hover:bg-[#7E22CE]">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : mode === "trial" ? <ShieldCheck size={16} /> : <ArrowLeft size={16} style={{ transform: isAr ? "none" : "scaleX(-1)" }} />}
              {submitting ? t.uploading : (mode === "trial" ? t.trialSubmit : t.buySubmit)}
            </Button>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5"><ShieldCheck size={13} /> {t.secure}</p>
          </form>
        </div>
      </div>
    );
  }

  // —— عرض السعر القابل للطباعة
  return (
    <div className="min-h-screen bg-muted" dir={isAr ? "rtl" : "ltr"}>
      <div className="no-print sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/"><Logo size={40} /></Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link to="/" className="text-base text-muted-foreground hover:text-foreground hidden sm:inline">{t.barBack}</Link>
            <Button onClick={() => window.print()} className="gap-2"><Printer size={16} /> {t.barPrint}</Button>
          </div>
        </div>
      </div>

      {mode === "trial" ? (
        <div className="max-w-2xl mx-auto px-5 py-10">
          <div className="print-quote bg-white border border-border rounded-2xl p-8 sm:p-10 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <Check size={20} /> {t.trialDoneTitle}
            </div>
            <p className="text-base text-muted-foreground mt-1">{t.trialDoneNote}</p>
            <div className="mt-5 grid sm:grid-cols-2 gap-x-8 gap-y-1 text-base">
              <Row k={t.company} v={company.name} />
              <Row k={t.unified} v={company.unified_number} mono />
              <Row k={t.email} v={company.contact_email} />
              <Row k={t.phone} v={company.contact_phone} />
            </div>
            <div className="mt-6 pt-5 border-t border-border">
              <div className="flex items-center gap-2 text-[#8E24AA] font-bold">
                <UserPlus size={18} /> {t.activateTitle}
              </div>
              <p className="text-base text-muted-foreground mt-1">{t.activateNote}</p>
              <div className="mt-3">
                <Link to={`/company-register?email=${encodeURIComponent(company.contact_email || "")}&unified=${encodeURIComponent(company.unified_number || "")}`} className="inline-flex items-center gap-2 rounded-2xl bg-[#8E24AA] hover:bg-[#7E22CE] text-white px-5 py-3 font-bold shadow-md shadow-[#8E24AA]/30 transition">
                  {t.activateBtn} <ArrowLeft size={16} style={{ transform: isAr ? "none" : "scaleX(-1)" }} />
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{t.activateHint}</p>
              <div className="mt-3 text-sm text-slate-500 bg-violet-50/60 border border-violet-100 rounded-lg px-3 py-2">{t.portalNote}</div>
            </div>
          </div>

          {/* تفاصيل الباقة والسعر — مع الخصم الكامل إن وُجد رمز، ليُطبع العميل عرض سعر واضحًا فيه الخصم ونسبته ومبلغه */}
          {matchedTier && (
            <div className="pt-6 mt-2 border-t border-dashed border-border">
              <div className="text-lg font-bold mb-1">{isAr ? "عرض سعر الاشتراك السنوي" : "Annual subscription quote"}</div>
              <div className="text-sm text-muted-foreground mb-2">{isAr ? "السعر المحسوب لعدد موظفيكم — شامل تفاصيل الخصم إن وُجد" : "Price computed for your headcount — with full discount details if any"}</div>
              {pricingCard}
            </div>
          )}
        </div>
      ) : (
      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="print-quote bg-white border border-border rounded-2xl p-8 sm:p-12 shadow-sm">
          {/* رأس العرض */}
          <div className="flex items-start justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Logo size={56} />
              <div>
                <div className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>{t.pageTitle}</div>
                <div className="text-sm text-muted-foreground">جداره — منصة الموارد البشرية السعودية</div>
              </div>
            </div>
            <div className="text-left sm:text-right space-y-1 text-base">
              <div><span className="text-muted-foreground">{t.quoteNo}: </span><span className="font-mono font-semibold">{quoteNo}</span></div>
              <div><span className="text-muted-foreground">{t.date}: </span><span className="font-semibold">{quoteDate}</span></div>
            </div>
          </div>

          {/* إلى (بيانات المنشأة) */}
          <div className="py-6">
            <div className="text-sm font-semibold text-muted-foreground mb-2">{t.to}</div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-base">
              <Row k={t.company} v={company.name} />
              <Row k={t.industry} v={company.industry} />
              <Row k={t.city} v={company.city} />
              <Row k={t.contact} v={company.contact_name} />
              <Row k={t.phone} v={company.contact_phone} />
              <Row k={t.unified} v={company.unified_number} />
              <Row k={t.email} v={company.contact_email} />
            </div>
          </div>

          {/* الباقة والمميزات */}
          <div className="py-6 border-t border-border">
            <div className="text-xl font-bold mb-1">{t.planTitle}</div>
            <div className="text-base text-muted-foreground mb-4">{t.planDesc}</div>
            <div className="text-sm font-semibold text-muted-foreground mb-3">{t.includes}</div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-base">
              {features.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* الأسعار — بطاقة مشتركة تعرض الخصم كاملًا (السعر الأصل، الرمز والنسبة، قيمة الخصم، بعد الخصم) */}
          {pricingCard}

          {/* تفعيل الاشتراك عبر التحويل البنكي + الواتساب */}
          <div className="py-6 border-t border-border">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-lg">
                <Banknote size={20} /> {t.transferTitle}
              </div>
              <p className="text-base text-emerald-900/80">{t.transferNote}</p>

              {/* المبلغ المستحق */}
              <div className="flex items-center justify-between gap-3 bg-white/70 border border-emerald-200 rounded-xl px-4 py-3 text-base">
                <span className="text-muted-foreground">{isAr ? "المبلغ المستحق للسنة الأولى" : "Amount due for year 1"}</span>
                <span className="font-extrabold text-emerald-700 text-2xl">{isCustomT ? (isAr ? "تأثير خاص" : "Custom") : `${totalYear1.toLocaleString()} ${isAr ? "ريال" : "SAR"}`}</span>
              </div>

              {/* بيانات البنك */}
              <div className="bg-white/80 border border-violet-200 rounded-xl p-4">
                <div className="text-base font-semibold text-violet-700 mb-3 flex items-center gap-2"><Building2 size={15} /> {t.bankSection}</div>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-base">
                  <Row k={t.beneficiary} v={isAr ? PROVIDER_BANK.beneficiaryAr : PROVIDER_BANK.beneficiaryEn} />
                  <Row k={t.bank} v={isAr ? PROVIDER_BANK.bankAr : PROVIDER_BANK.bankEn} />
                  <Row k={t.account} v={PROVIDER_BANK.account} mono />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground">{t.iban}:</span>
                      <span className="font-mono font-semibold tracking-wide break-all">{PROVIDER_BANK.iban}</span>
                    </div>
                    <button type="button" onClick={copyIban}
                      className="inline-flex items-center gap-1 text-sm text-violet-700 border border-violet-200 rounded-lg px-2.5 py-1.5 hover:bg-violet-50 transition">
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? t.copied : t.copy}
                    </button>
                  </div>
                </div>
              </div>

              {/* واتساب الدعم الفني */}
              <div className="rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-bold text-emerald-800"><MessageCircle size={18} /> {t.waSupport}</div>
                  <div className="text-xl font-mono font-bold mt-1 tracking-wide" dir="ltr">{WHATSAPP_NUMBER}</div>
                  <div className="text-base text-emerald-900/80 mt-1">{t.sendReceipt}</div>
                </div>
                <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold px-5 py-3 shadow-md transition shrink-0">
                  <MessageCircle size={18} /> {t.openWhatsApp}
                </a>
              </div>
            </div>
          </div>

          {/* تنشيط الحساب للدخول لبوابة الشركات (العميل قادر على الاستفادة من التجربة فوراً) */}
          {company?.unified_number && (
            <div className="py-6 border-t border-border">
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-l from-violet-50 to-fuchsia-50 p-5">
                <div className="flex items-center gap-2 text-violet-700 font-bold">
                  <UserPlus size={18} /> {t.activateTitle}
                </div>
                <p className="text-base text-muted-foreground mt-1">{t.activateNote}</p>
                <div className="mt-3">
                  <Link
                    to={`/company-register?email=${encodeURIComponent(company.contact_email || "")}&unified=${encodeURIComponent(company.unified_number || "")}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white px-5 py-3 font-bold shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-fuchsia-500 transition"
                  >
                    {t.activateBtn} <ArrowLeft size={16} style={{ transform: isAr ? "none" : "scaleX(-1)" }} />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t.activateHint}</p>
                <div className="mt-3 text-sm text-slate-500 bg-white/60 border border-violet-100 rounded-lg px-3 py-2">{t.portalNote}</div>
              </div>
            </div>
          )}

          {/* التوقيع والختم */}
          <div className="pt-8 border-t border-border flex items-end justify-between gap-6 flex-wrap">
            <div className="w-64">
              <div className="h-20 flex items-center justify-center text-sm text-muted-foreground/60">مساحة التوقيع</div>
              <div className="text-base font-semibold mt-2 border-t border-foreground/20 pt-1">{t.sigName}</div>
            </div>
            <ProviderStamp size={150} />
          </div>

          {/* الصفحة الثانية — شهادة الآيبان الرسمية للمنشأة المُوفِّرة */}
          <div className="break-before-page pt-10 mt-10 border-t border-dashed border-border flex flex-col items-center">
            <div className="text-base font-bold mb-1">شهادة رقم الآيبان (IBAN) — {isAr ? PROVIDER_BANK.beneficiaryAr : PROVIDER_BANK.beneficiaryEn}</div>
            <div className="text-sm text-muted-foreground mb-4">الرقم الوطني الموحد للمنشأة: 7054695650 · {PROVIDER_BANK.bankAr}</div>
            <img src={IBAN_CERT_URL} crossOrigin="anonymous" alt="شهادة الآيبان" className="max-w-[560px] w-full rounded-2xl border border-border shadow-sm" />
            <div className="mt-4 text-sm text-muted-foreground text-center leading-7 max-w-[560px]">
              <div><b>المستفيد:</b> {PROVIDER_BANK.beneficiaryAr} · <b>رقم الحساب:</b> <span className="font-mono">{PROVIDER_BANK.account}</span></div>
              <div><b>الآيبان (IBAN):</b> <span className="font-mono">{PROVIDER_BANK.iban}</span></div>
            </div>
          </div>

          <div className="no-print mt-8 flex items-center justify-center gap-3">
            <Button onClick={() => window.print()} className="gap-2"><Printer size={16} /> {t.barPrint}</Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-medium ${mono ? "font-mono tracking-wide" : ""}`}>{v || "—"}</span>
    </div>
  );
}

function JadaraStamp({ ar, label }) {
  return (
    <div style={{ transform: "rotate(-7deg)" }} className="opacity-80">
      <svg viewBox="0 0 200 200" width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <path id="stampTop" d="M 100,100 m -74,0 a 74,74 0 1,1 148,0" fill="none" />
        </defs>
        <circle cx="100" cy="100" r={92} fill="none" stroke="#1A237E" strokeWidth={3} />
        <circle cx="100" cy="100" r={84} fill="none" stroke="#1A237E" strokeWidth={1.4} />
        <circle cx="100" cy="100" r={46} fill="none" stroke="#1A237E" strokeWidth={1.6} />
        <text fill="#1A237E" fontSize="16" fontWeight="700" fontFamily="Tajawal, IBM Plex Sans Arabic, sans-serif" style={{ letterSpacing: "1px" }}>
          <textPath href="#stampTop" startOffset="50%" textAnchor="middle">{label}</textPath>
        </text>
        <text x="100" y="98" textAnchor="middle" fill="#1A237E" fontSize="22" fontWeight="800" fontFamily="Tajawal, IBM Plex Sans Arabic, sans-serif">جداره</text>
        <text x="100" y="118" textAnchor="middle" fill="#1A237E" fontSize="9" fontWeight="600" fontFamily="sans-serif">JADARA HR</text>
        <text x="100" y="132" textAnchor="middle" fill="#1A237E" fontSize="14">✦</text>
      </svg>
    </div>
  );
}