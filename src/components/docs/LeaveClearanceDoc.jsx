import React from "react";
import BrandHeader from "@/components/docs/BrandHeader";
import { leaveTypeLabel, formatCurrency } from "@/lib/hr";
import { genDateBoth } from "@/lib/printDate";

export default function LeaveClearanceDoc({ employee, leave, org, balanceBefore, balanceAfter, daysCash, dailyWage }) {
  const requestDate = leave?.request_date || (leave?.created_date || "").slice(0, 10) || "—";
  const rows = [
    ["تاريخ تقديم الطلب", requestDate],
    ["اسم الموظف", employee?.full_name],
    ["الرقم الوظيفي", employee?.employee_number],
    ["الهوية / الإقامة", employee?.national_id || "—"],
    ["الإدارة", employee?.department || "—"],
    ["المسمى الوظيفي", employee?.position || "—"],
    ["تاريخ المباشرة", employee?.hire_date || "—"],
    ["نوع الإجازة", leaveTypeLabel(leave?.leave_type)],
    ["عنوان الإجازة / السبب", leave?.description || leave?.reason || "—"],
    ["من تاريخ", leave?.start_date || "—"],
    ["إلى تاريخ", leave?.end_date || "—"],
  ];
  return (
    <div
      dir="rtl"
      style={{
        width: 794,
        padding: 32,
        fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif",
        color: "#0b1120",
        background: "#fff",
      }}
    >
      <BrandHeader org={org} />
      <h2 style={{ textAlign: "center", fontSize: 22, margin: "4px 0 4px" }}>مخالصة تصفية إجازة</h2>
      <div style={{ textAlign: "center", fontSize: 14, color: "#6d28d9", fontWeight: 700, marginBottom: 16 }}>{leaveTypeLabel(leave?.leave_type)}{leave?.is_full_clearance ? " — تصفية كاملة" : ""}</div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} style={{ borderBottom: "1px solid #eceef2" }}>
              <td style={{ padding: "9px 6px", width: "42%", color: "#667085", fontWeight: 600 }}>{k}</td>
              <td style={{ padding: "9px 6px", fontWeight: 600 }}>{v || "—"}</td>
            </tr>
          ))}
          <tr>
            <td style={{ padding: "9px 6px", color: "#667085", fontWeight: 600 }}>الأيام المطلوبة (الأصلية)</td>
            <td style={{ padding: "9px 6px", fontWeight: 600 }}>{leave?.days_count || 0} يوم</td>
          </tr>
          <tr style={{ background: "#f8f9fb" }}>
            <td style={{ padding: "10px 6px", color: "#667085", fontWeight: 700 }}>عدد الأيام المعتمدة (المُخصومة)</td>
            <td style={{ padding: "10px 6px", fontWeight: 800, fontSize: 15 }}>{(Number(leave?.balance_deducted) > 0 ? Number(leave?.balance_deducted) : (leave?.days_count || 0))} يوم</td>
          </tr>
          <tr>
            <td style={{ padding: "9px 6px", color: "#667085", fontWeight: 600 }}>رصيد الإجازات قبل التصفية</td>
            <td style={{ padding: "9px 6px", fontWeight: 700 }}>{balanceBefore ?? 0} يوم</td>
          </tr>
          <tr style={{ borderBottom: "2px solid #0b1120" }}>
            <td style={{ padding: "9px 6px", color: "#667085", fontWeight: 700 }}>رصيد الإجازات المتبقي بعد التصفية</td>
            <td style={{ padding: "9px 6px", fontWeight: 800, fontSize: 15, color: (Number(balanceAfter) || 0) < 0 ? "#b42318" : "#0b1120" }}>
              {(Number(balanceAfter) || 0)} يوم{(Number(balanceAfter) || 0) < 0 ? " — الموظف متجاوز لمستحقه (مدين)" : ""}
            </td>
          </tr>
        </tbody>
      </table>

      {(() => {
        const ticket = Number(leave?.ticket_amount) || 0;
        const ded = Number(leave?.deduction_amount) || 0;
        const add = Number(leave?.addition_amount) || 0;
        const daysC = Number(daysCash) || 0;
        const dw = Number(dailyWage) || 0;
        const total = Number(leave?.settlement_amount) || Math.max(0, daysC + ticket + add - ded);
        if (!(ticket > 0 || ded > 0 || add > 0 || daysC > 0)) return null;
        const FinRow = ({ label, value, strong }) => (
          <tr style={{ borderBottom: "1px solid #eceef2", fontWeight: strong ? 800 : 600 }}>
            <td style={{ padding: "9px 6px", width: "62%", color: strong ? "#0b1120" : "#667085" }}>{label}</td>
            <td style={{ padding: "9px 6px", textAlign: "left", color: value < 0 ? "#b42318" : "#0b1120" }}>{formatCurrency(value)}</td>
          </tr>
        );
        return (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 18 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ textAlign: "right", padding: "9px 6px", width: "62%" }}>الملخص المالي للتصفية</th>
                <th style={{ textAlign: "left", padding: "9px 6px" }}>المبلغ (ر.س)</th>
              </tr>
            </thead>
            <tbody>
              {daysC > 0 && <FinRow label={`تعويض الأيام الممنوحة (${leave?.balance_deducted || 0} يوم × ${formatCurrency(dw)})`} value={daysC} />}
              {ticket > 0 && <FinRow label="تعويض التذكرة" value={ticket} />}
              {add > 0 && <FinRow label={`مستحقات إضافية (تُضاف للموظف)${leave?.addition_note ? " — " + leave.addition_note : ""}`} value={add} />}
              {ded > 0 && <FinRow label={`مستحقات دائنة (تُخصم)${leave?.deduction_note ? " — " + leave.deduction_note : ""}`} value={-ded} />}
              <tr style={{ borderTop: "2px solid #0b1120" }}>
                <td style={{ padding: "10px 6px", fontWeight: 800, fontSize: 15 }}>إجمالي التصفية</td>
                <td style={{ padding: "10px 6px", textAlign: "left", fontWeight: 800, fontSize: 15, color: "#0b1120" }}>{formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>
        );
      })()}

      <div style={{ marginTop: 26, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <div>تاريخ تقديم الطلب: {requestDate}</div>
        <div>توقيع الموارد البشرية: .................................</div>
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: "#475569", textAlign: "center" }}>
        تاريخ الطباعة: {genDateBoth(true)}
      </div>
      <div style={{ marginTop: 8, fontSize: 9, color: "#94a3b8", textAlign: "center" }}>
        تم إنشاء هذا المستند آلياً بواسطة نظام جداره لإدارة الموارد البشرية
      </div>
    </div>
  );
}