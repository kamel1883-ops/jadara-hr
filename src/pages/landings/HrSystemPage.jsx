import { Users, Building2, ShieldCheck, FileCheck, BarChart3, Bell, GitBranch, CalendarCheck, Wallet, Award, Cloud, Globe } from "lucide-react";
import FeatureLanding from "@/components/landing/FeatureLanding";

export default function HrSystemPage() {
  return <FeatureLanding content={CONTENT} />;
}

const CONTENT = {
  path: "/hr-system",
  ar: {
    badge: "نظام موارد بشرية سعودي متكامل",
    titlePre: "أفضل",
    titleHi: "نظام موارد بشرية في السعودية",
    hero: "جداره منصة HR سحابية متكاملة تدير دورة حياة الموظف كاملة — من التوظيف وحتى نهاية الخدمة — في مكان واحد: حضور وانصراف، رواتب، إجازات، سلف، أداء، تخطيط تعاقبي، تأمينات GOSI، وتراخيص حكومية. مصممة خصيصاً للمنشآت في الرياض وجدة والدمام ومكة وباقي المملكة، ومتوافقة مع متطلبات وزارة الموارد البشرية ومنصتي قوى ومدد.",
    heroImg: "https://images.unsplash.com/photo-1521737604873-3f85d663b1cd?auto=format&fit=crop&w=1200&q=80",
    ctaPrimary: "ابدأ تجربتك المجانية 30 يوماً",
    painTitle: "هل تبحث عن نظام HR سعودي يفهم احتياجك؟",
    painPoints: [
      "نظام موارد بشرية متوافق مع نظام العمل السعودي والتأمينات الاجتماعية.",
      "بوابة موظف ذاتية لتقديم الإجازات والسلف ومتابعة الرواتب.",
      "ربط الحضور بالرواتب ونهاية الخدمة تلقائياً دون إدخال يدوي.",
      "تقارير وتحليلات موارد بشرية جاهزة للإدارة واتخاذ القرار.",
      "تخزين سحابي آمن يدعم تعدد الفروع والمستخدمين والصلاحيات.",
    ],
    featuresTag: "منظومة متكاملة",
    featuresTitle: "كل ما تحتاجه منصة HR عصرية في مكان واحد",
    features: [
      { icon: Users, t: "إدارة الموظفين", d: "ملف موظف شامل: بيانات، وثائق، عقود، إقامات، تأمين طبي، تنبيهات انتهاء." },
      { icon: CalendarCheck, t: "الحضور والانصراف", d: "بصمة GPS ضمن نطاق 50 متراً من مقر العمل أو رفع جداول حضور بالجملة." },
      { icon: Wallet, t: "الرواتب (Payroll)", d: "احتساب الراتب، البدلات، الجزرات، الاستقطاعات، والإجمالي الصافي بدقة." },
      { icon: ShieldCheck, t: "التأمينات GOSI", d: "حساب المساهمات حسب تاريخ التسجيل (21.5% أو 23.5% للسعوديين، و2% مخاطر مهنية للمقيمين) وتوليد الكشوف." },
      { icon: Award, t: "إدارة الأداء", d: "أهداف، كفاءات، سلوكيات، وتوصيات ترقية ومكافآت وتنبيهات." },
      { icon: GitBranch, t: "التخطيط التعاقبي", d: "تحديد البدلاء لكل موقع حرج وتقليل مخاطر فقدان الكفاءات." },
      { icon: BarChart3, t: "التحليلات والتقارير", d: "لوحات مؤشرات موارد بشرية لحظية لقياس معدلات الحضور والدوام." },
      { icon: Bell, t: "تنبيهات استباقية", d: "إشعارات قبل انتهاء الإقامات والتراخيص والتأمينات ومواعيد العقود." },
      { icon: Cloud, t: "سحابي وآمن", d: "صلاحيات دقيقة لكل مستخدم، وسجلات تدقيق، ونسخ احتياطي تلقائي." },
    ],
    stepsTitle: "كيف تبدأ مع جداره في خطوات",
    steps: [
      { t: "أنشئ حساب منشأتك", d: "سجّل بيانات منشأتك والرقم الموحد خلال دقائق بدون بطاقة ائتمان." },
      { t: "استورد موظفيك", d: "ارفع ملف الموظفين والوثائق بنقرة واحدة أو أضفهم يدوياً." },
      { t: "فعّل الحضور والرواتب", d: "اربط البصمة بالرواتب وفعّل الموافقات على الإجازات والسلف." },
      { t: "اتخذ قرارات أذكى", d: "تابع التحليلات والتقارير اللحظية وحسّن أداء فريقك." },
    ],
    faqTitle: "أسئلة شائعة عن نظام الموارد البشرية",
    faqs: [
      { q: "ما هو أفضل نظام موارد بشرية في السعودية؟", a: "جداره منصة HR سحابية سعودية متكاملة تجمع الحضور والرواتب والإجازات والأداء والتراخيص في نظام واحد، مصممة للمنشآت السعودية ومتوافقة مع نظام العمل والتأمينات الاجتماعية." },
      { q: "هل جداره نظام HR مناسب للشركات الصغيرة؟", a: "نعم — تتدرج الباقات حسب عدد الموظفين، ويمكن للمنشآت الصغيرة البدء بتجربة مجانية 30 يوماً بكل المميزات دون بطاقة ائتمان." },
      { q: "هل يدعم جداره الفروع المتعددة؟", a: "نعم، يدعم تعدد الفروع مع صلاحيات مستقلة لكل فرع وتقارير موحّدة على مستوى المنشأة." },
      { q: "هل البيانات آمنة على السحابة؟", a: "تُخزّن البيانات على بنية سحابية آمنة مع صلاحيات دقيقة لكل مستخدم وسجل تدقيق كامل ونسخ احتياطي تلقائي." },
      { q: "هل يتكامل مع قوى ومدد؟", a: "نعم — يولّد جداره بيانات مسير الرواتب جاهزة لحماية الأجور (WPS) عبر مدد، وحسابات التأمينات الاجتماعية GOSI." },
    ],
    ctaTitle: "نظام HR سعودي يقود فريقك للإنجاز",
    ctaDesc: "انضم لمنشآت سعودية تثق بجداره لإدارة مواردها البشرية. ابدأ التجربة المجانية الآن.",
    seo: {
      title: "نظام موارد بشرية سعودي | أفضل منصة HR في السعودية — جداره",
      description: "جداره أفضل نظام موارد بشرية (HR) في السعودية — منصة سحابية متكاملة لإدارة الموظفين والحضور والرواتب والإجازات والأداء والتأمينات GOSI. للشركات في الرياض وجدة والدمام ومكة.",
      keywords: "نظام موارد بشرية, منصة HR, نظام HR, برنامج موارد بشرية, أفضل نظام موارد بشرية في السعودية, نظام HR سعودي, منصة موارد بشرية الرياض, برنامج HR الدمام, نظام إدارة الموظفين, نظام موارد بشرية سحابي",
    },
  },
  en: {
    badge: "Integrated Saudi HR System",
    titlePre: "The best",
    titleHi: "HR system in Saudi Arabia",
    hero: "Jadara is a cloud-native HR platform that manages the full employee lifecycle — from hiring to end of service — in one place: attendance, payroll, leave, loans, performance, succession, GOSI, and government licenses. Built for companies in Riyadh, Jeddah, Dammam, Makkah and across the Kingdom, and aligned with Ministry of Human Resources, Qiwa and Mudad.",
    heroImg: "https://images.unsplash.com/photo-1521737604873-3f85d663b1cd?auto=format&fit=crop&w=1200&q=80",
    ctaPrimary: "Start your 30-day free trial",
    painTitle: "Looking for a Saudi HR system that gets it?",
    painPoints: [
      "An HR system aligned with Saudi Labor Law and GOSI.",
      "A self-service employee portal for leave, loans and payslips.",
      "Attendance linked to payroll and end-of-service automatically.",
      "Ready-made HR analytics for management decisions.",
      "Secure cloud storage with multi-branch, multi-user permissions.",
    ],
    featuresTag: "An integrated platform",
    featuresTitle: "Everything a modern HR platform needs in one place",
    features: [
      { icon: Users, t: "Employee Management", d: "Complete employee file: data, documents, contracts, Iqama, insurance, expiry alerts." },
      { icon: CalendarCheck, t: "Attendance", d: "GPS check-in within 50m of the workplace or bulk attendance import." },
      { icon: Wallet, t: "Payroll", d: "Accurate salary, allowances, deductions and net pay calculation." },
      { icon: ShieldCheck, t: "GOSI", d: "Calculate contributions by registration date (21.5% or 23.5% for Saudis, 2% occupational-hazards for expats) and generate statements." },
      { icon: Award, t: "Performance", d: "Goals, competencies, behaviors, promotion and bonus recommendations." },
      { icon: GitBranch, t: "Succession Planning", d: "Identify successors for critical roles and reduce talent loss risk." },
      { icon: BarChart3, t: "Analytics & Reports", d: "Real-time HR KPI dashboards for attendance and workforce metrics." },
      { icon: Bell, t: "Proactive Alerts", d: "Notifications before Iqama, license, insurance and contract expiry." },
      { icon: Cloud, t: "Cloud & Secure", d: "Granular per-user permissions, audit logs, and automatic backups." },
    ],
    stepsTitle: "How to get started with Jadara",
    steps: [
      { t: "Create your company account", d: "Register your establishment and unified number in minutes — no credit card." },
      { t: "Import your employees", d: "Upload the employee file and documents in one click or add them manually." },
      { t: "Enable attendance & payroll", d: "Link check-ins to payroll and enable leave and loan approvals." },
      { t: "Make smarter decisions", d: "Track real-time analytics and reports to improve team performance." },
    ],
    faqTitle: "Frequently asked HR system questions",
    faqs: [
      { q: "What is the best HR system in Saudi Arabia?", a: "Jadara is an integrated cloud Saudi HR platform combining attendance, payroll, leave, performance and licenses in one system, built for Saudi companies and aligned with Labor Law and GOSI." },
      { q: "Is Jadara suitable for small businesses?", a: "Yes — plans scale by employee count, and small businesses can start a 30-day free trial with all features enabled, no credit card." },
      { q: "Does Jadara support multiple branches?", a: "Yes, it supports multi-branch with per-branch permissions and unified company-wide reports." },
      { q: "Is data secure in the cloud?", a: "Data is stored on a secure cloud infrastructure with granular user permissions, full audit logs and automatic backups." },
      { q: "Does it integrate with Qiwa and Mudad?", a: "Yes — Jadara generates payroll data ready for Wage Protection (WPS) via Mudad and GOSI calculations." },
    ],
    ctaTitle: "The Saudi HR system that drives your team forward",
    ctaDesc: "Join Saudi companies that trust Jadara to run their HR. Start your free trial today.",
    seo: {
      title: "Saudi HR System | Best HR Platform in Saudi Arabia — Jadara",
      description: "Jadara — the best HR system in Saudi Arabia: a cloud platform for employees, attendance, payroll, leave, performance and GOSI. For companies in Riyadh, Jeddah, Dammam and Makkah.",
      keywords: "HR system Saudi Arabia, HR platform Riyadh, best HR software Saudi, cloud HR Saudi Arabia, HRMS Saudi Arabia, employee management system, Jadara HR",
    },
  },
};

export function _icons() { return { Users, Building2, ShieldCheck, FileCheck, BarChart3, Bell, GitBranch, CalendarCheck, Wallet, Award, Cloud, Globe }; }