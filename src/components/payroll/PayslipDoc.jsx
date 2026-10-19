import React from "react";
import StampSeal from "@/components/docs/StampSeal";
import { formatCurrency } from "@/lib/hr";
import { genDateBoth } from "@/lib/printDate";

/**
 * بيسليب (كشف راتب) لموظف محدد في شهر محدد — يُصدَّر كمستند رسمي قابل للطباعة
 * (يُطبع داخل غلاف الطباعة الموحّد: شعار المنشأة واسمها يميناً، وشعار جداره يساراً).
 * يحمل إقراراً بأن المستند معتمد إلكترونياً ولا يحتاج إلى توقيع.
 */
export default function PayslipDoc({ record, employee, org, isAr = true, batchTitle = "", months = [] }) {
  const r = record || {};
  const e = employee || {};
  const L = isAr;
  const t = L ? {
    emp: "اسم الموظف", natId: "الهوية/الإقامة", empNo: "الرقم الوظيفي", dept: "الإدارة", position: "المسمى الوظيفي",
    hire: "تاريخ المباشرة", method: "طريقة استلام الراتب", status: "حالة الصرف", paidDate: "تاريخ الصرف",
    month: "شهر الراتب", batch: "الدفعة",
    item: "البند", detail: "التفصيل", amount: "المبلغ (ر.س)",
    base: "الراتب الأساسي", house: "بدل السكن", trans: "بدل المواصلات", other: "بدلات أخرى", gross: "إجمالي الراتب",
    bonus: "حوافز", overtime: "عمل إضافي", absent: "خصم الغياب", absentD: (d, h) => `${d || 0} يوم${h ? ` + ${h} ساعة` : ""}`,
    ded: "خصومات أخرى", loan: "قسط السلفة", gosi: "تأمينات الموظف (حصة الموظف)",
    net: "صافي الراتب المستحق والمصروف",
    mudad: "مدد — حماية الأجور (تحويل بنكي)", cash: "كاش — صرف نقدي",
    approvedText: (orgName) => `هذا المستند معتمد إلكترونياً من منصة جداره لإدارة الموارد البشرية ومن ${orgName || "المنشأة"}، ولا يحتاج إلى توقيع.`,
    footer: (d) => `أُصدر هذا الكشف آلياً من منصة جداره لإدارة الموارد البشرية — ${d || ""}`,
    printDate: "تاريخ الطباعة",
  } : {
    emp: "Employee name", natId: "ID/Iqama", empNo: "Employee no", dept: "Department", position: "Job title",
    hire: "Commencement date", method: "Salary payment method", status: "Payment status", paidDate: "Paid date",
    month: "Payroll month", batch: "Batch",
    item: "Item", detail: "Detail", amount: "Amount (SAR)",
    base: "Base salary", house: "Housing allowance", trans: "Transport allowance", other: "Other allowances", gross: "Gross salary",
    bonus: "Bonus", overtime: "Overtime", absent: "Absence deduction", absentD: (d, h) => `${d || 0} day(s)${h ? ` + ${h} hr(s)` : ""}`,
    ded: "Other deductions", loan: "Loan installment", gosi: "Employee GOSI share",
    net: "Net salary paid",
    mudad: "Mudad — WPS (bank transfer)", cash: "Cash payment",
    approvedText: (orgName) => `This document is electronically approved by the Jadara HR platform and by ${orgName || "the organization"}. No signature is required.`,
    footer: (d) => `Generated automatically by the Jadara HR platform — ${d || ""}`,
    printDate: "Print date",
  };

  const method = r.salary_payment_method === "cash" ? t.cash : t.mudad;
  const statusLabel = r.status === "paid" ? (L ? "مصروف" : "Paid") : r.status === "approved" ? (L ? "معتمد" : "Approved") : (L ? "مسودة" : "Draft");
  const gross = Number(r.gross_salary) || 0;
  const dedRows = [
    Number(r.bonus) > 0 ? [t.bonus, "", Number(r.bonus)] : null,
    Number(r.overtime_amount) > 0 ? [t.overtime, "", Number(r.overtime_amount)] : null,
    Number(r.absent_deduction) > 0 ? [t.absent, t.absentD(r.absent_days, r.absent_hours), -Number(r.absent_deduction)] : null,
    Number(r.deductions) > 0 ? [t.ded, "", -Number(r.deductions)] : null,
    Number(r.loan_installment) > 0 ? [t.loan, "", -Number(r.loan_installment)] : null,
    Number(r.gosi_employee) > 0 ? [t.gosi, "", -Number(r.gosi_employee)] : null,
  ].filter(Boolean);

  return (
    <div className="bg-white text-slate-900 mx-auto" style={{ maxWidth: "800px" }} dir={L ? "rtl" : "ltr"}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-5">
        <Info label={t.emp} value={r.employee_name || e.full_name} />
        <Info label={t.natId} value={e.national_id || r.national_id} />
        <Info label={t.empNo} value={e.employee_number} />
        <Info label={t.dept} value={e.department} />
        <Info label={t.position} value={e.position} />
        <Info label={t.hire} value={e.hire_date} />
        <Info label={t.month} value={`${months[r.month - 1] || r.month} ${r.year}`} />
        <Info label={t.batch} value={batchTitle} />
        <Info label={t.method} value={method} />
        <Info label={t.status} value={statusLabel} />
        {r.paid_date ? <Info label={t.paidDate} value={r.paid_date} /> : null}
      </div>

      <table className="w-full text-sm border border-slate-300 mb-5">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-right p-2 border-b border-slate-300 font-semibold">{t.item}</th>
            <th className="text-right p-2 border-b border-slate-300 font-semibold">{t.detail}</th>
            <th className="text-left p-2 border-b border-slate-300 font-semibold">{t.amount}</th>
          </tr>
        </thead>
        <tbody>
          <Row label={t.base} detail="" value={r.base_salary} />
          <Row label={t.house} detail="" value={r.housing_allowance} />
          <Row label={t.trans} detail="" value={r.transport_allowance} />
          {Number(r.other_allowances) > 0 && <Row label={t.other} detail="" value={r.other_allowances} />}
          <Row label={t.gross} detail="" value={gross} bold />
          {dedRows.map(([label, detail, value], i) => <Row key={i} label={label} detail={detail} value={value} />)}
          <tr className="bg-slate-100 font-bold">
            <td className="p-2 border-t-2 border-slate-900">{t.net}</td>
            <td className="p-2 border-t-2 border-slate-900"></td>
            <td className="p-2 border-t-2 border-slate-900 text-left">{formatCurrency(r.net_salary)}</td>
          </tr>
        </tbody>
      </table>

      <div className="border-2 border-emerald-500 bg-emerald-50 text-emerald-800 rounded-xl px-4 py-3 text-sm font-semibold mb-6">
        {t.approvedText(org?.name)}
      </div>

      <div className="flex items-center justify-between gap-4 mt-4">
        <div className="text-[11px] text-slate-500 leading-relaxed" style={{ maxWidth: 360 }}>
          {t.printDate}: {genDateBoth(L)}
          <div className="mt-1">{t.footer(r.paid_date || "")}</div>
        </div>
        <StampSeal size={110} />
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="font-medium border-b border-dotted border-slate-300 pb-1">{value || "—"}</span>
    </div>
  );
}

function Row({ label, detail, value, bold }) {
  return (
    <tr className={bold ? "font-semibold" : ""}>
      <td className="p-2 border-b border-slate-200">{label}</td>
      <td className="p-2 border-b border-slate-200 text-slate-600 text-xs">{detail}</td>
      <td className="p-2 border-b border-slate-200 text-left">{formatCurrency(value)}</td>
    </tr>
  );
}