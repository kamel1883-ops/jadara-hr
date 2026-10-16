import React from "react";
import {
  Crown, Download, Users, Fingerprint, Wallet, Calculator, ShieldCheck, BadgeCheck,
  GraduationCap, GitBranch, Car, FileBadge, Building2, Smartphone, MapPin,
  ClipboardList, Server, Cpu, HardDrive, MemoryStick, Zap, Lock, Globe,
  CalendarClock, Mail, Phone, Linkedin, Twitter, Facebook, Network, BarChart3, Plane, FileText,
  Clock, Sparkles, Layers, LayoutDashboard, Bell, CheckCircle2, MapPinned,
  Briefcase, UserCog, Boxes, Settings, ShieldAlert, Headphones, BadgeCheck as BadgeIcon
} from "lucide-react";
import { TiktokIcon, SnapchatIcon } from "@/components/SocialIcons";
import { PROVIDER } from "@/lib/providerIdentity";
import { PRICING_TIERS_AR } from "@/lib/pricing";
import ReportsAnalytics from "@/components/brochure/ReportsAnalytics";
import { EquipmentModule, ComplaintsModule, InsuranceProvidersSection } from "@/components/brochure/ExtraModules";
import StoreButtons from "@/components/StoreButtons";
import { Image } from "@/components/ui/image";

// بروفايل منصة جداره — نسخة فاخرة موسّعة، عربي صافٍ، RTL، قابل للطباعة
const NAVY = "#0A1629";
const NAVY2 = "#0e1f3a";
const CYAN = "#8B5CF6";
const GOLD = "#C9A961";
const LOGO_URL = "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/f7b65511d_Gemini_Generated_Image_bc8r52bc8r52bc8r.jpg";

export default function Brochure() {
  return (
    <div dir="rtl" lang="ar" className="bg-slate-100 min-h-screen">
      <div className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1100px] mx-auto px-4 h-14 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="جداره" style={{ height: 30, width: "auto", objectFit: "contain" }} />
          </div>
          <div className="flex items-center gap-2">
            <a href="/brochure-en" className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-semibold">English</a>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#8B5CF6] hover:bg-[#7C5CE6] text-white text-sm font-semibold shadow-md shadow-violet-300/50">
              <Download size={16} /> تصدير الملف
            </button>
          </div>
        </div>
      </div>

      <div className="print-brochure mx-auto" style={{ width: "100%", maxWidth: 1100 }}>
        <Cover />
        <div className="print-group"><Vision /><TwoPortals /></div>
        <DashboardOverview />
        <ModuleShowcase />
        <div className="print-group"><FlightProvidersSection /><InsuranceProvidersSection lang="ar" Section={Section} Heading={Heading} CYAN={CYAN} NAVY={NAVY} /></div>
        <ReportsAnalytics Section={Section} Heading={Heading} />
        <EmployeePortal />
        <div className="print-group"><Infra /><Partners /></div>
        <div className="print-group"><Pricing /><Closing /></div>
      </div>
    </div>
  );
}

/* =================== الغلاف =================== */
function Cover() {
  return (
    <div style={{ background: "linear-gradient(160deg, #ffffff 0%, #F5F2FC 55%, #EFE7F9 100%)", padding: "40px 36px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${CYAN}22 0%, transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -100, left: -60, width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)` }} />
      <div style={{ position: "relative", minHeight: 760, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="flex items-center gap-3">
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 14px", borderRadius: 14, background: "#ffffff", border: "1px solid rgba(212,175,55,.35)", boxShadow: "0 10px 26px -12px rgba(10,22,41,.28)" }}>
            <img src={LOGO_URL} alt="جداره" style={{ height: 60, width: "auto", objectFit: "contain" }} />
          </div>
        </div>

        <div className="text-center" style={{ margin: "24px 0" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", borderRadius: 999, background: `${CYAN}1A`, border: `1px solid ${CYAN}55`, color: CYAN, fontSize: 12, fontWeight: 700, marginBottom: 18 }}>
            بروفايل المنصة الرسمي
          </div>
          <h1 style={{ color: NAVY, fontSize: 50, fontWeight: 800, lineHeight: 1.12, fontFamily: "var(--font-display)", marginBottom: 14 }}>
            منصة جداره<br/>
            <span style={{ color: CYAN, fontSize: 42 }}>لإدارة الموارد البشرية</span>
          </h1>
          <p style={{ color: "#475569", fontSize: 16, maxWidth: 700, margin: "0 auto", lineHeight: 1.9 }}>
            منظومة سعودية متكاملة تدير رأس المال البشري في مؤسستك<br/>
            من البصمة إلى الراتب، ومن المباشرة إلى نهاية الخدمة، في مكان واحد آمن.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-7" style={{ maxWidth: 760, margin: "20px auto 0" }}>
            {[
              "إدارة الموظفين", "إدارة الفروع", "الحضور والانصراف", "البصمة بالموقع",
              "إدارة الإجازات", "مسار الموافقات", "السلف والقروض", "رحلات العمل والانتداب",
              "الرواتب الشهرية", "التأمينات الاجتماعية", "نهاية الخدمة", "إدارة الأداء",
              "تقييم الأداء", "التدريب والتطوير", "التخطيط التعاقبي", "الهيكل التنظيمي",
              "تخطيط القوى العاملة", "التوظيف الكامل", "المركبات والأسطول", "تأمين المركبات (تأميني)", "الرخص الحكومية",
              "الاشتراكات الحكومية", "الإنذارات والسياسة", "العهد والأصول", "الشكاوى السرّية", "مقابلات نهاية الخدمة", "التقارير والتحليلات",
              "بوابة المنشآت", "بوابة الموظف الذاتية", "تطبيق الجوال", "المساعد الذكي",
              "إعدادات المنشأة", "تنبيهات التراخيص", "كشوف المخالصات", "تكامل البصمة الذاتية"
            ].map((b) => (
              <span key={b} style={{ fontSize: 10.5, fontWeight: 600, color: "#334155", padding: "5px 11px", borderRadius: 999, background: "#ffffff", border: "1px solid #e2e8f0" }}>{b}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <div style={{ color: NAVY }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>مُقدّم من</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{PROVIDER.institutionName}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              الرقم الوطني الموحد للمنشآت: <span style={{ fontFamily: "ui-monospace, monospace", direction: "ltr", display: "inline-block" }}>{PROVIDER.unifiedNumber}</span>
            </div>
          </div>
          <StoreButtons variant="light" isAr={true} />
        </div>
      </div>
    </div>
  );
}

/* =================== الرؤية =================== */
function Vision() {
  return (
    <Section tint="light">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <SectionTag>رؤية المنصة</SectionTag>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: NAVY, fontFamily: "var(--font-display)" }}>
            منصة واحدة<br/>
            <span style={{ color: CYAN }}>تتحكّم</span> في كل رأس مال بشري
          </h2>
          <p className="mt-5 text-slate-600 leading-loose text-[15px]">
            «جداره» منصة سحابية سعودية متكاملة، تجمع إدارة الموظفين والحضور والبصمة والرواتب والإجازات ونهاية الخدمة والأداء والتدريب والمركبات وتأمينها والعهد والأصول والشكاوى والتراخيص والاشتراكات الحكومية في منظومة واحدة آمنة — بدل جداول الإكسل والملفات الورقية متفرقة.
          </p>
          <p className="mt-3 text-slate-600 leading-loose text-[15px]">
            صُمّمت لتخدم المنشآت الصغيرة وحتى كبرى الشركات بأداء ثابت وسعة حتى <b style={{ color: NAVY }}>25,000 موظف</b> في منشأة واحدة.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <KpiBox big="18+" label="وحدة إدارية متكاملة" />
          <KpiBox big="25K" label="سعة موظفين بمنشأة" />
          <KpiBox big="99.9%" label="جاهزية الخدمة" />
          <KpiBox big="30 يوم" label="تجربة مجانية" accent />
        </div>
      </div>
    </Section>
  );
}

/* =================== بوابتان منفصلتان =================== */
function TwoPortals() {
  return (
    <Section tint="dark" heading={<Heading dark icon={<Network />} title="بوابتان منفصلتان" sub="بوابة خاصة بإدارة المنشأة، وبوابة خاصة بالموظف — كل واحدة مستقلة بصلاحياتها" />}>
      <div className="grid md:grid-cols-2 gap-6">
        <PortalCard icon={Building2} title="بوابة الشركات" tag="للإدارة"
          points={["إدارة كل الموظفين والفروع والعقود","الرواتب والتأمينات ونهاية الخدمة","اعتمادات وطلبات وتقارير وتحليلات","التراخيص والاشتراكات الحكومية للمنشأة"]} />
        <PortalCard icon={Smartphone} title="بوابة الموظف" tag="ذاتية"
          points={["ملف الموظف وراتبه ورصيد إجازاته","بصمة الحضور من التطبيق بالموقع","تقديم طلبات إجازة وسلفة ورحلة","استلام المخالصات كـملف إلكتروني"]} />
      </div>
    </Section>
  );
}

/* =================== لوحة التحكم الرئيسية =================== */
function DashboardOverview() {
  return (
    <Section tint="light" heading={<Heading icon={<LayoutDashboard />} title="لوحة التحكم الرئيسية" sub="مدخل واحد يجمع كل أدوات الإدارة في واجهة سريعة وواضحة" />}>
      <MockFrame title="منصة جداره — لوحة التحكم">
        <div className="grid grid-cols-[170px,1fr] gap-0 h-[420px]">
          {/* الشريط الجانبي */}
          <div style={{ background: "#F8F6FD", color: "#475569", borderRadius: "10px 0 0 10px", padding: 14, borderLeft: "1px solid #e2e8f0" }} className="flex flex-col gap-1 text-[11px]">
            <div className="flex items-center gap-2 font-bold mb-2" style={{ color: NAVY }}>
              <Crown size={14} style={{ color: GOLD }} /> جداره
            </div>
            {[
              { i: LayoutDashboard, t: "الرئيسية", a: true },
              { i: Users, t: "الموظفون" },
              { i: Fingerprint, t: "الحضور والبصمة" },
              { i: Wallet, t: "الرواتب" },
              { i: ShieldCheck, t: "التأمينات" },
              { i: CalendarClock, t: "الإجازات" },
              { i: ClipboardList, t: "الموافقات" },
              { i: Calculator, t: "نهاية الخدمة" },
              { i: Briefcase, t: "التوظيف" },
              { i: GraduationCap, t: "التدريب" },
              { i: GitBranch, t: "التعاقبي" },
              { i: BarChart3, t: "التحليلات" }
            ].map((x, k) => {
              const I = x.i;
              return (
                <div key={k} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: x.a ? "rgba(139,92,246,.15)" : "transparent", color: x.a ? NAVY : "#94a3b8" }}>
                  <I size={12} /> {x.t}
                </div>
              );
            })}
          </div>
          {/* المحتوى */}
          <div className="bg-slate-50 p-4 rounded-l-[10px]" style={{ borderRadius: "0 10px 10px 0" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] text-slate-400">أهلاً، وليد</div>
                <div className="text-sm font-bold" style={{ color: NAVY }}>لوحة القيادة</div>
              </div>
              <div className="flex gap-1 items-center text-[10px] text-slate-400"><Bell size={12} /> 3 تنبيهات</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { i: Users, b: "248", s: "إجمالي الموظفين", c: CYAN },
                { i: Fingerprint, b: "231", s: "حاضرون اليوم", c: "#16a34a" },
                { i: Clock, b: "9", s: "غياب اليوم", c: "#dc2626" }
              ].map((s, k) => {
                const I = s.i;
                return (
                  <div key={k} className="bg-white rounded-xl p-3 border border-slate-200">
                    <div className="flex items-center gap-1.5"><I size={12} style={{ color: s.c }} /><span className="text-[9px] text-slate-400">{s.s}</span></div>
                    <div className="text-xl font-extrabold mt-1" style={{ color: NAVY }}>{s.b}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-white rounded-xl p-3 border border-slate-200">
                <div className="text-[10px] text-slate-400 mb-2">حالة الطلبات</div>
                {[{ t: "بانتظار المدير", n: 5, c: "#fbbf24" }, { t: "بانتظار المالية", n: 3, c: "#8B5CF6" }, { t: "مكتملة", n: 28, c: "#16a34a" }].map((r, k) => (
                  <div key={k} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600">{r.t}</span><span className="font-bold" style={{ color: r.c }}>{r.n}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200">
                <div className="text-[10px] text-slate-400 mb-2">حضور آخر 7 أيام</div>
                <div className="flex items-end gap-1 h-20">
                  {[60, 80, 72, 90, 65, 95, 70].map((h, k) => (
                    <div key={k} className="flex-1 rounded-t" style={{ height: `${h}%`, background: CYAN, opacity: .85 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MockFrame>
      <p className="text-center text-xs text-slate-500 mt-4">
        العمود الجانبي ينتقل بك مباشرة بين كل الوحدات — من الموظفين إلى الرواتب إلى نهاية الخدمة إلى التحليلات
      </p>
    </Section>
  );
}

/* =================== استعراض الوحدات بالتفصيل =================== */
function ModuleShowcase() {
  return (
    <div className="print-group">
      <EmployeesModule />
      <AttendanceModule />
      <PayrollModule />
      <GosiModule />
      <EosModule />
      <LeavesModule />
      <RecruitmentModule />
      <PerformanceModule />
      <TrainingModule />
      <SuccessionModule />
      <FleetModule />
      <EquipmentModule lang="ar" FeatureBlock={FeatureBlock} MockFrame={MockFrame} CYAN={CYAN} NAVY={NAVY} />
      <GovernmentModule />
      <FlightBookingsModule />
      <ComplaintsModule lang="ar" FeatureBlock={FeatureBlock} MockFrame={MockFrame} CYAN={CYAN} NAVY={NAVY} />
      <OtherModules />
    </div>
  );
}

/* --- حجوزات الطيران --- */
function FlightBookingsModule() {
  return (
    <FeatureBlock
      icon={Plane} kicker="حجوزات الطيران" title="احجز رحلتك من جداره وتُحوَّل لأحد أربعة مزوّدين للدفع"
      desc="احجز رحلاتك جواً من داخل نظام جداره نفسه — اختر الوجهة والتاريخ وعدد الركاب ودرجة المقصورة، وبعد البحث عن الرحلة يُحوّلك النظام تلقائياً عبر الروابط العميقة (Deep Links) إلى منصة المسافر أو المطار أو Skyscanner أو Wingie لإكمال بيانات الجواز والدفع في صفحتها الآمنة. تكامل مع أربعة من أكبر مزوّدي الطيران دون مغادرة تجربة جداره."
      points={[
        "بحث عن الرحلة داخل جداره: الوجهة، التاريخ، الركاب، درجة المقصورة",
        "تحويل تلقائي عبر الروابط العميقة إلى المسافر أو المطار أو Skyscanner أو Wingie",
        "إكمال بيانات الجواز والدفع في الصفحة الآمنة لمزوّد الطيران",
        "تكامل مع أربعة من أكبر مزوّدي الطيران عالمياً وخليجياً"
      ]}
      mock={
        <MockFrame title="حجوزات الطيران — بحث عن رحلة">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">من</div>
                <div className="text-[11px] font-bold" style={{ color: NAVY }}>الرياض (RUH)</div>
              </div>
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">إلى</div>
                <div className="text-[11px] font-bold" style={{ color: NAVY }}>دبي (DXB)</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">التاريخ</div>
                <div className="text-[10px] font-bold" style={{ color: NAVY }}>15 أكتوبر</div>
              </div>
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">الركاب</div>
                <div className="text-[10px] font-bold" style={{ color: NAVY }}>2 بالغ</div>
              </div>
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">الدرجة</div>
                <div className="text-[10px] font-bold" style={{ color: NAVY }}>اقتصادية</div>
              </div>
            </div>
            <button className="w-full rounded-lg py-2 text-center font-bold text-[11px] text-white" style={{ background: `linear-gradient(135deg, ${CYAN}, #7C5CE6)` }}>
              <Plane size={12} className="inline ml-1" /> ابحث عن الرحلة
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2 flex items-center gap-1.5" style={{ background: "#f8fafc", border: `1px solid ${CYAN}40` }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: CYAN }}>MS</span>
                <div><div className="text-[10px] font-bold" style={{ color: NAVY }}>المسافر</div><div className="text-[8px] text-slate-400">روابط عميقة</div></div>
              </div>
              <div className="rounded-lg p-2 flex items-center gap-1.5" style={{ background: "#f8fafc", border: `1px solid ${CYAN}40` }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: CYAN }}>MT</span>
                <div><div className="text-[10px] font-bold" style={{ color: NAVY }}>المطار</div><div className="text-[8px] text-slate-400">دخول يدوي</div></div>
              </div>
              <div className="rounded-lg p-2 flex items-center gap-1.5" style={{ background: "#f8fafc", border: `1px solid ${CYAN}40` }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: CYAN }}>SS</span>
                <div><div className="text-[10px] font-bold" style={{ color: NAVY }}>Skyscanner</div><div className="text-[8px] text-slate-400">روابط عميقة</div></div>
              </div>
              <div className="rounded-lg p-2 flex items-center gap-1.5" style={{ background: "#f8fafc", border: `1px solid ${CYAN}40` }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: CYAN }}>WG</span>
                <div><div className="text-[10px] font-bold" style={{ color: NAVY }}>Wingie</div><div className="text-[8px] text-slate-400">روابط عميقة</div></div>
              </div>
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

/* =================== مزوّدو حجوزات الطيران =================== */
function FlightProvidersSection() {
  const providers = [
    { logo: "/logos/almosafer.svg", name: "المسافر", brand: "#003143", deep: true },
    { logo: "/logos/almatar.png", name: "المطار", brand: "#16a34a", deep: false },
    { logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/1dcb0cd9e_image.png", name: "Skyscanner", brand: "#0770e3", deep: true },
    { logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/0d35e8ef9_image.png", name: "Wingie", brand: "#e81932", deep: true },
  ];
  return (
    <Section tint="light" heading={<Heading icon={<Plane />} title="مزوّدو حجوزات الطيران" sub="منصة جداره توفر لك أكبر أربعة من مزوّدي الطيران الموثوقين — ابحث داخل جداره وتُحوَّل للمزوّد لإكمال الحجز والدفع" />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {providers.map((p, k) => (
          <div key={k} className="rounded-3xl p-6 flex flex-col items-center gap-3 shadow-sm" style={{ background: "#fff", border: `2px solid ${p.brand}30` }}>
            <div className="h-20 w-full flex items-center justify-center rounded-2xl overflow-hidden">
              <img src={p.logo} alt={p.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="text-[15px] font-extrabold" style={{ color: p.brand, fontFamily: "var(--font-display)" }}>{p.name}</div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: p.deep ? "#16a34a1a" : "#fbbf241a", color: p.deep ? "#16a34a" : "#b45309", border: `1px solid ${p.deep ? "#16a34a30" : "#fbbf2430"}` }}>
              {p.deep ? "روابط عميقة" : "دخول يدوي"}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* --- موظفين وفروع --- */
function EmployeesModule() {
  return (
    <FeatureBlock
      icon={Users} kicker="إدارة الموظفين والفروع" title="ملف الموظف الكامل مع تعدد الفروع"
      desc="ملف موظف شامل يربط الهوية والعقد والراتب والبنك والإقامة والتأمين والمباشرة، مع إدارة فروع متعدّدة لكل منشأة — لكل فرع مكانه ونطاق بصمته ومسؤولوه."
      points={[
        "رفع شعار المنشأة وتفعيل الفروع والمدن داخل النظام",
        "ربط الموظف بفرع ومدير مباشر ومُعتمد مالية ومُعتمد موارد بشرية",
        "حساب رصيد الإجازات تناسبياً من تاريخ المباشرة — 21 أو 30 يوماً",
        "سجل كامل للحالات الوظيفية: نشط، في إجازة، منهية، مستقيل"
      ]}
      mock={
        <MockFrame title="إدارة الموظفين">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="grid grid-cols-[1.5fr,1fr,1fr,.8fr] gap-2 text-[10px] text-slate-400 pb-2 border-b border-slate-100 font-semibold">
              <div>الموظف</div><div>المسمى</div><div>الفرع</div><div>الحالة</div>
            </div>
            {[
              { n: "أحمد القحطاني", p: "مدير عمليات", b: "الفرع الرئيسي", s: "نشط", c: "#16a34a" },
              { n: "سارة العتيبي", p: "محاسب", b: "فرع جدة", s: "نشط", c: "#16a34a" },
              { n: "خالد المغربي", p: "مندوب مبيعات", b: "فرع الدمام", s: "في إجازة", c: "#fbbf24" },
              { n: "نورة الزهراني", p: "أخصائي موارد", b: "الفرع الرئيسي", s: "نشط", c: "#16a34a" }
            ].map((r, k) => (
              <div key={k} className="grid grid-cols-[1.5fr,1fr,1fr,.8fr] gap-2 text-[11px] py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-cyan-50 text-[10px] flex items-center justify-center font-bold" style={{ color: CYAN }}>{r.n[0]}</div>{r.n}</div>
                <div className="text-slate-600">{r.p}</div>
                <div className="text-slate-500">{r.b}</div>
                <div><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${r.c}1A`, color: r.c }}>{r.s}</span></div>
              </div>
            ))}
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- حضور وبصمة --- */
function AttendanceModule() {
  return (
    <FeatureBlock dark
      icon={Fingerprint} kicker="الحضور والبصمة بالموقع" title="بصمة من التطبيق تتحقق من الموقع"
      desc="يسجّل الموظف حضوره وانصرافه من تطبيق الجوال، ويتحقق النظام من موقعه داخل نطاق البصمة المحدّد للفرع — مع فترات الراحة وساعات العمل الصافية والتأخر والتغيب تلقائياً."
      points={[
        "بصمة موظفين عبر تطبيق الجوال مع التحقق من الموقع ونطاق الفرع",
        "تسجيل فترات الراحة وإجمالي ساعات العمل الصافية لكل يوم",
        "حساب التأخر بفترة سماح، والتغيب، والإجازات داخل اليوم",
        "إمكانية إضافة بصمة يدوية وتعديلها بموافقة المدير"
      ]}
      mock={
        <MockFrame title="الحضور والبصمة">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-3 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-slate-400">بصمة اليوم</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#16a34a1A", color: "#16a34a" }}>داخل النطاق</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${CYAN}15`, border: `2px solid ${CYAN}` }}>
                  <Fingerprint size={26} style={{ color: CYAN }} />
                </div>
                <div className="text-[11px] leading-relaxed">
                  <div className="text-slate-500">الحضور: <b style={{ color: NAVY }}>08:02</b></div>
                  <div className="text-slate-500">الانصراف: <b style={{ color: NAVY }}>—</b></div>
                  <div className="text-slate-400">الفرع الرئيسي</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                <MapPin size={11} style={{ color: CYAN }} /> على بُعد 35 م من مقر العمل
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-200">
              <div className="text-[10px] text-slate-400 mb-2">سجل الأسبوع</div>
              {[
                { d: "الأحد", h: "8:00", s: "حاضر", c: "#16a34a" },
                { d: "الإثنين", h: "8:15", s: "متأخر", c: "#fbbf24" },
                { d: "الثلاثاء", h: "8:01", s: "حاضر", c: "#16a34a" },
                { d: "الأربعاء", h: "—", s: "غائب", c: "#dc2626" }
              ].map((r, k) => (
                <div key={k} className="flex items-center justify-between text-[11px] py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-600">{r.d}</span>
                  <span className="text-slate-400">{r.h}</span>
                  <span className="font-bold" style={{ color: r.c }}>{r.s}</span>
                </div>
              ))}
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- الرواتب --- */
function PayrollModule() {
  return (
    <FeatureBlock
      icon={Wallet} kicker="الرواتب الشهرية" title="كشف رواتب يُبنى تلقائياً من البصمة"
      desc="يتولّد كشف الرواتب الشهري مباشرة من بيانات البصمة — راتب أساسي وبدلات وعمل إضافي، وخصومات تغيب وقسط السلفة، والتأمينات الاجتماعية، ثم صافي الراتب — قابل للمراجعة والاعتماد والصرف."
      points={[
        "احتساب الراتب الإجمالي والصافي تلقائياً من أيام الحضور والتغيب",
        "حساب العمل الإضافي والحوافز والبدلات وخصم التغيب",
        "إضافة قسط السلفة تلقائياً لكل شهر حتى انتهاء السداد",
        "اعتماد كشف الرواتب دفعة واحدة ثم صرفه وإصدار كشف نهائي"
      ]}
      mock={
        <MockFrame title="كشف الرواتب — أكتوبر">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[1.4fr,.8fr,.8fr,.8fr,.9fr] gap-2 text-[10px] text-slate-400 bg-slate-50 p-2 font-bold border-b border-slate-100">
              <div>الموظف</div><div>الإجمالي</div><div>التأمينات</div><div>الخصومات</div><div>الصافي</div>
            </div>
            {[
              { n: "أحمد القحطاني", g: "12,000", ins: "1,170", d: "600", net: "10,230" },
              { n: "سارة العتيبي", g: "8,500", ins: "829", d: "240", net: "7,431" },
              { n: "خالد المغربي", g: "6,000", ins: "120", d: "0", net: "5,880" },
              { n: "نورة الزهراني", g: "9,200", ins: "897", d: "350", net: "7,953" }
            ].map((r, k) => (
              <div key={k} className="grid grid-cols-[1.4fr,.8fr,.8fr,.8fr,.9fr] gap-2 text-[11px] p-2 border-b border-slate-50 last:border-0">
                <div className="text-slate-700 font-medium">{r.n}</div>
                <div className="text-slate-600">{r.g}</div>
                <div className="text-rose-600">{r.ins}</div>
                <div className="text-amber-600">{r.d}</div>
                <div className="font-extrabold" style={{ color: NAVY }}>{r.net}</div>
              </div>
            ))}
            <div className="grid grid-cols-[1.4fr,.8fr,.8fr,.8fr,.9fr] gap-2 text-[11px] p-2 font-extrabold" style={{ background: NAVY, color: "#fff" }}>
              <div>الإجمالي</div><div>35,700</div><div>3,016</div><div>1,190</div><div style={{ color: CYAN }}>31,494</div>
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- تأمينات --- */
function GosiModule() {
  return (
    <FeatureBlock dark
      icon={ShieldCheck} kicker="التأمينات الاجتماعية" title="احتساب التأمينات للسعوديين والمقيمين"
      desc="احتساب اشتراكات التأمينات الاجتماعية آلياً — للسعوديين بنسبة العامل وصاحب العمل، وللمقيمين بنسبة صاحب العمل — وفق نسب المنشأة القابلة للتعديل، مع كشف شهري جاهز للرفع."
      points={[
        "نسب منشأة قابلة للتعديل للسعوديين والمقيمين على حدة",
        "احتساب الموظف وصاحب العمل تلقائياً داخل كشف الرواتب",
        "كشف تأمينات شهري مصدّر وقابل للتصدير",
        "ربط بموظفين نشطين مع بيانات الراتب الخاضع للاشتراك"
      ]}
      mock={
        <MockFrame title="كشف التأمينات الاجتماعية">
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { t: "إجمالي الأجور", v: "124,500", c: NAVY },
              { t: "اشتراك الموظفين", v: "12,140", c: "#dc2626" },
              { t: "اشتراك صاحب العمل", v: "12,140", c: "#fbbf24" }
            ].map((s, k) => (
              <div key={k} className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400">{s.t}</div>
                <div className="text-lg font-extrabold mt-1" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 bg-white rounded-xl p-3 border border-slate-200">
            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 font-bold pb-2 border-b border-slate-100">
              <div>الموظف</div><div>الجنسية</div><div>الاشتراك</div>
            </div>
            {[
              { n: "أحمد القحطاني", j: "سعودي", v: "1,170" },
              { n: "خالد المغربي", j: "مقيم", v: "120" },
              { n: "نورة الزهراني", j: "سعودية", v: "897" }
            ].map((r, k) => (
              <div key={k} className="grid grid-cols-3 gap-2 text-[11px] py-2 border-b border-slate-50 last:border-0">
                <div className="text-slate-700">{r.n}</div>
                <div className="text-slate-500">{r.j}</div>
                <div className="font-bold" style={{ color: CYAN }}>{r.v}</div>
              </div>
            ))}
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- نهاية الخدمة --- */
function EosModule() {
  return (
    <FeatureBlock
      icon={Calculator} kicker="نهاية الخدمة" title="حساب مستحقات نهاية الخدمة وفق نظام العمل"
      desc="حساب مكافأة نهاية الخدمة وفق نظام العمل السعودي — نصف راتب لخمس سنوات ثم راتب كامل، وأحكام خاصة بالاستقالة والفصل — مع تصفية رصيد الإجازات والمستحقات والمخصومات والكشف القانوني." 
      points={[
        "احتساب نصف راتب لما دون الخمس سنوات وراتب كامل بعدها",
        "أحكام خاصة بالاستقالة والفصل التعسفي وإنهاء العقد",
        "تصفية رصيد الإجازات وتذكرة العودة وتسوية السلف",
        "إصدار كشف مخالصة نهاية الخدمة القانوني كملف إلكتروني"
      ]}
      mock={
        <MockFrame title="مخالصة نهاية الخدمة">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] text-slate-400">أحمد القحطاني · مدير عمليات</div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fbbf241A", color: "#fbbf24" }}>إنهاء عقد</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: "سنوات الخدمة", v: "6 سنوات و3 أشهر" },
                { l: "الأجر الشهري", v: "12,000 ر.س" },
                { l: "مكافأة نهاية الخدمة", v: "73,500 ر.س", accent: true },
                { l: "رصيد الإجازات", v: "15 يوم · 6,900 ر.س" }
              ].map((r, k) => (
                <div key={k} className="rounded-lg p-2.5" style={{ background: r.accent ? `${CYAN}10` : "#f8fafc", border: `1px solid ${r.accent ? `${CYAN}55` : "#e2e8f0"}` }}>
                  <div className="text-[10px] text-slate-400">{r.l}</div>
                  <div className="text-sm font-extrabold mt-0.5" style={{ color: r.accent ? CYAN : NAVY }}>{r.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg p-2.5" style={{ background: NAVY, color: "#fff" }}>
              <div className="text-[11px]">إجمالي المستحق</div>
              <div className="text-lg font-extrabold" style={{ color: CYAN }}>80,400 ر.س</div>
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- الإجازات ومسار الموافقات --- */
function LeavesModule() {
  return (
    <FeatureBlock dark
      icon={ClipboardList} kicker="الإجازات ومسار الموافقات" title="مسار موافقات متعدّد وسجل تاريخ كامل"
      desc="كل طلب يمرّ عبر مسار اعتماد متعدّد المراحل — الموظف ثم المدير المباشر ثم الموارد البشرية ثم المالية — وكل حالة محفوظة كسجل مع تاريخها ومعتمدها وملاحظاته، ويُحتفظ بآخر 20 طلباً مكتمل وسجل تاريخ كامل لكل طلب."
      points={[
        "طلبات إجازة وسلفة ورحلة وتعديل بصمة من بوابة الموظف",
        "مسار اعتماد متعدّد: الموظف ← المدير ← الموارد البشرية ← المالية",
        "كل حالة محفوظة كسجل مع التاريخ والمعتمد والملاحظات",
        "الاحتفاظ بآخر 20 طلباً مكتمل وسجل تاريخ كامل لكل طلب"
      ]}
      mock={
        <MockFrame title="الموافقات — طلب إجازة سنوية">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-cyan-50 text-[10px] flex items-center justify-center font-bold" style={{ color: CYAN }}>س</div>
              <div className="text-[11px]"><b className="text-slate-700">سارة العتيبي</b> · إجازة سنوية · 5 أيام</div>
            </div>
            <div className="flex items-center gap-1 mb-3">
              {[
                { s: "الموظف", t: "قُدّم الطلب", c: "#16a34a", done: true },
                { s: "المدير المباشر", t: "اعتمد", c: "#16a34a", done: true },
                { s: "الموارد البشرية", t: "بانتظار", c: "#fbbf24", done: false },
                { s: "المالية", t: "—", c: "#94a3b8", done: false }
              ].map((x, k) => (
                <React.Fragment key={k}>
                  {k > 0 && <div className="flex-1 h-0.5" style={{ background: x.done ? "#16a34a" : "#e2e8f0" }} />}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${x.c}1A`, border: `1px solid ${x.c}`, color: x.c }}>
                      {x.done ? <CheckCircle2 size={12} /> : <Clock size={11} />}
                    </div>
                    <div className="text-[8px] text-center leading-tight">
                      <div className="font-bold text-slate-700">{x.s}</div>
                      <div className="text-slate-400">{x.t}</div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="rounded-lg p-2 bg-slate-50 border border-slate-100">
              <div className="text-[10px] text-slate-400 mb-1">سجل الطلب</div>
              {[
                { d: "12/10 09:15", t: "الموظف قدّم الطلب" },
                { d: "12/10 11:02", t: "المدير المباشر اعتمد" },
                { d: "—", t: "بانتظار الموارد البشرية" }
              ].map((r, k) => (
                <div key={k} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-600">{r.t}</span><span className="text-slate-400">{r.d}</span>
                </div>
              ))}
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- التوظيف --- */
function RecruitmentModule() {
  return (
    <FeatureBlock
      icon={Briefcase} kicker="إدارة التوظيف" title="من إعلان الوظيفة إلى التعيين الكامل"
      desc="دورة توظيف كاملة — إعلان الوظيفة بشواغرها ومتطلباتها، استقبال الطلبات وفرزها، جدولة المقابلات وتسجيل نتائجها، تقييم فترة التجربة، إصدار خطاب التعيين ومستند القرار."
      points={[
        "إعلان وظائف بالمسمى والمهنة والدرجة والراتب والمؤهلات وعدد الشواغر",
        "فرز الطلبات وقياس سنوات الخبرة وتسجيل نتائج المقابلات",
        "تقييم فترة التجربة على خمسة معايير وتسجيل التوصية",
        "إصدار خطاب التعيين ومستند القرار الرسمي كملف إلكتروني"
      ]}
      mock={
        <MockFrame title="التوظيف — مرشّحون">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="text-[11px] text-slate-700 font-bold mb-2">وظيفة: محلل موارد بشرية · 2 شواغر</div>
            <div className="flex items-center gap-1 mb-3">
              {[{ s: "متقدم", n: 38, c: "#94a3b8" }, { s: "فرز", n: 12, c: "#8B5CF6" }, { s: "مقابلة", n: 5, c: "#fbbf24" }, { s: "تعيين", n: 2, c: "#16a34a" }].map((x, k) => (
                <React.Fragment key={k}>
                  <div className="flex-1 text-center rounded-lg py-1.5" style={{ background: `${x.c}1A`, border: `1px solid ${x.c}55` }}>
                    <div className="text-sm font-extrabold" style={{ color: x.c }}>{x.n}</div>
                    <div className="text-[9px] text-slate-500">{x.s}</div>
                  </div>
                  {k < 3 && <div className="w-1 h-3" style={{ background: x.c, opacity: .5 }} />}
                </React.Fragment>
              ))}
            </div>
            {[
              { n: "محمد الشهري", e: "5 سنوات", s: "مقابلة أولى", c: "#fbbf24" },
              { n: "ريم الحربي", e: "3 سنوات", s: "تم التعيين", c: "#16a34a" },
              { n: "فهد النعيمي", e: "7 سنوات", s: "فرز أولي", c: "#8B5CF6" }
            ].map((r, k) => (
              <div key={k} className="flex items-center justify-between text-[11px] py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 text-[10px] flex items-center justify-center font-bold text-slate-500">{r.n[0]}</div>{r.n}</div>
                <div className="text-slate-400">{r.e}</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${r.c}1A`, color: r.c }}>{r.s}</span>
              </div>
            ))}
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- الأداء --- */
function PerformanceModule() {
  return (
    <FeatureBlock dark
      icon={BarChart3} kicker="إدارة الأداء" title="تقييم على معايير متعدّدة وتوصية واضحة"
      desc="تقييم الموظف على خمسة معايير — الكفاءة، السلوك، المعرفة، المجال المهني، الخبرة — مع تسجيل نقاط القوة وفرص التحسين، وتوصية بالتثبيت أو الفصل من فترة التجربة أو تمديد الفترة."
      points={[
        "تقييم على خمسة معايير بمقياس خماسي لكل معيار",
        "تسجيل نقاط القوة وفرص التحسين لكل موظف",
        "توصية بالتثبيت أو الفصل أو تمديد فترة التجربة",
        "سجل تقييمات لحظي قابل للمراجعة ومقارنة الأداء عبر الوقت"
      ]}
      mock={
        <MockFrame title="تقييم أداء موظف">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="text-[11px] text-slate-700 font-bold mb-2">تقييم: خالد المغربي · الربع الثاني</div>
            {[
              { l: "الكفاءة", v: 4 },
              { l: "السلوك", v: 5 },
              { l: "المعرفة", v: 4 },
              { l: "المجال المهني", v: 3 },
              { l: "الخبرة", v: 4 }
            ].map((r, k) => (
              <div key={k} className="flex items-center gap-2 text-[11px] py-1.5">
                <span className="text-slate-500 w-24 shrink-0">{r.l}</span>
                <div className="flex-1 flex gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <div key={s} className="flex-1 h-2 rounded" style={{ background: s <= r.v ? CYAN : "#e2e8f0" }} />
                  ))}
                </div>
                <span className="font-bold" style={{ color: NAVY }}>{r.v}/5</span>
              </div>
            ))}
            <div className="mt-2 rounded-lg p-2 flex items-center justify-between" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}55` }}>
              <span className="text-[11px] font-bold" style={{ color: NAVY }}>التوصية: تثبيت بعد فترة التجربة</span>
              <span className="text-[11px] font-extrabold" style={{ color: CYAN }}>4.0/5</span>
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- التدريب --- */
function TrainingModule() {
  return (
    <FeatureBlock
      icon={GraduationCap} kicker="التدريب والتطوير" title="خطط تدريب فردية وجماعية بقياس الأثر"
      desc="بناء خطط تدريب لموظف واحد أو لإدارة كاملة — تشخيص نقص المهارات، تحديد الهدف بعد الخطة، آلية التنفيذ، التكلفة والفترة، ثم متابعة الإنجاز وقياس الأثر على الأداء."
      points={[
        "خطة تدريب فردية لكل موظف أو جماعية لإدارة كاملة",
        "تشخيص نقص المهارات وتحديد الهدف بعد الخطة",
        "آلية التنفيذ والتكلفة وفترة البدء والانتهاء",
        "متابعة حالة الخطة وقياس الأثر على الأداء"
      ]}
      mock={
        <MockFrame title="خطط التدريب">
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { t: "مهارات التواصل", s: "قسم المبيعات", p: 70, c: CYAN },
              { t: "إدارة الوقت", s: "خالد المغربي", p: 40, c: "#fbbf24" },
              { t: "برامج المحاسبة", s: "سارة العتيبي", p: 100, c: "#16a34a" },
              { t: "خدمة العملاء", s: "قسم الدعم", p: 25, c: "#dc2626" }
            ].map((r, k) => (
              <div key={k} className="bg-white rounded-xl p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] font-bold text-slate-700">{r.t}</div>
                  <span className="text-[10px] text-slate-400">{r.s}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.p}%`, background: r.c }} />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">الإنجاز: {r.p}%</div>
              </div>
            ))}
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- التعاقبي --- */
function SuccessionModule() {
  return (
    <FeatureBlock dark
      icon={GitBranch} kicker="التخطيط التعاقبي" title="تأهيل بدلاء للمسميات الحساسة"
      desc="تحديد المسميات القيادية الحساسة، والمهارات المطلوبة لكل مسمى، وترشيح المؤهلين بداخل المنشأة، وقياس فجوة الجاهزية، وبناء خطة إعداد لكل مرشّح حتى يبلغ درجة الجاهزية عند خلوّ المنصب."
      points={[
        "تحديد المسميات الحساسة والقيادية داخل الهيكل",
        "ترشيح المؤهلين وقياس فجوة الجاهزية لكل منصب",
        "خطة إعداد مفصّلة لكل مرشّح بتدريب وتمارين ومتابعة",
        "تنبيهات عند خلوّ المنصب أو اقتراب تقاعد صاحبه"
      ]}
      mock={
        <MockFrame title="خطة التعاقب">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="text-[11px] text-slate-700 font-bold mb-2">المسمى الحساس: مدير العمليات</div>
            {[
              { n: "أحمد القحطاني", r: "نائب المدير", g: 85, c: "#16a34a" },
              { n: "نورة الزهراني", r: "أخصائي أول", g: 60, c: "#fbbf24" },
              { n: "سعد المالكي", r: "مشرف", g: 35, c: "#dc2626" }
            ].map((r, k) => (
              <div key={k} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between text-[11px] py-1">
                  <div><b className="text-slate-700">{r.n}</b> <span className="text-slate-400">· {r.r}</span></div>
                  <span className="font-bold" style={{ color: r.c }}>{r.g}% جاهزية</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.g}%`, background: r.c }} />
                </div>
              </div>
            ))}
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- المركبات --- */
function FleetModule() {
  return (
    <FeatureBlock
      icon={Car} kicker="إدارة المركبات" title="أسطول كامل برحلات وصيانة وتأمين"
      desc="تسجيل مركبات المنشأة وسائقيها، ربط المركبة بفرع وموظف، تسجيل رحلات المركبة، مجدد التأمين والفحص وإقامة المركبة، ومتابعة الصيانة الدورية — مع تنبيهات قبل انتهاء كل مستند."
      points={[
        "ملف مركبة: رقم اللوحة، النوع، الموديل، الإقامة، التأمين",
        "ربط سائق وحالة المركبة وفرع التشغيل",
        "تسجيل الرحلات: الوجهة، التاريخ، المسافة، التكلفة",
        "تنبيهات قبل انتهاء التأمين والفحص والإقامة وصيانة دورية"
      ]}
      mock={
        <MockFrame title="إدارة المركبات">
          <div className="grid sm:grid-cols-3 gap-2">
            {[
              { n: "م ك هـ 1234", t: "هيونداي إلنترا", s: "نشطة", c: "#16a34a" },
              { n: "م ل بـ 5678", t: "تويوتا كامري", s: "في صيانة", c: "#fbbf24" },
              { n: "م ر جـ 9012", t: "نيسان باترول", s: "نشطة", c: "#16a34a" }
            ].map((r, k) => (
              <div key={k} className="bg-white rounded-xl p-3 border border-slate-200">
                <div className="flex items-center gap-2 mb-2"><Car size={14} style={{ color: CYAN }} /><span className="text-[11px] font-bold text-slate-700" dir="ltr">{r.n}</span></div>
                <div className="text-[10px] text-slate-500">{r.t}</div>
                <div className="text-[10px] mt-2"><span className="font-bold px-2 py-0.5 rounded-full" style={{ background: `${r.c}1A`, color: r.c }}>{r.s}</span></div>
                <div className="text-[9px] text-slate-400 mt-1">التأمين ينتهي: 12/12</div>
              </div>
            ))}
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- رخص واشتراكات حكومية --- */
function GovernmentModule() {
  return (
    <FeatureBlock dark
      icon={FileBadge} kicker="الرخص والاشتراكات الحكومية" title="كل التزامات المنشأة الحكومية في مكان واحد"
      desc="إدارة كاملة لرخص المنشأة (بلدي، تجاري، آمنة، صحي، مهني) وللاشتراكات في المنصات الحكومية (أبشر أعمال، مقيم، تم، الأمانة، وزارة الصحة، مدد، التأمينات، وطن، واثق، معروف، اعتماد، زاتكا، المركز السعودي للأعمال، إيجار، مكتب العمل) — مع تاريخ كل اشتراك وتكلفته وتنبيه قبل انتهائه."
      points={[
        "كل رخص المنشأة في جدول واحد مع الإجراء والجهة وتاريخ الانتهاء",
        "تسجيل كل اشتراك حكومي برقم الحساب والمشترك ومدة الاشتراك",
        "تتبّع التكلفة السنوية لكل اشتراك وإجمالي الكلفة الحكومية",
        "تنبيهات قبل انتهاء أي رخصة أو اشتراك بأسبوعين"
      ]}
      mock={
        <MockFrame title="الاشتراكات الحكومية">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { n: "أبشر أعمال", s: "نشط" },
              { n: "مقيم", s: "نشط" },
              { n: "قوى", s: "نشط" },
              { n: "مدد", s: "تنبيه", warn: true },
              { n: "التأمينات", s: "نشط" },
              { n: "وطن", s: "نشط" },
              { n: "واثق", s: "نشط" },
              { n: "بلدي", s: "نشط" }
            ].map((r, k) => (
              <div key={k} className="bg-white rounded-xl p-2.5 border border-slate-200 text-center">
                <Building2 size={14} style={{ color: r.warn ? "#fbbf24" : CYAN, margin: "0 auto 4px" }} />
                <div className="text-[10px] font-bold text-slate-700">{r.n}</div>
                <div className="text-[9px] mt-0.5" style={{ color: r.warn ? "#fbbf24" : "#16a34a" }}>{r.s}</div>
              </div>
            ))}
          </div>
        </MockFrame>
      }
    />
  );
}

/* --- وحدات إضافية --- */
function OtherModules() {
  const items = [
    { i: Plane, t: "رحلات العمل والانتداب", d: "طلب رحلة بوجهة وتواريخ وتكلفة، اعتماد مدير وموارد بشرية ومالية، تذاكر، صرف للموظف، وكشف رسمي." },
    { i: Building2, t: "الهيكل التنظيمي", d: "إدارة الإدارات والأقسام والفروع والوحدات، ورسم شجري للعلاقات الوظيفية والتدرج الهرمي." },
    { i: Boxes, t: "تخطيط القوى العاملة", d: "إسقاط احتياج الموظفين على الإدارات، تحليل الفجوة بين الميزانية والفعلي، وخطط التوظيف المستقبلية." },
    { i: FileText, t: "الإنذارات والسياسة", d: "إنذارات بثلاث درجات حسب نوع المخالفة، تسجيل الواقعة وإجراء الجلسة والتحقق ومرجع النظام والاعتماد." },
    { i: UserCog, t: "مقابلات إنهاء الخدمة", d: "مقابلة منفصلة عند نهاية الخدمة، تحليل أسباب المغادرة، مقترحات تحسين بيئة العمل والاحتفاظ بالكوادر." },
    { i: BarChart3, t: "التحليلات والتقارير", d: "تقارير البصمة والرواتب والإجازات والتوظيف، مع لوحة قيادة تحليلية لصانع القرار ومستويات الأداء." },
    { i: Calculator, t: "ميزانية الموارد البشرية السنوية", d: "كل ريال يُصرف على الموظف معروف بالنسبة لك: الرواتب والتأمينات والإقامة ونهاية الخدمة تُحسب تلقائياً من ملفات موظفيك، مع رسوم بيانية ومقارنة الميزانية بالفعلي وطباعة بترويسة منشأتك." },
    { i: Settings, t: "إعدادات المنشأة", d: "نسب التأمينات، ساعات وأيام العمل، فترة سماح التأخر، نطاق البصمة، سياسات الإجازة والتذكرة." },
    { i: Headphones, t: "منتج عربي ودعم فني مستمر", d: "منصة عربية سعودية بتصميم فاخر وواجهة عربية أصيلة، مع دعم فني عربي على مدار الساعة عبر واتساب والبريد — فريقنا جاهز لمساعدتك من التفعيل حتى الترحيل والتدريب." }
  ];
  return (
    <Section tint="light" heading={<Heading icon={<ShieldAlert />} title="وحدات إدارية إضافية" sub="ما يُكمل منظومة الموارد البشرية من رحلات وهيكل وتحليلات وسياسات" />}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m, k) => {
          const I = m.i;
          return (
            <div key={k} className="rounded-2xl p-4 border border-slate-200 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}1A`, color: CYAN, border: `1px solid ${CYAN}40` }}><I size={18} /></div>
                <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: NAVY }}>{m.t}</h4>
              </div>
              <p className="text-[13px] leading-relaxed text-slate-600">{m.d}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* =================== بوابة الموظف والتطبيق =================== */
function EmployeePortal() {
  return (
    <Section tint="dark" heading={<Heading dark icon={<Smartphone />} title="بوابة الموظف والتطبيق" sub="تطبيق حقيقي على الجوال — بوابة ذاتية خاصة بكل موظف" />}>
      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        <div className="rounded-2xl p-6 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}1A`, color: CYAN, border: `1px solid ${CYAN}40` }}><Smartphone size={20} /></div>
            <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, color: NAVY }}>تطبيق جداره للموظف</h4>
          </div>
          <ul className="space-y-2.5 text-[14.5px] text-slate-600">
            {[
              "بوابة ذاتية: الملف الوظيفي، الراتب، رصيد الإجازات، السلف ومراحل الموافقة",
              "بصمة الحضور والانصراف من التطبيق مع التحقق من الموقع",
              "تقديم طلبات الإجازة والسلفة ورحلة العمل ومتابعة الموافقات",
              "استلام المخالصات والكشوف الرسمية كملف إلكتروني داخل التطبيق",
              "مساعد ذكي للدردشة يجاوب على استفسارات الموظف"
            ].map((x, k) => (
              <li key={k} className="flex items-start gap-2"><BadgeCheck size={16} style={{ color: CYAN, marginTop: 3, flexShrink: 0 }} /><span>{x}</span></li>
            ))}
          </ul>
          <div className="mt-5">
            <StoreButtons variant="glass" isAr={true} />
          </div>
        </div>
        <PhoneMock />
      </div>
    </Section>
  );
}

function PhoneMock() {
  return (
    <div className="flex justify-center">
      <div style={{ width: 280, padding: 10, borderRadius: 36, background: "#0a0f1c", boxShadow: "0 25px 60px -20px rgba(10,22,41,.5)", border: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ background: `linear-gradient(160deg, ${NAVY2}, ${NAVY})`, borderRadius: 28, padding: 16, color: "#fff", minHeight: 360, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="flex items-center gap-2">
            <Crown size={14} style={{ color: GOLD }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>جداره</span>
            <span style={{ fontSize: 10, color: "#7d92a8", marginRight: "auto" }}>بوابة الموظف</span>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.10)" }}>
            <div style={{ fontSize: 10, color: "#9fb3c8" }}>صباح الخير، أحمد</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>قسم التشغيل · مدير العمليات</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[{ I: Fingerprint, t: "بصمة" }, { I: CalendarClock, t: "إجازة" }, { I: Wallet, t: "سلفة" }].map((x, i) => (
              <div key={i} className="rounded-lg py-3" style={{ background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.25)" }}>
                <x.I size={16} style={{ color: CYAN, margin: "0 auto 4px" }} />
                <div style={{ fontSize: 10 }}>{x.t}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-3 flex-1" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>آخر الطلبات</div>
            {[
              { t: "إجازة سنوية — مُعتمدة", c: "#34d399" },
              { t: "سلفة الراتب — بانتظار المالية", c: "#fbbf24" },
              { t: "تعديل بصمة — موافق", c: "#34d399" }
            ].map((x, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5 text-[11px]"><span style={{ width: 6, height: 6, borderRadius: 999, background: x.c }} /> {x.t}</div>
            ))}
          </div>
          <button className="rounded-xl py-2.5 text-center font-bold text-xs" style={{ background: `linear-gradient(135deg, ${CYAN}, #7C5CE6)`, color: "#fff" }}>
            <Fingerprint size={13} className="inline ml-1" /> تسجيل الحضور الآن
          </button>
        </div>
      </div>
    </div>
  );
}

/* =================== البنية التحتية =================== */
function Infra() {
  return (
    <Section tint="dark" heading={<Heading dark icon={<Server />} title="بنية تحتية سعودية فاخرة" sub="خادم خاص بمنصة جداره — داخل المملكة وبأعلى المواصفات" />}>
      <div className="grid md:grid-cols-[1.1fr,1fr] gap-6">
        <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
          <div className="flex items-center gap-2 mb-4" style={{ color: NAVY }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}1A`, border: `1px solid ${CYAN}40` }}><Server size={20} style={{ color: CYAN }} /></div>
            <div>
              <div className="font-extrabold text-lg">خادم جداره الخاص</div>
              <div className="text-xs text-slate-500">سيرفر خاص بمنصة جداره — يستضيف اشتراكات جميع الشركات والمؤسسات</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 self-start mb-3" style={{ background: "#dcfce7", border: "1px solid #86efac" }}>
            <MapPin size={14} style={{ color: "#16a34a" }} />
            <span className="text-xs font-bold" style={{ color: "#15803d" }}>الرياض — المملكة العربية السعودية</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Spec icon={Cpu} big="12 vCores" small="AMD EPYC 4464P · 24 مسار" />
            <Spec icon={MemoryStick} big="48 جيجا" small="ذاكرة DDR5 ECC" />
            <Spec icon={HardDrive} big="1 تيرا" small="تخزين NVMe فائق السرعة" />
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
            <div className="text-xs text-slate-500">سعة الخادم</div>
            <div className="text-lg font-extrabold flex items-center justify-center gap-1.5" style={{ color: NAVY }}><Users size={16} style={{ color: CYAN }} /> حتى 50,000 موظف</div>
            <div className="text-[11px] text-slate-400">موزّعون على مجموعة شركات ومؤسسات مختلفة — دون أي تأثير على السرعة</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TrustChip dark icon={MapPin} label="موقع سعودي (الرياض)" />
          <TrustChip dark icon={ShieldCheck} label="ضوابط صلاحيات" />
          <TrustChip dark icon={ShieldCheck} label="عزل المنشآت" />
          <TrustChip dark icon={Lock} label="خزنة سحابية معزولة" />
          <TrustChip dark icon={Lock} label="تشفير البيانات" />
          <TrustChip dark icon={ShieldCheck} label="نسخ احتياطي يومي" />
          <TrustChip dark icon={Zap} label="تخزين فائق السرعة" />
          <TrustChip dark icon={BadgeCheck} label="جاهزية 99.9%" />
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-slate-700 text-[13px] leading-relaxed">
        <div className="flex items-center gap-2 mb-2" style={{ color: NAVY }}>
          <ShieldCheck size={16} style={{ color: "#16a34a" }} />
          <span className="font-extrabold text-sm">استضافة سعودية وضوابط حماية</span>
        </div>
        <p style={{ color: "#475569" }}>
          تُستضاف منصة جداره داخل المملكة العربية السعودية على خوادم شركة <b>Oracle Systems</b> السعودية — وفق إعداد الاستضافة الحالي، وبياناتك تبقى داخل المملكة.
          نوفر ضوابط صلاحيات وتشفير ونسخ احتياطي للبيانات، وخزنة سحابية معزولة للهوية والبنك والوثائق. نساعدك على تنظيم متطلباتك؛ ولا يغني النظام عن المراجعة القانونية أو متطلبات الجهات الرسمية.
        </p>
      </div>
      {/* مزوّد الخادم والاستضافة */}
      <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-xs text-slate-500 shrink-0">مزوّد الخادم والاستضافة</div>
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-14 rounded-lg bg-white flex items-center justify-center p-1.5 shrink-0 border border-slate-200">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg" alt="Oracle Systems" style={{ width: "100%", height: "auto", objectFit: "contain" }} />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-base" style={{ fontFamily: "var(--font-display)", color: NAVY }}>Oracle Systems</div>
            <div className="text-[11px] text-slate-500">شركة Oracle Systems السعودية — مزوّد الخادم والاستضافة</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* =================== الشركاء =================== */
function Partners() {
  const partners = [
    { n: "شركة كود الأعمال للمقاولات", sub: "مقاولات", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/d146af91b_Screenshot2026-08-09155940.png" },
    { n: "شركة درز للخياطة الراقية", sub: "خياطة راقية", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/64e527d78_Screenshot2026-08-09155842.png" },
    { n: "عيادة دكتور توم البيطرية", sub: "عيادات بيطريّة", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/5ae9d2097_Screenshot2026-08-05143830.png" },
    { n: "آل معيض", sub: "شركة آل معيض", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/40f72a492_image.png" },
    { n: "شركة ومصنع الفواكه المجففة (دي فروت)", sub: "تصنيع الفواكه المجففة", logo: "https://base44.app/api/apps/6a74edc8f347046365c2e1a4/files/mp/public/6a74edc8f347046365c2e1a4/3e3cb09aa_dfruit-logo.png" },
  ];
  return (
    <Section tint="light" heading={<Heading icon={<Network />} title="شركاؤنا" sub="الشركات والجهات الفعلية التي نتعامل معها ونخدمها" />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {partners.map((p, k) => (
          <div key={k} className="rounded-3xl border border-slate-200 p-5 flex flex-col items-center gap-3 shadow-sm" style={{ minHeight: 230, background: "#ffffff" }}>
            <div className="w-full h-32 rounded-2xl flex items-center justify-center p-3 overflow-hidden" style={{ background: "#ffffff", border: "1px solid #eef2f6" }}>
              <Image src={p.logo} fittingType="fit" alt={p.n} loading="eager" fetchpriority="high" className="h-full w-full" />
            </div>
            <div className="text-center">
              <div className="text-[14px] font-extrabold" style={{ color: NAVY, fontFamily: "var(--font-display)" }}>{p.n}</div>
              <div className="text-[11px] text-slate-500 mt-1">{p.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="text-center text-[13px] font-bold text-slate-600 mb-3">مزوّدو حجوزات الطيران المعتمدون</div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {[
            { logo: "/logos/almosafer.svg", name: "المسافر" },
            { logo: "/logos/almatar.png", name: "المطار" },
            { logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/1dcb0cd9e_image.png", name: "Skyscanner" },
            { logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/0d35e8ef9_image.png", name: "Wingie" },
          ].map((p, i) => (
            <div key={i} className="h-12 w-28 flex items-center justify-center px-3 rounded-xl bg-white border border-slate-200">
              <img src={p.logo} alt={p.name} className="max-h-full max-w-full object-contain" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* =================== الباقات =================== */
function Pricing() {
  return (
    <Section tint="dark" heading={<Heading dark icon={<Sparkles />} title="الباقات والأسعار السنوية" sub="خمس شرائح تناسب كل أحجام المنشآت — كل الباقات بنفس المميزات" />}>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-right">
          <thead>
            <tr style={{ background: "#F5F2FC", color: NAVY }}>
              <Th>الباقة</Th><Th>عدد الموظفين</Th><Th>الاشتراك السنوي</Th><Th>إجمالي السنة الأولى</Th>
            </tr>
          </thead>
          <tbody>
            {PRICING_TIERS_AR.map((t, i) => (
              <tr key={t.id} style={{ background: i % 2 ? "#F8F6FD" : "transparent" }}>
                <td className="py-3 px-4 font-extrabold" style={{ color: NAVY }}>{t.tier}</td>
                <td className="py-3 px-4 text-slate-600 text-[13px]">{t.range}</td>
                <td className="py-3 px-4 font-bold" style={{ color: CYAN }}>{t.custom ? "حسب الاتفاق" : `${(t.yearly ?? 0).toLocaleString()} ر.س`}</td>
                <td className="py-3 px-4 font-extrabold" style={{ color: NAVY }}>{t.custom ? "حسب الاتفاق" : `${(t.year1 ?? 0).toLocaleString()} ر.س`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-slate-500 mt-3">
        جميع الباقات تشمل كامل المميزات دون استثناء · تجربة مجانية 30 يوماً قبل الالتزام
      </p>
    </Section>
  );
}

/* =================== الختام =================== */
function Closing() {
  return (
    <div style={{ background: "linear-gradient(160deg, #ffffff 0%, #F5F2FC 100%)", color: NAVY, padding: "34px" }}>
      <div className="text-center max-w-2xl mx-auto">
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", borderRadius: 18, background: "#ffffff", border: "1px solid rgba(212,175,55,.35)", boxShadow: "0 14px 32px -14px rgba(10,22,41,.30)" }}>
          <img src={LOGO_URL} alt="جداره" style={{ height: 72, width: "auto", objectFit: "contain" }} />
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 800, marginTop: 10, fontFamily: "var(--font-display)", color: NAVY }}>
          لنبدأ رحلتك مع <span style={{ color: CYAN }}>جداره</span>
        </h2>
        <p style={{ fontSize: 14, color: "#475569", marginTop: 10, lineHeight: 1.9 }}>
          جرّب المنصة 30 يوماً مجاناً واكتشف كيف تتحوّل إدارة مواردك البشرية إلى منظومة رقمية موحّدة وفاخرة.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-7">
          <a href="https://wa.me/966594700782" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl px-5 py-3" style={{ background: CYAN, border: "1px solid #7C5CE6" }}>
            <Phone size={18} style={{ color: "#fff" }} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }} dir="ltr">+966 59 470 0782</span>
          </a>
          <div className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 bg-white" style={{ border: "1px solid #e2e8f0" }}>
            <Mail size={18} style={{ color: CYAN }} />
            <a href="mailto:info@jadara-hr.com" style={{ color: NAVY, fontWeight: 700, fontSize: 15 }} dir="ltr">info@jadara-hr.com</a>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 bg-white" style={{ border: "1px solid #e2e8f0" }}>
            <Globe size={18} style={{ color: CYAN }} />
            <span style={{ color: NAVY, fontWeight: 700, fontSize: 15 }} dir="ltr">jadara-hr.com</span>
          </div>
        </div>
        <div className="flex justify-center mt-7">
          <StoreButtons variant="light" isAr={true} />
        </div>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Social icon={Twitter} label="إكس · تويتر" href="https://x.com/jadaraHRM" />
          <Social icon={Linkedin} label="لينكدإن" href="https://www.linkedin.com/company/%D8%AC%D8%AF%D8%A7%D8%B1%D8%A9-%D9%84%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D9%88%D8%A7%D8%B1%D8%AF-%D8%A7%D9%84%D8%A8%D8%B4%D8%B1%D9%8A%D8%A9" />
          <Social icon={TiktokIcon} label="تيك توك" href="https://www.tiktok.com/@jadarahr?_r=1&_t=ZS-99aHcundyoi" />
          <Social icon={Facebook} label="فيسبوك" href="https://www.facebook.com/share/1CEdfx8jV7/?mibextid=wwXIfr" />
          <Social icon={SnapchatIcon} label="سناب شات" href="https://snapchat.com/t/9UWDJAhl" />
          <Social icon={Globe} label="الموقع الإلكتروني" href="https://jadara-hr.com" />
        </div>
        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="rounded-2xl overflow-hidden bg-white px-5 py-3 flex items-center justify-center border border-slate-200">
            <img src="https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/e133dacf0_IMG_0423.png" alt="رؤية المملكة العربية السعودية 2030" style={{ height: 72, width: "auto", objectFit: "contain" }} />
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>نتوافق مع رؤية المملكة العربية السعودية 2030</div>
        </div>
      </div>
      <div className="mt-10 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
        <div>© {new Date().getFullYear()} {PROVIDER.institutionName} — جميع الحقوق محفوظة</div>
        <div>الرقم الوطني الموحد للمنشآت: <span style={{ fontFamily: "ui-monospace, monospace", direction: "ltr" }}>{PROVIDER.unifiedNumber}</span></div>
      </div>
    </div>
  );
}

/* =================== مكوّنات مشتركة =================== */
function Section({ tint, heading, children }) {
  const dark = tint === "dark";
  return (
    <div style={{ background: dark ? "#F5F2FC" : "#ffffff", color: NAVY, padding: "28px 36px" }}>
      {heading && <div style={{ marginBottom: 16 }}>{heading}</div>}
      {children}
    </div>
  );
}

function Heading({ icon, title, sub, dark }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl mb-2" style={{ background: "rgba(139,92,246,.10)", color: CYAN, border: `1px solid ${CYAN}44` }}>{icon}</div>
      <h3 style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", color: NAVY, marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 13, color: "#64748b", maxWidth: 680 }}>{sub}</p>
      <div style={{ width: 48, height: 3, borderRadius: 999, background: CYAN, marginTop: 10 }} />
    </div>
  );
}

function FeatureBlock({ icon: I, kicker, title, desc, points, mock, dark }) {
  return (
    <div style={{ background: dark ? "#F5F2FC" : "#ffffff", color: NAVY, padding: "20px 32px" }}>
      <div className="grid lg:grid-cols-[1fr,1.05fr] gap-5 items-center">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}1A`, color: CYAN, border: `1px solid ${CYAN}40` }}><I size={18} /></div>
            <span style={{ fontSize: 11, fontWeight: 700, color: CYAN }}>{kicker}</span>
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", color: NAVY, marginBottom: 5 }}>{title}</h3>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>{desc}</p>
          <ul className="space-y-1">
            {points.map((p, k) => (
              <li key={k} className="flex items-start gap-2 text-[12.5px]" style={{ color: "#475569" }}>
                <CheckCircle2 size={14} style={{ color: CYAN, marginTop: 3, flexShrink: 0 }} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>{mock}</div>
      </div>
    </div>
  );
}

function MockFrame({ title, children }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200" style={{ background: "#f1f5f9" }}>
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200">
        <div className="flex gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /></div>
        <div className="flex-1 text-center text-[11px] text-slate-400 font-medium truncate">{title}</div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function PortalCard({ icon: I, title, tag, points }) {
  return (
    <div className="rounded-2xl p-6 bg-white border border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}1A`, color: CYAN, border: `1px solid ${CYAN}40` }}><I size={22} /></div>
        <div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${GOLD}22`, color: GOLD }}>{tag}</span>
          <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, color: NAVY, marginTop: 2 }}>{title}</h4>
        </div>
      </div>
      <ul className="space-y-2 text-slate-600 text-[14px]">
        {points.map((p, k) => <li key={k} className="flex items-start gap-2"><BadgeCheck size={15} style={{ color: CYAN, marginTop: 3, flexShrink: 0 }} /><span>{p}</span></li>)}
      </ul>
    </div>
  );
}

function SectionTag({ children }) {
  return (
    <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: CYAN, background: `${CYAN}1A`, border: `1px solid ${CYAN}55`, padding: "5px 14px", borderRadius: 999 }}>{children}</span>
  );
}

function KpiBox({ big, label, accent }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ background: accent ? `linear-gradient(135deg, ${NAVY}, ${NAVY2})` : "#fff", borderColor: accent ? NAVY : "#e2e8f0", color: accent ? "#fff" : NAVY }}>
      <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-display)" }}>{big}</div>
      <div style={{ fontSize: 12, marginTop: 4, color: accent ? "#a9bcd0" : "#64748b" }}>{label}</div>
    </div>
  );
}

function Spec({ icon: I, big, small }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
      <I size={18} style={{ color: CYAN, margin: "0 auto 4px" }} />
      <div style={{ fontWeight: 800, fontSize: 14, color: NAVY }}>{big}</div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{small}</div>
    </div>
  );
}

function TrustChip({ icon: I, label, dark }) {
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-center gap-2 bg-white border border-slate-200">
      <I size={16} style={{ color: CYAN }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{label}</span>
    </div>
  );
}

function Social({ icon: I, label, href }) {
  const inner = (
    <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-white" style={{ border: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>
      <I size={14} style={{ color: CYAN }} /> {label}
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{inner}</a>
  ) : inner;
}

function Th({ children }) {
  return <th className="py-3 px-4 text-[13px] font-bold">{children}</th>;
}