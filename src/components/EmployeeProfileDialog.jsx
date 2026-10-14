import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plane, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCurrency, statusEmployeeLabel, leaveTypeLabel, ticketEntitlementLabel, contractTypeLabel } from "@/lib/hr";
import { computeLeaveEntitlement, usedLeaveTotal, getEmployeeAnnualDays } from "@/lib/leaveBalance";
import { reasonMeta, computeSettlement } from "@/lib/eos";
import { badge } from "@/lib/approvals";
import EmployeePaidDocuments from "@/components/EmployeePaidDocuments";
import { StoredDocButton } from "@/components/VaultDocLink";
import EmployeePortalPasswordAdmin from "@/components/portal/EmployeePortalPasswordAdmin";
import { useI18n } from "@/lib/i18n";
import { PERMISSION_MODULES, parsePermissions } from "@/lib/employeePermissions";
import JobDescPrintActions from "@/components/docs/JobDescPrintActions";
import { useEnrichedEmployee } from "@/lib/vaultSensitive";

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-left">{value || "—"}</span>
    </div>
  );
}
function Block({ title, children }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="text-xs font-bold text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function EmployeeProfileDialog({ open, onClose, employee, org, onOpenTrips }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  // جلب البيانات الحساسة من الخزنة السعودية عند توفر emp_ref (وضع احتياطي للنمط القديم)
  const emp = useEnrichedEmployee(employee);
  const t = isAr ? {
    personal: "بيانات شخصية", employment: "بيانات التوظيف", salary: "الراتب والبدلات",
    leave: "الإجازات والتذاكر", eos: "نهاية الخدمة", trips: "انتدابات الموظف",
    leaveEnt: (n) => `المستحق (تناسبي): ${n}`, leaveUsed: (n) => `المستهلك: ${n}`, leaveRem: (n) => `المتبقي: ${n}`,
    eosAmount: "مكافأة نهاية الخدمة", eosYears: "سنوات الخدمة", eosFraction: "النسبة المطبقة",
    leaveCash: "تعويض الإجازات", ticket: "تعويض التذكرة", total: "إجمالي المخالصة",
    termination: "معلومات الإنهاء", none: "غير منتهٍ", openTrips: "فتح سجل الانتدابات",
    joinJourney: "رحلة العمل داخل المنشأة",
    archive: "أرشيف مستندات الموظف (سلف، إجازات، انتدابات، مخالصات)",
  } : {
    personal: "Personal", employment: "Employment", salary: "Salary & allowances",
    leave: "Leaves & tickets", eos: "End of service", trips: "Employee trips",
    leaveEnt: (n) => `Accrued (prorated): ${n}`, leaveUsed: (n) => `Used: ${n}`, leaveRem: (n) => `Remaining: ${n}`,
    eosAmount: "EOS award", eosYears: "Years of service", eosFraction: "Applied fraction",
    leaveCash: "Leave compensation", ticket: "Ticket compensation", total: "Total settlement",
    termination: "Termination info", none: "Active", openTrips: "Open trips log",
    joinJourney: "Employment journey",
    archive: "Employee documents archive (loans, leaves, trips, settlements)",
  };
  const [trips, setTrips] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [ticketValue, setTicketValue] = useState("");
  const [savingTicket, setSavingTicket] = useState(false);

  useEffect(() => { setTicketValue(employee?.ticket_value ?? ""); }, [employee?.id]);

  const saveTicket = async (v) => {
    if (!employee?.id) return;
    const num = Number(v) || 0;
    setSavingTicket(true);
    try { await base44.entities.Employee.update(employee.id, { ticket_value: num }); }
    catch (_) {} finally { setSavingTicket(false); }
  };

  useEffect(() => {
    // تصفير فوري عند تبديل الموظف — يمنع تسرب بيانات موظف سابق
    setTrips([]); setLeaves([]);
    if (!open || !employee?.id) return;
    base44.entities.BusinessTrip.filter({ employee_id: employee.id }, "-created_date", 500)
      .then(setTrips).catch(() => setTrips([]));
    base44.entities.LeaveRequest.filter({ employee_id: employee.id }, "-created_date", 500)
      .then(setLeaves).catch(() => setLeaves([]));
  }, [open, employee?.id]);

  const annualDays = getEmployeeAnnualDays(employee, org);
  const entitled = employee ? computeLeaveEntitlement(employee.hire_date, org, undefined, employee.annual_leave_entitlement) : 0;
  const used = usedLeaveTotal(employee, leaves);
  const remaining = Math.round((entitled - used) * 10) / 10;
  const eos = employee ? computeSettlement({
    employee, org,
    lastWorkingDate: employee.termination_date || new Date().toISOString().slice(0, 10),
    reason: employee.termination_reason && employee.termination_reason !== "none" ? employee.termination_reason : "end_of_contract",
    leaveBalance: remaining,
    ticketAmount: ticketValue,
  }) : null;
  const tmeta = employee?.termination_reason && employee.termination_reason !== "none" ? reasonMeta(employee.termination_reason) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{employee?.full_name}</span>
            {employee && <span className={cn("text-xs px-2 py-0.5 rounded-full", statusEmployeeLabel(employee.status).cls)}>{statusEmployeeLabel(employee.status).label}</span>}
            <button onClick={onOpenTrips} className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"><Plane size={12} /> {t.trips} ({trips.length})</button>
          </DialogTitle>
        </DialogHeader>

        {employee && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">{t.joinJourney}</div>
            <Block title={t.personal}>
              <Row label={employee.is_saudi ? (isAr ? "الهوية الوطنية" : "National ID") : (isAr ? "رقم الإقامة" : "Iqama number")} value={emp.national_id} />
              <Row label={isAr ? "تاريخ الميلاد" : "Birth date"} value={emp.birth_date} />
              <Row label={isAr ? "الجوال" : "Phone"} value={emp.phone} />
              <Row label={isAr ? "البريد" : "Email"} value={employee.email} />
            </Block>

            <Block title={t.employment}>
              <Row label={isAr ? "تاريخ المباشرة" : "Hire date"} value={employee.hire_date} />
              <Row label={isAr ? "الإدارة" : "Department"} value={employee.department} />
              <Row label={isAr ? "الفرع" : "Branch"} value={employee.branch_name} />
              <Row label={isAr ? "المسمى" : "Position"} value={employee.position} />
              <Row label={isAr ? "نوع العقد" : "Contract type"} value={contractTypeLabel(employee.contract_type)} />
              <Row label={isAr ? "بداية العقد" : "Contract start"} value={employee.contract_start_date} />
              <Row label={isAr ? "نهاية العقد" : "Contract end"} value={employee.contract_end_date} />
              <Row label={isAr ? "المدير المباشر" : "Manager"} value={employee.manager_id} />
              <Row label={isAr ? "أُعدّ بواسطة (الاسم)" : "Prepared by (name)"} value={employee.prepared_by_name || employee.hired_by_name} />
              <Row label={isAr ? "أُعدّ بواسطة (الهوية/الإقامة)" : "Prepared by (ID)"} value={employee.prepared_by_id} />
            </Block>

            <Block title={t.salary}>
              <Row label={isAr ? "الأساسي" : "Base"} value={formatCurrency(employee.base_salary)} />
              <Row label={isAr ? "بدل سكن" : "Housing"} value={formatCurrency(employee.housing_allowance)} />
              <Row label={isAr ? "بدل مواصلات" : "Transport"} value={formatCurrency(employee.transport_allowance)} />
              <Row label={isAr ? "بدلات أخرى" : "Other"} value={formatCurrency(employee.other_allowances)} />
              <div className="flex justify-between gap-3 pt-2 mt-1 border-t-2 border-violet-200">
                <span className="text-sm font-bold text-violet-700">{isAr ? "الإجمالي الشهري (أساس الحسابات)" : "Monthly gross (computation basis)"}</span>
                <span className="text-sm font-bold text-violet-700">{formatCurrency((Number(employee.base_salary)||0) + (Number(employee.housing_allowance)||0) + (Number(employee.transport_allowance)||0) + (Number(employee.other_allowances)||0))}</span>
              </div>
            </Block>

            <Block title={t.leave}>
              <Row label={isAr ? "نظام الإجازات السنوي" : "Annual leave system"} value={`${annualDays} ${isAr ? "يوم / سنة" : "days/yr"}`} />
              <Row label={t.leaveEnt(entitled?.toFixed(1))} value={`${entitled?.toFixed(1)}`} />
              <Row label={t.leaveUsed(used)} value={`${used}`} />
              <Row label={t.leaveRem(remaining)} value={`${remaining}`} />
              <Row label={isAr ? "استحقاق التذاكر" : "Ticket entitlement"} value={ticketEntitlementLabel(employee.ticket_entitlement)} />
              <div className="pt-1">
                <Label className="text-xs text-muted-foreground">{isAr ? "قيمة التذكرة (ريال — مفتوحة يحددها المسؤول)" : "Ticket value (SAR — open, set by admin)"}</Label>
                <Input type="number" dir="ltr" value={ticketValue} placeholder="0" onChange={(e) => setTicketValue(e.target.value)} onBlur={(e) => saveTicket(e.target.value)} className="mt-1" />
                {savingTicket && <div className="text-xs text-muted-foreground mt-1">{isAr ? "جارٍ حفظ قيمة التذكرة..." : "Saving ticket value..."}</div>}
              </div>
            </Block>

            <Block title={t.termination}>
              {tmeta ? (
                <>
                  <Row label={isAr ? "تاريخ الإنهاء" : "Termination date"} value={employee.termination_date} />
                  <Row label={isAr ? "السبب" : "Reason"} value={tmeta.label} />
                  <Row label={isAr ? "المادة" : "Article"} value={tmeta.article} />
                  {tmeta.note && <div className="text-xs text-muted-foreground mt-1">{tmeta.note}</div>}
                </>
              ) : <div className="text-sm text-emerald-600">{t.none}</div>}
            </Block>

            {(employee?.job_description || parsePermissions(employee?.permissions).length > 0) && (
              <Block title={isAr ? "الوصف الوظيفي والصلاحيات" : "Job description & permissions"}>
                {employee?.job_description && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-muted-foreground">{isAr ? "الوصف الوظيفي" : "Job description"}</div>
                      <JobDescPrintActions employee={employee} isAr={isAr} />
                    </div>
                    <div className="text-sm whitespace-pre-line">{employee.job_description}</div>
                  </div>
                )}
                {parsePermissions(employee?.permissions).length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{isAr ? "الوحدات المصرّح بها (توثيقية)" : "Allowed modules (descriptive)"}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {parsePermissions(employee?.permissions).map((k) => {
                        const m = PERMISSION_MODULES.find((x) => x.key === k);
                        return <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{m ? (isAr ? m.ar : m.en) : k}</span>;
                      })}
                    </div>
                  </div>
                )}
              </Block>
            )}

            <EmployeePortalPasswordAdmin employee={employee} />

            <Block title={t.archive}>
              <EmployeePaidDocuments employee={employee} org={org} />
            </Block>

            {eos && (
              <Block title={t.eos}>
                <Row label={isAr ? "أساس الحساب (الإجمالي الشهري)" : "Basis (monthly gross)"} value={formatCurrency(eos.monthlyWage)} />
                <Row label={isAr ? "الأجر اليومي (إجمالي ÷ 30)" : "Daily wage (gross ÷ 30)"} value={formatCurrency(eos.dailyWage)} />
                <Row label={t.eosYears} value={eos.years} />
                <Row label={t.eosFraction} value={eos.fractionLabel} />
                <Row label={t.eosAmount} value={formatCurrency(eos.amount)} />
                <Row label={t.leaveCash} value={formatCurrency(eos.leaveCash)} />
                <Row label={t.ticket} value={formatCurrency(eos.ticketAmount)} />
                <div className="flex justify-between gap-3 pt-2 mt-1 border-t border-border">
                  <span className="text-sm font-bold">{t.total}</span>
                  <span className="text-sm font-bold">{formatCurrency(eos.total_settlement)}</span>
                </div>
              </Block>
            )}

            <Block title={isAr ? "سجل الإجازات" : "Leave requests"}>
              {leaves.length === 0 ? (
                <div className="text-sm text-muted-foreground py-1">{isAr ? "لا توجد طلبات إجازات مسجّلة لهذا الموظف." : "No leave requests recorded for this employee."}</div>
              ) : leaves.map((r) => {
                const stages = [
                  { label: isAr ? "طلب الموظف" : "Employee request", who: r.employee_name, date: (r.created_date || "").slice(0, 10), note: r.reason, doc: r.medical_report_url, done: true },
                  { label: isAr ? "المدير المباشر" : "Direct manager", who: r.manager_name, date: r.manager_date, note: r.manager_note, done: r.manager_status === "approved", reject: r.manager_status === "rejected" },
                  { label: isAr ? "الموارد البشرية" : "HR", who: r.hr_name, date: r.hr_date, note: r.hr_note, doc: r.hr_document_url, done: r.hr_status === "approved", reject: r.hr_status === "rejected" },
                  { label: isAr ? "المالية" : "Finance", who: isAr ? "المالية" : "Finance", date: r.finance_paid_date, note: r.finance_note, doc: r.finance_proof_url, done: r.finance_status === "paid", reject: r.finance_status === "rejected" },
                ];
                return (
                  <div key={r.id} className="rounded-lg border border-border bg-white p-3 mb-2 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{leaveTypeLabel(r.leave_type)} · {r.start_date} ← {r.end_date} · {r.days_count} {isAr ? "يوم" : "d"}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", badge(r.status).cls)}>{badge(r.status).label}</span>
                    </div>
                    <ol className="mt-1 space-y-1">
                      {stages.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", s.reject ? "bg-rose-500" : s.done ? "bg-emerald-500" : "bg-slate-300")} />
                          <div className="flex-1">
                            <span className="font-medium">{s.label}</span>
                            {s.date && <span className="text-muted-foreground mx-1">· {s.date}</span>}
                            {s.who && <span className="text-muted-foreground">· {s.who}</span>}
                            {s.note && <div className="text-muted-foreground mt-0.5">{s.note}</div>}
                            {s.doc && <StoredDocButton value={s.doc} isAr={isAr} className="inline-flex items-center gap-1 text-blue-600 mt-0.5"><Download size={11} /> {isAr ? "مرفق" : "attachment"}</StoredDocButton>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </Block>
          </div>
        )}



      </DialogContent>
    </Dialog>
  );
}