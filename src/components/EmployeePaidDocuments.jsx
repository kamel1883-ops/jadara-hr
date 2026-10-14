import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { Download, FileText, Printer, Plane, Wallet, CalendarCheck, FileCheck2 } from "lucide-react";
import SettlementSheet from "@/components/SettlementSheet";
import { leaveTypeLabel, formatCurrency } from "@/lib/hr";
import { reasonMeta } from "@/lib/eos";
import { useI18n } from "@/lib/i18n";
import { StoredDocButton } from "@/components/VaultDocLink";

// أرشيف مستندات الموظف المالية — سلف، إجازات، انتدابات، مخالصات نهاية الخدمة
// يظهر لجميع الموظفين (نشطين وغير نشطين) طالما توجد مستندات
export default function EmployeePaidDocuments({ employee, org }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [leaves, setLeaves] = useState([]);
  const [sets, setSets] = useState([]);
  const [loans, setLoans] = useState([]);
  const [trips, setTrips] = useState([]);
  const [printing, setPrinting] = useState(null);

  // تصفير فوري عند تبديل الموظف — يمنع تسرب مستندات موظف سابق إلى ملف الموظف الجديد
  useEffect(() => {
    setLeaves([]); setSets([]); setLoans([]); setTrips([]);
    if (!employee?.id) return;
    base44.entities.LeaveRequest.filter({ employee_id: employee.id }, "-created_date", 500)
      .then(setLeaves).catch(() => setLeaves([]));
    base44.entities.Settlement.filter({ employee_id: employee.id }, "-created_date", 200)
      .then(setSets).catch(() => setSets([]));
    base44.entities.LoanRequest.filter({ employee_id: employee.id }, "-created_date", 500)
      .then(setLoans).catch(() => setLoans([]));
    base44.entities.BusinessTrip.filter({ employee_id: employee.id }, "-created_date", 500)
      .then(setTrips).catch(() => setTrips([]));
  }, [employee?.id]);

  // مستندات لها ملف مرفق أو إثبات صرف
  const docLeaves = leaves.filter((l) => l.settlement_pdf_url || l.finance_proof_url);
  const docSets = sets.filter((s) => s.status === "completed" || s.finance_proof_url);
  const docLoans = loans.filter((l) => l.statement_pdf_url || l.finance_proof_url);
  const docTrips = trips.filter((t) => t.approval_pdf_url || t.finance_proof_url || t.hr_document_url || t.employee_document_url);

  const t = isAr ? {
    empty: "لا توجد مستندات لهذا الموظف بعد.",
    loanDoc: "كشف سلفة", leaveDoc: "مخالصة إجازة", tripDoc: "موافقة انتداب", eosDoc: "مخالصة نهاية الخدمة",
    proof: "إثبات التحويل", print: "معاينة/طباعة المخالصة", settle: "المستند", statement: "كشف السلفة", approval: "موافقة الانتداب",
    days: (n) => `${n} يوم`, lwd: "آخر يوم عمل", issued: "تاريخ الإصدار", amount: "المبلغ", dest: "الوجهة",
  } : {
    empty: "No documents for this employee yet.",
    loanDoc: "Loan statement", leaveDoc: "Leave settlement", tripDoc: "Business trip approval", eosDoc: "End-of-service settlement",
    proof: "Transfer proof", print: "View/Print settlement", settle: "Document", statement: "Loan statement", approval: "Trip approval",
    days: (n) => `${n} days`, lwd: "Last working day", issued: "Issued", amount: "Amount", dest: "Destination",
  };

  useEffect(() => {
    const after = () => setPrinting(null);
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  const printSet = (rec) => {
    setPrinting(rec);
    let done = false;
    const run = () => { if (done) return; done = true; window.print(); };
    // انتظر حتى يستقر تركيب المخالصة في DOM (بوابة body) قبل فتح الطباعة
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(run, 60)));
  };

  const hasAny = docLeaves.length > 0 || docSets.length > 0 || docLoans.length > 0 || docTrips.length > 0;
  if (!hasAny) return <div className="text-sm text-muted-foreground py-2">{t.empty}</div>;

  return (
    <div className="space-y-2">
      {docLoans.map((l) => (
        <div key={"ln" + l.id} className="rounded-lg border border-border bg-white p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-600 shrink-0"><Wallet size={14} /></span>
            <div>
              <div className="text-sm font-medium">{t.loanDoc} — {t.amount}: {formatCurrency(l.amount)}</div>
              <div className="text-xs text-muted-foreground">{l.request_date} · {l.reason}</div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {l.statement_pdf_url && (
              <StoredDocButton value={l.statement_pdf_url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium">
                <Download size={14} /> {t.statement}
              </StoredDocButton>
            )}
            {l.finance_proof_url && (
              <StoredDocButton value={l.finance_proof_url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">
                <FileText size={14} /> {t.proof}
              </StoredDocButton>
            )}
          </div>
        </div>
      ))}

      {docLeaves.map((l) => (
        <div key={"l" + l.id} className="rounded-lg border border-border bg-white p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 shrink-0"><CalendarCheck size={14} /></span>
            <div>
              <div className="text-sm font-medium">{t.leaveDoc} — {leaveTypeLabel(l.leave_type)}</div>
              <div className="text-xs text-muted-foreground">{l.start_date} ← {l.end_date} · {t.days(l.days_count)}</div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {l.settlement_pdf_url && (
              <StoredDocButton value={l.settlement_pdf_url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium">
                <Download size={14} /> {t.settle}
              </StoredDocButton>
            )}
            {l.finance_proof_url && (
              <StoredDocButton value={l.finance_proof_url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">
                <FileText size={14} /> {t.proof}
              </StoredDocButton>
            )}
          </div>
        </div>
      ))}

      {docTrips.map((tr) => (
        <div key={"tr" + tr.id} className="rounded-lg border border-border bg-white p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-50 text-sky-600 shrink-0"><Plane size={14} /></span>
            <div>
              <div className="text-sm font-medium">{t.tripDoc} — {t.dest}: {tr.destination}</div>
              <div className="text-xs text-muted-foreground">{tr.start_date} ← {tr.end_date} · {t.days(tr.days_count)}</div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {tr.approval_pdf_url && (
              <StoredDocButton value={tr.approval_pdf_url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium">
                <Download size={14} /> {t.approval}
              </StoredDocButton>
            )}
            {tr.hr_document_url && (
              <StoredDocButton value={tr.hr_document_url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 text-xs font-medium">
                <FileCheck2 size={14} /> {isAr ? "مرفق الموارد" : "HR doc"}
              </StoredDocButton>
            )}
            {tr.finance_proof_url && (
              <StoredDocButton value={tr.finance_proof_url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">
                <FileText size={14} /> {t.proof}
              </StoredDocButton>
            )}
          </div>
        </div>
      ))}

      {docSets.map((s) => (
        <div key={"s" + s.id} className="rounded-lg border border-border bg-white p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 text-rose-600 shrink-0"><FileCheck2 size={14} /></span>
            <div>
              <div className="text-sm font-medium">{t.eosDoc} — {reasonMeta(s.reason).label}</div>
              <div className="text-xs text-muted-foreground">{t.lwd}: {s.last_working_date} · {t.issued}: {s.generated_date}</div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {s.finance_proof_url && (
              <StoredDocButton value={s.finance_proof_url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">
                <FileText size={14} /> {t.proof}
              </StoredDocButton>
            )}
            <button onClick={() => printSet(s)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium">
              <Printer size={14} /> {t.print}
            </button>
          </div>
        </div>
      ))}

      {printing && createPortal(
        <div className="print-mount" aria-hidden="true">
          <SettlementSheet record={printing} org={org} />
        </div>,
        document.body
      )}
    </div>
  );
}