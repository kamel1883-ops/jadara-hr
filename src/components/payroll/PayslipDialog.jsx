import React, { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2, Search, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, payrollStatusLabel } from "@/lib/hr";
import { printReport } from "@/lib/reportPrint";
import { enrichEmployeesBatch, applySensitiveMap } from "@/lib/vaultSensitive";
import { useI18n } from "@/lib/i18n";
import { batchTitle, batchOf } from "@/lib/payrollBatch";
import PayslipDoc from "@/components/payroll/PayslipDoc";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * البحث في رواتب الأشهر السابقة وطباعة بيسليب (كشف راتب) لموظف محدد.
 * البحث بهوية الموظف أو رقمه الوظيفي أو اسمه مع تحديد الشهر، ثم طباعة بيسليب رسمي
 * يحمل بيانات الراتب والبدلات والخصومات وصافي المبلغ وطريقة الاستلام وختم الاعتماد الإلكتروني.
 */
export default function PayslipDialog({ open, onClose, org, month, year }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "كشوف رواتب الموظفين — بيسليب",
    hint: "ابحث بهوية الموظف أو رقمه الوظيفي أو اسمه، وحدّد الشهر (أو «كل الشهور») ثم اطبع بيسليب الموظف.",
    q: "الهوية / الرقم الوظيفي / الاسم", month: "الشهر", year: "السنة", all: "كل الشهور", search: "بحث",
    loading: "جارٍ التحميل...", empty: "لا توجد رواتب مطابقة — جرّب شهراً أو بحثاً آخر.",
    thEmp: "الموظف", thNat: "الهوية/الإقامة", thMonth: "الشهر", thBatch: "الدفعة", thMethod: "الاستلام", thNet: "الصافي", thStatus: "الحالة", thPrint: "بيسليب",
    print: "طباعة بيسليب", exporting: "جارٍ التجهيز...", mudad: "مدد", cash: "كاش",
    slipTitle: "كشف راتب",
    closed: "إغلاق", count: (n) => `${n} كشف`,
  } : {
    title: "Employee salary slips",
    hint: "Search by national ID, employee number or name, choose the month (or all months), then print the payslip.",
    q: "ID / employee number / name", month: "Month", year: "Year", all: "All months", search: "Search",
    loading: "Loading...", empty: "No matching payroll — try another month or search.",
    thEmp: "Employee", thNat: "ID/Iqama", thMonth: "Month", thBatch: "Batch", thMethod: "Method", thNet: "Net", thStatus: "Status", thPrint: "Payslip",
    print: "Print payslip", exporting: "Preparing...", mudad: "Mudad", cash: "Cash",
    slipTitle: "Salary slip",
    closed: "Close", count: (n) => `${n} slips`,
  };

  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [q, setQ] = useState("");
  const [m, setM] = useState(String(month || "all"));
  const [y, setY] = useState(String(year || new Date().getFullYear()));
  const months = isAr ? MONTHS_AR : MONTHS_EN;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const emps = await base44.entities.Employee.list("-created_date", 500);
        const sens = await enrichEmployeesBatch(emps).catch(() => ({}));
        setEmployees(applySensitiveMap(emps, sens));
      } catch {
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const query = { year: Number(y) || new Date().getFullYear() };
    if (m !== "all") query.month = Number(m);
    base44.entities.Payroll.filter(query, "-created_date", 500)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open, m, y]);

  const empById = {};
  for (const e of employees) empById[e.id] = e;

  const needle = q.trim().toLowerCase();
  const results = rows.filter((p) => {
    if (!needle) return true;
    const e = empById[p.employee_id];
    return [p.national_id, e?.national_id, e?.employee_number, p.employee_name, e?.full_name].some((v) =>
      String(v || "").toLowerCase().includes(needle)
    );
  });

  const printSlip = async (p) => {
    setBusy(p.id);
    const emp = empById[p.employee_id] || null;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      const ordinal = batchTitle(batchOf(p), isAr);
      flushSync(() => {
        root.render(<PayslipDoc record={p} employee={emp} org={org} isAr={isAr} batchTitle={ordinal} months={months} />);
      });
      const node = container.firstChild;
      if (!node) return;
      await printReport(node, {
        org,
        title: `${t.slipTitle} — ${p.employee_name || emp?.full_name || ""}`,
        subtitle: `${months[(p.month || 1) - 1]} ${p.year} · ${ordinal} · ${p.salary_payment_method === "cash" ? t.cash : t.mudad} · ${formatCurrency(p.net_salary)}`,
        stamp: p.status === "paid",
        empRef: p.emp_ref || null,
        docType: "payslip",
      });
    } finally {
      root.unmount();
      container.remove();
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wallet size={18} /> {t.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{t.hint}</p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Search size={12} /> {t.q}</div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="1xxxxxxxxx" dir="auto" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">{t.month}</div>
            <Select value={m} onValueChange={setM}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                {months.map((name, i) => <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">{t.year}</div>
            <Input type="number" value={y} onChange={(e) => setY(e.target.value)} dir="ltr" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">{t.empty}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-right px-3 py-2 font-medium">{t.thEmp}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thNat}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thMonth}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thBatch}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thMethod}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thNet}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thStatus}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((p) => {
                  const emp = empById[p.employee_id];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{p.employee_name || emp?.full_name || "—"}</td>
                      <td className="px-3 py-2 tabular-nums text-xs">{emp?.national_id || p.national_id || "—"}</td>
                      <td className="px-3 py-2 text-xs">{months[(p.month || 1) - 1]} {p.year}</td>
                      <td className="px-3 py-2 text-xs">{batchTitle(batchOf(p), isAr)}</td>
                      <td className="px-3 py-2 text-xs">{p.salary_payment_method === "cash" ? t.cash : t.mudad}</td>
                      <td className="px-3 py-2 font-semibold tabular-nums">{formatCurrency(p.net_salary)}</td>
                      <td className="px-3 py-2">
                        <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", payrollStatusLabel(p.status).cls)}>{payrollStatusLabel(p.status).label}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printSlip(p)} disabled={busy === p.id}>
                          {busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} {t.print}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{t.count(results.length)}</span>
          <Button variant="outline" onClick={onClose}>{t.closed}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}