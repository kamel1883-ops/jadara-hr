import React from "react";
import BrandHeader from "@/components/docs/BrandHeader";
import { formatCurrency } from "@/lib/hr";
import { reasonMeta } from "@/lib/eos";
import { useI18n } from "@/lib/i18n";
import { genDateBoth } from "@/lib/printDate";

export default function SettlementSheet({ record, org }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const r = record || {};
  const L = isAr;
  const t = L ? {
    orgNameFallback: "اسم المنشأة", cr: "س.ت", title: "مخالصة نهاية الخدمة", no: "رقم",
    emp: "اسم الموظف", empNo: "الرقم الوظيفي", natId: "الهوية/الإقامة", nationality: "الجنسية", dept: "الإدارة", position: "المسمى الوظيفي",
    hireDate: "تاريخ المباشرة", lwd: "آخر يوم عمل", years: (n) => `${n} سنة`, reason: "سبب الإنهاء",
    item: "البند", detail: "التفصيل", amount: "المبلغ (ر.س)",
    monthly: "الأجر الشهري", monthlyD: (b) => `أساس: ${b === "gross" ? "إجمالي" : "أساسي فقط"}`, daily: "الأجر اليومي", dailyD: "الأجر الشهري ÷ 30",
    eos: "مكافأة نهاية الخدمة", leaveCash: "تصفية رصيد الإجازات", leaveD: (n) => `${n} يوم × الأجر اليومي`,
    ticket: "تعويض التذكرة", ticketD: "لا يستحق", total: "إجمالي المخالصة",
    deductionLabel: "مستحقات دائنة (تُخصم)", additionLabel: "مستحقات إضافية (تُضاف للموظف)",
    empSign: "توقيع الموظف", hrSign: "مدير الموارد البشرية", adminSign: "المعتمد من الإدارة",
    footer: (d) => `تم إصدار هذه المخالصة بواسطة منصة جداره لإدارة الموارد البشرية — ${d || ""}`,
  } : {
    orgNameFallback: "Organization name", cr: "CR", title: "End-of-service settlement", no: "No.",
    emp: "Employee name", empNo: "Employee no", natId: "ID/Iqama", nationality: "Nationality", dept: "Department", position: "Job title",
    hireDate: "Commencement date", lwd: "Last working date", years: (n) => `${n} years`, reason: "Termination reason",
    item: "Item", detail: "Detail", amount: "Amount (SAR)",
    monthly: "Monthly wage", monthlyD: (b) => `Basis: ${b === "gross" ? "Gross" : "Base only"}`, daily: "Daily wage", dailyD: "Monthly wage ÷ 30",
    eos: "EOS award", leaveCash: "Leave balance settlement", leaveD: (n) => `${n} days × daily wage`,
    ticket: "Ticket compensation", ticketD: "Not entitled", total: "Total settlement",
    deductionLabel: "Debit dues (deducted)", additionLabel: "Additional dues (added to employee)",
    empSign: "Employee signature", hrSign: "HR manager", adminSign: "Approved by management",
    footer: (d) => `Issued by Jadara system — ${d || ""}`,
  };

  return (
    <div className="print-settlement bg-white text-slate-900 mx-auto" style={{ maxWidth: "800px" }} dir={L ? "rtl" : "ltr"}>
      <BrandHeader org={org} />
      <div className="text-center mb-5">
        <div className="text-base font-bold">{t.title}</div>
        <div className="text-xs text-slate-500">{t.no}: {r.id ? r.id.slice(-6).toUpperCase() : ""} · {r.generated_date || ""}</div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-5">
        <Info label={t.emp} value={r.employee_name} />
        <Info label={t.empNo} value={r.employee_number} />
        <Info label={t.natId} value={r.national_id} />
        <Info label={t.nationality} value={r.nationality} />
        <Info label={t.dept} value={r.department} />
        <Info label={t.position} value={r.position} />
        <Info label={t.hireDate} value={r.hire_date} />
        <Info label={t.lwd} value={r.last_working_date} />
        <Info label={L ? "سنوات الخدمة" : "Years of service"} value={t.years(r.years_of_service)} />
        <Info label={t.reason} value={reasonMeta(r.reason).label} />
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
          <Row label={t.monthly} detail={t.monthlyD(r.basis)} value={r.monthly_wage} />
          <Row label={t.daily} detail={t.dailyD} value={r.daily_wage} />
          <Row label={t.eos} detail={r.fraction_label} value={r.eos_amount} bold />
          <Row label={t.leaveCash} detail={t.leaveD(r.leave_balance_days)} value={r.leave_cash} />
          {Number(r.ticket_amount) > 0 && (
            <Row label={t.ticket} detail={r.ticket_entitlement === "none" ? t.ticketD : r.ticket_entitlement || ""} value={r.ticket_amount} />
          )}
          {Number(r.addition_amount) > 0 && (
            <Row label={`${t.additionLabel}${r.addition_note ? " — " + r.addition_note : ""}`} detail="" value={Number(r.addition_amount)} />
          )}
          {Number(r.deduction_amount) > 0 && (
            <Row label={`${t.deductionLabel}${r.deduction_note ? " — " + r.deduction_note : ""}`} detail="" value={-Number(r.deduction_amount)} />
          )}
          <tr className="bg-slate-100 font-bold">
            <td className="p-2 border-t-2 border-slate-900">{t.total}</td>
            <td className="p-2 border-t-2 border-slate-900"></td>
            <td className="p-2 border-t-2 border-slate-900 text-left">{formatCurrency(r.total_settlement)}</td>
          </tr>
        </tbody>
      </table>

      {r.reason_note && (<div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 mb-5">{r.reason_note}</div>)}

      <div className="grid grid-cols-3 gap-6 mt-10 text-center text-sm">
        <Sign label={t.empSign} />
        <Sign label={t.hrSign} />
        <Sign label={t.adminSign} />
      </div>

      <div className="text-center text-[11px] text-slate-500 mt-6">{L ? "تاريخ الطباعة" : "Print date"}: {genDateBoth(L)}</div>
      <div className="text-center text-xs text-slate-400 mt-8">{t.footer(r.generated_date)}</div>
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
function Sign({ label }) {
  return (
    <div className="flex flex-col items-center gap-10">
      <span className="border-t border-slate-400 w-40"></span>
      <span className="text-xs text-slate-600">{label}</span>
    </div>
  );
}