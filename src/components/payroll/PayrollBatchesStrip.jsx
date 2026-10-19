import React from "react";
import { Button } from "@/components/ui/button";
import { Banknote, CheckCircle2, FileDown, Layers, RotateCcw, Send } from "lucide-react";
import { formatCurrency } from "@/lib/hr";
import { cn } from "@/lib/utils";
import { batchTitle } from "@/lib/payrollBatch";

/**
 * شريط مسيرات الشهر: كل دفعة (مسير) تُعرض مستقلة بعدد موظفيها وإجماليها وملفاتها —
 * طباعة رواتب مدد المعتمدة، التحويل إلى مدد، كشف الكاش وطباعته، وصرف المسير — دون أي خلط بين الدفعات.
 */
export default function PayrollBatchesStrip({ batches = [], isAr, months = [], month, year, busy, onPrintMudad, onPrintCash, onSendMudad, onCashExcel, onPay, onReopen }) {
  if (batches.length === 0) return null;
  const t = isAr ? {
    title: "مسيرات الشهر (الدفعات)",
    hint: "كل مسير مسجّل ومستقل: بعدد موظفيه وإجمالي رواتبه وملفاته — طباعة رواتب مدد المعتمدة، التحويل إلى مدد، كشف الكاش وصرفه — دون أي دمج بين الدفعات.",
    mudad: "مدد", cash: "كاش", total: "إجمالي المسير",
    empCount: (n) => `${n} موظف`,
    sendMudad: "الإرسال إلى مدد",
    printMudad: "طباعة رواتب مدد المعتمدة",
    cashSheet: "صرف الكاش (Excel)",
    printCash: "طباعة رواتب الكاش المعتمدة",
    stDraft: "مسودة", stApproved: "معتمد", stPaid: "مصروف (محوّل)",
    pay: "تحويل الرواتب (تم الصرف)", reopen: "إعادة فتح المسير",
    paidNote: (n) => `تم صرف ${n} موظف`,
  } : {
    title: "Month payroll runs (batches)",
    hint: "Every run is saved and independent: its own employees, total, and files — approved Mudad payroll, send to Mudad, cash sheet and payment — with no merging between runs.",
    mudad: "Mudad", cash: "Cash", total: "Run total",
    empCount: (n) => `${n} employees`,
    sendMudad: "Send to Mudad",
    printMudad: "Print approved Mudad",
    cashSheet: "Cash sheet (Excel)",
    printCash: "Print approved cash",
    stDraft: "Draft", stApproved: "Approved", stPaid: "Paid (transferred)",
    pay: "Transfer salaries (mark paid)", reopen: "Reopen run",
    paidNote: (n) => `${n} employees paid`,
  };
  const monthName = months[(month || 1) - 1] || "";

  return (
    <div className="bg-white rounded-2xl border border-border p-4 mb-5">
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-primary" />
        <h3 className="text-sm font-semibold">{t.title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mt-1 mb-3">{t.hint}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {batches.map((b) => {
          const isDraft = b.count === 0 || b.included.some((r) => r.status === "draft");
          const isPaid = !isDraft && b.paidCount === b.count;
          const statusLabel = isDraft ? t.stDraft : isPaid ? t.stPaid : t.stApproved;
          const statusCls = isDraft
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : isPaid
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-[#0B2545]/5 text-[#0B2545] border border-[#0B2545]/15";
          return (
          <div key={b.batch} className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-semibold text-sm">{batchTitle(b.batch, isAr)} — {monthName} {year}</div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusCls)}>{statusLabel}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-white">{t.empCount(b.count)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <div className="rounded-lg bg-[#0B2545]/5 border border-[#0B2545]/15 p-2">
                <div className="text-[10px] text-[#0B2545]/70">{t.mudad}</div>
                <div className="text-sm font-extrabold text-[#0B2545] tabular-nums">{formatCurrency(b.mudadTotal)}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                <div className="text-[10px] text-emerald-700">{t.cash}</div>
                <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatCurrency(b.cashTotal)}</div>
              </div>
              <div className="rounded-lg bg-slate-900/95 text-white p-2">
                <div className="text-[10px] text-white/70">{t.total}</div>
                <div className="text-sm font-extrabold tabular-nums">{formatCurrency(b.total)}</div>
              </div>
            </div>

            {b.paidCount > 0 && (
              <div className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> {t.paidNote(b.paidCount)} — {formatCurrency(b.paidTotal)}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {b.mudad.length > 0 && (
                <>
                  <Button size="sm" className="gap-1.5 bg-[#0B2545] hover:bg-[#14315a] text-white" disabled={busy} onClick={() => onSendMudad(b.batch)}>
                    <Send size={14} /> {t.sendMudad}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => onPrintMudad(b.batch)}>
                    <FileDown size={14} /> {t.printMudad}
                  </Button>
                </>
              )}
              {b.cash.length > 0 && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" disabled={busy} onClick={() => onCashExcel(b.batch)}>
                    <Banknote size={14} /> {t.cashSheet}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => onPrintCash(b.batch)}>
                    <FileDown size={14} /> {t.printCash}
                  </Button>
                </>
              )}
              {b.approved.length > 0 && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy} onClick={() => onPay(b.batch)}>
                  <CheckCircle2 size={14} /> {t.pay}
                </Button>
              )}
              {b.paidCount > 0 && (
                <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => onReopen(b.batch)}>
                  <RotateCcw size={14} /> {t.reopen}
                </Button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}