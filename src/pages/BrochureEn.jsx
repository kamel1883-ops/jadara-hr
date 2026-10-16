import React from "react";
import {
  Crown, Download, Users, Fingerprint, Wallet, Calculator, ShieldCheck, BadgeCheck,
  GraduationCap, GitBranch, Car, FileBadge, Building2, Smartphone, MapPin,
  ClipboardList, Server, Cpu, HardDrive, MemoryStick, Zap, Lock, Globe,
  CalendarClock, Mail, Phone, Linkedin, Twitter, Facebook, Network, BarChart3, Plane, FileText,
  Clock, Sparkles, LayoutDashboard, Bell, CheckCircle2,
  Briefcase, UserCog, Boxes, Settings, ShieldAlert, Headphones, TrendingDown, UserCheck,
  CalendarCheck, FileSignature,
} from "lucide-react";
import { TiktokIcon, SnapchatIcon } from "@/components/SocialIcons";
import { PROVIDER } from "@/lib/providerIdentity";
import { PRICING_TIERS_EN } from "@/lib/pricing";
import StoreButtons from "@/components/StoreButtons";
import { EquipmentModule, ComplaintsModule, InsuranceProvidersSection } from "@/components/brochure/ExtraModules";
import { Image } from "@/components/ui/image";

// Jadara Platform — Profile / Brochure — English edition (LTR), fully translated, printable.
const NAVY = "#0A1629";
const NAVY2 = "#0e1f3a";
const CYAN = "#8B5CF6";
const GOLD = "#C9A961";
const LOGO_URL = "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/f7b65511d_Gemini_Generated_Image_bc8r52bc8r52bc8r.jpg";

export default function BrochureEn() {
  return (
    <div dir="ltr" lang="en" className="bg-slate-100 min-h-screen">
      <div className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1100px] mx-auto px-4 h-14 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Jadara" style={{ height: 30, width: "auto", objectFit: "contain" }} />
          </div>
          <div className="flex items-center gap-2">
            <a href="/brochure" className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-semibold">العربية</a>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#8B5CF6] hover:bg-[#7C5CE6] text-white text-sm font-semibold shadow-md shadow-violet-300/50">
              <Download size={16} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="print-brochure mx-auto" style={{ width: "100%", maxWidth: 1100 }}>
        <Cover />
        <div className="print-group"><Vision /><TwoPortals /></div>
        <DashboardOverview />
        <ModuleShowcase />
        <div className="print-group"><FlightProvidersSection /><InsuranceProvidersSection lang="en" Section={Section} Heading={Heading} CYAN={CYAN} NAVY={NAVY} /></div>
        <ReportsAnalyticsEn />
        <EmployeePortal />
        <div className="print-group"><Infra /><Partners /></div>
        <div className="print-group"><Pricing /><Closing /></div>
      </div>
    </div>
  );
}

/* =================== Cover =================== */
function Cover() {
  return (
    <div style={{ background: "linear-gradient(160deg, #ffffff 0%, #F5F2FC 55%, #EFE7F9 100%)", padding: "40px 36px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${CYAN}22 0%, transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -100, right: -60, width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)` }} />
      <div style={{ position: "relative", minHeight: 760, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="flex items-center gap-3">
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 14px", borderRadius: 14, background: "#ffffff", border: "1px solid rgba(212,175,55,.35)", boxShadow: "0 10px 26px -12px rgba(10,22,41,.28)" }}>
            <img src={LOGO_URL} alt="Jadara" style={{ height: 60, width: "auto", objectFit: "contain" }} />
          </div>
        </div>

        <div className="text-center" style={{ margin: "24px 0" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", borderRadius: 999, background: `${CYAN}1A`, border: `1px solid ${CYAN}55`, color: CYAN, fontSize: 12, fontWeight: 700, marginBottom: 18 }}>
            Official Platform Profile
          </div>
          <h1 style={{ color: NAVY, fontSize: 50, fontWeight: 800, lineHeight: 1.12, fontFamily: "var(--font-display)", marginBottom: 14 }}>
            Jadara<br/>
            <span style={{ color: CYAN, fontSize: 42 }}>Human Resources Platform</span>
          </h1>
          <p style={{ color: "#475569", fontSize: 16, maxWidth: 700, margin: "0 auto", lineHeight: 1.9 }}>
            An integrated Saudi system that manages your organization's human capital<br/>
            from check-in to payroll, from onboarding to end of service — in one secure place.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-7" style={{ maxWidth: 760, margin: "20px auto 0" }}>
            {[
              "Employee Management", "Branch Management", "Attendance & Check-out", "Geo Check-in",
              "Leave Management", "Approval Workflow", "Loans & Advances", "Business Trips & Deputation",
              "Monthly Payroll", "Social Insurance (GOSI)", "End of Service", "Performance Management",
              "Performance Reviews", "Training & Development", "Succession Planning", "Org Structure",
              "Workforce Planning", "Full Recruitment", "Vehicles & Fleet", "Vehicle Insurance (Tameeni)", "Government Licenses",
              "Government Subscriptions", "Warnings & Labor Policy", "Equipment & Assets", "Confidential Complaints", "Exit Interviews", "Reports & Analytics",
              "Company Portal", "Employee Self-Service", "Mobile App", "AI Assistant",
              "Organization Settings", "License Alerts", "Settlement Statements", "Self Check-in Integration",
            ].map((b) => (
              <span key={b} style={{ fontSize: 10.5, fontWeight: 600, color: "#334155", padding: "5px 11px", borderRadius: 999, background: "#ffffff", border: "1px solid #e2e8f0" }}>{b}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <div style={{ color: NAVY }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Provided by</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{PROVIDER.institutionNameEn}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              National Unified Number: <span style={{ fontFamily: "ui-monospace, monospace", direction: "ltr", display: "inline-block" }}>{PROVIDER.unifiedNumber}</span>
            </div>
          </div>
          <StoreButtons variant="light" isAr={false} />
        </div>
      </div>
    </div>
  );
}

/* =================== Vision =================== */
function Vision() {
  return (
    <Section tint="light">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <SectionTag>Platform Vision</SectionTag>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: NAVY, fontFamily: "var(--font-display)" }}>
            One platform<br/>
            <span style={{ color: CYAN }}>commanding</span> all human capital
          </h2>
          <p className="mt-5 text-slate-600 leading-loose text-[15px]">
            Jadara is an integrated Saudi cloud platform that brings together employees, attendance, check-in, payroll, leaves, end of service, performance, training, fleet, vehicle insurance, equipment & assets, complaints, licenses, and government subscriptions into a single secure ecosystem — replacing scattered spreadsheets and paper files.
          </p>
          <p className="mt-3 text-slate-600 leading-loose text-[15px]">
            Designed to serve small businesses all the way to large enterprises with consistent performance and a capacity of up to <b style={{ color: NAVY }}>25,000 employees</b> in a single organization.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <KpiBox big="18+" label="Integrated Modules" />
          <KpiBox big="25K" label="Employees per tenant" />
          <KpiBox big="99.9%" label="Service Uptime" />
          <KpiBox big="30 days" label="Free trial" accent />
        </div>
      </div>
    </Section>
  );
}

/* =================== Two Portals =================== */
function TwoPortals() {
  return (
    <Section tint="dark" heading={<Heading dark icon={<Network />} title="Two Separate Portals" sub="One portal for the organization's administration, and one for the employee — each independent with its own permissions" />}>
      <div className="grid md:grid-cols-2 gap-6">
        <PortalCard icon={Building2} title="Company Portal" tag="Administration"
          points={["Manage all employees, branches, and contracts", "Payroll, social insurance, and end of service", "Approvals, requests, reports, and analytics", "Organization licenses and government subscriptions"]} />
        <PortalCard icon={Smartphone} title="Employee Portal" tag="Self-service"
          points={["Profile, salary, and leave balance", "Geo check-in from the mobile app", "Submit leave, loan, and trip requests", "Receive settlements as electronic files"]} />
      </div>
    </Section>
  );
}

/* =================== Main Dashboard =================== */
function DashboardOverview() {
  return (
    <Section tint="light" heading={<Heading icon={<LayoutDashboard />} title="Main Dashboard" sub="A single entry point that brings every management tool into one fast, clear interface" />}>
      <MockFrame title="Jadara — Dashboard">
        <div className="grid grid-cols-[170px,1fr] gap-0 h-[420px]">
          <div style={{ background: "#F8F6FD", color: "#475569", borderRadius: "10px 0 0 10px", padding: 14, borderRight: "1px solid #e2e8f0" }} className="flex flex-col gap-1 text-[11px]">
            <div className="flex items-center gap-2 font-bold mb-2" style={{ color: NAVY }}>
              <Crown size={14} style={{ color: GOLD }} /> Jadara
            </div>
            {[
              { i: LayoutDashboard, t: "Dashboard", a: true },
              { i: Users, t: "Employees" },
              { i: Fingerprint, t: "Attendance" },
              { i: Wallet, t: "Payroll" },
              { i: ShieldCheck, t: "GOSI" },
              { i: CalendarClock, t: "Leaves" },
              { i: ClipboardList, t: "Approvals" },
              { i: Calculator, t: "End of Service" },
              { i: Briefcase, t: "Recruitment" },
              { i: GraduationCap, t: "Training" },
              { i: GitBranch, t: "Succession" },
              { i: BarChart3, t: "Analytics" },
            ].map((x, k) => {
              const I = x.i;
              return (
                <div key={k} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: x.a ? "rgba(139,92,246,.15)" : "transparent", color: x.a ? NAVY : "#94a3b8" }}>
                  <I size={12} /> {x.t}
                </div>
              );
            })}
          </div>
          <div className="bg-slate-50 p-4" style={{ borderRadius: "0 10px 10px 0" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] text-slate-400">Welcome, Walid</div>
                <div className="text-sm font-bold" style={{ color: NAVY }}>Dashboard</div>
              </div>
              <div className="flex gap-1 items-center text-[10px] text-slate-400"><Bell size={12} /> 3 alerts</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { i: Users, b: "248", s: "Total employees", c: CYAN },
                { i: Fingerprint, b: "231", s: "Present today", c: "#16a34a" },
                { i: Clock, b: "9", s: "Absent today", c: "#dc2626" },
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
                <div className="text-[10px] text-slate-400 mb-2">Requests Status</div>
                {[{ t: "Pending manager", n: 5, c: "#fbbf24" }, { t: "Pending finance", n: 3, c: "#8B5CF6" }, { t: "Completed", n: 28, c: "#16a34a" }].map((r, k) => (
                  <div key={k} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600">{r.t}</span><span className="font-bold" style={{ color: r.c }}>{r.n}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200">
                <div className="text-[10px] text-slate-400 mb-2">Attendance — last 7 days</div>
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
        The sidebar moves you directly between every module — from employees to payroll to end of service to analytics
      </p>
    </Section>
  );
}

/* =================== Module Showcase =================== */
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
      <EquipmentModule lang="en" FeatureBlock={FeatureBlock} MockFrame={MockFrame} CYAN={CYAN} NAVY={NAVY} />
      <GovernmentModule />
      <FlightBookingsModule />
      <ComplaintsModule lang="en" FeatureBlock={FeatureBlock} MockFrame={MockFrame} CYAN={CYAN} NAVY={NAVY} />
      <OtherModules />
    </div>
  );
}

/* --- Flight Bookings --- */
function FlightBookingsModule() {
  return (
    <FeatureBlock
      icon={Plane} kicker="Flight Bookings" title="Book your flight from Jadara, redirected to one of four providers to pay"
      desc="Book your flights right inside Jadara — pick the destination, date, number of passengers, and cabin class; after the search, the system redirects you automatically via Deep Links to Almosafer, Almatar, Skyscanner, or Wingie to complete passport details and payment on their secure checkout page. An integration with four of the largest flight providers without leaving the Jadara experience."
      points={[
        "Search for flights inside Jadara: destination, date, passengers, cabin class",
        "Automatic redirect via Deep Links to Almosafer, Almatar, Skyscanner, or Wingie",
        "Complete passport details and payment on the provider's secure checkout page",
        "Integration with four of the world's and Gulf's largest flight providers"
      ]}
      mock={
        <MockFrame title="Flight Bookings — Search a flight">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">From</div>
                <div className="text-[11px] font-bold" style={{ color: NAVY }}>Riyadh (RUH)</div>
              </div>
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">To</div>
                <div className="text-[11px] font-bold" style={{ color: NAVY }}>Dubai (DXB)</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">Date</div>
                <div className="text-[10px] font-bold" style={{ color: NAVY }}>Oct 15</div>
              </div>
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">Passengers</div>
                <div className="text-[10px] font-bold" style={{ color: NAVY }}>2 adults</div>
              </div>
              <div className="rounded-lg p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="text-[9px] text-slate-400">Cabin</div>
                <div className="text-[10px] font-bold" style={{ color: NAVY }}>Economy</div>
              </div>
            </div>
            <button className="w-full rounded-lg py-2 text-center font-bold text-[11px] text-white" style={{ background: `linear-gradient(135deg, ${CYAN}, #7C5CE6)` }}>
              <Plane size={12} className="inline mr-1" /> Search flights
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2 flex items-center gap-1.5" style={{ background: "#f8fafc", border: `1px solid ${CYAN}40` }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: CYAN }}>MS</span>
                <div><div className="text-[10px] font-bold" style={{ color: NAVY }}>Almosafer</div><div className="text-[8px] text-slate-400">deep links</div></div>
              </div>
              <div className="rounded-lg p-2 flex items-center gap-1.5" style={{ background: "#f8fafc", border: `1px solid ${CYAN}40` }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: CYAN }}>MT</span>
                <div><div className="text-[10px] font-bold" style={{ color: NAVY }}>Almatar</div><div className="text-[8px] text-slate-400">manual entry</div></div>
              </div>
              <div className="rounded-lg p-2 flex items-center gap-1.5" style={{ background: "#f8fafc", border: `1px solid ${CYAN}40` }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: CYAN }}>SS</span>
                <div><div className="text-[10px] font-bold" style={{ color: NAVY }}>Skyscanner</div><div className="text-[8px] text-slate-400">deep links</div></div>
              </div>
              <div className="rounded-lg p-2 flex items-center gap-1.5" style={{ background: "#f8fafc", border: `1px solid ${CYAN}40` }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: CYAN }}>WG</span>
                <div><div className="text-[10px] font-bold" style={{ color: NAVY }}>Wingie</div><div className="text-[8px] text-slate-400">deep links</div></div>
              </div>
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

/* =================== Flight Booking Providers =================== */
function FlightProvidersSection() {
  const providers = [
    { logo: "/logos/almosafer.svg", name: "Almosafer", brand: "#003143", deep: true },
    { logo: "/logos/almatar.png", name: "Almatar", brand: "#16a34a", deep: false },
    { logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/1dcb0cd9e_image.png", name: "Skyscanner", brand: "#0770e3", deep: true },
    { logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/0d35e8ef9_image.png", name: "Wingie", brand: "#e81932", deep: true },
  ];
  return (
    <Section tint="light" heading={<Heading icon={<Plane />} title="Flight Booking Providers" sub="Jadara brings you the four largest trusted flight providers — search inside Jadara, then redirect to the provider to complete booking and payment" />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {providers.map((p, k) => (
          <div key={k} className="rounded-3xl p-6 flex flex-col items-center gap-3 shadow-sm" style={{ background: "#fff", border: `2px solid ${p.brand}30` }}>
            <div className="h-20 w-full flex items-center justify-center rounded-2xl overflow-hidden">
              <img src={p.logo} alt={p.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="text-[15px] font-extrabold" style={{ color: p.brand, fontFamily: "var(--font-display)" }}>{p.name}</div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: p.deep ? "#16a34a1a" : "#fbbf241a", color: p.deep ? "#16a34a" : "#b45309", border: `1px solid ${p.deep ? "#16a34a30" : "#fbbf2430"}` }}>
              {p.deep ? "Deep Links" : "Manual Entry"}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function EmployeesModule() {
  return (
    <FeatureBlock
      icon={Users} kicker="Employee & Branch Management" title="Complete employee profile with multi-branch support"
      desc="A comprehensive employee profile that links identity, contract, salary, bank, residency, insurance, and hire date — with multi-branch management for each organization: every branch has its own location, check-in radius, and managers."
      points={[
        "Upload the organization logo and enable branches and cities within the system",
        "Link an employee to a branch, direct manager, finance approver, and HR approver",
        "Calculate leave balance pro-rata from the hire date — 21 or 30 days",
        "Full history of employment statuses: active, on leave, terminated, resigned",
      ]}
      mock={
        <MockFrame title="Employee Management">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="grid grid-cols-[1.5fr,1fr,1fr,.8fr] gap-2 text-[10px] text-slate-400 pb-2 border-b border-slate-100 font-semibold">
              <div>Employee</div><div>Position</div><div>Branch</div><div>Status</div>
            </div>
            {[
              { n: "Ahmed Al-Qahtani", p: "Operations Manager", b: "Main Branch", s: "Active", c: "#16a34a" },
              { n: "Sarah Al-Otaibi", p: "Accountant", b: "Jeddah Branch", s: "Active", c: "#16a34a" },
              { n: "Khalid Al-Maghribi", p: "Sales Rep", b: "Dammam Branch", s: "On Leave", c: "#fbbf24" },
              { n: "Noura Al-Zahrani", p: "HR Specialist", b: "Main Branch", s: "Active", c: "#16a34a" },
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

function AttendanceModule() {
  return (
    <FeatureBlock dark
      icon={Fingerprint} kicker="Attendance & Geo Check-in" title="Mobile check-in that verifies location"
      desc="Employees check in and out from the mobile app, and the system verifies their location within the branch's defined check-in radius — with break periods, net working hours, lateness, and absence handled automatically."
      points={[
        "Mobile employee check-in with location and branch-radius verification",
        "Record break periods and net working hours for each day",
        "Calculate lateness within a grace period, absence, and in-day leaves",
        "Manual check-in entry and edits subject to manager approval",
      ]}
      mock={
        <MockFrame title="Attendance & Check-in">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-3 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-slate-400">Today's check-in</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#16a34a1A", color: "#16a34a" }}>In Range</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${CYAN}15`, border: `2px solid ${CYAN}` }}>
                  <Fingerprint size={26} style={{ color: CYAN }} />
                </div>
                <div className="text-[11px] leading-relaxed">
                  <div className="text-slate-500">Check-in: <b style={{ color: NAVY }}>08:02</b></div>
                  <div className="text-slate-500">Check-out: <b style={{ color: NAVY }}>—</b></div>
                  <div className="text-slate-400">Main Branch</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                <MapPin size={11} style={{ color: CYAN }} /> 35 m from the workplace
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-200">
              <div className="text-[10px] text-slate-400 mb-2">Weekly log</div>
              {[
                { d: "Sunday", h: "8:00", s: "Present", c: "#16a34a" },
                { d: "Monday", h: "8:15", s: "Late", c: "#fbbf24" },
                { d: "Tuesday", h: "8:01", s: "Present", c: "#16a34a" },
                { d: "Wednesday", h: "—", s: "Absent", c: "#dc2626" },
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

function PayrollModule() {
  return (
    <FeatureBlock
      icon={Wallet} kicker="Monthly Payroll" title="A payslip built automatically from attendance"
      desc="The monthly payroll statement is generated directly from attendance data — base salary, allowances, overtime, absence deductions, loan installments, and social insurance — leading to net pay, ready for review, approval, and disbursement."
      points={[
        "Compute gross and net salary automatically from attendance and absence",
        "Calculate overtime, bonuses, allowances, and absence deductions",
        "Automatically add the loan installment each month until repayment completes",
        "Approve the whole payroll batch then disburse and issue the final statement",
      ]}
      mock={
        <MockFrame title="Payroll — October">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[1.4fr,.8fr,.8fr,.8fr,.9fr] gap-2 text-[10px] text-slate-400 bg-slate-50 p-2 font-bold border-b border-slate-100">
              <div>Employee</div><div>Gross</div><div>GOSI</div><div>Deductions</div><div>Net</div>
            </div>
            {[
              { n: "Ahmed Al-Qahtani", g: "12,000", ins: "1,170", d: "600", net: "10,230" },
              { n: "Sarah Al-Otaibi", g: "8,500", ins: "829", d: "240", net: "7,431" },
              { n: "Khalid Al-Maghribi", g: "6,000", ins: "120", d: "0", net: "5,880" },
              { n: "Noura Al-Zahrani", g: "9,200", ins: "897", d: "350", net: "7,953" },
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
              <div>Total</div><div>35,700</div><div>3,016</div><div>1,190</div><div style={{ color: CYAN }}>31,494</div>
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

function GosiModule() {
  return (
    <FeatureBlock dark
      icon={ShieldCheck} kicker="Social Insurance (GOSI)" title="GOSI calculation for Saudis and residents"
      desc="Automatic GOSI contribution calculation — for Saudis at the employee and employer rates, and for residents at the employer rate — based on organization-adjustable rates, with a monthly statement ready to upload."
      points={[
        "Organization-adjustable rates for Saudis and residents separately",
        "Automatic employee and employer contribution inside the payslip",
        "An issued, exportable monthly GOSI statement",
        "Linked to active employees with the contribution-subject salary data",
      ]}
      mock={
        <MockFrame title="GOSI Statement">
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { t: "Total wages", v: "124,500", c: NAVY },
              { t: "Employee contribution", v: "12,140", c: "#dc2626" },
              { t: "Employer contribution", v: "12,140", c: "#fbbf24" },
            ].map((s, k) => (
              <div key={k} className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400">{s.t}</div>
                <div className="text-lg font-extrabold mt-1" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 bg-white rounded-xl p-3 border border-slate-200">
            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 font-bold pb-2 border-b border-slate-100">
              <div>Employee</div><div>Nationality</div><div>Contribution</div>
            </div>
            {[
              { n: "Ahmed Al-Qahtani", j: "Saudi", v: "1,170" },
              { n: "Khalid Al-Maghribi", j: "Resident", v: "120" },
              { n: "Noura Al-Zahrani", j: "Saudi", v: "897" },
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

function EosModule() {
  return (
    <FeatureBlock
      icon={Calculator} kicker="End of Service" title="End-of-service benefits per labor law"
      desc="Calculates end-of-service gratuity per Saudi labor law — half-pay for five years then full pay, with specific rulings for resignation and dismissal — settling leave balance, dues, deductions, and issuing the legal statement."
      points={[
        "Half-pay for under five years and full pay thereafter",
        "Specific rulings for resignation, unfair dismissal, and contract termination",
        "Settle leave balance, return ticket, and loan settlement",
        "Issue a legal end-of-service statement as an electronic file",
      ]}
      mock={
        <MockFrame title="End-of-Service Settlement">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] text-slate-400">Ahmed Al-Qahtani · Operations Manager</div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fbbf241A", color: "#fbbf24" }}>Contract End</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: "Years of service", v: "6 years 3 months" },
                { l: "Monthly wage", v: "12,000 SAR" },
                { l: "EOS gratuity", v: "73,500 SAR", accent: true },
                { l: "Leave balance", v: "15 days · 6,900 SAR" },
              ].map((r, k) => (
                <div key={k} className="rounded-lg p-2.5" style={{ background: r.accent ? `${CYAN}10` : "#f8fafc", border: `1px solid ${r.accent ? `${CYAN}55` : "#e2e8f0"}` }}>
                  <div className="text-[10px] text-slate-400">{r.l}</div>
                  <div className="text-sm font-extrabold mt-0.5" style={{ color: r.accent ? CYAN : NAVY }}>{r.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg p-2.5" style={{ background: NAVY, color: "#fff" }}>
              <div className="text-[11px]">Total entitlement</div>
              <div className="text-lg font-extrabold" style={{ color: CYAN }}>80,400 SAR</div>
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

function LeavesModule() {
  return (
    <FeatureBlock dark
      icon={ClipboardList} kicker="Leaves & Approval Workflow" title="A multi-stage approval flow and full history log"
      desc="Every request flows through a multi-stage approval path — employee, then direct manager, then HR, then finance — with each status saved as an entry with its date, approver, and notes. The last 20 completed requests are kept with a full history per request."
      points={[
        "Leave, loan, trip, and check-in edit requests from the employee portal",
        "Multi-stage approval: Employee → Manager → HR → Finance",
        "Each status saved as an entry with date, approver, and notes",
        "Keeps the last 20 completed requests and a full history per request",
      ]}
      mock={
        <MockFrame title="Approvals — Annual Leave Request">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-cyan-50 text-[10px] flex items-center justify-center font-bold" style={{ color: CYAN }}>S</div>
              <div className="text-[11px]"><b className="text-slate-700">Sarah Al-Otaibi</b> · Annual leave · 5 days</div>
            </div>
            <div className="flex items-center gap-1 mb-3">
              {[
                { s: "Employee", t: "Submitted", c: "#16a34a", done: true },
                { s: "Direct Manager", t: "Approved", c: "#16a34a", done: true },
                { s: "HR", t: "Pending", c: "#fbbf24", done: false },
                { s: "Finance", t: "—", c: "#94a3b8", done: false },
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
              <div className="text-[10px] text-slate-400 mb-1">Request log</div>
              {[
                { d: "12/10 09:15", t: "Employee submitted the request" },
                { d: "12/10 11:02", t: "Direct manager approved" },
                { d: "—", t: "Awaiting HR" },
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

function RecruitmentModule() {
  return (
    <FeatureBlock
      icon={Briefcase} kicker="Recruitment Management" title="From job posting to full hiring"
      desc="A complete hiring cycle — posting a job with its vacancies and requirements, receiving and screening applications, scheduling interviews and recording results, evaluating the probation period, and issuing the appointment letter and decision document."
      points={[
        "Post jobs by title, profession, grade, salary, qualifications, and vacancies",
        "Screen applications, measure years of experience, and record interview results",
        "Evaluate the probation period across five criteria and record a recommendation",
        "Issue the appointment letter and official decision document as an electronic file",
      ]}
      mock={
        <MockFrame title="Recruitment — Candidates">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="text-[11px] text-slate-700 font-bold mb-2">Role: HR Analyst · 2 vacancies</div>
            <div className="flex items-center gap-1 mb-3">
              {[{ s: "Applied", n: 38, c: "#94a3b8" }, { s: "Screened", n: 12, c: "#8B5CF6" }, { s: "Interview", n: 5, c: "#fbbf24" }, { s: "Hired", n: 2, c: "#16a34a" }].map((x, k) => (
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
              { n: "Mohammed Al-Shehri", e: "5 years", s: "First interview", c: "#fbbf24" },
              { n: "Reem Al-Harbi", e: "3 years", s: "Hired", c: "#16a34a" },
              { n: "Fahd Al-Naimi", e: "7 years", s: "Initial screening", c: "#8B5CF6" },
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

function PerformanceModule() {
  return (
    <FeatureBlock dark
      icon={BarChart3} kicker="Performance Management" title="Multi-criteria evaluation with a clear recommendation"
      desc="Evaluate the employee across five criteria — competence, behavior, knowledge, professional field, and experience — recording strengths and improvement opportunities, with a recommendation to confirm, dismiss from probation, or extend the period."
      points={[
        "Evaluation across five criteria on a five-point scale each",
        "Record strengths and improvement opportunities for each employee",
        "A recommendation to confirm, dismiss, or extend the probation period",
        "A live evaluation log, reviewable, with performance tracking over time",
      ]}
      mock={
        <MockFrame title="Employee Performance Review">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="text-[11px] text-slate-700 font-bold mb-2">Review: Khalid Al-Maghribi · Q2</div>
            {[
              { l: "Competence", v: 4 },
              { l: "Behavior", v: 5 },
              { l: "Knowledge", v: 4 },
              { l: "Professional field", v: 3 },
              { l: "Experience", v: 4 },
            ].map((r, k) => (
              <div key={k} className="flex items-center gap-2 text-[11px] py-1.5">
                <span className="text-slate-500 w-28 shrink-0">{r.l}</span>
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className="flex-1 h-2 rounded" style={{ background: s <= r.v ? CYAN : "#e2e8f0" }} />
                  ))}
                </div>
                <span className="font-bold" style={{ color: NAVY }}>{r.v}/5</span>
              </div>
            ))}
            <div className="mt-2 rounded-lg p-2 flex items-center justify-between" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}55` }}>
              <span className="text-[11px] font-bold" style={{ color: NAVY }}>Recommendation: Confirm after probation</span>
              <span className="text-[11px] font-extrabold" style={{ color: CYAN }}>4.0/5</span>
            </div>
          </div>
        </MockFrame>
      }
    />
  );
}

function TrainingModule() {
  return (
    <FeatureBlock
      icon={GraduationCap} kicker="Training & Development" title="Individual and group training plans with impact measurement"
      desc="Build training plans for a single employee or an entire department — diagnose skill gaps, define the goal after the plan, the execution mechanism, cost, and duration, then track completion and measure impact on performance."
      points={[
        "Individual training plan per employee or group plan for a whole department",
        "Diagnose skill gaps and define the goal after the plan",
        "Execution mechanism, cost, and the start and end dates",
        "Track plan status and measure the impact on performance",
      ]}
      mock={
        <MockFrame title="Training Plans">
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { t: "Communication skills", s: "Sales team", p: 70, c: CYAN },
              { t: "Time management", s: "Khalid Al-Maghribi", p: 40, c: "#fbbf24" },
              { t: "Accounting software", s: "Sarah Al-Otaibi", p: 100, c: "#16a34a" },
              { t: "Customer service", s: "Support team", p: 25, c: "#dc2626" },
            ].map((r, k) => (
              <div key={k} className="bg-white rounded-xl p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] font-bold text-slate-700">{r.t}</div>
                  <span className="text-[10px] text-slate-400">{r.s}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.p}%`, background: r.c }} />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Progress: {r.p}%</div>
              </div>
            ))}
          </div>
        </MockFrame>
      }
    />
  );
}

function SuccessionModule() {
  return (
    <FeatureBlock dark
      icon={GitBranch} kicker="Succession Planning" title="Grooming successors for sensitive positions"
      desc="Identify sensitive leadership positions, the skills required for each, nominate qualified candidates within the organization, measure the readiness gap, and build a preparation plan for each candidate until they reach readiness when the position is vacant."
      points={[
        "Identify sensitive and leadership positions within the structure",
        "Nominate qualified candidates and measure the readiness gap for each role",
        "A detailed preparation plan per candidate with training, exercises, and follow-up",
        "Alerts when a position is vacant or its holder nears retirement",
      ]}
      mock={
        <MockFrame title="Succession Plan">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="text-[11px] text-slate-700 font-bold mb-2">Sensitive Role: Operations Manager</div>
            {[
              { n: "Ahmed Al-Qahtani", r: "Deputy Manager", g: 85, c: "#16a34a" },
              { n: "Noura Al-Zahrani", r: "Senior Specialist", g: 60, c: "#fbbf24" },
              { n: "Saad Al-Maliki", r: "Supervisor", g: 35, c: "#dc2626" },
            ].map((r, k) => (
              <div key={k} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between text-[11px] py-1">
                  <div><b className="text-slate-700">{r.n}</b> <span className="text-slate-400">· {r.r}</span></div>
                  <span className="font-bold" style={{ color: r.c }}>{r.g}% ready</span>
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

function FleetModule() {
  return (
    <FeatureBlock
      icon={Car} kicker="Fleet Management" title="A full fleet with trips, maintenance, and insurance"
      desc="Register the organization's vehicles and drivers, link a vehicle to a branch and employee, record vehicle trips, track insurance renewal, inspection, and vehicle residency, and follow periodic maintenance — with alerts before each document expires."
      points={[
        "Vehicle file: plate, type, model, residency, insurance",
        "Link a driver, vehicle status, and operating branch",
        "Record trips: destination, date, distance, cost",
        "Alerts before insurance, inspection, residency, and periodic maintenance expire",
      ]}
      mock={
        <MockFrame title="Fleet Management">
          <div className="grid sm:grid-cols-3 gap-2">
            {[
              { n: "RJK 1234", t: "Hyundai Elantra", s: "Active", c: "#16a34a" },
              { n: "RLP 5678", t: "Toyota Camry", s: "In Maintenance", c: "#fbbf24" },
              { n: "RRJ 9012", t: "Nissan Patrol", s: "Active", c: "#16a34a" },
            ].map((r, k) => (
              <div key={k} className="bg-white rounded-xl p-3 border border-slate-200">
                <div className="flex items-center gap-2 mb-2"><Car size={14} style={{ color: CYAN }} /><span className="text-[11px] font-bold text-slate-700" dir="ltr">{r.n}</span></div>
                <div className="text-[10px] text-slate-500">{r.t}</div>
                <div className="text-[10px] mt-2"><span className="font-bold px-2 py-0.5 rounded-full" style={{ background: `${r.c}1A`, color: r.c }}>{r.s}</span></div>
                <div className="text-[9px] text-slate-400 mt-1">Insurance expires: 12/12</div>
              </div>
            ))}
          </div>
        </MockFrame>
      }
    />
  );
}

function GovernmentModule() {
  return (
    <FeatureBlock dark
      icon={FileBadge} kicker="Government Licenses & Subscriptions" title="All the organization's government obligations in one place"
      desc="Full management of the organization's licenses (municipal, commercial, civil defense, health, professional) and of subscriptions to government platforms (Absher Business, Muqeem, Qiwa, Mudad, GOSI, Wathq, Saber, Balady, and more) — with each subscription's date, cost, and a pre-expiry alert."
      points={[
        "All the organization's licenses in one table with the procedure, authority, and expiry",
        "Record each government subscription with account number, subscriber, and duration",
        "Track the annual cost per subscription and the total government cost",
        "Alerts two weeks before any license or subscription expires",
      ]}
      mock={
        <MockFrame title="Government Subscriptions">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { n: "Absher Business", s: "Active" },
              { n: "Muqeem", s: "Active" },
              { n: "Qiwa", s: "Active" },
              { n: "Mudad", s: "Alert", warn: true },
              { n: "GOSI", s: "Active" },
              { n: "Wathq", s: "Active" },
              { n: "Zatca", s: "Active" },
              { n: "Balady", s: "Active" },
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

function OtherModules() {
  const items = [
    { i: Plane, t: "Business Trips & Deputation", d: "Request a trip with destination, dates, and cost; obtain manager, HR, and finance approvals; book tickets; disburse to the employee; and issue an official statement." },
    { i: Building2, t: "Organization Structure", d: "Manage departments, sections, branches, and units, with a chart view of reporting relationships and hierarchy." },
    { i: Boxes, t: "Workforce Planning", d: "Project headcount needs onto departments, analyze the gap between budget and actual, and plan future hiring." },
    { i: FileText, t: "Warnings & Labor Policy", d: "Three-level warnings by violation type, recording the incident, hearing session, verification, legal reference, and approval." },
    { i: UserCog, t: "Exit Interviews", d: "A separate interview at end of service, analyze departure reasons, and propose workplace improvements to retain talent." },
    { i: BarChart3, t: "Analytics & Reports", d: "Attendance, payroll, leaves, and recruitment reports, with an analytics dashboard for decision-makers and performance levels." },
    { i: Calculator, t: "Annual HR Budget", d: "Every riyal spent on employees is accounted for: salaries, GOSI, housing and end-of-service are computed automatically from your employee files, with charts, budget-vs-actual comparison and branded print." },
    { i: Settings, t: "Organization Settings", d: "GOSI rates, working hours and days, lateness grace period, check-in radius, and leave and ticket policies." },
    { i: Headphones, t: "Arabic Product & Continuous Support", d: "A Saudi Arabic platform with a premium, authentic Arabic-first design, plus round-the-clock Arabic technical support via WhatsApp and email — our team is ready to help from activation to onboarding and training." },
  ];
  return (
    <Section tint="light" heading={<Heading icon={<ShieldAlert />} title="Additional Administrative Modules" sub="What completes an HR ecosystem — trips, structure, analytics, and policies" />}>
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

/* =================== Reports & Analytics (English) =================== */
function ReportsAnalyticsEn() {
  const reports = [
    {
      icon: TrendingDown,
      label: "Turnover Rate",
      desc: "Monthly employee departure rate",
      render: () => (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-end gap-1.5 h-24 mb-2">
            {[4.2, 3.1, 5.5, 2.8, 3.6, 4.9, 3.2].map((h, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${(h / 6) * 100}%`, background: h > 4.5 ? "#fbbf24" : CYAN, opacity: .85 }} />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Annual avg.</span>
            <span className="font-extrabold" style={{ color: NAVY }}>3.9%</span>
          </div>
          <div className="text-[10px] text-amber-600 mt-1">Alert: spike in June</div>
        </div>
      ),
    },
    {
      icon: UserCheck,
      label: "Retention Rate",
      desc: "Share of employees retained",
      render: () => (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="relative flex items-center justify-center h-24">
            <svg viewBox="0 0 100 100" className="w-24 h-24" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={CYAN} strokeWidth="10" strokeLinecap="round" strokeDasharray="263.9" strokeDashoffset="42" />
            </svg>
            <div className="absolute text-center">
              <div className="text-lg font-extrabold" style={{ color: NAVY }}>84%</div>
              <div className="text-[9px] text-slate-400">retained</div>
            </div>
          </div>
          <div className="text-[11px] text-center text-slate-500">out of 120 employees</div>
        </div>
      ),
    },
    {
      icon: CalendarCheck,
      label: "Attendance & Absence",
      desc: "Monthly absence and lateness summary",
      render: () => (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            {[{ l: "Present", v: "92%", c: "#16a34a" }, { l: "Late", v: "5%", c: "#fbbf24" }, { l: "Absent", v: "3%", c: "#dc2626" }].map((x, i) => (
              <div key={i} className="rounded-lg py-2" style={{ background: `${x.c}14` }}>
                <div className="text-sm font-extrabold" style={{ color: x.c }}>{x.v}</div>
                <div className="text-[9px] text-slate-500">{x.l}</div>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-1 h-12">
            {[88, 92, 79, 95, 90, 85, 93].map((h, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: CYAN, opacity: .8 }} />
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: FileBadge,
      label: "Licenses Nearing Expiry",
      desc: "Proactive pre-expiry alerts",
      render: () => (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="text-[10px] text-slate-400 mb-2">Licenses nearing expiry</div>
          {[
            { n: "Municipal License", d: "in 6 days", warn: true },
            { n: "Civil Defense", d: "in 12 days", warn: true },
            { n: "Commercial", d: "Active", warn: false },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-700 font-medium">{r.n}</span>
              <span className="font-bold" style={{ color: r.warn ? "#dc2626" : "#16a34a" }}>{r.d}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Building2,
      label: "Gov Subscriptions Nearing Expiry",
      desc: "Proactive pre-expiry alerts",
      render: () => (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="text-[10px] text-slate-400 mb-2">Subscriptions nearing expiry</div>
          {[
            { n: "Muqeem", d: "in 8 days", warn: true },
            { n: "Mudad", d: "in 15 days", warn: true },
            { n: "Absher Business", d: "in 21 days", warn: true },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-700 font-medium">{r.n}</span>
              <span className="font-bold" style={{ color: "#fbbf24" }}>{r.d}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: FileSignature,
      label: "Contracts Nearing Expiry",
      desc: "Proactive pre-expiry alerts",
      render: () => (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="text-[10px] text-slate-400 mb-2">Contracts nearing expiry</div>
          {[
            { n: "Khalid Al-Maghribi", d: "in 12 days", warn: true },
            { n: "Sarah Al-Otaibi", d: "in 30 days", warn: true },
            { n: "Fahd Al-Naimi", d: "in 45 days", warn: false },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-700 font-medium">{r.n}</span>
              <span className="font-bold" style={{ color: r.warn ? "#dc2626" : "#fbbf24" }}>{r.d}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: ShieldAlert,
      label: "Warnings",
      desc: "Number of warnings by level",
      render: () => (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-end gap-2 h-24 justify-center">
            {[{ d: "First", v: 18, c: "#fbbf24" }, { d: "Second", v: 7, c: "#fb923c" }, { d: "Third", v: 2, c: "#dc2626" }].map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1" style={{ width: 38 }}>
                <div className="rounded-t w-full" style={{ height: `${(b.v / 20) * 70}px`, background: b.c }} />
                <div className="text-[9px] text-slate-600 font-bold">{b.v}</div>
                <div className="text-[8px] text-slate-400">{b.d}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-center text-slate-500 mt-1">27 total warnings this quarter</div>
        </div>
      ),
    },
    {
      icon: Wallet,
      label: "Recent Payroll",
      desc: "Total payroll disbursed monthly",
      render: () => (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="text-[10px] text-slate-400 mb-2">Payroll in SAR (last 7 months)</div>
          <svg viewBox="0 0 200 70" className="w-full h-20">
            <polyline points="0,50 33,44 66,48 100,38 133,34 166,30 200,26" fill="none" stroke={CYAN} strokeWidth="2.5" />
            {[50, 44, 48, 38, 34, 30, 26].map((y, i) => (
              <circle key={i} cx={i * 33} cy={y} r="2.5" fill={CYAN} />
            ))}
          </svg>
          <div className="flex justify-between text-[8px] text-slate-400 mt-1">
            <span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-slate-400">Last disbursement</span>
            <span className="font-extrabold" style={{ color: NAVY }}>31,494 SAR</span>
          </div>
        </div>
      ),
    },
    {
      icon: ShieldCheck,
      label: "Recent GOSI",
      desc: "Monthly GOSI contribution",
      render: () => (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="text-[10px] text-slate-400 mb-2">GOSI in SAR (last 7 months)</div>
          <svg viewBox="0 0 200 70" className="w-full h-20">
            <polyline points="0,55 33,52 66,50 100,46 133,44 166,40 200,38" fill="none" stroke="#7c3aed" strokeWidth="2.5" />
            {[55, 52, 50, 46, 44, 40, 38].map((y, i) => (
              <circle key={i} cx={i * 33} cy={y} r="2.5" fill="#7c3aed" />
            ))}
          </svg>
          <div className="flex justify-between text-[8px] text-slate-400 mt-1">
            <span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-slate-400">Last installment</span>
            <span className="font-extrabold" style={{ color: "#7c3aed" }}>3,016 SAR</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Section tint="light" heading={<Heading icon={<BarChart3 />} title="Reports & Analytics" sub="A complete analytics dashboard for decision-makers — live previews of every report" />}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r, k) => {
          const I = r.icon;
          return (
            <div key={k} className="rounded-2xl p-3 border border-slate-200 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}1A`, color: CYAN, border: `1px solid ${CYAN}40` }}><I size={18} /></div>
                <div>
                  <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: NAVY }}>{r.label}</h4>
                  <div className="text-[11px] text-slate-500">{r.desc}</div>
                </div>
              </div>
              <r.render />
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-slate-500 mt-4">
        Every report is filterable by branch, department, and period — and exportable as an electronic file for sharing or archiving
      </p>
    </Section>
  );
}

/* =================== Employee Portal & App =================== */
function EmployeePortal() {
  return (
    <Section tint="dark" heading={<Heading dark icon={<Smartphone />} title="Employee Portal & App" sub="A real mobile app — a dedicated self-service portal for every employee" />}>
      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        <div className="rounded-2xl p-6 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}1A`, color: CYAN, border: `1px solid ${CYAN}40` }}><Smartphone size={20} /></div>
            <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, color: NAVY }}>Jadara Employee App</h4>
          </div>
          <ul className="space-y-2.5 text-[14.5px] text-slate-600">
            {[
              "Self-service: profile, salary, leave balance, loans, and approval stages",
              "Check-in and check-out from the app with location verification",
              "Submit leave, loan, and business trip requests and track approvals",
              "Receive settlements and official statements as electronic files in the app",
              "An AI assistant that answers employee questions",
            ].map((x, k) => (
              <li key={k} className="flex items-start gap-2"><BadgeCheck size={16} style={{ color: CYAN, marginTop: 3, flexShrink: 0 }} /><span>{x}</span></li>
            ))}
          </ul>
          <div className="mt-5">
            <StoreButtons variant="glass" isAr={false} />
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
            <span style={{ fontSize: 12, fontWeight: 700 }}>Jadara</span>
            <span style={{ fontSize: 10, color: "#7d92a8", marginLeft: "auto" }}>Employee Portal</span>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.10)" }}>
            <div style={{ fontSize: 10, color: "#9fb3c8" }}>Good morning, Ahmed</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>Operations · Operations Manager</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[{ I: Fingerprint, t: "Check-in" }, { I: CalendarClock, t: "Leave" }, { I: Wallet, t: "Loan" }].map((x, i) => (
              <div key={i} className="rounded-lg py-3" style={{ background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.25)" }}>
                <x.I size={16} style={{ color: CYAN, margin: "0 auto 4px" }} />
                <div style={{ fontSize: 10 }}>{x.t}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-3 flex-1" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Latest requests</div>
            {[
              { t: "Annual leave — Approved", c: "#34d399" },
              { t: "Salary loan — Pending finance", c: "#fbbf24" },
              { t: "Check-in edit — Approved", c: "#34d399" },
            ].map((x, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5 text-[11px]"><span style={{ width: 6, height: 6, borderRadius: 999, background: x.c }} /> {x.t}</div>
            ))}
          </div>
          <button className="rounded-xl py-2.5 text-center font-bold text-xs" style={{ background: `linear-gradient(135deg, ${CYAN}, #7C5CE6)`, color: "#fff" }}>
            <Fingerprint size={13} className="inline mr-1" /> Check in now
          </button>
        </div>
      </div>
    </div>
  );
}

/* =================== Infrastructure =================== */
function Infra() {
  return (
    <Section tint="dark" heading={<Heading dark icon={<Server />} title="Premium Saudi Infrastructure" sub="A dedicated Jadara server — inside the Kingdom, top specs" />}>
      <div className="grid md:grid-cols-[1.1fr,1fr] gap-6">
        <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
          <div className="flex items-center gap-2 mb-4" style={{ color: NAVY }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}1A`, border: `1px solid ${CYAN}40` }}><Server size={20} style={{ color: CYAN }} /></div>
            <div>
              <div className="font-extrabold text-lg">Jadara Dedicated Server</div>
              <div className="text-xs text-slate-500">A server dedicated to the Jadara platform — hosting all company and institution subscriptions</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 self-start mb-3" style={{ background: "#dcfce7", border: "1px solid #86efac" }}>
            <MapPin size={14} style={{ color: "#16a34a" }} />
            <span className="text-xs font-bold" style={{ color: "#15803d" }}>Riyadh — Kingdom of Saudi Arabia</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Spec icon={Cpu} big="12 vCores" small="AMD EPYC 4464P · 24 threads" />
            <Spec icon={MemoryStick} big="48 GB" small="DDR5 ECC memory" />
            <Spec icon={HardDrive} big="1 TB" small="Ultra-fast NVMe" />
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
            <div className="text-xs text-slate-500">Server capacity</div>
            <div className="text-lg font-extrabold flex items-center justify-center gap-1.5" style={{ color: NAVY }}><Users size={16} style={{ color: CYAN }} /> up to 50,000 employees</div>
            <div className="text-[11px] text-slate-400">across different companies and institutions — with no impact on speed</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TrustChip dark icon={MapPin} label="Saudi location (Riyadh)" />
          <TrustChip dark icon={ShieldCheck} label="Access controls" />
          <TrustChip dark icon={ShieldCheck} label="Tenant isolation" />
          <TrustChip dark icon={Lock} label="Isolated cloud vault" />
          <TrustChip dark icon={Lock} label="Data encryption" />
          <TrustChip dark icon={ShieldCheck} label="Daily backups" />
          <TrustChip dark icon={Zap} label="Ultra-fast NVMe" />
          <TrustChip dark icon={BadgeCheck} label="99.9% uptime" />
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-slate-700 text-[13px] leading-relaxed">
        <div className="flex items-center gap-2 mb-2" style={{ color: NAVY }}>
          <ShieldCheck size={16} style={{ color: "#16a34a" }} />
          <span className="font-extrabold text-sm">Saudi hosting & data protection controls</span>
        </div>
        <p style={{ color: "#475569" }}>
          Jadara is hosted inside the Kingdom of Saudi Arabia on <b>Oracle Systems</b> Saudi Arabia servers — under the current hosting setup, and your data stays inside the Kingdom.
          We provide access controls, encryption, and backups for your data, plus an isolated cloud vault for identity, banking, and documents. We help you organize your requirements; the system does not replace legal review or the requirements of official authorities.
        </p>
      </div>
      {/* Server & hosting provider */}
      <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-xs text-slate-500 shrink-0">Server & hosting provider</div>
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-14 rounded-lg bg-white flex items-center justify-center p-1.5 shrink-0 border border-slate-200">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg" alt="Oracle Systems" style={{ width: "100%", height: "auto", objectFit: "contain" }} />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-base" style={{ fontFamily: "var(--font-display)", color: NAVY }}>Oracle Systems</div>
            <div className="text-[11px] text-slate-500">Oracle Systems Saudi Arabia — server & hosting provider</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* =================== Partners =================== */
function Partners() {
  const partners = [
    { n: "Business Code Contracting Co.", sub: "Contracting", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/d146af91b_Screenshot2026-08-09155940.png" },
    { n: "Darz Fine Tailoring Co.", sub: "Fine tailoring", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/64e527d78_Screenshot2026-08-09155842.png" },
    { n: "Dr. Tom Veterinary Clinic", sub: "Veterinary clinics", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/5ae9d2097_Screenshot2026-08-05143830.png" },
    { n: "Al Moied", sub: "Al Moied Co.", logo: "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/40f72a492_image.png" },
    { n: "Dfruit Dried Fruits Co. & Factory", sub: "Dried fruit manufacturing", logo: "https://base44.app/api/apps/6a74edc8f347046365c2e1a4/files/mp/public/6a74edc8f347046365c2e1a4/3e3cb09aa_dfruit-logo.png" },
  ];
  return (
    <Section tint="light" heading={<Heading icon={<Network />} title="Our Partners" sub="The real companies and entities we work with and serve" />}>
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
        <div className="text-center text-[13px] font-bold text-slate-600 mb-3">Trusted Flight Booking Providers</div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {[
            { logo: "/logos/almosafer.svg", name: "Almosafer" },
            { logo: "/logos/almatar.png", name: "Almatar" },
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

/* =================== Pricing =================== */
function Pricing() {
  return (
    <Section tint="dark" heading={<Heading dark icon={<Sparkles />} title="Plans & Annual Pricing" sub="Five tiers for every organization size — all plans include the same features" />}>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left">
          <thead>
            <tr style={{ background: "#F5F2FC", color: NAVY }}>
              <Th>Plan</Th><Th>Employees</Th><Th>Annual Subscription</Th><Th>Year 1 Total</Th>
            </tr>
          </thead>
          <tbody>
            {PRICING_TIERS_EN.map((t, i) => (
              <tr key={t.id} style={{ background: i % 2 ? "#F8F6FD" : "transparent" }}>
                <td className="py-3 px-4 font-extrabold" style={{ color: NAVY }}>{t.tier}</td>
                <td className="py-3 px-4 text-slate-600 text-[13px]">{t.range}</td>
                <td className="py-3 px-4 font-bold" style={{ color: CYAN }}>{t.custom ? "By agreement" : `${(t.yearly ?? 0).toLocaleString()} SAR`}</td>
                <td className="py-3 px-4 font-extrabold" style={{ color: NAVY }}>{t.custom ? "By agreement" : `${(t.year1 ?? 0).toLocaleString()} SAR`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-slate-500 mt-3">
        All plans include every feature without exception · 30-day free trial before any commitment
      </p>
    </Section>
  );
}

/* =================== Closing =================== */
function Closing() {
  return (
    <div style={{ background: "linear-gradient(160deg, #ffffff 0%, #F5F2FC 100%)", color: NAVY, padding: "34px" }}>
      <div className="text-center max-w-2xl mx-auto">
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", borderRadius: 18, background: "#ffffff", border: "1px solid rgba(212,175,55,.35)", boxShadow: "0 14px 32px -14px rgba(10,22,41,.30)" }}>
          <img src={LOGO_URL} alt="Jadara" style={{ height: 72, width: "auto", objectFit: "contain" }} />
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 800, marginTop: 10, fontFamily: "var(--font-display)", color: NAVY }}>
          Start your journey with <span style={{ color: CYAN }}>Jadara</span>
        </h2>
        <p style={{ fontSize: 14, color: "#475569", marginTop: 10, lineHeight: 1.9 }}>
          Try the platform free for 30 days and discover how your HR management transforms into one unified, premium digital ecosystem.
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
          <StoreButtons variant="light" isAr={false} />
        </div>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Social icon={Twitter} label="X · Twitter" href="https://x.com/jadaraHRM" />
          <Social icon={Linkedin} label="LinkedIn" href="https://www.linkedin.com/company/%D8%AC%D8%AF%D8%A7%D8%B1%D8%A9-%D9%84%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D9%88%D8%A7%D8%B1%D8%AF-%D8%A7%D9%84%D8%A8%D8%B4%D8%B1%D9%8A%D8%A9" />
          <Social icon={TiktokIcon} label="TikTok" href="https://www.tiktok.com/@jadarahr?_r=1&_t=ZS-99aHcundyoi" />
          <Social icon={Facebook} label="Facebook" href="https://www.facebook.com/share/1CEdfx8jV7/?mibextid=wwXIfr" />
          <Social icon={SnapchatIcon} label="Snapchat" href="https://snapchat.com/t/9UWDJAhl" />
          <Social icon={Globe} label="Website" href="https://jadara-hr.com" />
        </div>
        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="rounded-2xl overflow-hidden bg-white px-5 py-3 flex items-center justify-center border border-slate-200">
            <img src="https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/e133dacf0_IMG_0423.png" alt="Saudi Vision 2030" style={{ height: 72, width: "auto", objectFit: "contain" }} />
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>In alignment with Saudi Vision 2030</div>
        </div>
      </div>
      <div className="mt-10 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
        <div>© {new Date().getFullYear()} {PROVIDER.institutionNameEn} — All rights reserved</div>
        <div>National Unified Number: <span style={{ fontFamily: "ui-monospace, monospace", direction: "ltr" }}>{PROVIDER.unifiedNumber}</span></div>
      </div>
    </div>
  );
}

/* =================== Shared components =================== */
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