import React from "react";
import { Button } from "@/components/ui/button";
import { Banknote, FileDown, Layers, Send } from "lucide-react";
import { formatCurrency } from "@/lib/hr";
import { batchTitle } from "@/lib/payrollBatch";

/**
 * شريط مسيرات الشهر: كل دفعة (مسير) معتمدة تُعرض مستقلة بإجمالياتها وملفاتها —
 * طباعة رواتب مدد المعتمدة، التحويل إلى مدد، كشف الكاش وطباعته — دون أي خلط بين الدفعات.
 */
export default function PayrollBatchesStrip({ batches = [], isAr, months = [], month, year, busy, onPrintMudad, onPrintCash, onSendMudad, onCashExcel }) {
  if (batches.length === 0) return null;
  const t = isAr ? {
    title: "مسيرات الشهر (الدفعات)",
    hint: "كل دفعة لها ملفاتها ومستنداتها المستقلة: طباعة رواتب مدد المعتمدة، التحويل إلى مدد، وكشف الكاش.",
    mudad: "مدد", cash: "كاش", total: "إجمالي الدفعة",
    empCount: (n) => `${n} موظف`,
    sendMudad: "الإرسال إلى مدد",
    printMudad: "طباعة رواتب مدد المعتمدة",
    cashSheet: "صرف الكاش (Excel)",
    printCash: "طباعة رواتب الكاش المعتمدة",
  } : {
    title: "Month payroll runs (batches)",
    hint: "Each batch keeps its own files: approved Mudad payroll, send to Mudad, and the cash sheet.",
    mudad: "Mudad", cash: "Cash", total: "Batch total",
    empCount: (n) => `${n} employees`,
    sendMudad: "Send to Mudad",
    printMudad: "Print approved Mudad",
    cashSheet: "Cash sheet (Excel)",
    printCash: "Print approved cash",
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
        {batches.map((b) => (
          <div key={b.batch} className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm">{batchTitle(b.batch, isAr)} — {monthName} {year}</div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-white">{t.empCount(b.count)}</span>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}