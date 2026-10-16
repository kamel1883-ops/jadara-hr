import { ShieldCheck, Bell, BadgeCheck, Building2, FileCheck, RefreshCw, Link2, Landmark } from "lucide-react";
import FeatureLanding from "@/components/landing/FeatureLanding";

export default function QiwaMudadPage() {
  return <FeatureLanding content={CONTENT} />;
}

const CONTENT = {
  path: "/qiwa-mudad",
  ar: {
    badge: "تكامل مع منصة قوى ومدد",
    titlePre: "تكامل جداره مع منصة",
    titleHi: "قوى ومدد",
    hero: "اربط بيانات منشأتك في «جداره» بمنصة قوى ومدد بسهولة — تتبّع الإقامات والوثائق الحكومية للموظفين، أدر بيانات المنشأة وموظفيها للالتزام، وأرسل تقارير حماية الأجور والتأمينات الاجتماعية بدقة. نظام موارد بشرية سحابي مصمّم خصيصاً للمنشآت السعودية ومتوافق مع متطلبات وزارة الموارد البشرية.",
    heroImg: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    ctaPrimary: "جرّب مجاناً 30 يوماً",
    painTitle: "لماذا تبحث عن نظام HR متوافق مع قوى ومدد؟",
    painPoints: [
      "طريقة ربط بيانات الموظفين والإقامات بمنصة قوى.",
      "الالتزام بنظام حماية الأجور (WPS) عبر منصة مدد.",
      "استخراج شهادات التأمينات الاجتماعية GOSI ومساهماتها.",
      "تحديث بيانات المنشأة والموظفين تلقائياً.",
      "تجنّب المخالفات والغرامات الناتجة عن التأخير.",
    ],
    featuresTag: "ماذا يقدّم التكامل",
    featuresTitle: "مزايا الربط مع قوى ومدد",
    features: [
      { icon: BadgeCheck, t: "تتبّع الإقامات والوثائق", d: "متابعة تواريخ انتهاء الإقامات والجوازات والتأمين الطبي مع تنبيهات استباقية." },
      { icon: ShieldCheck, t: "حماية الأجور (WPS)", d: "توليد بيانات مسير الرواتب جاهزة للإرسال لمنصة مدد وفق الهيكل المعتمد." },
      { icon: Landmark, t: "التأمينات الاجتماعية", d: "احتساب مساهمات GOSI حسب تاريخ تسجيل الموظف (21.5% أو 23.5% للسعوديين، و2% مخاطر مهنية للمقيمين) ومواءمتها مع النظام." },
      { icon: RefreshCw, t: "تحديث تلقائي للبيانات", d: "مزامنة بيانات الموظفين والمنشأة دون إدخال يدوي مكرّر." },
      { icon: Bell, t: "تنبيهات استباقية", d: "إشعارات قبل انتهاء الإقامات والتراخيص والتأمينات." },
      { icon: Link2, t: "تكامل واحد متكامل", d: "كل البيانات الحكومية المتعلقة بالموظف في مكان واحد منظّم." },
    ],
    stepsTitle: "كيف يبسّط جداره الالتزام؟",
    steps: [
      { t: "سجّل منشأتك", d: "أنشئ حساباً مجانياً وأدخل بيانات منشأتك والرقم الموحد." },
      { t: "استورد موظفيك", d: "ارفع ملف الموظفين مع الإقامات والوثائق بنقرة واحدة." },
      { t: "اربط بياناتك", d: "صدّر بيانات الموظفين ومسيرات الرواتب لحماية الأجور ومدد." },
      { t: "تابع التنبيهات", d: "استقبل إشعارات استباقية قبل أي موعد حكومي." },
    ],
    faqTitle: "أسئلة متكررة",
    faqs: [
      { q: "هل يدعم جداره الإرسال لمنصة مدد مباشرة؟", a: "يولّد جداره بيانات مسير الرواتب وفق الهيكل المعتمد لحماية الأجور، مع مساعدتك في تجهيزها للإرسال عبر مدد." },
      { q: "هل التكامل مع قوى ضمن الباقة؟", a: "كل المميزات متاحة ضمن الاشتراك السنوي، مع تحديثات مستمرة للتكاملات الحكومية." },
      { q: "هل يدعم الجنسيات غير السعودية؟", a: "نعم — متابعة كاملة لإقامات ووثائق المقيمين وتنبيهات انتهائها." },
    ],
    ctaTitle: "اربط منشأتك بـ قوى ومدد بثقة",
    ctaDesc: "ابدأ تجربتك المجانية لمدة 30 يوماً — كل المميزات متاحة، بدون بطاقة ائتمان.",
    seo: {
      title: "تكامل جداره مع منصة قوى ومدد | ربط بيانات الموظفين والرواتب السعودية",
      description: "نظام جداره سحابي متكامل مع منصة قوى ومدد — تتبّع الإقامات والوثائق، الالتزام بنظام حماية الأجور (WPS) عبر مدد، ومساهمات التأمينات GOSI. للمنشآت والشركات في السعودية.",
      keywords: "تكامل قوى ومدد, ربط قوى ومدد, نظام موارد بشرية متوافق مع قوى, حماية الأجور مدد, ربط الرواتب بمدد, ERP HR Saudi Arabia, Qiwa integration, Mudad WPS",
    },
  },
  en: {
    badge: "Qiwa & Mudad Integration",
    titlePre: "Jadara integrates with",
    titleHi: "Qiwa & Mudad",
    hero: "Connect your organization in Jadara with the Qiwa and Mudad platforms — track Iqama and government documents, manage establishment and employee data for compliance, and submit Wage Protection (WPS) and GOSI reports accurately. A cloud HR system built for Saudi companies and aligned with Ministry of Human Resources requirements.",
    heroImg: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    ctaPrimary: "Try free for 30 days",
    painTitle: "Looking for an HR system aligned with Qiwa & Mudad?",
    painPoints: [
      "Connecting employee data and Iqama with Qiwa.",
      "Complying with Wage Protection (WPS) via Mudad.",
      "Issuing GOSI certificates and reconciling contributions.",
      "Auto-updating establishment and employee data.",
      "Avoiding fines from late government filings.",
    ],
    featuresTag: "What the integration delivers",
    featuresTitle: "Benefits of Qiwa & Mudad linking",
    features: [
      { icon: BadgeCheck, t: "Iqama & Document Tracking", d: "Track Iqama, passport and health insurance expiry with proactive alerts." },
      { icon: ShieldCheck, t: "Wage Protection (WPS)", d: "Generate payroll data ready to submit to Mudad in the approved format." },
      { icon: Landmark, t: "GOSI Social Insurance", d: "Calculate GOSI by the employee's registration date (21.5% or 23.5% for Saudis, 2% occupational-hazards for expats) and reconcile with the scheme." },
      { icon: RefreshCw, t: "Auto Data Updates", d: "Sync establishment and employee data without duplicate manual entry." },
      { icon: Bell, t: "Proactive Alerts", d: "Notifications before Iqama, license and insurance expiry." },
      { icon: Link2, t: "One Integrated Hub", d: "All employee-related government data in one organized place." },
    ],
    stepsTitle: "How Jadara simplifies compliance",
    steps: [
      { t: "Register your company", d: "Create a free account and add your establishment details and unified number." },
      { t: "Import employees", d: "Upload your employee file with Iqama and documents in one click." },
      { t: "Connect your data", d: "Export employee and payroll data for Wage Protection and Mudad." },
      { t: "Track alerts", d: "Receive proactive notifications before any government deadline." },
    ],
    faqTitle: "Frequently asked questions",
    faqs: [
      { q: "Does Jadara submit to Mudad directly?", a: "Jadara generates payroll data in the approved Wage Protection format and helps you prepare it for submission via Mudad." },
      { q: "Is the Qiwa integration included?", a: "All features are included in the annual subscription, with ongoing updates to government integrations." },
      { q: "Does it support non-Saudi nationalities?", a: "Yes — full tracking of expat Iqama and documents with expiry alerts." },
    ],
    ctaTitle: "Connect your company with Qiwa & Mudad confidently",
    ctaDesc: "Start your 30-day free trial — all features enabled, no credit card.",
    seo: {
      title: "Jadara Qiwa & Mudad Integration | Saudi Employee & Payroll Data Link",
      description: "Jadara cloud HR platform integrated with Qiwa and Mudad — track Iqama and documents, comply with Wage Protection (WPS) via Mudad, and reconcile GOSI contributions. For Saudi companies.",
      keywords: "Qiwa integration, Mudad integration, Saudi HR software, Wage Protection System, WPS Mudad, GOSI Saudi Arabia, HR compliance Saudi",
    },
  },
};

export function _icons() { return { ShieldCheck, Bell, BadgeCheck, Building2, FileCheck, RefreshCw, Link2, Landmark }; }