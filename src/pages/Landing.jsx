import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import { PROVIDER } from "@/lib/providerIdentity";
import LanguageToggle from "@/components/LanguageToggle";
import ShareBar from "@/components/ShareBar";
import { Image } from "@/components/ui/image";
import ClientMarquee from "@/components/ClientMarquee";
import FlightProviders from "@/components/landing/FlightProviders";
import PricingColumns from "@/components/landing/PricingColumns";
import HostingSpecs from "@/components/landing/HostingSpecs";
import HrKeywordField from "@/components/landing/HrKeywordField";
import { useI18n } from "@/lib/i18n";
import { getActiveSeason } from "@/lib/seasonalVideo";
import SeasonalHero from "@/components/landing/SeasonalHero";
import NitaqatSection from "@/components/landing/NitaqatSection";

import { PRICING_TIERS_AR, PRICING_TIERS_EN } from "@/lib/pricing";
import AssistantAvatar from "@/components/AssistantAvatar";
import StoreButtons from "@/components/StoreButtons";
import { useNativeGate } from "@/components/NativeAppNotice";
import {
  Sparkles, Check, ArrowLeft, ShieldCheck, Users, CalendarCheck, Wallet,
  Calculator, Target, Car, BarChart3, Zap, Phone, Mail, Building2,
  BadgeCheck, Star, Clock, TrendingUp, Bell, CreditCard,
  Briefcase, GraduationCap, Award, GitBranch, Landmark, FileSpreadsheet, Plug,
  Gavel, HeartPulse, Stethoscope, LineChart, MessageCircle, MapPin, Crown,
  Network, ClipboardList, Plane, CalendarPlus, Server, Linkedin, Facebook, Twitter,
  Send, Music2, Languages, Share2, Headphones,
  FileSearch, MessageSquareWarning, PackageCheck, Percent,
} from "lucide-react";
import { TiktokIcon, SnapchatIcon } from "@/components/SocialIcons";

const WHATSAPP = "https://wa.me/966594700782";
const SALES_EMAIL = "info@jadara-hr.com";
// روابط حسابات التواصل الرسمية
const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/company/%D8%AC%D8%AF%D8%A7%D8%B1%D8%A9-%D9%84%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D9%88%D8%A7%D8%B1%D8%AF-%D8%A7%D9%84%D8%A8%D8%B4%D8%B1%D9%8A%D8%A9",
  twitter: "https://x.com/jadaraHRM",
  tiktok: "https://www.tiktok.com/@jadarahr?_r=1&_t=ZS-99aHcundyoi",
  facebook: "https://www.facebook.com/share/1CEdfx8jV7/?mibextid=wwXIfr",
  snapchat: "https://snapchat.com/t/9UWDJAhl",
};

const featuresAr = [
  { icon: Users, title: "إدارة الموظفين", desc: "ملفات كاملة، وثائق، إقامات، جوازات، تأمين طبي، حسابات بنكية، وتنبيهات انتهاء الوثائق." },
  { icon: CalendarCheck, title: "الحضور والانصراف", desc: "بصمة ذاتية من البرنامج نفسه — بدون أجهزة بصمة ولا أنظمة قديمة. يبصم الموظف حضوره وانصرافه من جواله داخل بوابة الموظف، ولا تُقبل البصمة إلا ضمن 50 متراً من مقر العمل، وتتدفّق تلقائياً إلى الإدارة والرواتب. وتبقى إمكانية استيراد البصمات من أجهزة البصمة (Excel/CSV) للمنشآت التي تستخدم أجهزتها." },
  { icon: CalendarPlus, title: "إدارة الإجازات والموافقات", desc: "بوابة الموظف لرفع طلبات الإجازات، ومسار موافقات متعدد المراحل (مدير مباشر ‹ الموارد البشرية ‹ المالية)، خصم آلي من رصيد الإجازات، ومرفقات التقارير الطبية." },
  { icon: Plane, title: "رحلات العمل والانتداب", desc: "طلب رحلات داخلية وخارجية من بوابة الموظف، حساب التكلفة (تنقل، إقامة، بدل انتداب يومي، سلفة)، اعتماد الإدارة، ومتابعة حالة الرحلة حتى الاكتمال." },
  { icon: Wallet, title: "إدارة الرواتب (Payroll)", desc: "احتساب آلي للراتب، تعديل المستحقات والسلف والخصومات، اعتماد وصرف كشوف، وتقارير شهرية." },
  { icon: ShieldCheck, title: "التأمينات الاجتماعية (GOSI)", desc: "احتساب تلقائي للنسب حسب تاريخ تسجيل الموظف: مسجل قبل 3 يوليو 2024 (21.5% = 9.75% موظف + 11.75% صاحب عمل)، ومسجل من 3 يوليو 2024 (23.5% = 10.75% + 12.75%)، والمقيم 2% مخاطر مهنية على صاحب العمل." },
  { icon: Calculator, title: "نهاية الخدمة", desc: "حاسبة وفق نظام العمل السعودي — جميع أسباب الإنهاء وموادها النظامية (53 فترة التجربة، 74، 75، 77، 80، 81، 84، 85)، تصفية رصيد الإجازات وتعويض التذاكر، ومخالصة قابلة للطباعة بشعار منشأتك." },
  { icon: Target, title: "إدارة الأداء", desc: "تقييمات دورية (أهداف، كفاءات، قيم)، توصيات (ترقية/مكافأة/إنذار)، ومسارات تطوير." },
  { icon: GitBranch, title: "التخطيط التعاقبي", desc: "خطة تعاقب للمناصب الحرجة، تحديد البدلاء، مستوى الجاهزية، ومخاطر الفقد وأثره." },
  { icon: Network, title: "الهيكل التنظيمي", desc: "بناء هيكل تنظيمي مرن تضعه المنشأة بنفسها (إدارة عليا › أقسام › مشرفون › عمال) بعدد مستويات ووحدات غير محدود، مع المسؤولين والأعداد المخططة والفعلية لكل وحدة." },
  { icon: ClipboardList, title: "تخطيط القوى العاملة", desc: "خطط القوى العاملة بأفق سنوي/متعدد السنوات: الأهداف، الأعداد الحالية والمستهدفة، فجوات التوظيف، الميزانية، التدريب، المبادرات ومؤشرات الأداء، وحالة الخطة." },
  { icon: BarChart3, title: "تحليلات الموارد البشرية", desc: "لوحات معلومات تفاعلية ومؤشرات لحظية: إجمالي القوى العاملة، نسبة التوطين، معدلات الدوران والاستبقاء (سنوي/نصف سنوي/ربع سنوي)، الحضور والغياب، متوسط خدمة المغادرين بالأيام، الإدارات عالية المخاطر، وتكلفة الرواتب الشهرية. توزيع القوى العاملة حسب الإدارة والجنس والحالات الوظيفية ومدة الخدمة، ومتوسط الراتب والأداء لكل إدارة، وأسباب المغادرة ورضا المغادرين (الراتب، المزايا، البيئة، الإدارة، التوصية)، مع توصيات آلية لخفض الدوران. ومركز تقارير متكامل: عقود قاربت بالانتهاء، الحضور والغياب (للجميع أو لموظف)، تراخيص قاربت الانتهاء، تقرير الأسطول والمركبات، رحلات العمل، الإنذارات لكل موظف، إدارة الأداء، مقابلات المغادرة، الاستبيانات، كشوف الرواتب المصروفة، واشتراكات المنصات الحكومية — مع توصيات مُولّدة بالذكاء الاصطناعي وتصدير PDF وطباعة لكل تقرير." },
  { icon: Car, title: "إدارة الأسطول والمركبات", desc: "مركبات، تأمين، رخص، فحوصات فنية دورية، ومسؤولين، مع تنبيهات انتهاء." },
  { icon: Landmark, title: "تراخيص المنشأة الحكومية", desc: "تتبّع كل تراخيص الجهات الحكومية وعقود الصيانة، خيار «لا ينطبق»، ونسخة إلكترونية لكل ترخيص." },
  { icon: Plug, title: "تنظيم المتطلبات الحكومية", desc: "تتبّع التراخيص والإقامات والتأمينات والضمان الصحي في مكان واحد، مع احتساب اشتراكات التأمينات الاجتماعية وتصدير كشوف جاهزة — والتكامل المباشر مع البوابات الحكومية (مقيم/أبشر/مدد/الضمان الصحي) قيد التطوير." },
  { icon: Server, title: "بنية تحتية سحابية خاصة", desc: "نعمل على خوادم VPS خاصة (غير مشتركة) بأعلى معايير التخزين السحابي، وتقنيات العزل والتشفير، فتعمل منصتك بأداء ثابت وسرعة فائقة لا تتأثر بضغط العمل أو عدد المستخدمين مهما كبر حجم منشأتك." },
  { icon: Building2, title: "بوابة تجربة العميل", desc: "نظام اشتراكات ذكي بفترة تجربة مجانية 30 يوماً، وإشعارات فورية للمالك بكل عميل جديد." },
  { icon: Gavel, title: "سياسة العمل والإنذارات الذكية", desc: "مرجع كامل لسياسة العمل وفق نظام العمل السعودي (الغياب، النوم، إتلاف المنتجات، العصيان، إفشاء الأسرار…). أنشئ إنذاراً تصاعدياً (أول/ثاني/ثالث/فصل) مرتبطاً بالمادة النظامية بعد جلسة تحقيق مع الموظف، ويُرسل تلقائياً إلى بوابة الموظف الذاتية — دون ورق ودون انتظار موافقة الموظف، ويظهر له عدد إنذاراته ودرجاتها فوراً." },
  { icon: Briefcase, title: "إدارة التوظيف", desc: "أنشئ الوظائف الشاغرة ببيانات كاملة (المهنة، الدرجة، الراتب، النوع، المطلوب سعودياً/مقيماً)، وولّد الوصف الوظيفي تلقائياً بالذكاء الاصطناعي — ويمكنك تعديله وإضافة أو حذف المهام. شارك إعلان الوظيفة عبر واتساب وتيليجرام ولينكدإن والبريد مع رابط تقديم عام يستقبل المتقدمين ويرفع السير الذاتية، رشّح المناسبين وادعُهم للمقابلة، وعند التعيين تُغلق الوظيفة وتُرفض بقية الطلبات تلقائياً، مع تقرير الموظفين الذين تم توظيفهم خلال آخر 90 يوماً وتقييم فترة التجربة (الكفاءة، السلوك، المعرفة، المجال المهني، الخبرة) والتوصية بتثبيت الموظف أو استبعاده وفق المادة 53 من نظام العمل." },
  { icon: GraduationCap, title: "التدريب والتطوير", desc: "ضع خططاً تدريبية لموظف محدد أو لجهة/قسم كامل بمعايير موحّدة: حدّد مشاكل النقص لدى الموظف، الهدف بعد الخطة، آلية التنفيذ والتكلفة والتواريخ، مع صناديق شرح ووصف تفصيلية، وتتبّع حالة كل خطة حتى الاكتمال لرفع كفاءة الموارد البشرية وفق احتياج المنشأة." },
  { icon: Languages, title: "بوابة موظف متعددة اللغات", desc: "بوابة الموظف الذاتية تدعم 7 لغات: العربية، الإنجليزية، الهندية، البنغالية، النيبالية، الفلبينية (Tagalog)، والأردية (الباكستانية) — يستخدمها كل موظف بلغته الأم بضغطة زر. تُرفع الإجازات والسلف والانتدابات والتقييمات من الموظف نفسه، وتُحفظ مشتركة بينه وبين الإدارة، وتظهر للطرفين في أي لحظة مع كل التفاصيل والاعتمادات والوثائق." },
  { icon: Share2, title: "طلبات مشتركة وشفافة بين الموظف والإدارة", desc: "كل ما يرفعه الموظف (إجازات، سلف، رحلات عمل، مرفقات) يُحفظ في سجل موحّد مشترك بين الموظف والإدارة — يتابع الموظف حالته واعتماداته، وتطّلع الإدارة على أي لحظة، مع مستندات المخالصات وكشوف السلف والتصفية المتاحة في ملف الموظف فور اعتمادها وصرفها مالياً." },
  { icon: Plane, title: "حجوزات الطيران", desc: "احجز رحلاتك داخل نظام جداره نفسه — اختر الوجهة والتاريخ وعدد الركاب، وبعد البحث عن الرحلة يُحوّلك النظام تلقائياً عبر الروابط العميقة (Deep Links) إلى منصة المسافر أو المطار أو Skyscanner أو Wingie لإكمال بيانات الجواز والدفع في صفحتها الآمنة. تكامل مع أربعة من أكبر مزوّدي الطيران دون مغادرة تجربة جداره." },
  { icon: Headphones, title: "منتج عربي ودعم فني مستمر", desc: "منصة عربية سعودية بتصميم فاخر وواجهة عربية أصيلة، مع دعم فني عربي على مدار الساعة عبر واتساب والبريد الإلكتروني — فريقنا جاهز لمساعدتك في كل خطوة، من التفعيل حتى الترحيل والتدريب." },
  { icon: FileSearch, title: "محاضر التحقيق", desc: "افتح محضر تحقيق رسمي برقمه وتاريخه ونوع المخالفة، وأضف أطراف الواقعة (موظف مُحقَّق معه أو شاهد)، واستقبل أقوال الموظف ومرفقاته من بوابته الذاتية، ثم اطبعه بترويسة منشأتك وشعارها — ويُحفظ المحضر كاملاً مرتبطاً بالإنذار الصادر عنه." },
  { icon: MessageSquareWarning, title: "الشكاوى", desc: "يرفع الموظف شكواه من بوابته الذاتية، وإن كانت سرّية تُحال مباشرة إلى الموارد البشرية دون المرور بالمدير المباشر؛ تمر بمسار اعتماد ويُصدر قرار المعالجة في مستند رسمي قابل للطباعة، مع سجل كامل لكل شكوى وحالتها." },
  { icon: PackageCheck, title: "العهد والمصروفات", desc: "تسليم العهد للموظفين (أجهزة، جوالات، خطوط، ملابس، أدوات) بطلب من بوابة الموظف ومسار موافقات، ومستند تسليم موقّع، وتتبّع الإرجاع والخصم عند التلف أو الفقد — مع تقييد المصروفات وربطها بتقارير المنصة." },
  { icon: Percent, title: "النطاقات (التوطين) بمعادلة قوى", desc: "يُحسب نطاق منشأتك (بلاتيني/أخضر مرتفع/متوسط/منخفض/أحمر) بنفس معادلة حاسبة قوى: النشاط التفصيلي من الدليل الوطني للأنشطة الاقتصادية وعدد السعوديين والوافدين من موظفيك النشطين، مع مزايا كل نطاق ومخاطره وكم سعودياً تحتاج للخروج من الأحمر — والنسب مُزامَنة تلقائياً من المصدر الرسمي (منصة قوى)." },
  { icon: Calculator, title: "ميزانية الموارد البشرية السنوية", desc: "كل ريال يُصرف على الموظف معروف بالنسبة لك: بنود محسوبة تلقائياً من بياناتك الفعلية (الرواتب والبدلات، التأمينات الاجتماعية بالنسب السارية لكل فئة، الإقامات ورخص العمل، مخصص نهاية الخدمة بمادة 84، ومخصص الإجازات من ملف الموظف)، وبنود تُدخلها مرة واحدة فتحدّث الميزانية فوراً — مع رسوم بيانية للموازنة السنوية ومقارنة الميزانية بالفعلي شهرياً، ومؤشرات تكلفة الموظف ونسبة السعودة، وطباعة PDF بترويسة منشأتك." },
];

const featuresEn = [
  { icon: Users, title: "Employee Management", desc: "Complete profiles, documents, Iqama, passports, health insurance, bank accounts, and document expiry alerts." },
  { icon: CalendarCheck, title: "Attendance & Time", desc: "Self check‑in from the app itself — no fingerprint machines, no legacy systems. Employees clock in/out from their phone inside the employee portal; check‑in is only accepted within 50 meters of the workplace and flows automatically to management and payroll. Importing punches from fingerprint devices (Excel/CSV) is still available for companies using hardware." },
  { icon: CalendarPlus, title: "Leaves & Approvals", desc: "Employee portal to submit leave requests with a multi‑stage approval flow (direct manager ‹ HR ‹ Finance), automatic leave‑balance deduction, and medical report attachments." },
  { icon: Plane, title: "Business Trips & Deputation", desc: "Request internal/external trips from the employee portal, cost calculation (transport, accommodation, daily per diem, advance), management approval, and trip status tracking to completion." },
  { icon: Wallet, title: "Payroll", desc: "Automatic salary calculation, editing of entitlements, loans, deductions, approval and payment of payroll sheets, and monthly reports." },
  { icon: ShieldCheck, title: "GOSI (Social Insurance)", desc: "Automatic rates by GOSI registration date: before 3 July 2024 (21.5% = 9.75% employee + 11.75% employer) and from 3 July 2024 (23.5% = 10.75% + 12.75%), with 2% occupational-hazards for expatriates (employer)." },
  { icon: Calculator, title: "End of Service", desc: "Calculator per Saudi Labor Law — all termination reasons and articles (53 probation, 74, 75, 77, 80, 81, 84, 85), leave balance encashment and ticket compensation, with a printable settlement bearing your company logo." },
  { icon: Target, title: "Performance Management", desc: "Periodic reviews (goals, competencies, values), recommendations (promotion/bonus/warning), and development paths." },
  { icon: GitBranch, title: "Succession Planning", desc: "Succession plans for critical roles, identify successors, readiness level, and risk and impact of loss." },
  { icon: Network, title: "Organization Structure", desc: "Build a flexible org structure the company shapes itself (exec › departments › supervisors › staff) with unlimited levels and units, with managers and planned/actual headcount per unit." },
  { icon: ClipboardList, title: "Workforce Planning", desc: "Workforce plans on an annual/multi‑year horizon: objectives, current vs target headcount, hiring gaps, budget, training, initiatives, KPIs, and plan status." },
  { icon: BarChart3, title: "HR Analytics", desc: "Interactive dashboards and live KPIs: total workforce, Saudization rate, turnover & retention rates (annual/semi-annual/quarterly), attendance & absence, average tenure at exit (days), high-risk departments, and monthly payroll cost. Headcount by department, gender, employment status and tenure, average salary and performance per department, exit reasons and exiting-employee satisfaction (salary, benefits, environment, management, recommend), plus auto-generated turnover-reduction recommendations. And a full reports center: expiring contracts, attendance & absence (all or per employee), licenses expiring, fleet & vehicles report, business trips, per-employee warnings, performance, exit interviews, surveys, paid payroll sheets, and government-platform subscriptions — with AI-generated insights and PDF export/print for every report." },
  { icon: Car, title: "Fleet & Vehicles", desc: "Vehicles, insurance, licenses, periodic technical inspections, and assignees, with expiry alerts." },
  { icon: Landmark, title: "Government Licenses", desc: "Track all government authority licenses and maintenance contracts, a “not applicable” option, and an electronic copy for each license." },
  { icon: Plug, title: "Government Requirement Tracking", desc: "Track licenses, Iqama, insurance, and health insurance in one place, with automatic GOSI contribution calculation and ready-to-export sheets — direct integration with government portals (Muqeem/Absher/Mudad/Health Insurance) is under development." },
  { icon: Server, title: "Private Cloud Infrastructure", desc: "We run on dedicated VPS servers (not shared) with the highest cloud storage standards, isolation and encryption — so your platform runs with steady performance and blazing speed unaffected by workload or user volume, however large your organization grows." },
  { icon: Building2, title: "Client Trial Portal", desc: "Smart subscription system with a 30‑day free trial and instant owner notifications for every new client." },
  { icon: Gavel, title: "Labor Policy & Smart Warnings", desc: "Full labor policy reference per Saudi Labor Law (absence, sleeping, product damage, insubordination, disclosure of secrets…). Issue a progressive warning (first/second/third/termination) linked to the relevant article after an investigation session with the employee; it is sent automatically to the employee self-service portal — paperless and without waiting for the employee's approval — and their warnings count and levels appear instantly." },
  { icon: Briefcase, title: "Recruitment Management", desc: "Create vacancies with full data (profession, grade, salary, type, Saudi/expat requirement) and auto-generate the job description with AI — fully editable to add or remove tasks. Share the posting on WhatsApp, Telegram, LinkedIn, and email with a public apply link that receives applicants and their CVs, shortlist the suitable ones and invite them to interviews, and on hiring the job closes and remaining requests are auto-rejected — with a 90-day hiring report and a probation evaluation (competence, behavior, knowledge, professional field, experience) and a recommendation to confirm or dismiss per Article 53 of the Labor Law." },
  { icon: GraduationCap, title: "Training & Development", desc: "Build training plans for a specific employee or a whole department under unified criteria: define the employee's skill gaps, the post-plan goal, the execution mechanism, cost and dates, with detailed description fields, and track each plan to completion to raise workforce capability per the organization's needs." },
  { icon: Languages, title: "Multilingual Employee Portal", desc: "The self-service portal supports 7 languages: Arabic, English, Hindi, Bengali, Nepali, Tagalog (Filipino) and Urdu (Pakistani) — every employee uses it in their native language with one tap. Leaves, loans, business trips and performance reviews are submitted by the employee and saved shared between them and management, visible to both at any moment with all details, approvals and documents." },
  { icon: Share2, title: "Shared, Transparent Requests", desc: "Everything an employee submits (leaves, loans, business trips, attachments) is kept in one shared record between the employee and management — the employee tracks their status and approvals, while management can review any request at any moment, with settlement, loan-statement and clearance documents available in the employee file as soon as they are approved and paid." },
  { icon: Plane, title: "Flight Bookings", desc: "Book your flights right inside Jadara — pick the destination, date, and passengers; after the search, the system redirects you automatically via Deep Links to Almosafer, Almatar, Skyscanner, or Wingie to complete passport details and payment on their secure checkout page. An integration with four of the largest flight providers without leaving the Jadara experience." },
  { icon: Headphones, title: "Arabic Product & Continuous Support", desc: "A Saudi Arabic platform with a premium, authentic Arabic-first design, plus round-the-clock Arabic technical support via WhatsApp and email — our team is ready to help at every step, from activation to onboarding and training." },
  { icon: FileSearch, title: "Investigation Minutes", desc: "Open an official investigation minute with its number, date and violation type, add the case parties (the employee under investigation or a witness), receive the employee's statement and attachments from their self-service portal, then print it with your company letterhead and logo — the minute is kept in full, linked to the warning it produced." },
  { icon: MessageSquareWarning, title: "Complaints", desc: "An employee files a complaint from their self-service portal, and a confidential one goes straight to HR without passing through the direct manager; it follows an approval flow and the resolution is issued as a printable official document, with a full record of every complaint and its status." },
  { icon: PackageCheck, title: "Custody & Expenses", desc: "Hand over custody items (devices, phones, SIM lines, clothing, tools) through an employee-portal request and approval flow, with a signed handover document, plus return tracking and deductions for damage or loss — with expenses captured and reflected in the platform's reports." },
  { icon: Percent, title: "Nitaqat (Saudization) with Qiwa's formula", desc: "Your band (Platinum / High / Medium / Low Green / Red) is calculated using Qiwa's own calculator formula: the detailed activity from the National Guide of Economic Activities plus the Saudi and expat counts from your active employees, with each band's benefits and risks and how many more Saudis you need to leave Red — and the ratios are synced automatically from the official source (Qiwa)." },
  { icon: Calculator, title: "Annual HR Budget", desc: "Every riyal spent on employees is accounted for: lines computed automatically from your actual data (salaries & allowances, social insurance at each category's current rates, iqama & work permits, the Article-84 end-of-service provision, and leave provisions from each employee file), plus lines you enter once that update the budget instantly — with annual charts, a monthly budget-vs-actual comparison, cost-per-employee and Saudization KPIs, and PDF print on your company letterhead." },
];

const licensesAr = [
  "السجل التجاري", "أمانة/بلدية", "الدفاع المدني",
  "وزارة الصناعة والثروة المعدنية", "الهيئة السعودية للمدن الصناعية ومناطق التقنية (MODON)", "الهيئة العامة للغذاء والدواء (SFDA)",
  "وزارة الموارد البشرية والتنمية الاجتماعية", "التأمينات الاجتماعية (GOSI)",
  "هيئة النقل", "الهيئة السعودية للسياحة", "الزكاة والضريبة والجمارك",
  "مكتب العمل", "الرخصة الصحية / العيادات",
];
const licensesEn = [
  "Commercial Register", "Municipality", "Civil Defense",
  "Ministry of Industry & Mineral Resources", "MODON", "SFDA",
  "Ministry of Human Resources", "GOSI",
  "Transport Authority", "Saudi Tourism Authority", "ZATCA",
  "Labor Office", "Health / Clinic License",
];

const integrationsAr = [
  { icon: Bell, t: "إشعارات فورية", d: "تنبيهات استباقية لانتهاء التراخيص والإقامات والتأمينات والوثائق والمركبات.", soon: false },
  { icon: Landmark, t: "التراخيص الحكومية", d: "ربط مع بوابات التراخيص الحكومية ومتابعة استصدارها وتجديدها.", soon: true },
  { icon: BadgeCheck, t: "مقيم وأبشر (قريباً)", d: "تكاملات قادمة مع منصة مقيم وأبشر لمتابعة هويات وإقامات المقيمين.", soon: true },
  { icon: ShieldCheck, t: "التأمينات الاجتماعية (GOSI)", d: "احتساب اشتراكات التأمينات الاجتماعية وفق النظام وتصدير كشوف جاهزة — والتكامل المباشر مع منصة التأمينات قيد التطوير.", soon: true },
  { icon: HeartPulse, t: "مجلس الضمان الصحي", d: "ربط بيانات التأمين الصحي والمستفيدين والاعتمادات.", soon: true },
  { icon: Stethoscope, t: "التعاملات الطبية", d: "ربط التعاملات الطبية والفحوصات لهويات المقيمين.", soon: true },
  { icon: Car, t: "إدارة المرور للمركبات", d: "ربط رخص وتأمين وفحوصات المركبات مع إدارة المرور.", soon: true },
  { icon: Calculator, t: "أنظمة المحاسبة (Odoo/ERP)", d: "تكامل مع أنظمة محاسبية Odoo وأنظمة ERP لترحيل الرواتب والقيود.", soon: true },
];
const integrationsEn = [
  { icon: Bell, t: "Instant Notifications", d: "Proactive alerts for expiry of licenses, Iqama, insurance, documents, and vehicles.", soon: false },
  { icon: Landmark, t: "Government Licenses", d: "Integration with government license portals to track issuance and renewal.", soon: true },
  { icon: BadgeCheck, t: "Muqeem & Absher (Soon)", d: "Upcoming integrations with Muqeem and Absher to track expat IDs and Iqama.", soon: true },
  { icon: ShieldCheck, t: "GOSI", d: "Automatic GOSI contribution calculation per the scheme, with ready-to-export sheets — direct integration with the GOSI portal is under development.", soon: true },
  { icon: HeartPulse, t: "Health Insurance Council", d: "Link health insurance data, beneficiaries, and approvals.", soon: true },
  { icon: Stethoscope, t: "Medical Transactions", d: "Link medical transactions and tests to expat IDs.", soon: true },
  { icon: Car, t: "Traffic for Vehicles", d: "Link vehicle licenses, insurance, and inspections with the Traffic Department.", soon: true },
  { icon: Calculator, t: "Accounting (Odoo/ERP)", d: "Integration with Odoo and ERP systems to post payroll and journal entries.", soon: true },
];

const tiersAr = PRICING_TIERS_AR;
const tiersEn = PRICING_TIERS_EN;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Landing() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { gate, notice } = useNativeGate();
  const isAr = lang === "ar";
  const features = isAr ? featuresAr : featuresEn;
  const licenses = isAr ? licensesAr : licensesEn;
  const integrations = isAr ? integrationsAr : integrationsEn;

  const t = isAr ? {
    nav: { features: "المميزات", licenses: "التراخيص", nitaqat: "النطاقات", integrations: "التكاملات", about: "عن المؤسس", pricing: "الباقات", contact: "تواصل" },
    portal: "بوابة دخول الموظفين الذاتية", ownerPortal: "بوابة المالك الذاتية", login: "بوابة دخول الشركات", start: "ابدأ الآن",
    badge: "منصة الموارد البشرية السعودية",
    titlePre: "نظام الموارد البشرية",
    titleHi: "الأحدث والأكثر تكاملاً",
    heroDesc: "من «جداره» — منصة سعودية واحدة متكاملة تجمع كل جوانب إدارة رأس المال البشري في مكان واحد: ملفات الموظفين ووثائقهم، الحضور والبصمة الذاتية من الجوال، الإجازات والسلف ورحلات العمل المرفوعة من الموظف والمشتركة مع الإدارة لحظياً، الرواتب وحماية الأجور، التأمينات الاجتماعية، نهاية الخدمة وفق نظام العمل، إدارة الأداء والتدريب والتطوير، التخطيط التعاقبي والقوى العاملة، التحليلات اللحظية، الأسطول والمركبات، التراخيص الحكومية، والإنذارات الذكية المرتبطة بنظام العمل — مع بوابة موظف ذاتية تدعم 7 لغات، ومسار موافقات متعدد المراحل، وتنظيم للمتطلبات الحكومية، وتصميم فخم، وحسابات دقيقة وفق الأنظمة السعودية.",
    cta1: "جرّب مجاناً لمدة شهر", cta2: "استكشف المميزات",
    stats: [{ n: "+50", l: "عميل تابع" }, { n: "+15,000", l: "موظف مُدار" }, { n: "99.9%", l: "استمرارية" }],
    portalTitle: "بوابة الموظف الذاتية",
    portalDesc: "دخول خاص بالموظفين فقط — بصمة الحضور والانصراف من الجوال ضمن 50 متراً من مقر العمل (بدون أجهزة)، وعرض الراتب ورصيد الإجازات، ورفع طلبات السلف والإجازات ورحلات العمل مباشرة. تدعم البوابة 7 لغات (العربية، الإنجليزية، الهندية، البنغالية، النيبالية، الفلبينية، الأردية) ليستخدمها كل موظف بلغته، وتُحفظ الطلبات مشتركة بين الموظف والإدارة وتظهر للطرفين في أي لحظة.",
    portalCta: "دخول البوابة",
    approvers: "بوابة المعتمدين",
    approversTitle: "بوابة المعتمدين",
    approversDesc: "دخول مخصّص للمديرين المباشرين والمديرين الماليين لاعتماد طلبات الإجازات والسلف ورحلات العمل ونهاية الخدمة — عبر البريد الإلكتروني وكلمة المرور فقط. ليست بوابة الموظف (إقامة) ولا بوابة الشركات (رقم موحّد).",
    approversCta: "دخول المعتمدين",
    featuresTag: "كل ما تحتاجه في مكان واحد", featuresTitle: "منصة واحدة، حلول متكاملة",
    vmvTag: "هويتنا", vmvTitle: "رؤيتنا، رسالتنا، وأهدافنا",
    visionLabel: "رؤيتنا",     visionText: "أن نكون المنصة السعودية الرائدة والمفضّلة لإدارة الموارد البشرية بحلول 2030، نمكّن المنشآت من تحويل مواردها البشرية إلى ميزة تنافسية حقيقية عبر تقنية سحابية ذكية مصممة لدعم متطلبات العمل والموارد البشرية في السعودية.",
    missionLabel: "رسالتنا", missionText: "تبسيط إدارة الموارد البشرية للمنشآت السعودية بمختلف أحجامها عبر منصة واحدة متكاملة، تجمع الموظفين والحضور والرواتب والإجازات ونهاية الخدمة والتراخيص والتحليلات، وتوفّر تجربة فاخرة وآمنة ودقيقة بلا تعقيد.",
    goalsLabel: "أهدافنا",     goalsText: "نمكّن عملاءنا من الكفاءة والنمو، ونساعدهم على تنظيم متطلباتهم، ونختصر الوقت والجهد، ونعزز التوطين وقرارات الموارد البشرية بالبيانات، ونبني شراكة طويلة الأمد قائمة على الثقة والشفافية.",
    licensesTag: "تنظيم التراخيص", licensesTitle: "تراخيص حكومية شاملة تحت سقف واحد",
    licBadge: "مزايا إدارة التراخيص",
    licLi: ["إرفاق نسخة إلكترونية لكل ترخيص.", "تنبيهات استباقية قبل انتهاء الترخيص.", "تسجيل عقود الصيانة وتواريخها.", "تصنيف مخصّص لأي ترخيص حكومي إضافي."],
    integTag: "تكاملات ذكية", integTitle: "تكاملات تربط نظامك بالواقع",
    aboutTag: "الرؤية خلف جداره", aboutTitle: "عن المؤسس",
    aboutChip: "مولد فكرة «جداره» ومصمم منهجها",
    aboutRole: "مدير رأس المال البشري",
    aboutText1: "يقف خلف «جداره» قائد في إدارة رأس المال البشري جمع بين العمق الأكاديمي والخبرة التطبيقية في تصميم حلول رقمية ترفع كفاءة المنشآت وتلتزم بالأنظمة السعودية. حاصل على درجة ", aboutTextBold1: "الماجستير في إدارة الموارد البشرية", aboutTextUniv: " من ", aboutTextUnivBold: "جامعة بورتسموث — المملكة المتحدة", aboutTextGrade: " بتقدير ", aboutTextGradeBold: "جيد جداً",
    aboutText2: "، إضافةً إلى شهادة ", certs: ["MA — University of Portsmouth", "SHRM-SCP", "OTHM", "CMI"],
    certAr: ["ماجستير — جامعة بورتسموث", "SHRM-SCP", "OTHM", "CMI"],
    pricingTag: "ابدأ الآن", pricingTitle: "باقات بسيطة وشريفة",
    planTrialLabel: "تجربة مجانية", planTrialDur: "30 يوماً", planTrialSub: "بدون بطاقة ائتمان",
    planTrialLi: ["تجربة كاملة لكل المميزات", "مدة 30 يوماً بدون بطاقة ائتمان", "استيراد بيانات الموظفين", "دعم فني خلال فترة التجربة", "بدون التزام"],
    planTrialCta: "سجّل تجربتك",
    planAnnualLabel: "الاشتراك السنوي", planAnnualPrice: "2,500 ريال", planAnnualPriceNote: "السنة الأولى (تشمل سنة مجانية)", planAnnualAfter: "ثم 700 ريال سنوياً من العام الثاني", planAnnualSub: "اطلب عرض سعر ودفع بتحويل بنكي",
    planAnnualLi: ["كل مميزات المنصة", "السنة الأولى بـ 2,500 ريال (تشمل سنة مجانية)", "التجديد السنوي 700 ريال فقط من العام الثاني", "إدارة التراخيص والمتطلبات الحكومية", "دعم مخصّص وتحديثات مستمرة"],
    planAnnualBadge: "الأكثر اختياراً", planAnnualCta: "اطلب عرض السعر",
    paidVerifying: "جارٍ تأكيد الاشتراك والدفع…",
    paidTitle: "تم الاشتراك بنجاح", paidDesc: "تم تفعيل اشتراكك السنوي ودفع 2,500 ريال بنجاح. سنتواصل معك على بياناتك لتأكيد الترحيل، وتجديد العام الثاني بـ 700 ريال. تحقق من بريدك.",
    paidCta: "تسجيل الدخول للمنصة",
    trialTag: "سجّل في دقيقة", trialTitle: "ابدأ تجربتك المجانية الآن",
    doneTitle: "تم استلام طلبك بنجاح", doneDesc: "سيتواصل معك فريقنا خلال فترة التجربة لتفعيل اشتراكك السنوي ونقل بياناتك. تحقق من بريدك الإلكتروني.",
    doneCta: "تسجيل الدخول للمنصة",
    form: { company: "اسم المنشأة *", industry: "القطاع / النشاط", city: "المدينة", contact: "اسم الشخص المسؤول", phone: "الهاتف *", unified: "الرقم الوطني الموحد للمنشآت (10 خانات تبدأ بـ7) *", email: "البريد الإلكتروني *", headcount: "عدد الموظفين المتوقع *", pricePreview: (tier, price) => `شريحتك: ${tier} — السعر السنوي للباقة: ${price.toLocaleString()} ر.س`, submit: "تفعيل التجربة المجانية لمدة شهر", secure: "بياناتك آمنة ولن تُباع لأي طرف ثالث" },
    contactTag: "نحن هنا لمساعدتك", contactTitle: "تواصل معنا",
    wa: "واتساب مباشر", emailCard: "البريد الإلكتروني", loc: "الموقع", locVal: "المملكة العربية السعودية - الرياض - المركز المالي KAFD",
    footerDesc: "منصة الموارد البشرية السعودية المتكاملة — منصة واحدة تجمع كل ما تحتاجه لإدارة رأس المال البشري.",
    footContact: "تواصل معنا", footPlatform: "المنصة", copy: `© ${new Date().getFullYear()} جداره — جميع الحقوق محفوظة`,
  } : {
    nav: { features: "Features", licenses: "Licenses", nitaqat: "Nitaqat", integrations: "Integrations", about: "Founder", pricing: "Pricing", contact: "Contact" },
    portal: "Employee Self‑Service Portal", ownerPortal: "Owner Portal", login: "Company Portal", start: "Get Started",
    badge: "The Saudi HR Platform",
    titlePre: "The Latest & Most",
    titleHi: "Integrated HR System",
    heroDesc: "From “Jadara” — one integrated Saudi platform that brings together every aspect of human-capital management in one place: employee profiles and documents, mobile self-attendance, leaves, loans and business trips submitted by employees and shared live with management, payroll and wage protection, GOSI, end-of-service per labor law, performance, training and development, succession and workforce planning, live analytics, fleet and vehicles, government licenses, and smart labor-law warnings — with a 7-language employee self-service portal, a multi-stage approval flow, government requirement organization, a premium design, and accurate calculations per Saudi regulations.",
    cta1: "Try free for a month", cta2: "Explore Features",
    stats: [{ n: "+50", l: "Active Clients" }, { n: "+15,000", l: "Employees Managed" }, { n: "99.9%", l: "Uptime" }],
    portalTitle: "Employee Self‑Service Portal",
    portalDesc: "Employees only — clock in/out from the phone within 50 meters of the workplace (no devices), view salary and leave balance, and submit loan, leave, and business‑trip requests directly. The portal supports 7 languages (Arabic, English, Hindi, Bengali, Nepali, Tagalog, Urdu) so every employee uses it in their own language; requests are saved shared between employee and management and visible to both at any moment.",
    portalCta: "Enter Portal",
    approvers: "Approvers Portal",
    approversTitle: "Approvers Portal",
    approversDesc: "Sign-in for direct managers and finance managers to approve leave, loan, business-trip and end-of-service requests — email and password only. Not the employee portal (Iqama) nor the company portal (unified number).",
    approversCta: "Approvers sign in",
    featuresTag: "Everything in one place", featuresTitle: "One platform, integrated solutions",
    vmvTag: "Our Identity", vmvTitle: "Our Vision, Mission & Goals",
    visionLabel: "Our Vision",     visionText: "To be the leading and preferred Saudi platform for human resource management by 2030, empowering organizations to turn their human capital into a genuine competitive advantage through smart cloud technology built to support Saudi labor and HR requirements.",
    missionLabel: "Our Mission", missionText: "Simplify HR management for Saudi organizations of all sizes through one integrated platform that brings together employees, attendance, payroll, leaves, end-of-service, licenses, and analytics — delivering a premium, secure, and accurate experience without complexity.",
    goalsLabel: "Our Goals",     goalsText: "Empower our clients' efficiency and growth; help them organize their requirements; cut time and effort; strengthen Saudization and data-driven HR decisions; and build a long-term partnership grounded in trust and transparency.",
    licensesTag: "License management", licensesTitle: "All government licenses under one roof",
    licBadge: "License management perks",
    licLi: ["Attach an electronic copy for each license.", "Proactive alerts before expiry.", "Record maintenance contracts and dates.", "Custom classification for any extra government license."],
    integTag: "Smart integrations", integTitle: "Integrations that connect your system to reality",
    aboutTag: "The vision behind Jadara", aboutTitle: "About the Founder",
    aboutChip: "Originator of the Jadara idea and designer of its methodology",
    aboutRole: "Head of Human Capital",
    aboutText1: "Behind “Jadara” stands a leader in human capital management combining academic depth with applied experience in designing digital solutions that raise organizational efficiency and comply with Saudi regulations. Holds a ", aboutTextBold1: "Master’s in HR Management", aboutTextUniv: " from ", aboutTextUnivBold: "University of Portsmouth — UK", aboutTextGrade: " with merit ", aboutTextGradeBold: "Very Good",
    aboutText2: ", in addition to the ", certs: ["MA — University of Portsmouth", "SHRM-SCP", "OTHM", "CMI"],
    certAr: ["MA — University of Portsmouth", "SHRM-SCP", "OTHM", "CMI"],
    pricingTag: "Start now", pricingTitle: "Simple, fair plans",
    planTrialLabel: "Free Trial", planTrialDur: "30 days", planTrialSub: "No credit card",
    planTrialLi: ["Full access to all features", "30 days, no credit card", "Import employee data", "Technical support during the trial", "No commitment"],
    planTrialCta: "Start your trial",
    planAnnualLabel: "Annual Subscription", planAnnualPrice: "SAR 2,500", planAnnualPriceNote: "First year (includes one free year)", planAnnualAfter: "Then SAR 700 / year from year two", planAnnualSub: "Request a quote & pay by bank transfer",
    planAnnualLi: ["All platform features", "First year at SAR 2,500 (includes one free year)", "Annual renewal at only SAR 700 from year two", "Government license & requirement management", "Dedicated support and continuous updates"],
    planAnnualBadge: "Most chosen", planAnnualCta: "Request a quote",
    paidVerifying: "Verifying subscription and payment…",
    paidTitle: "Subscription successful", paidDesc: "Your annual subscription is active and SAR 2,500 was paid. We’ll contact you on your details to confirm onboarding; renewal from year two is SAR 700. Check your email.",
    paidCta: "Sign in to the platform",
    trialTag: "Register in a minute", trialTitle: "Start your free trial now",
    doneTitle: "Your request was received", doneDesc: "Our team will contact you during the trial to activate your annual subscription and migrate your data. Check your email.",
    doneCta: "Sign in to the platform",
    form: { company: "Company name *", industry: "Sector / Activity", city: "City", contact: "Responsible person", phone: "Phone *", unified: "National Unified Number (10 digits, starts with 7) *", email: "Email *", headcount: "Expected employees count *", pricePreview: (tier, price) => `Your tier: ${tier} — Annual package price: ${price.toLocaleString()} SAR`, submit: "Activate the free trial for a month", secure: "Your data is safe and will never be sold to third parties" },
    contactTag: "We’re here to help", contactTitle: "Contact us",
    wa: "WhatsApp directly", emailCard: "Email", loc: "Location", locVal: "Saudi Arabia — Riyadh — KAFD Financial Center",
    footerDesc: "The integrated Saudi HR platform — one place bringing together everything you need to manage human capital.",
    footContact: "Contact us", footPlatform: "Platform", copy: `© ${new Date().getFullYear()} Jadara — All rights reserved`,
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  // هوية موسمية لكل الصفحة داخل نطاق الموسم، وتعود هوية جداره الكحلية تلقائياً بعده
  const seasonal = !!getActiveSeason();

  return (
    <div className="min-h-screen antialiased bg-[#F6F3FC] text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <AssistantAvatar mode="public" tone="dark" lang={lang} />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px] bg-violet-300/40" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] bg-violet-200/35" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] bg-fuchsia-200/25" />
      </div>

      {/* شريط علوي */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-violet-100">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-14 h-20 flex items-center justify-between">
          <Link to="/">
            <Logo tone="dark" size={56} />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-base text-foreground/70">
            <button onClick={() => scrollTo("features")} className="hover:text-violet-700 transition">{t.nav.features}</button>
            <button onClick={() => scrollTo("licenses")} className="hover:text-violet-700 transition">{t.nav.licenses}</button>
            <button onClick={() => scrollTo("nitaqat")} className="hover:text-violet-700 transition">{t.nav.nitaqat}</button>
            <button onClick={() => scrollTo("integrations")} className="hover:text-violet-700 transition">{t.nav.integrations}</button>
            <button onClick={() => scrollTo("about")} className="hover:text-violet-700 transition">{t.nav.about}</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-violet-700 transition">{t.nav.pricing}</button>
            <button onClick={() => scrollTo("contact")} className="hover:text-violet-700 transition">{t.nav.contact}</button>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link to="/portal" className="text-base text-foreground/70 hover:text-violet-700 px-4 py-2 rounded-lg hidden sm:block">{t.portal}</Link>
            <Link to="/company-login" className="text-base text-foreground/70 hover:text-violet-700 px-4 py-2 rounded-lg hidden sm:block">{t.login}</Link>
            <button onClick={() => gate(() => navigate("/quote"))} className="text-base bg-violet-600 hover:bg-violet-700 px-5 py-2.5 rounded-xl font-semibold text-white shadow-lg shadow-violet-600/30 transition">{t.start}</button>
          </div>
        </div>
      </header>

      {/* Hero — فيديو سينمائي يغطي الشاشة بالكامل بخلفية الكرة، مع عنوان وأزرار فوقه */}
      <section className="relative min-h-[92vh] flex flex-col overflow-hidden">
        <SeasonalHero isAr={isAr} />
        <HrKeywordField />
        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-14 pt-12 pb-6 w-full text-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight text-white drop-shadow-lg" style={{ fontFamily: "var(--font-display)" }}>
              <span className="block">{t.titlePre}</span>
              <span className="block text-white">{t.titleHi}</span>
            </h1>
          </motion.div>
        </div>

        <div className="relative flex-1" />

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-14 pb-10 w-full">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-2xl text-center sm:text-start">
              <p className="text-foreground/70 text-base sm:text-lg leading-relaxed mb-5">{t.heroDesc}</p>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <button onClick={() => gate(() => navigate("/quote"))} className="bg-white hover:bg-slate-100 border-2 border-black text-foreground px-6 py-3.5 rounded-2xl font-semibold shadow-xl shadow-black/20 flex items-center gap-2 transition">
                  <Zap size={18} /> {t.cta1}
                </button>
                <button onClick={() => scrollTo("features")} className="bg-white hover:bg-slate-100 border-2 border-black text-foreground px-6 py-3.5 rounded-2xl font-medium shadow-xl shadow-black/20 flex items-center gap-2 transition"><ArrowLeft size={16} style={{ transform: isAr ? "none" : "scaleX(-1)" }} /> {t.cta2}</button>
              </div>
              <StoreButtons variant="light" isAr={isAr} className="mt-6 justify-center sm:justify-start" />
            </motion.div>
            <div className="flex gap-8 text-sm">
              {t.stats.map((s) => <Stat key={s.l} n={s.n} l={s.l} />)}
            </div>
          </div>
        </div>
      </section>

      {/* صورة الفريق السعودي + شبكة الخدمات بجوارها */}
      <section className="max-w-[1600px] mx-auto px-6 lg:px-14 pt-10 pb-6 grid lg:grid-cols-12 gap-6 items-stretch">
        {/* صورة الفريق السعودي — نُزلت هنا من الـ Hero لتظهر بجوار المميزات */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-[2rem] border border-violet-100 min-h-[440px]">
          <Image src="https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/9f8ce8977_generated_image.png" alt={isAr ? "شباب سعوديون واقفون في بيئة عمل احترافية مع شعار جداره" : "Young Saudi team standing in a professional environment with Jadara logo"} fittingType="fill" className="w-full h-full absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="absolute bottom-6 right-6 left-6">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-xs text-white/90 mb-3 backdrop-blur-md">
              <Sparkles size={12} className="text-violet-200" /> {isAr ? "كل ما تحتاجه في مكان واحد" : "Everything in one place"}
            </div>
            <h3 className="text-2xl font-bold text-white leading-snug" style={{ fontFamily: "var(--font-display)" }}>{isAr ? "كل خدمات المنصة في مكان واحد" : "All platform services in one place"}</h3>
          </div>
        </div>

        {/* شبكة الخدمات — بجوار صورة الفريق السعودي */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-[2rem] border border-violet-100 bg-white p-6 sm:p-7">
          <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="relative mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-violet-600" />
            <span className="text-base font-semibold text-foreground">{isAr ? "كل خدمات المنصة في مكان واحد" : "All platform services in one place"}</span>
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {features.map((f) => {
              const I = f.icon;
              return (
                <div key={f.title} className="bg-violet-50/60 border border-violet-100 rounded-xl px-2.5 py-2.5 flex items-center gap-2">
                  <I size={15} className="text-violet-600 shrink-0" />
                  <span className="text-sm leading-snug text-foreground">{f.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* بوابة الموظف الذاتية — مكوّن مستقل */}
      <section className="max-w-[1600px] mx-auto px-6 lg:px-14 pb-10">
        <div className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-gradient-to-l from-violet-50 via-violet-100/60 to-fuchsia-50 p-8 sm:p-10">
          <div className="absolute -top-12 -left-12 w-60 h-60 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="relative flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                <Users size={26} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">{t.portalTitle}</h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">{t.portalDesc}</p>
              </div>
            </div>
            <Link to="/portal" className="self-start inline-flex items-center gap-2 bg-violet-600 text-white hover:bg-violet-700 px-6 py-3.5 rounded-2xl font-semibold shadow-xl shadow-violet-600/30 transition">
              {t.portalCta} <ArrowLeft size={18} style={{ transform: isAr ? "none" : "scaleX(-1)" }} />
            </Link>
          </div>
        </div>
      </section>

      {/* مزوّدو حجوزات الطيران */}
      <FlightProviders isAr={isAr} />

      {/* عملاؤنا */}
      <ClientMarquee />

      {/* الرؤية والرسالة والأهداف */}
      <section id="vmv" className="max-w-[1600px] mx-auto px-6 lg:px-14 py-14">
        <SectionHead tag={t.vmvTag} title={t.vmvTitle} />
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {[
            { icon: Star, label: t.visionLabel, text: t.visionText, glow: "from-violet-200/60 to-violet-100/40", ring: "text-violet-600" },
            { icon: ShieldCheck, label: t.missionLabel, text: t.missionText, glow: "from-fuchsia-200/60 to-violet-100/40", ring: "text-fuchsia-600" },
            { icon: Target, label: t.goalsLabel, text: t.goalsText, glow: "from-indigo-200/60 to-violet-100/40", ring: "text-indigo-600" },
          ].map((c) => {
            const I = c.icon;
            return (
              <motion.div key={c.label} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
                className="relative border border-violet-100 rounded-3xl p-7 overflow-hidden bg-white">
                <div className={`absolute -top-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-br ${c.glow} blur-2xl`} />
                <div className="relative w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-4 shadow-sm">
                  <I size={22} className={c.ring} />
                </div>
                <div className="relative text-2xl font-bold mb-2 text-foreground" style={{ fontFamily: "var(--font-display)" }}>{c.label}</div>
                <p className="relative text-muted-foreground text-base leading-relaxed">{c.text}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* المميزات */}
      <section id="features" className="max-w-[1600px] mx-auto px-6 lg:px-14 py-14">
        <SectionHead tag={t.featuresTag} title={t.featuresTitle} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {features.map((f) => {
            const I = f.icon;
            return (
              <motion.div key={f.title} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
                className="group relative border border-violet-100 rounded-3xl p-6 pt-7 transition-all hover:-translate-y-1 overflow-hidden bg-white hover:bg-violet-50/40">
                <div className="absolute top-7 left-6 h-8 w-8 rounded-full bg-violet-500/0 group-hover:bg-violet-500/10 blur-xl transition-all" />
                <div className="relative w-12 h-12 rounded-2xl border border-violet-100 flex items-center justify-center mb-4 shadow-sm bg-violet-50">
                  <I size={22} className="text-violet-600" />
                </div>
                <div className="relative font-bold text-xl leading-snug text-foreground">{f.title}</div>
                <div className="relative text-muted-foreground text-base mt-2 leading-relaxed">{f.desc}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* التراخيص الحكومية */}
      <section id="licenses" className="max-w-[1600px] mx-auto px-6 lg:px-14 py-14">
        <SectionHead tag={t.licensesTag} title={t.licensesTitle} />
        <div className="grid lg:grid-cols-3 gap-6 mt-10 items-start">
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-3">
            {licenses.map((l) => (
              <div key={l} className="flex items-center gap-2.5 bg-white border border-violet-100 rounded-2xl px-4 py-3 text-base text-foreground">
                <Landmark size={16} className="text-violet-600 shrink-0" /> {l}
              </div>
            ))}
          </div>
          <div className="bg-white border border-violet-100 rounded-3xl p-6 space-y-3 text-base text-muted-foreground">
            <div className="font-semibold text-foreground text-lg mb-1">{t.licBadge}</div>
            {t.licLi.map((li) => <FeatureLi key={li}>{li}</FeatureLi>)}
          </div>
        </div>
      </section>

      {/* النطاقات (التوطين) — مطابقة حاسبة قوى ومزامنة من المصدر الرسمي */}
      <NitaqatSection isAr={isAr} />

      {/* التكاملات */}
      <section id="integrations" className="max-w-[1600px] mx-auto px-6 lg:px-14 py-14">
        <SectionHead tag={t.integTag} title={t.integTitle} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {integrations.map((it) => {
            const I = it.icon;
            return (
              <div key={it.t} className="bg-white border border-violet-100 rounded-3xl p-6">
                <div className="w-11 h-11 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-4">
                  <I size={20} className="text-violet-600" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold text-foreground">{it.t}</div>
                  {it.soon && <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">{isAr ? "قريباً" : "Soon"}</span>}
                </div>
                <div className="text-muted-foreground text-base mt-1.5 leading-relaxed">{it.d}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* عن المؤسس */}
      <section id="about" className="max-w-[1400px] mx-auto px-6 lg:px-14 py-14">
        <SectionHead tag={t.aboutTag} title={t.aboutTitle} />
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          className="bg-white border border-violet-100 rounded-3xl p-8 mt-8 grid sm:grid-cols-[auto,1fr] gap-7 items-start">
          <div className="w-24 h-24 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto sm:mx-0">
            <Crown size={40} className="text-violet-600" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-3 py-1 text-sm mb-3">
              <Sparkles size={13} /> {t.aboutChip}
            </div>
            <h3 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{t.aboutRole}</h3>
            <p className="text-muted-foreground text-base mt-3 leading-loose">
              {t.aboutText1}<b className="text-violet-700">{t.aboutTextBold1}</b>{t.aboutTextUniv}<b className="text-violet-700">{t.aboutTextUnivBold}</b>{t.aboutTextGrade}<b className="text-violet-700">{t.aboutTextGradeBold}</b>{t.aboutText2} <b className="text-violet-700">SHRM‑SCP</b> {isAr ? "الأمريكية، وشهادة" : ", the"} <b className="text-violet-700">OTHM</b> {isAr ? "، وشهادة" : " certificate, and the"} <b className="text-violet-700">CMI</b> {isAr ? "." : " certificate."}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {(isAr ? t.certAr : t.certs).map((c) => {
                const I = c.includes("MA") || c.includes("ماجستير") ? GraduationCap : Award;
                return (
                  <span key={c} className="inline-flex items-center gap-1.5 text-sm bg-violet-50 border border-violet-200 rounded-full px-3 py-1.5 text-foreground">
                    <I size={13} className="text-violet-600" /> {c}
                  </span>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* الاستضافة: سيرفر خاص بأعلى المواصفات */}
      <HostingSpecs isAr={isAr} />

      {/* الباقات */}
      <PricingColumns isAr={isAr} onStartTrial={() => gate(() => navigate("/quote"))} onBuyTier={(tier) => gate(() => navigate(`/quote?tier=${tier.id}`))} />

      {/* شارك جداره */}
      <section id="share" className="max-w-[1200px] mx-auto px-6 lg:px-14 py-12 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-100 border border-violet-200 rounded-full px-3 py-1 text-sm text-violet-700 mb-4">{isAr ? "انشُرها على كل المنصات" : "Share on every platform"}</div>
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 text-foreground" style={{ fontFamily: "var(--font-display)" }}>{isAr ? "شارك جداره مع فريقك" : "Share Jadara with your team"}</h2>
        <p className="text-muted-foreground text-base mb-6 max-w-xl mx-auto">{isAr ? "اضغط أي منصة لمشاركة رابط جداره مباشرة لأي شخص يبحث عن نظام لإدارة الموارد البشرية." : "Click any platform to share Jadara's link with anyone looking for an HR management system."}</p>
        <ShareBar isAr={isAr} />
      </section>

      {/* تواصل */}
      <section id="contact" className="max-w-[1400px] mx-auto px-6 lg:px-14 py-14">
        <SectionHead tag={t.contactTag} title={t.contactTitle} />
        <div className="grid sm:grid-cols-3 gap-5 mt-8">
          <a href={WHATSAPP} target="_blank" rel="noreferrer" className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-3xl p-6 text-center transition group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3"><MessageCircle size={22} className="text-emerald-600" /></div>
            <div className="font-semibold text-foreground">{t.wa}</div>
            <div className="text-muted-foreground text-base mt-1" dir="ltr">+966 594700782</div>
          </a>
          <a href={`mailto:${SALES_EMAIL}`} className="bg-white hover:bg-violet-50 border border-violet-100 rounded-3xl p-6 text-center transition">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3"><Mail size={22} className="text-violet-600" /></div>
            <div className="font-semibold text-foreground">{t.emailCard}</div>
            <div className="text-muted-foreground text-base mt-1" dir="ltr">{SALES_EMAIL}</div>
          </a>
          <div className="bg-white border border-violet-100 rounded-3xl p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-3"><MapPin size={22} className="text-indigo-600" /></div>
            <div className="font-semibold text-foreground">{t.loc}</div>
            <div className="text-muted-foreground text-base mt-1">{t.locVal}</div>
          </div>
        </div>
      </section>

      {/* التذييل */}
      <footer className="border-t border-violet-100 mt-10 bg-white/60">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-14 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-base text-muted-foreground">
          <div>
            <div className="mb-2"><Logo tone="dark" size={48} /></div>
            <p>{t.footerDesc}</p>
            <p className="mt-2 text-sm font-semibold text-foreground/80">{isAr ? `تطوير وتشغيل: ${PROVIDER.institutionName}` : `Developed & operated by: ${PROVIDER.institutionNameEn}`}</p>
            <div className="flex items-center gap-2 mt-4">
              <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"
                className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors">
                <Linkedin size={17} className="text-violet-600" />
              </a>
              <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noreferrer" aria-label="X (Twitter)"
                className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors">
                <Twitter size={17} className="text-violet-600" />
              </a>
              <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"
                className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors">
                <TiktokIcon size={17} className="text-violet-600" />
              </a>
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"
                className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors">
                <Facebook size={17} className="text-violet-600" />
              </a>
              <a href={SOCIAL_LINKS.snapchat} target="_blank" rel="noreferrer" aria-label="Snapchat"
                className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors">
                <SnapchatIcon size={17} className="text-violet-600" />
              </a>
            </div>
            <div className="mt-5">
              <StoreButtons variant="light" isAr={isAr} className="!gap-2.5" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="font-semibold text-base text-foreground mb-1">{isAr ? "الحلول" : "Solutions"}</div>
            <Link to="/qiwa-mudad" className="block hover:text-violet-700">{isAr ? "تكامل قوى ومدد" : "Qiwa & Mudad"}</Link>
            <Link to="/wps-mudad" className="block hover:text-violet-700">{isAr ? "حماية الأجور (مدد)" : "Wage Protection (Mudad)"}</Link>
            <Link to="/eos-calculator" className="block hover:text-violet-700">{isAr ? "حاسبة نهاية الخدمة" : "EOS Calculator"}</Link>
            <Link to="/contracts" className="block hover:text-violet-700">{isAr ? "إدارة العقود واللوائح" : "Contracts & Policies"}</Link>
            <Link to="/blog" className="block hover:text-violet-700">{isAr ? "مدونة HR" : "HR Blog"}</Link>
            <Link to="/affiliate-program" className="block hover:text-violet-700">{isAr ? "التسويق بالعمولة (7%)" : "Affiliate Program (7%)"}</Link>
          </div>
          <div className="space-y-1.5">
            <div className="font-semibold text-base text-foreground mb-1">{t.footContact}</div>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-violet-700"><MessageCircle size={14} /> WhatsApp: +966 594700782</a>
            <a href={`mailto:${SALES_EMAIL}`} className="flex items-center gap-2 hover:text-violet-700"><Mail size={14} /> {SALES_EMAIL}</a>
          </div>
          <div className="space-y-1.5">
            <div className="font-semibold text-base text-foreground mb-1">{t.footPlatform}</div>
            <button onClick={() => scrollTo("features")} className="block hover:text-violet-700">{t.nav.features}</button>
            <button onClick={() => scrollTo("pricing")} className="block hover:text-violet-700">{t.nav.pricing}</button>
            <Link to="/about" className="block hover:text-violet-700">{isAr ? "من نحن" : "About"}</Link>
            <Link to="/contact" className="block hover:text-violet-700">{t.nav.contact}</Link>
            <Link to="/company-login?returnTo=/app" className="block hover:text-violet-700">{t.login}</Link>
            <Link to="/privacy" className="block hover:text-violet-700">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
            <Link to="/refund-policy" className="block hover:text-violet-700">{isAr ? "شروط الاسترداد" : "Refund Terms"}</Link>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 pb-6 pt-2">
          <div className="rounded-2xl overflow-hidden shadow-md border border-violet-100 bg-black px-5 py-3">
            <img src="https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/e133dacf0_IMG_0423.png" alt={isAr ? "شعار رؤية المملكة العربية السعودية 2030" : "Saudi Vision 2030 logo"} className="h-16 sm:h-20 w-auto object-contain" loading="lazy" />
          </div>
          <span className="text-muted-foreground/70 text-sm text-center">{isAr ? "نتوافق مع رؤية المملكة العربية السعودية 2030" : "In alignment with Saudi Vision 2030"}</span>
        </div>
        <div className="text-center text-muted-foreground/70 text-base pb-6">{t.copy}</div>
      </footer>

      {notice}
    </div>
  );
}

function SectionHead({ tag, title }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 bg-violet-100 border border-violet-200 rounded-full px-3 py-1 text-sm text-violet-700">{tag}</div>
      <h2 className="text-4xl sm:text-5xl font-extrabold mt-4 text-foreground" style={{ fontFamily: "var(--font-display)" }}>{title}</h2>
    </div>
  );
}

function Stat({ n, l }) {
  return (
    <div className="bg-white border-2 border-black rounded-2xl px-5 py-3 shadow-xl shadow-black/20 text-center">
      <div className="text-2xl font-extrabold text-foreground">{n}</div>
      <div className="text-foreground text-sm mt-0.5">{l}</div>
    </div>
  );
}

function FeatureLi({ children }) {
  return (
    <div className="flex items-start gap-2"><Check size={16} className="text-violet-600 mt-0.5 shrink-0" /> <span>{children}</span></div>
  );
}