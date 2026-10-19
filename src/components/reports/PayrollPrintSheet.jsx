import React from "react";
import { formatCurrency } from "@/lib/hr";

// جدول طباعة نظيف ومخصص لكشف الرواتب (PDF) — يُبنى مستقلاً عن الجدول التفاعلي
// لتجنّب انهيار الأعمدة الثابتة (sticky) وحقول الإدخال عند التصدير.
// القاعدة:
//  - الأعمدة الثابتة دائماً تظهر: الموظف، الهوية، الأساسي، السكن، المواصلات، الإجمالي، الصافي.
//  - الأعمدة الديناميكية تظهر فقط إذا كان أحد الموظفين لديه قيمة غير صفرية:
//    بدلات أخرى، حوافز، عمل إضافي، غياب (أيام)، غياب (ساعات)، خصومات أخرى، سلفة.
export default function PayrollPrintSheet({ payrolls = [], employees = [], workDaysInMonth = 0, workHoursPerDay = 0, hoursPerDayById = {}, isAr = true }) {
  const empMap = {};
  for (const e of employees) empMap[e.id] = e;
  const nameOf = (p) => empMap[p.employee_id]?.full_name || p.employee_name || "—";
  const natOf = (p) => p.national_id || empMap[p.employee_id]?.national_id || "—";

  const dailyWage = (g) => (workDaysInMonth ? Number(g) / workDaysInMonth : 0);
  const hourlyWage = (dw, hpd) => (hpd > 0 ? dw / hpd : 0);
  const dayValue = (g, d) => Number(((d || 0) * dailyWage(g)).toFixed(2));
  // ساعات اليوم المعتمدة للموظف (دوام فرعه إن كان له دوام خاص) وإلا ساعات المنشأة
  const hourValue = (g, h, empId) => {
    const hpd = Number(hoursPerDayById[empId] || workHoursPerDay) || 0;
    return Number(((h || 0) * hourlyWage(dailyWage(g), hpd)).toFixed(2));
  };

  const hasOther = payrolls.some((p) => Number(p.other_allowances) > 0);
  const hasBonus = payrolls.some((p) => Number(p.bonus) > 0);
  const hasOvertime = payrolls.some((p) => Number(p.overtime_amount) > 0);
  const hasAbsentDays = payrolls.some((p) => Number(p.absent_days) > 0);
  const hasAbsentHours = payrolls.some((p) => Number(p.absent_hours) > 0);
  const hasDed = payrolls.some((p) => Number(p.deductions) > 0);
  const hasLoan = payrolls.some((p) => Number(p.loan_installment) > 0);

  const th = "border-b border-slate-300 px-2 py-1.5 text-[12px] font-bold text-slate-700 bg-slate-100 text-center whitespace-nowrap";
  const td = "border-b border-slate-200 px-2 py-1.5 text-[12px] text-slate-800 text-center whitespace-nowrap";
  const tdR = "border-b border-slate-200 px-2 py-1.5 text-[12px] text-slate-800 text-right whitespace-nowrap";

  const totalNet = payrolls.reduce((s, p) => s + (Number(p.net_salary) || 0), 0);
  const preparer = payrolls.find((p) => p.prepared_by_name);

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ fontFamily: "var(--font-display), Tajawal, IBM Plex Sans Arabic, sans-serif" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "34px" }} />
          <col style={{ width: "170px" }} />
          <col style={{ width: "110px" }} />
          <col style={{ width: "90px" }} />
          <col style={{ width: "80px" }} />
          <col style={{ width: "80px" }} />
          {hasOther && <col style={{ width: "80px" }} />}
          <col style={{ width: "95px" }} />
          {hasBonus && <col style={{ width: "80px" }} />}
          {hasOvertime && <col style={{ width: "80px" }} />}
          {hasAbsentDays && <col style={{ width: "100px" }} />}
          {hasAbsentHours && <col style={{ width: "100px" }} />}
          {hasDed && <col style={{ width: "85px" }} />}
          {hasLoan && <col style={{ width: "80px" }} />}
          <col style={{ width: "100px" }} />
        </colgroup>
        <thead>
          <tr>
            <th className={th}>#</th>
            <th className={th} style={{ textAlign: "right" }}>{isAr ? "الموظف" : "Employee"}</th>
            <th className={th}>{isAr ? "الهوية/الإقامة" : "National ID"}</th>
            <th className={th}>{isAr ? "أساسي" : "Base"}</th>
            <th className={th}>{isAr ? "سكن" : "Housing"}</th>
            <th className={th}>{isAr ? "مواصلات" : "Transport"}</th>
            {hasOther && <th className={th}>{isAr ? "بدلات أخرى" : "Other"}</th>}
            <th className={th} style={{ color: "#0b1120" }}>{isAr ? "الإجمالي" : "Gross"}</th>
            {hasBonus && <th className={th} style={{ color: "#059669" }}>{isAr ? "حوافز" : "Bonus"}</th>}
            {hasOvertime && <th className={th} style={{ color: "#2563eb" }}>{isAr ? "عمل إضافي" : "Overtime"}</th>}
            {hasAbsentDays && <th className={th}>{isAr ? "غياب (يوم/قيمة)" : "Absent days/value"}</th>}
            {hasAbsentHours && <th className={th}>{isAr ? "غياب (ساعة/قيمة)" : "Absent hours/value"}</th>}
            {hasDed && <th className={th} style={{ color: "#dc2626" }}>{isAr ? "خصومات أخرى" : "Deductions"}</th>}
            {hasLoan && <th className={th} style={{ color: "#7c3aed" }}>{isAr ? "سلفة" : "Loan"}</th>}
            <th className={th} style={{ color: "#0b1120" }}>{isAr ? "الصافي" : "Net"}</th>
          </tr>
        </thead>
        <tbody>
          {payrolls.map((p, i) => {
            const g = Number(p.gross_salary) || 0;
            return (
              <tr key={p.id}>
                <td className={td} style={{ fontWeight: 600 }}>{i + 1}</td>
                <td className={tdR} style={{ fontWeight: 700 }}>{nameOf(p)}</td>
                <td className={td} dir="ltr">{natOf(p)}</td>
                <td className={td}>{formatCurrency(p.base_salary)}</td>
                <td className={td}>{formatCurrency(p.housing_allowance)}</td>
                <td className={td}>{formatCurrency(p.transport_allowance)}</td>
                {hasOther && <td className={td}>{formatCurrency(p.other_allowances)}</td>}
                <td className={td} style={{ fontWeight: 800, color: "#0b1120" }}>{formatCurrency(g)}</td>
                {hasBonus && <td className={td} style={{ color: "#059669" }}>{formatCurrency(p.bonus)}</td>}
                {hasOvertime && <td className={td} style={{ color: "#2563eb" }}>{formatCurrency(p.overtime_amount)}</td>}
                {hasAbsentDays && (
                  <td className={td}>
                    <div style={{ fontWeight: 600 }}>{Number(p.absent_days) || 0}</div>
                    {(() => { const v = dayValue(g, p.absent_days); return v ? <div style={{ color: "#dc2626", fontSize: 11 }}>−{formatCurrency(v)}</div> : null; })()}
                  </td>
                )}
                {hasAbsentHours && (
                  <td className={td}>
                    <div style={{ fontWeight: 600 }}>{Number(p.absent_hours) || 0}</div>
                    {(() => { const v = hourValue(g, p.absent_hours, p.employee_id); return v ? <div style={{ color: "#dc2626", fontSize: 11 }}>−{formatCurrency(v)}</div> : null; })()}
                  </td>
                )}
                {hasDed && <td className={td} style={{ color: "#dc2626" }}>{formatCurrency(p.deductions)}</td>}
                {hasLoan && <td className={td} style={{ color: "#7c3aed" }}>{formatCurrency(p.loan_installment)}</td>}
                <td className={td} style={{ fontWeight: 800, color: "#0b1120" }}>{formatCurrency(p.net_salary)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className={td} style={{ fontWeight: 800, background: "#f1f5f9" }} colSpan={(() => {
              let n = 7 + (hasOther?1:0) + (hasBonus?1:0) + (hasOvertime?1:0) + (hasAbsentDays?1:0) + (hasAbsentHours?1:0) + (hasDed?1:0) + (hasLoan?1:0);
              return n - 1;
            })()}></td>
            <td className={td} style={{ fontWeight: 800, background: "#f1f5f9", color: "#0b1120" }}>
              {isAr ? "الإجمالي" : "Total"}: {formatCurrency(totalNet)}
            </td>
          </tr>
        </tfoot>
      </table>
      {preparer && (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-start" }}>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 16px", background: "#f8fafc", fontSize: 12, color: "#334155" }}>
            <span style={{ fontWeight: 700 }}>{isAr ? "أُعدّت بواسطة:" : "Prepared by:"}</span>{" "}
            {preparer.prepared_by_name}
            {preparer.prepared_by_id ? ` — ${preparer.prepared_by_id}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}