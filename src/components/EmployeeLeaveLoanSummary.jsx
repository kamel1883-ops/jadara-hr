import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { entitledLeaveDays, usedLeaveTotal, sumUsedDays, getOrgOnce, getEmployeeAnnualDays, openingUsedDays } from "@/lib/leaveBalance";
import { generateLeaveSettlement, generateLoanStatement } from "@/lib/docGenerators";
import { formatCurrency, leaveTypeLabel } from "@/lib/hr";
import { badge } from "@/lib/approvals";
import { Download, FileText, Loader2, RefreshCw, CalendarDays, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoredDocButton } from "@/components/VaultDocLink";
import { useI18n } from "@/lib/i18n";
import { leaveDocumentErrorText } from "@/lib/saveLeaveDocument";

export default function EmployeeLeaveLoanSummary({ employee }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    leaveTitle: "رصيد الإجازات (محسوب تلقائياً من تاريخ المباشرة)",
    entitled: "المستحق", used: "المستخدم", remaining: "المتبقي", day: "يوم",
    systemNote: (g) => g ? "30 يوماً/سنة عن كامل المدة (سياسة المنشأة) · تراكم يومي فعلي من تاريخ المباشرة" : "21 يوماً/سنة لأول 5 سنوات + 30 يوماً/سنة بعدها · تراكم يومي فعلي من تاريخ المباشرة",
    settlementsTitle: "سجل التصفيات", noSettlements: "لا توجد تصفيات بعد",
    days: (n) => `${n} يوم`, settlement: "المخالصة", generate: "توليد",
    usedBreak: (p, s) => `المستخدم = رصيد افتتاحي ${p} يوم (قبل النظام) + ${s} يوم معتمدة داخل النظام`,
    approvedOf: (a, r) => `معتمدة ${a} يوم من ${r} مطلوبة`,
    loansTitle: "السلف", noLoans: "لا توجد سلف",
    paid: (v) => `تم سداد ${v}`, rem: (v) => `متبقي ${v}`, closed: "مغلقة", statement: "الكشف",
  } : {
    leaveTitle: "Leave balance (auto-calculated from hire date)",
    entitled: "Accrued", used: "Used", remaining: "Remaining", day: "days",
    systemNote: (g) => g ? "30 days/yr for full tenure (org policy) · accrued daily from hire date" : "21 days/yr first 5 years + 30 days/yr after · accrued daily from hire date",
    settlementsTitle: "Settlements log", noSettlements: "No settlements yet",
    days: (n) => `${n} d`, settlement: "Settlement", generate: "Generate",
    usedBreak: (p, s) => `Used = ${p} d opening balance (pre-system) + ${s} d approved in-system`,
    approvedOf: (a, r) => `${a} d approved of ${r} d requested`,
    loansTitle: "Loans", noLoans: "No loans",
    paid: (v) => `Paid ${v}`, rem: (v) => `Remaining ${v}`, closed: "Closed", statement: "Statement",
  };

  const [leaves, setLeaves] = useState([]);
  const [loans, setLoans] = useState([]);
  const [org, setOrg] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    if (!employee?.id) return;
    const [lv, ln, o] = await Promise.all([
      base44.entities.LeaveRequest.filter({ employee_id: employee.id }, "-created_date", 300),
      base44.entities.LoanRequest.filter({ employee_id: employee.id }, "-created_date", 300),
      getOrgOnce(),
    ]);
    setLeaves(lv || []);
    setLoans(ln || []);
    setOrg(o);
  };

  // تصفير فوري عند تبديل الموظف — يمنع تسرب بيانات موظف سابق إلى ملف الموظف الجديد
  useEffect(() => {
    setLeaves([]);
    setLoans([]);
    if (employee?.id) load();
  }, [employee?.id]);

  const emp = employee;
  // رصيد الإجازات يعتمد اختيار المنشأة لكل موظف (21 أو 30) من ملف الموظف،
  // ويُلزم بـ30 بعد إكمال 5 سنوات خدمة. الخزنة أعلاه تتبع هذا الاختيار دائماً.
  const annualDays = getEmployeeAnnualDays(emp, org);
  const generous30 = annualDays === 30;
  const entitlement = entitledLeaveDays(emp, org);
  // المستخدم الكلي = الرصيد الافتتاحي (prior_used_leave، ثابت) + المعتمد داخل النظام (sumUsedDays).
  const used = usedLeaveTotal(emp, leaves);
  const remaining = Math.round((entitlement - used) * 100) / 100;
  // تفصيل «المستخدم» ليكون واضحاً أنه ليس أياماً أُخذت داخل النظام فقط —
  // الرصيد الافتتاحي يُحتسب فقط لمن رُفع ملفه عبر ملف إكسل، وإلا فقيمته صفر.
  const priorUsed = openingUsedDays(emp);
  const systemUsed = Math.round(sumUsedDays(leaves) * 10) / 10;

  const doneLeaves = leaves.filter((l) => l.status === "completed" || l.status === "paid");

  const regenLeave = async (l) => {
    setBusy("l" + l.id);
    try { await generateLeaveSettlement(l, emp, org, leaves); await load(); }
    catch (error) { alert(leaveDocumentErrorText(error, isAr)); }
    finally { setBusy(null); }
  };
  const genLoan = async (l) => {
    setBusy("loan" + l.id);
    try { await generateLoanStatement(l, employee, org); await load(); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      {/* رصيد الإجازات */}
      <div className="rounded-xl border border-border bg-white p-3">
        <div className="flex items-center gap-2 text-sm font-semibold mb-2">
          <CalendarDays size={16} className="text-violet-600" /> {t.leaveTitle}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label={t.entitled} value={`${entitlement} ${t.day}`} tone="slate" />
          <Stat label={t.used} value={`${used} ${t.day}`} tone="amber" />
          <Stat label={t.remaining} value={`${remaining} ${t.day}`} tone={remaining < 0 ? "rose" : "emerald"} />
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {t.systemNote(generous30)}
        </div>
        {priorUsed > 0 && (
          <div className="text-[11px] text-amber-600 mt-1">{t.usedBreak(priorUsed, systemUsed)}</div>
        )}
      </div>

      {/* سجل الإجازات المصفاة */}
      <div className="rounded-xl border border-border bg-white p-3">
        <div className="text-sm font-semibold mb-2">{t.settlementsTitle}</div>
        {doneLeaves.length === 0 ? (
          <div className="text-xs text-muted-foreground py-3 text-center">{t.noSettlements}</div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {doneLeaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/60 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{leaveTypeLabel(l.leave_type)} · {l.start_date} ← {l.end_date}</div>
                  <div className="text-muted-foreground">
                    {Number(l.balance_deducted) > 0 && Number(l.balance_deducted) !== Number(l.days_count)
                      ? t.approvedOf(Number(l.balance_deducted), Number(l.days_count) || 0)
                      : t.days(l.days_count)} · <span className={cn("px-1.5 rounded-full", badge(l.status).cls)}>{badge(l.status).label}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {l.settlement_pdf_url ? (
                    <StoredDocButton value={l.settlement_pdf_url}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">
                      <Download size={13} /> {t.settlement}
                    </StoredDocButton>
                  ) : (
                    <button type="button" onClick={() => regenLeave(l)} disabled={busy === "l" + l.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                      {busy === "l" + l.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {t.generate}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* السلف */}
      <div className="rounded-xl border border-border bg-white p-3">
        <div className="flex items-center gap-2 text-sm font-semibold mb-2">
          <Wallet size={16} className="text-amber-600" /> {t.loansTitle}
        </div>
        {loans.length === 0 ? (
          <div className="text-xs text-muted-foreground py-3 text-center">{t.noLoans}</div>
        ) : (
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {loans.map((l) => {
              const paid = Number(l.paid_amount) || 0;
              const rem = Math.max(0, (Number(l.amount) || 0) - paid);
              const closed = (Number(l.amount) || 0) > 0 && paid >= (Number(l.amount) || 0);
              return (
                <div key={l.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/60 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{formatCurrency(l.amount)}</div>
                    <div className="text-muted-foreground">
                      {t.paid(formatCurrency(paid))} · {t.rem(formatCurrency(rem))} ·{" "}
                      <span className={cn("px-1.5 rounded-full", closed ? "bg-rose-50 text-rose-600" : badge(l.status).cls)}>
                        {closed ? t.closed : badge(l.status).label}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {l.statement_pdf_url ? (
                      <StoredDocButton value={l.statement_pdf_url}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">
                        <FileText size={13} /> {t.statement}
                      </StoredDocButton>
                    ) : (
                      <button type="button" onClick={() => genLoan(l)} disabled={busy === "loan" + l.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                        {busy === "loan" + l.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {t.generate}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className={cn("rounded-lg py-2 px-1", tones[tone])}>
      <div className="text-[10px] opacity-80">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}