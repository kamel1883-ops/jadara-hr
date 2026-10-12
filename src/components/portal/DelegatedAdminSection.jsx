import React, { useState, useEffect, Suspense, lazy } from "react";
import { base44 } from "@/api/base44Client";
import { enablePortalEntities, disablePortalEntities } from "@/lib/portalEntityBridge";
import { Loader2 } from "lucide-react";

// صفحات لوحة الشركات — تُعرض للموظف المُفوّض كما هي بكامل مهامها وصلاحياتها.
const PAGES = {
  employees: lazy(() => import("@/pages/Employees")),
  recruitment: lazy(() => import("@/pages/Recruitment")),
  attendance: lazy(() => import("@/pages/Attendance")),
  "import-attendance": lazy(() => import("@/pages/ImportAttendance")),
  approvals: lazy(() => import("@/pages/Approvals")),
  leaves: lazy(() => import("@/pages/Leaves")),
  "business-trips": lazy(() => import("@/pages/BusinessTrips")),
  payroll: lazy(() => import("@/pages/Payroll")),
  gosi: lazy(() => import("@/pages/Gosi")),
  fleet: lazy(() => import("@/pages/Fleet")),
  "end-of-service": lazy(() => import("@/pages/EndOfService")),
  performance: lazy(() => import("@/pages/Performance")),
  training: lazy(() => import("@/pages/Training")),
  succession: lazy(() => import("@/pages/Succession")),
  "org-structure": lazy(() => import("@/pages/OrgStructure")),
  "workforce-planning": lazy(() => import("@/pages/WorkforcePlanning")),
  "exit-interviews": lazy(() => import("@/pages/ExitInterviews")),
  surveys: lazy(() => import("@/pages/Surveys")),
  investigations: lazy(() => import("@/pages/Investigations")),
  warnings: lazy(() => import("@/pages/Warnings")),
  decisions: lazy(() => import("@/pages/Decisions")),
  incentives: lazy(() => import("@/pages/Incentives")),
  analytics: lazy(() => import("@/pages/Analytics")),
  licenses: lazy(() => import("@/pages/Licenses")),
  "platform-subscriptions": lazy(() => import("@/pages/PlatformSubscriptions")),
  "customer-surveys": lazy(() => import("@/pages/CustomerSurveys")),
  settings: lazy(() => import("@/pages/Settings")),
};

export const hasAdminPage = (key) => !!PAGES[key];

const Spinner = () => (
  <div className="py-20 flex items-center justify-center text-muted-foreground">
    <Loader2 className="animate-spin" size={20} />
  </div>
);

// يفعّل جسر البيانات لجلسة الموظف المُفوّض ثم يعرض صفحة القسم الأصلية داخل البوابة.
export default function DelegatedAdminSection({ sectionKey, session, employee }) {
  const [ready, setReady] = useState(false);
  const Page = PAGES[sectionKey];

  useEffect(() => {
    enablePortalEntities(session, base44.functions.invoke.bind(base44.functions), employee);
    setReady(true);
    return () => { disablePortalEntities(); setReady(false); };
  }, [session, employee]);

  if (!Page) return null;
  if (!ready) return <Spinner />;

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/70 shadow-lg overflow-hidden">
      <Suspense fallback={<Spinner />}>
        <Page />
      </Suspense>
    </div>
  );
}