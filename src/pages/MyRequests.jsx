import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import LoanRequestForm from "@/components/LoanRequestForm";
import BusinessTripForm from "@/components/BusinessTripForm";
import EquipmentRequestForm from "@/components/EquipmentRequestForm";
import ComplaintForm from "@/components/ComplaintForm";
import EmployeeClock from "@/components/EmployeeClock";
import EmployeeWarnings from "@/components/EmployeeWarnings";
import EmployeeInvestigations from "@/components/portal/EmployeeInvestigations";
import EmployeeDecisions from "@/components/portal/EmployeeDecisions";
import EmployeeIncentives from "@/components/portal/EmployeeIncentives";
import EmployeePerformance from "@/components/portal/EmployeePerformance";
import EmployeeTraining from "@/components/portal/EmployeeTraining";
import EmployeeDocuments from "@/components/portal/EmployeeDocuments";
import ApprovalsPortal from "@/pages/ApprovalsPortal";
import Logo from "@/components/Logo";
import PortalLanguageSelector from "@/components/portal/PortalLanguageSelector";
import PortalNotificationsBell from "@/components/portal/PortalNotificationsBell";
import PortalNotificationsSection from "@/components/portal/PortalNotificationsSection";
import PortalAuthCard from "@/components/portal/PortalAuthCard";
import { Image } from "@/components/ui/image";
import { usePortalI18n, usePortalT, portalDir } from "@/lib/portalI18n";
import { Button } from "@/components/ui/button";
import {
  CalendarPlus, Wallet, Loader2, BadgeCheck, Clock, Banknote, CalendarCheck, Plane, LogOut, Crown, ArrowRight, Building2, Package, MessageSquareWarning
} from "lucide-react";
import { cn } from "@/lib/utils";
import { leaveTypeLabel, formatCurrency, attendanceStatusLabel } from "@/lib/hr";
import { badge } from "@/lib/approvals";
import { entitledLeaveDays, usedLeaveTotal } from "@/lib/leaveBalance";
import { computeSettlement } from "@/lib/eos";
import { parsePermissions } from "@/lib/employeePermissions";
import { portalSession } from "@/lib/portalSession";
import IdleSessionGuard from "@/components/portal/IdleSessionGuard";
import JobDescPrintActions from "@/components/docs/JobDescPrintActions";
import JobDescriptionDoc from "@/components/docs/JobDescriptionDoc";
import DelegatedWorkspace from "@/components/portal/DelegatedWorkspace";
import AssistantAvatar from "@/components/AssistantAvatar";
import PullToRefresh from "@/components/PullToRefresh";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function MyRequests() {
  const { lang } = usePortalI18n();
  const isAr = lang === "ar";
  const t = usePortalT("portal");
  const tN = usePortalT("notifications");
  const tripStatus = isAr ? {
    draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600" },
    pending: { label: "قيد الاعتماد", cls: "bg-amber-50 text-amber-600" },
    approved: { label: "معتمدة", cls: "bg-blue-50 text-blue-600" },
    in_progress: { label: "قيد التنفيذ", cls: "bg-indigo-50 text-indigo-600" },
    completed: { label: "مكتملة", cls: "bg-emerald-50 text-emerald-600" },
    cancelled: { label: "ملغاة", cls: "bg-rose-50 text-rose-600" },
    rejected: { label: "مرفوضة", cls: "bg-rose-50 text-rose-600" },
  } : {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
    pending: { label: "Pending", cls: "bg-amber-50 text-amber-600" },
    approved: { label: "Approved", cls: "bg-blue-50 text-blue-600" },
    in_progress: { label: "In progress", cls: "bg-indigo-50 text-indigo-600" },
    completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-600" },
    cancelled: { label: "Cancelled", cls: "bg-rose-50 text-rose-600" },
    rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-600" },
  };

  const [session, setSession] = useState(() => portalSession.load());
  const [employee, setEmployee] = useState(null);
  const [org, setOrg] = useState(null);
  const [branch, setBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loans, setLoans] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [trips, setTrips] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [todayAtt, setTodayAtt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [equipmentReqs, setEquipmentReqs] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const view = location.pathname === "/portal/notifications" ? "notifications" : location.pathname === "/portal/approvals" ? "approvals" : "self";

  // رسالة الحالة (تُستخدم في load أيضاً)
  const [signInMsg, setSignInMsg] = useState({ type: "", text: "" });


  const load = useCallback(async (sess = session) => {
    if (!sess) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("portalData", {
        token: sess.token, employee_id: sess.employee_id, action: "fetch",
      });
      const data = res?.data || res;
      if (!data?.ok) {
        if (data?.error === "invalid_session") { handlePortalLogout(); return; }
        setSignInMsg({ type: "err", text: data?.error || t.loading });
        setLoading(false); return;
      }
      setEmployee(data.employee); setOrg(data.org); setBranch(data.branch || null); setBranches(data.branches || []);
      setLeaves(data.leaves || []); setLoans(data.loans || []);
      setAttendance(data.attendance || []); setTrips(data.trips || []);
      setWarnings(data.warnings || []);
      setReviews(data.reviews || []);
      setTrainings(data.trainings || []);
      setSettlements(data.settlements || []);
      setDecisions(data.decisions || []);
      setIncentives(data.incentives || []);
      setEquipmentReqs(data.equipmentRequests || []);
      setComplaints(data.complaints || []);
      setInvestigations(data.investigations || []);
      setTodayAtt(data.attendance?.find((a) => a.date === localToday()) || null);
    } catch (e) {
      setSignInMsg({ type: "err", text: e?.message || t.loading });
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    load(session);
  }, [session, load]);

  // المالك لديه بوابة مستقلة — حوّله تلقائياً من بوابة الموظف إلى بوابة المالك.
  useEffect(() => {
    if (employee && employee.role_level === "owner") {
      window.location.href = "/owner-portal";
    }
  }, [employee]);

  const handlePortalLogout = () => {
    portalSession.clear();
    setSession(null);
    setEmployee(null); setOrg(null); setBranch(null); setBranches([]);
    setLeaves([]); setLoans([]); setAttendance([]); setTrips([]); setWarnings([]); setReviews([]); setTrainings([]); setSettlements([]);
    setInvestigations([]);
    setDecisions([]); setIncentives([]); setEquipmentReqs([]); setComplaints([]);
  };

  const exitToLanding = () => {
    portalSession.clear();
    // نبقى داخل بوابة الموظف (شاشة الدخول) دون العودة لصفحة الهبوط العامة.
    window.location.href = "/portal";
  };

  const portalArgs = session
    ? { token: session.token, employee_id: session.employee_id }
    : {};

  const portalCreateLeave = async (payload) => {
    const res = await base44.functions.invoke("portalData", {
      ...portalArgs, action: "create_leave", payload,
    });
    const data = res?.data || res;
    if (!data?.ok) throw new Error(data?.error || "fail");
    // يظهر الطلب فوراً في سجل الموظف قبل انتهاء إعادة التحميل
    if (data.leave) setLeaves((prev) => [data.leave, ...prev]);
    return data.leave;
  };
  const portalCreateLoan = async (payload) => {
    const res = await base44.functions.invoke("portalData", {
      ...portalArgs, action: "create_loan", payload,
    });
    const data = res?.data || res;
    if (!data?.ok) throw new Error(data?.error || "fail");
    if (data.loan) setLoans((prev) => [data.loan, ...prev]);
    return data.loan;
  };
  const portalCreateTrip = async (payload) => {
    const res = await base44.functions.invoke("portalData", {
      ...portalArgs, action: "create_trip", payload,
    });
    const data = res?.data || res;
    if (!data?.ok) throw new Error(data?.error || "fail");
    if (data.trip) setTrips((prev) => [data.trip, ...prev]);
    return data.trip;
  };
  const portalCreateEquipment = async (payload) => {
    const res = await base44.functions.invoke("portalData", {
      ...portalArgs, action: "create_equipment", payload,
    });
    const data = res?.data || res;
    if (!data?.ok) throw new Error(data?.error || "fail");
    if (data.equipment) setEquipmentReqs((prev) => [data.equipment, ...prev]);
    return data.equipment;
  };
  const portalCreateComplaint = async (payload) => {
    const res = await base44.functions.invoke("portalData", {
      ...portalArgs, action: "create_complaint", payload,
    });
    const data = res?.data || res;
    if (!data?.ok) throw new Error(data?.error || "fail");
    if (data.complaint) setComplaints((prev) => [data.complaint, ...prev]);
    return data.complaint;
  };

  const clockApi = {
    today: async () => {
      const res = await base44.functions.invoke("portalData", { ...portalArgs, action: "today_attendance" });
      return res?.data?.today || null;
    },
    clockIn: async (lat, lng, accuracy, branchId) => {
      const res = await base44.functions.invoke("portalData", {
        ...portalArgs, action: "clock_in", check_in: nowHM(), lat, lng, accuracy, branch_id: branchId || "",
      });
      const data = res?.data || res;
      if (!data?.ok) {
        if (data?.error === "out_of_range") {
          throw new Error(isAr
            ? `موقعك بعيد عن مقر العمل (${data.dist ?? "?"}م) — خارج النطاق المحدد (${data.radius ?? ""}م)`
            : `You are ${data.dist ?? "?"}m from the workplace — outside the allowed ${data.radius ?? ""}m radius`);
        }
        throw new Error(data?.error || "fail");
      }
      setTodayAtt(data.today);
    },
    clockOut: async (workHours) => {
      const res = await base44.functions.invoke("portalData", {
        ...portalArgs, action: "clock_out", check_out: nowHM(), work_hours: workHours,
      });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || "fail");
      setTodayAtt(data.today);
    },
    breakStart: async () => {
      const res = await base44.functions.invoke("portalData", {
        ...portalArgs, action: "break_start", break_start: nowHM(),
      });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || "fail");
      setTodayAtt(data.today);
    },
    breakEnd: async () => {
      const res = await base44.functions.invoke("portalData", {
        ...portalArgs, action: "break_end", break_end: nowHM(),
      });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || "fail");
      setTodayAtt(data.today);
    },
  };

  const rejectReason = (r) => {
    if (!r || r.status !== "rejected") return null;
    if (r.finance_status === "rejected" && r.finance_note) return { who: t.rejectByFin, text: r.finance_note };
    if (r.hr_status === "rejected" && r.hr_note) return { who: t.rejectByHr, text: r.hr_note };
    if (r.manager_status === "rejected" && r.manager_note) return { who: t.rejectByMgr, text: r.manager_note };
    const text = r.finance_note || r.hr_note || r.manager_note || r.notes || "";
    return text ? { who: "", text } : null;
  };

  let content;
  if (!session) {
    content = (
      <div>
        <PageHeader title={t.title} subtitle={t.gSubtitle} />
        <PortalAuthCard
          onAuthenticated={(s) => { portalSession.save(s); setSession(s); }}
        />
      </div>
    );
  } else if (loading || !employee) {
    content = <div className="min-h-[70vh] flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" size={20} /> {t.loading}</div>;
  } else if (employee.role_level === "owner") {
    content = (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin" size={24} />
        <p className="text-sm">{t.redirectingOwner}</p>
      </div>
    );
  } else {
    const hireDate = employee.hire_date ? new Date(employee.hire_date) : null;
    const serviceYears = hireDate ? Math.floor((Date.now() - hireDate.getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
    const gross =
      (employee.base_salary || 0) + (employee.housing_allowance || 0) +
      (employee.transport_allowance || 0) + (employee.other_allowances || 0);
    const entitled = entitledLeaveDays(employee, org);
    // المستخدم الكلي = الرصيد الافتتاحي (prior_used_leave) + المعتمد داخل النظام.
    const used = usedLeaveTotal(employee, leaves);
    // المتبقي بقيمته الصريحة — سالب إذا تجاوز الموظف مستحقه (يظهر للطرفين دون تصفير)
    const remaining = Math.round((entitled - used) * 10) / 10;
    const ticketLabel = employee.ticket_entitlement === "yearly" ? t.ticketYearly : employee.ticket_entitlement === "biennial" ? t.ticketBiennial : t.ticketNone;

    const hasApprovals = Boolean(employee.is_approver_manager || employee.is_approver_finance);
    const isOwner = employee.role_level === "owner";
    // مصفوفة الصلاحيات — تتحكم بإظهار أقسام البوابة للموظف. فارغة = كل الأقسام (افتراضي).
    const perms = parsePermissions(employee.permissions);
    const can = (key) => perms.length === 0 || perms.includes(key);
    content = (
          <div>
          {/* بطاقة المنشأة + الصلاحيات */}
          <div className={"rounded-2xl border p-5 mb-6 overflow-hidden " + (isOwner ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-violet-50" : "bg-white border-border")}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
              {org?.logo_url ? (
                <Image src={org.logo_url} fittingType="fit" className="h-14 w-14 rounded-xl bg-slate-50 p-1.5 border border-border shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <Building2 size={26} className="text-violet-600" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{t.orgLabel}</div>
                <div className="text-lg font-bold truncate">{org?.name || "—"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {employee.employee_number} · {employee.position} · {employee.department || ""}
                </div>
              </div>
            </div>
            {(hasApprovals) && (
              <div className="flex flex-wrap gap-2">
                {employee.is_approver_manager && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <BadgeCheck size={14} /> {t.delegatedManager}
                  </span>
                )}
                {employee.is_approver_finance && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    <BadgeCheck size={14} /> {t.delegatedFinance}
                  </span>
                )}
                {employee.is_approver_hr && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                    <BadgeCheck size={14} /> {t.delegatedHr}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-5 flex-wrap rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg p-1.5">
          <button type="button" onClick={() => navigate("/portal")} className={cn("px-4 py-2.5 text-sm font-medium rounded-xl transition", view === "self" ? "bg-violet-500/15 text-violet-700" : "text-muted-foreground hover:text-foreground hover:bg-white/50")}>{t.selfTab}</button>
          <button type="button" onClick={() => navigate("/portal/notifications")} className={cn("px-4 py-2.5 text-sm font-medium rounded-xl transition", view === "notifications" ? "bg-violet-500/15 text-violet-700" : "text-muted-foreground hover:text-foreground hover:bg-white/50")}>{tN.tabNotifications}</button>
          {hasApprovals && (
            <button type="button" onClick={() => navigate("/portal/approvals")} className={cn("px-4 py-2.5 text-sm font-medium rounded-xl transition", view === "approvals" ? "bg-violet-500/15 text-violet-700" : "text-muted-foreground hover:text-foreground hover:bg-white/50")}>{t.approvalsTab}</button>
          )}
        </div>
        {hasApprovals && view === "approvals" ? (
          <ApprovalsPortal portalSession={session} />
        ) : view === "notifications" ? (
          <PortalNotificationsSection session={session} />
        ) : (
          <>
            <PageHeader
              title={t.title}
              subtitle={`${employee.full_name || ""}`}
              action={
                <div className="flex flex-wrap gap-2">
                   {can("leaves") && <Button onClick={() => setLeaveOpen(true)} variant="outline" className="gap-2"><CalendarPlus size={18} /> {t.leaveBtn}</Button>}
                   <Button onClick={() => setLoanOpen(true)} variant="outline" className="gap-2"><Wallet size={18} /> {t.loanBtn}</Button>
                   {can("business-trips") && <Button onClick={() => setTripOpen(true)} className="gap-2"><Plane size={18} /> {t.tripBtn}</Button>}
                   <Button onClick={() => setEqOpen(true)} variant="outline" className="gap-2"><Package size={18} /> {isAr ? "طلب عهدة" : "Equipment"}</Button>
                   <Button onClick={() => setCompOpen(true)} variant="outline" className="gap-2"><MessageSquareWarning size={18} /> {isAr ? "رفع شكوى" : "Complaint"}</Button>
                 </div>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <InfoCard icon={Clock} label={t.yearsLabel} value={t.yearsVal(serviceYears)} sub={employee.hire_date ? t.yearsSub(employee.hire_date) : ""} />
              <InfoCard icon={CalendarCheck} label={t.leaveLabel} value={t.leaveVal(remaining)} sub={t.leaveSub(entitled, used)} />
              <InfoCard icon={Banknote} label={t.grossLabel} value={formatCurrency(gross)} sub={t.grossSub(formatCurrency(employee.base_salary || 0))} />
              <InfoCard icon={BadgeCheck} label={t.ticketLabel} value={ticketLabel} sub={employee.is_saudi ? t.ticketSaudi : t.ticketExpat} />
            </div>

            {can("attendance") && (
              <EmployeeClock employee={employee} org={org} branch={branch} branches={branches} onChanged={() => load(session)} clockApi={clockApi} initialToday={todayAtt} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <SideCard title={t.detailTitle}>
                <DLine label={t.dPosition} value={employee.position} />
                <DLine label={t.dDept} value={employee.department} />
                <DLine label={t.dHire} value={employee.hire_date} />
                <DLine label={t.dService} value={t.yearsVal(serviceYears)} />
                <DLine label={t.dContract} value={employee.contract_type === "full_time" ? t.contractFT : employee.contract_type === "part_time" ? t.contractPT : t.contractC} />
                <DLine label={t.dBase} value={formatCurrency(employee.base_salary || 0)} />
                <DLine label={t.dHousing} value={formatCurrency(employee.housing_allowance || 0)} />
                <DLine label={t.dTransport} value={formatCurrency(employee.transport_allowance || 0)} />
                <DLine label={t.dOther} value={formatCurrency(employee.other_allowances || 0)} />
                <DLine label={t.dTotal} value={formatCurrency(gross)} strong />
              </SideCard>

              <div className="lg:col-span-2">
                <SideCard title={t.attTitle}>
                  {!can("attendance") ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">{isAr ? "لا تملك صلاحية عرض الحضور" : "No attendance access"}</div>
                  ) : attendance.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">{t.attEmpty}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground">
                            <th className="text-right font-medium pb-2">{t.thDate}</th>
                            <th className="text-right font-medium pb-2">{t.thIn}</th>
                            <th className="text-right font-medium pb-2">{t.thOut}</th>
                            <th className="text-right font-medium pb-2">{t.thHours}</th>
                            <th className="text-right font-medium pb-2">{t.thStatus}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map((a) => {
                            const st = attendanceStatusLabel(a.status);
                            return (
                              <tr key={a.id} className="border-t border-border">
                                <td className="py-2">{a.date}</td>
                                <td className="py-2">{a.check_in || "—"}</td>
                                <td className="py-2">{a.check_out || "—"}</td>
                                <td className="py-2">{a.work_hours || "—"}</td>
                                <td className="py-2"><span className={cn("text-xs px-2 py-0.5 rounded-full", st.cls)}>{st.label}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SideCard>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {can("leaves") && (
              <Section title={t.leavesTitle}>
                {leaves.length === 0 ? <Empty text={t.noLeaves} /> : leaves.map((r) => (
                  <Row key={r.id}>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{leaveTypeLabel(r.leave_type)}</span>
                        {r.is_full_clearance && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{t.fullClear}</span>}
                        {r.medical_report_url && (
                          <a href={r.medical_report_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{t.medReport}</a>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{r.start_date} ← {r.end_date} · {t.days(Number(r.balance_deducted) > 0 ? Number(r.balance_deducted) : r.days_count)}</div>
                      {Number(r.balance_deducted) > 0 && Number(r.balance_deducted) < Number(r.days_count) && (
                        <div className="text-[11px] text-violet-600 mt-0.5">{isAr ? `المعتمد: ${Number(r.balance_deducted)} من ${Number(r.days_count)} يوم` : `Approved: ${Number(r.balance_deducted)} of ${Number(r.days_count)} days`}</div>
                      )}
                      <RequestDate r={r} isAr={isAr} />
                      {r.status === "rejected" && <RejectedNote reason={rejectReason(r)} t={t} />}
                    </div>
                    <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", badge(r.status).cls)}>{badge(r.status).label}</span>
                  </Row>
                ))}
              </Section>
              )}
              <Section title={t.loansTitle}>
                {loans.length === 0 ? <Empty text={t.noLoans} /> : loans.map((r) => (
                  <Row key={r.id}>
                    <div>
                      <div className="font-medium text-sm">{Number(r.amount).toLocaleString()} {t.sar}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t.loanInst(r.installment_count)} · {t.loanMonthly(formatCurrency(r.monthly_installment))}</div>
                      <RequestDate r={r} isAr={isAr} />
                      {Number(r.requested_amount) > 0 && Number(r.requested_amount) !== Number(r.amount) && (
                        <div className="text-[11px] text-violet-600 mt-0.5">
                          {isAr ? `المبلغ المطلوب: ${formatCurrency(r.requested_amount)} — المعتمد: ${formatCurrency(r.amount)}` : `Requested: ${formatCurrency(r.requested_amount)} — Approved: ${formatCurrency(r.amount)}`}
                        </div>
                      )}
                      {(r.status === "paid" || r.status === "completed") && (() => {
                        const amt = Number(r.amount) || 0;
                        const paid = Number(r.paid_amount) || 0;
                        const remaining = Math.max(0, amt - paid);
                        const closed = amt > 0 && paid >= amt;
                        return (
                          <div className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-muted-foreground">{isAr ? "الإجمالي" : "Total"}: <b className="text-foreground">{formatCurrency(amt)}</b></span>
                            <span className="text-emerald-600">{isAr ? "مسدد" : "Paid"}: <b>{formatCurrency(paid)}</b></span>
                            <span className="text-amber-600">{isAr ? "متبقي" : "Remaining"}: <b>{formatCurrency(remaining)}</b></span>
                            <span className={cn("px-1.5 py-0.5 rounded-full", closed ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>{closed ? (isAr ? "مغلقة" : "Closed") : (isAr ? "نشطة" : "Active")}</span>
                          </div>
                        );
                      })()}
                      {r.status === "rejected" && <RejectedNote reason={rejectReason(r)} t={t} />}
                    </div>
                    <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", badge(r.status).cls)}>{badge(r.status).label}</span>
                  </Row>
                ))}
              </Section>
            </div>

            <div className="mt-6">
              {can("business-trips") && (
              <Section title={t.tripsTitle}>
                {trips.length === 0 ? <Empty text={t.noTrips} /> : trips.map((r) => {
                  const st = tripStatus[r.status] || tripStatus.pending;
                  return (
                    <Row key={r.id}>
                      <div>
                        <div className="font-medium text-sm">{r.trip_type === "external" ? t.tripExternal : t.tripInternal} — {r.destination || "—"}</div>
                        <div className="text-xs text-muted-foreground mt-1">{r.start_date} ← {r.end_date} · {t.days(r.days_count)}</div>
                        {r.status === "rejected" && <RejectedNote reason={rejectReason(r)} t={t} />}
                      </div>
                      <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", st.cls)}>{st.label}</span>
                    </Row>
                  );
                })}
              </Section>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Section title={isAr ? "طلبات العهد" : "Equipment requests"}>
                {equipmentReqs.length === 0 ? <Empty text={isAr ? "لا توجد طلبات عهد" : "No equipment requests"} /> : equipmentReqs.map((r) => {
                  const st = (s) => {
                    const m = { pending_manager: { label: isAr ? "بانتظار المدير" : "Awaiting manager", cls: "bg-amber-50 text-amber-600" }, manager_approved: { label: isAr ? "بانتظار الموارد" : "Awaiting HR", cls: "bg-blue-50 text-blue-600" }, completed: { label: isAr ? "تم التسليم ✅" : "Delivered ✅", cls: "bg-emerald-100 text-emerald-700" }, rejected: { label: isAr ? "مرفوض" : "Rejected", cls: "bg-rose-50 text-rose-600" } };
                    return m[s] || { label: s || "—", cls: "bg-slate-100 text-slate-600" };
                  };
                  const b = st(r.status);
                  return (
                    <Row key={r.id}>
                      <div>
                        <div className="font-medium text-sm">{r.item_label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{r.reason}</div>
                        <RequestDate r={r} isAr={isAr} />
                        {r.status === "rejected" && <RejectedNote reason={{ who: isAr ? "الموارد البشرية" : "HR", text: r.hr_note || r.manager_note || "" }} t={t} />}
                      </div>
                      <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", b.cls)}>{b.label}</span>
                    </Row>
                  );
                })}
              </Section>
              <Section title={isAr ? "الشكاوى" : "Complaints"}>
                {complaints.length === 0 ? <Empty text={isAr ? "لا توجد شكاوى" : "No complaints"} /> : complaints.map((r) => {
                  const st = (s) => {
                    const m = { pending_manager: { label: isAr ? "بانتظار المدير" : "Awaiting manager", cls: "bg-amber-50 text-amber-600" }, manager_approved: { label: isAr ? "بانتظار الموارد" : "Awaiting HR", cls: "bg-blue-50 text-blue-600" }, resolved: { label: isAr ? "تم الحل ✅" : "Resolved ✅", cls: "bg-emerald-100 text-emerald-700" }, rejected: { label: isAr ? "مرفوضة" : "Rejected", cls: "bg-rose-50 text-rose-600" } };
                    return m[s] || { label: s || "—", cls: "bg-slate-100 text-slate-600" };
                  };
                  const b = st(r.status);
                  return (
                    <Row key={r.id}>
                      <div>
                        <div className="font-medium text-sm">{r.custom_type || r.complaint_type}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</div>
                        <RequestDate r={{ ...r, request_date: r.submitted_date }} isAr={isAr} />
                        {r.status === "resolved" && r.hr_resolution && <div className="text-[11px] text-emerald-700 mt-1">{isAr ? "الحل:" : "Resolution:"} {r.hr_resolution}</div>}
                        {r.status === "rejected" && <RejectedNote reason={{ who: isAr ? "الموارد البشرية" : "HR", text: r.hr_resolution || r.manager_note || "" }} t={t} />}
                      </div>
                      <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", b.cls)}>{b.label}</span>
                    </Row>
                  );
                })}
              </Section>
            </div>

            <LeaveRequestForm open={leaveOpen} onClose={() => setLeaveOpen(false)} onSaved={() => load(session)} employees={[employee]} currentUserEmployee={employee} portalCreate={portalCreateLeave} />
            <LoanRequestForm open={loanOpen} onClose={() => setLoanOpen(false)} onSaved={() => load(session)} employee={employee} portalCreate={portalCreateLoan} />
            <BusinessTripForm open={tripOpen} onClose={() => setTripOpen(false)} onSaved={() => load(session)} employees={[employee]} currentUserEmployee={employee} portalCreate={portalCreateTrip} />
            <EquipmentRequestForm open={eqOpen} onClose={() => setEqOpen(false)} onSaved={() => load(session)} employee={employee} portalCreate={portalCreateEquipment} />
            <ComplaintForm open={compOpen} onClose={() => setCompOpen(false)} onSaved={() => load(session)} employee={employee} portalCreate={portalCreateComplaint} />

            {can("performance") && (
            <div className="mt-6">
              <EmployeePerformance reviews={reviews} />
            </div>
            )}

            {can("training") && (
            <div className="mt-6">
              <EmployeeTraining trainings={trainings} />
            </div>
            )}

            <div className="mt-6">
              <EmployeeDocuments loans={loans} leaves={leaves} settlements={settlements} org={org} />
            </div>
            <EmployeeInvestigations items={investigations} isAr={isAr} portalArgs={portalArgs} onDone={() => load(session)} />
            {can("warnings") && (
            <div className="mt-6">
              <EmployeeWarnings employee={employee} warnings={warnings} />
            </div>
            )}
            {employee?.job_description && String(employee.job_description).trim() && (
              <div className="mt-6">
                <SideCard title={isAr ? "الوصف الوظيفي" : "Job description"}>
                  <div className="flex justify-end mb-3">
                    <JobDescPrintActions employee={employee} isAr={isAr} />
                  </div>
                  <JobDescriptionDoc employee={employee} isAr={isAr} />
                </SideCard>
              </div>
            )}
            {can("end-of-service") && (
              <div className="mt-6">
                <SideCard title={isAr ? "تقدير نهاية الخدمة" : "End of service estimate"}>
                  {(() => {
                    const eosEst = computeSettlement({
                      employee, org,
                      lastWorkingDate: employee.termination_date || new Date().toISOString().slice(0, 10),
                      reason: employee.termination_reason && employee.termination_reason !== "none" ? employee.termination_reason : "end_of_contract",
                      leaveBalance: remaining,
                      ticketAmount: Number(employee.ticket_value) || 0,
                    });
                    return (
                      <div className="space-y-1.5 text-sm">
                        <DLine label={isAr ? "أساس الحساب" : "Basis"} value={formatCurrency(eosEst.monthlyWage)} />
                        <DLine label={isAr ? "سنوات الخدمة" : "Years"} value={eosEst.years} />
                        <DLine label={isAr ? "النسبة" : "Fraction"} value={eosEst.fractionLabel} />
                        <DLine label={isAr ? "مكافأة نهاية الخدمة" : "EOS award"} value={formatCurrency(eosEst.amount)} />
                        <DLine label={isAr ? "تعويض الإجازات" : "Leave cash"} value={formatCurrency(eosEst.leaveCash)} />
                        <DLine label={isAr ? "تعويض التذكرة" : "Ticket"} value={formatCurrency(eosEst.ticketAmount)} />
                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border">
                          <span className="font-bold">{isAr ? "الإجمالي التقديري" : "Estimated total"}</span>
                          <span className="font-bold">{formatCurrency(eosEst.total_settlement)}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">{isAr ? "قيمة تقديرية للاطلاع فقط — تُحتسب عند الإنهاء فعلياً" : "Estimate for viewing only — finalized on termination"}</div>
                      </div>
                    );
                  })()}
                </SideCard>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {can("decisions") && <EmployeeDecisions items={decisions} session={session} onReload={() => load(session)} />}
              {can("incentives") && <EmployeeIncentives items={incentives} session={session} onReload={() => load(session)} />}
            </div>
            <DelegatedWorkspace perms={perms} session={session} employee={employee} isAr={isAr} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={portalDir(lang)}>
      {session && <IdleSessionGuard onTimeout={exitToLanding} />}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#F6F3FC] to-[#EFE9F8] text-[#2A2340] border-b border-[#E2D6F4]" style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/portal"><Logo tone="dark" size={38} /></Link>
            <div className="hidden sm:block text-xs text-[#6B5E8C] leading-tight">
              {t.brandSub}<br />
              <span className="text-[#8B7AB8]">{t.brandOnly}</span>
            </div>
            {session && org && (
              <div className="hidden sm:flex items-center gap-2 ps-3 border-s border-[#E2D6F4]">
                {org.logo_url ? <Image src={org.logo_url} fittingType="fit" className="h-8 w-8 rounded bg-white/90 p-0.5 border border-[#E8DEF7]" /> : null}
                <span className="text-sm font-semibold text-[#2A2340] truncate max-w-[160px]" title={org.name}>{org.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1.5 text-sm text-[#6B5E8C] hover:text-[#2A2340] px-3 py-2 rounded-lg hover:bg-white/60 transition">
              <ArrowRight size={16} style={{ transform: portalDir(lang) === "rtl" ? "none" : "scaleX(-1)" }} /> {t.backToSite}
            </Link>
            <PortalNotificationsBell session={session} onViewAll={() => navigate("/portal/notifications")} tone="dark" align={portalDir(lang) === "rtl" ? "left" : "right"} />
            <PortalLanguageSelector />
            {session && (
              <button onClick={exitToLanding} className="flex items-center gap-2 text-sm text-[#6B5E8C] hover:text-[#2A2340] px-3 py-2 rounded-lg hover:bg-white/60 transition">
                <LogOut size={18} /> {t.logout}
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.10] via-indigo-500/[0.05] to-amber-200/[0.10] dark:from-violet-500/[0.14] dark:via-indigo-500/[0.10] dark:to-amber-500/[0.08]" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full bg-violet-500/[0.10] dark:bg-violet-500/[0.16] blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 w-[380px] h-[380px] rounded-full bg-amber-400/[0.10] dark:bg-amber-500/[0.10] blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07] dark:opacity-[0.10]" aria-hidden="true">
          <Crown size={400} className="text-amber-500 dark:text-amber-400" strokeWidth={0.8} />
        </div>
        <div className="relative"><PullToRefresh onRefresh={() => load(session)}>{content}</PullToRefresh></div>
        <AssistantAvatar mode={session ? "employee" : "public"} session={session} tone="dark" lang={lang} />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-violet-600" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold truncate">{value}</div>
        {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
function SideCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}
function DLine({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(strong && "font-bold")}>{value || "—"}</span>
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden">{children}</div>
    </div>
  );
}
function Row({ children }) {
  return <div className="p-4 flex items-center justify-between gap-3">{children}</div>;
}
function Empty({ text }) {
  return <div className="p-8 text-center text-muted-foreground text-sm">{text}</div>;
}
function RequestDate({ r, isAr }) {
  const d = r.request_date || (r.created_date || "").slice(0, 10);
  if (!d) return null;
  return (
    <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
      {isAr ? "تاريخ تقديم الطلب" : "Request date"}: <b className="text-foreground">{d}</b>
    </div>
  );
}
function RejectedNote({ reason, t }) {
  if (!reason) return null;
  return (
    <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs">
      <div className="font-semibold text-rose-700 mb-0.5">{t.rejectReason}{reason.who ? ` — ${reason.who}` : ""}</div>
      <div className="text-rose-600 leading-relaxed whitespace-pre-wrap">{reason.text}</div>
      <div className="text-rose-400 mt-1.5">{t.resubmitHint}</div>
    </div>
  );
}