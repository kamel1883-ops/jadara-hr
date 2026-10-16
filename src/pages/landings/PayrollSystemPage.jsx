import { Wallet, ShieldCheck, FileCheck, Bell, BarChart3, Landmark, RefreshCw, Printer, Calculator, Banknote } from "lucide-react";
import FeatureLanding from "@/components/landing/FeatureLanding";

export default function PayrollSystemPage() {
  return <FeatureLanding content={CONTENT} />;
}

const CONTENT = {
  path: "/payroll-system",
  ar: {
    badge: "نظام رواتب سعودي متكامل",
    titlePre: "نظام",
    titleHi: "رواتب سعودي دقيق ومتوافق",
    hero: "نظام رواتب (Payroll) من جداره يحتسب الراتب الأساسي والبدلات والإجازات والاستقطاعات والتأمينات الاجتماعية GOSI ونهاية الخدمة تلقائياً، ويولّد كشوف رواتب جاهزة للطباعة وحماية الأجور (WPS) عبر مدد. مصمم للمنشآت في الرياض وجدة والدمام ومكة وباقي المملكة.",
    heroImg: "https://images.unsplash.com/photo-1554224155-6726b3ff590f?auto=format&fit=crop&w=1200&q=80",
    ctaPrimary: "ابدأ تجربتك المجانية 30 يوماً",
    painTitle: "تحدّيات احتساب الرواتب في السعودية",
    painPoints: [
      "احتساب بدلات السكن والمواصلات والبدلات الأخرى بدقة.",
      "خصم الغياب والتأخر وفق سياسة المنشأة ونظام العمل.",
      "حساب مساهمات التأمينات الاجتماعية (GOSI) للسعوديين والمقيمين.",
      "توليد ملفات حماية الأجور (WPS) بصيغة مدد المعتمدة.",
      "ربط الإجازات والسلف والمستحقات بكشف الراتب تلقائياً.",
    ],
    featuresTag: "منظومة الرواتب",
    featuresTitle: "مزايا نظام رواتب جداره",
    features: [
      { icon: Calculator, t: "احتساب دقيق", d: "راتب أساسي، بدلات، ساعات إضافية، استقطاعات، وصافي الدفع محسوب تلقائياً." },
      { icon: Landmark, t: "التأمينات GOSI", d: "حساب المساهمات حسب تاريخ التسجيل (21.5% أو 23.5% للسعوديين، و2% مخاطر مهنية للمقيمين) مع توليد الكشوف." },
      { icon: FileCheck, t: "حماية الأجور WPS", d: "تصدير بيانات مسير الرواتب بالهيكل المعتمد لمنصة مدد." },
      { icon: Banknote, t: "السلف والأقساط", d: "متابعة سلف الموظفين والأقساط الشهرية وخصمها من الراتب." },
      { icon: RefreshCw, t: "ربط مع الحضور", d: "خصم الغياب والتأخر تلقائياً من بيانات الحضور والانصراف." },
      { icon: Printer, t: "كشوف قابلة للطباعة", d: "كشوف رواتب PDF بشعار المنشأة وجاهزة للأرشفة والتوقيع." },
      { icon: Bell, t: "تنبيهات الصرف", d: "إشعارات للموظف والمالية عند صرف الراتب وتأكيد التحويل." },
      { icon: BarChart3, t: "تقارير الكلفة", d: "تحليل كلفة الرواتب لكل قسم وفرع وفترة." },
    ],
    stepsTitle: "كيف يعمل نظام الرواتب",
    steps: [
      { t: "عيّن ملف الرواتب", d: "حدد الراتب الأساسي والبدلات والاستقطاعات لكل موظف." },
      { t: "اربط الحضور والإجازات", d: "سيقوم النظام بجلب أيام الحضور والغياب والإجازات تلقائياً." },
      { t: "احتسب التأمينات", d: "تُحتسب مساهمات GOSI للموظف وصاحب العمل بدقة." },
      { t: "صدّر لمدد واطبع", d: "صدّر ملف WPS لمدد واطبع الكشوف بشعار منشأتك." },
    ],
    faqTitle: "أسئلة شائعة عن نظام الرواتب",
    faqs: [
      { q: "هل نظام رواتب جداره متوافق مع حماية الأجور؟", a: "نعم — يولّد جداره ملف مسير الرواتب بالهيكل المعتمد لمنصة مدد (WPS) جاهزاً للإرسال." },
      { q: "هل يحسب التأمينات الاجتماعية GOSI تلقائياً؟", a: "نعم — يحتسب المساهمات حسب تاريخ تسجيل الموظف في التأمينات: 21.5% للمسجلين قبل 3 يوليو 2024، و23.5% للمسجلين من 3 يوليو 2024، والمقيم 2% مخاطر مهنية على صاحب العمل، مع تمييز حصة الموظف عن حصة صاحب العمل." },
      { q: "هل يدعم خصم الغياب من الحضور؟", a: "نعم — يربط نظام الرواتب بسجلات الحضور والانصراف ويخصم الغياب والتأخر وفق سياسة منشأتك." },
      { q: "هل يمكن طباعة كشف الراتب بشعار المنشأة؟", a: "نعم — كل كشوف الرواتب تُولّد PDF بشعار منشأتك يميناً وشعار جداره يساراً." },
      { q: "هل يدعم السلف والأقساط؟", a: "نعم — يسجّل سلف الموظف ويوزّعها على أقساط شهرية تُخصم تلقائياً من الرواتب." },
    ],
    ctaTitle: "رواتب دقيقة متوافقة، كل شهر بلا عناء",
    ctaDesc: "وفّر وقتك وقلّل الأخطاء — جرّب نظام رواتب جداره مجاناً 30 يوماً.",
    seo: {
      title: "نظام رواتب سعودي | برنامج احتساب الرواتب و GOSI و WPS — جداره",
      description: "نظام رواتب (Payroll) سعودي متكامل من جداره — احتساب الرواتب والبدلات والاستقطاعات والتأمينات GOSI وحماية الأجور WPS لمدد. للشركات في الرياض وجدة والدمام ومكة.",
      keywords: "نظام رواتب, برنامج رواتب, نظام رواتب السعودية, برنامج احتساب الرواتب, حماية الأجور WPS, نظام رواتب الرياض, نظام رواتب جدة, كشف رواتب PDF, نظام إدارة الرواتب, رواتب GOSI",
    },
  },
  en: {
    badge: "Integrated Saudi Payroll System",
    titlePre: "An accurate, compliant",
    titleHi: "Saudi payroll system",
    hero: "Jadara's payroll system calculates base salary, allowances, leave, deductions, GOSI social insurance and end-of-service automatically, and produces payslips ready to print and submit for Wage Protection (WPS) via Mudad. Built for companies in Riyadh, Jeddah, Dammam, Makkah and across the Kingdom.",
    heroImg: "https://images.unsplash.com/photo-1554224155-6726b3ff590f?auto=format&fit=crop&w=1200&q=80",
    ctaPrimary: "Start your 30-day free trial",
    painTitle: "Saudi payroll challenges",
    painPoints: [
      "Accurately computing housing, transport and other allowances.",
      "Deducting absence and lateness per company policy and Labor Law.",
      "Calculating GOSI contributions for Saudis and expats.",
      "Generating WPS files in the approved Mudad format.",
      "Linking leave, loans and entitlements to payroll automatically.",
    ],
    featuresTag: "The payroll platform",
    featuresTitle: "Jadara payroll system features",
    features: [
      { icon: Calculator, t: "Accurate Calculation", d: "Base salary, allowances, overtime, deductions and net pay computed automatically." },
      { icon: Landmark, t: "GOSI", d: "Calculate contributions by registration date (21.5% or 23.5% for Saudis, 2% occupational-hazards for expats) and generate statements." },
      { icon: FileCheck, t: "WPS Wage Protection", d: "Export payroll data in the approved Mudad structure." },
      { icon: Banknote, t: "Loans & Installments", d: "Track employee loans and monthly installments deducted from salary." },
      { icon: RefreshCw, t: "Attendance Link", d: "Auto-deduct absence and lateness from attendance data." },
      { icon: Printer, t: "Printable Statements", d: "Payroll PDFs with your company logo, ready for archiving and signing." },
      { icon: Bell, t: "Payment Alerts", d: "Notify employee and finance upon payroll disbursement and transfer." },
      { icon: BarChart3, t: "Cost Reports", d: "Analyze payroll cost by department, branch and period." },
    ],
    stepsTitle: "How the payroll system works",
    steps: [
      { t: "Set payroll components", d: "Define base salary, allowances and deductions per employee." },
      { t: "Link attendance & leave", d: "The system pulls attendance, absence and leave days automatically." },
      { t: "Compute GOSI", d: "Employee and employer GOSI contributions are calculated precisely." },
      { t: "Export to Mudad & print", d: "Export the WPS file to Mudad and print statements with your logo." },
    ],
    faqTitle: "Frequently asked payroll questions",
    faqs: [
      { q: "Is Jadara's payroll system WPS-compliant?", a: "Yes — Jadara generates the payroll file in the Mudad-approved WPS structure ready for submission." },
      { q: "Does it compute GOSI automatically?", a: "Yes — it calculates contributions by the employee's GOSI registration date: 21.5% before 3 July 2024 and 23.5% from that date, with 2% occupational-hazards for expatriates (employer), separating employee and employer shares." },
      { q: "Does it deduct absence from attendance?", a: "Yes — payroll is linked to attendance records and deducts absence and lateness per your policy." },
      { q: "Can I print payslips with my company logo?", a: "Yes — all payroll PDFs include your company logo on the right and the Jadara logo on the left." },
      { q: "Does it support loans and installments?", a: "Yes — it records employee loans and splits them into monthly installments auto-deducted from payroll." },
    ],
    ctaTitle: "Accurate, compliant payroll every month — effortless",
    ctaDesc: "Save time and reduce errors — try Jadara's payroll system free for 30 days.",
    seo: {
      title: "Saudi Payroll System | Salary, GOSI & WPS Software — Jadara",
      description: "An integrated Saudi payroll system from Jadara — salary, allowances, deductions, GOSI and WPS for Mudad. For companies in Riyadh, Jeddah, Dammam and Makkah.",
      keywords: "Saudi payroll system, payroll software Saudi Arabia, WPS Mudad, GOSI payroll, payslip PDF, payroll Riyadh, payroll Jeddah, payroll management system",
    },
  },
};

export function _icons() { return { Wallet, ShieldCheck, FileCheck, Bell, BarChart3, Landmark, RefreshCw, Printer, Calculator, Banknote }; }