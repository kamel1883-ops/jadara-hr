import React, { useState } from "react";
import { Download, FileText, Printer, ShieldCheck } from "lucide-react";
import SettlementSheet from "@/components/SettlementSheet";
import { leaveTypeLabel, sarSymbol } from "@/lib/hr";
import { reasonMeta } from "@/lib/eos";
import { usePortalT } from "@/lib/portalI18n";
import { StoredDocButton } from "@/components/VaultDocLink";

// مستنداتي المالية في بوابة الموظف — مخالصات تصفية الإجازات + مخالصات نهاية الخدمة المصروفة
export default function EmployeeDocuments({ loans, leaves, settlements, org }) {
  const t = usePortalT("documents");
  const [printing, setPrinting] = useState(null);

  const paidLeaves = (leaves || []).filter(
    (l) => (l.status === "completed" || l.status === "paid") && l.settlement_pdf_url
  );
  const paidSets = (settlements || []).filter((s) => s.status === "completed");
  const paidLoans = (loans || []).filter(
    (l) => (l.status === "paid" || l.status === "completed") && l.statement_pdf_url
  );

  const printSet = (rec) => {
    setPrinting(rec);
    setTimeout(() => { window.print(); setPrinting(null); }, 250);
  };

  const hasAny = paidLeaves.length > 0 || paidLoans.length > 0 || paidSets.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
        <ShieldCheck size={16} className="text-emerald-600" /> {t.title}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">{t.desc}</p>

      {!hasAny ? (
        <div className="text-center text-muted-foreground text-sm py-6">{t.empty}</div>
      ) : (
        <div className="space-y-2">
          {paidLeaves.map((l) => (
            <div key={"l" + l.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">{t.leaveDoc} — {leaveTypeLabel(l.leave_type)}</div>
                <div className="text-xs text-muted-foreground">{l.start_date} ← {l.end_date} · {t.days(l.days_count)}</div>
              </div>
              <StoredDocButton value={l.settlement_pdf_url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium shrink-0">
                <Download size={14} /> {t.settle}
              </StoredDocButton>
            </div>
          ))}

          {paidLoans.map((l) => {
            const paid = Number(l.paid_amount) || 0;
            const total = Number(l.amount) || 0;
            const rem = Math.max(0, total - paid);
            return (
              <div key={"ln" + l.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.loansDoc} — {total.toLocaleString()} {sarSymbol()}</div>
                  <div className="text-xs text-muted-foreground">{t.paid}: {paid.toLocaleString()} · {t.remaining}: {rem.toLocaleString()} · {t.installments(l.installment_count || 0)}</div>
                </div>
                <StoredDocButton value={l.statement_pdf_url}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium shrink-0">
                  <Download size={14} /> {t.settle}
                </StoredDocButton>
              </div>
            );
          })}

          {paidSets.map((s) => (
            <div key={"s" + s.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-medium">{t.eosDoc} — {reasonMeta(s.reason).label}</div>
                <div className="text-xs text-muted-foreground">{t.lwd}: {s.last_working_date} · {t.issued}: {s.generated_date}</div>
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
        </div>
      )}

      {printing && (
        <div className="fixed -left-[9999px] top-0" aria-hidden="true">
          <SettlementSheet record={printing} org={org} />
        </div>
      )}
    </div>
  );
}