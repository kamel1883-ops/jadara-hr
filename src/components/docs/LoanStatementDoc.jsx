import React from "react";
import BrandHeader from "@/components/docs/BrandHeader";
import { formatCurrency } from "@/lib/hr";
import { genDateBoth } from "@/lib/printDate";

/**
 * كشف السلفة — يُطبع محدَّثاً بآخر مبلغ خصم وآخر مبلغ متبقٍ:
 * إجمالي السلفة، عدد الدفعات، بيان الخصم بتاريخ كل شهر، المتبقي، وحالة السلفة (مغلقة عند الاكتمال).
 */
export default function LoanStatementDoc({ employee, loan, org }) {
  const amount = Number(loan?.amount) || 0;
  const paid = Number(loan?.paid_amount) || 0;
  const remaining = Math.max(0, amount - paid);
  const count = Math.max(1, Number(loan?.installment_count) || 1);
  const closed = amount > 0 && paid >= amount;

  const requestDate = loan?.request_date || (loan?.created_date || "").slice(0, 10) || "—";
  let payments = [];
  try { payments = JSON.parse(loan?.payment_log || "[]"); } catch { payments = []; }
  const paidCount = payments.length;

  const rows = [
    ["تاريخ تقديم الطلب", requestDate],
    ["اسم الموظف", employee?.full_name],
    ["الرقم الوظيفي", employee?.employee_number],
    ["الهوية / الإقامة", employee?.national_id || "—"],
    ["الإدارة", employee?.department || "—"],
    ["سبب السلفة", loan?.reason || "—"],
    ["عدد الدفعات (الأقساط الشهرية)", count],
    ["القسط الشهري المخصوم من الراتب", formatCurrency(loan?.monthly_installment || 0)],
    ["الدفعات المسدَّدة", `${paidCount} من ${count}`],
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
      <h2 style={{ textAlign: "center", fontSize: 22, margin: "4px 0 10px" }}>كشف سلفة</h2>

      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 22,
            fontWeight: 800,
            color: closed ? "#dc2626" : "#0b1120",
            border: closed ? "3px solid #dc2626" : "2px solid #0b1120",
            borderRadius: 12,
            padding: "8px 26px",
            letterSpacing: "0.03em",
          }}
        >
          {closed ? "مغلقة — غير نشطة" : "نشطة"}
        </span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} style={{ borderBottom: "1px solid #eceef2" }}>
              <td style={{ padding: "9px 6px", width: "42%", color: "#667085", fontWeight: 600 }}>{k}</td>
              <td style={{ padding: "9px 6px", fontWeight: 600 }}>{v || "—"}</td>
            </tr>
          ))}
          <tr style={{ background: "#f8f9fb" }}>
            <td style={{ padding: "10px 6px", color: "#667085", fontWeight: 700 }}>إجمالي السلفة</td>
            <td style={{ padding: "10px 6px", fontWeight: 800, fontSize: 15 }}>{formatCurrency(amount)}</td>
          </tr>
          <tr>
            <td style={{ padding: "10px 6px", color: "#15803d", fontWeight: 700 }}>تم استلام</td>
            <td style={{ padding: "10px 6px", fontWeight: 700, color: "#15803d" }}>{formatCurrency(paid)}</td>
          </tr>
          <tr style={{ borderBottom: "2px solid #0b1120" }}>
            <td style={{ padding: "10px 6px", color: "#b45309", fontWeight: 700 }}>المتبقي</td>
            <td style={{ padding: "10px 6px", fontWeight: 800, fontSize: 15, color: "#b45309" }}>{formatCurrency(remaining)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, background: "#f1f5f9", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
        إجمالي السلفة {formatCurrency(amount)} · عدد الدفعات {count} · تم استلام {formatCurrency(paid)} · المتبقي {formatCurrency(remaining)}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 18 }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ textAlign: "right", padding: "8px 6px", width: "16%" }}>الشهر</th>
            <th style={{ textAlign: "right", padding: "8px 6px", width: "20%" }}>تاريخ الخصم</th>
            <th style={{ textAlign: "right", padding: "8px 6px", width: "22%" }}>المبلغ المخصوم</th>
            <th style={{ textAlign: "right", padding: "8px 6px", width: "22%" }}>المتبقي بعد الخصم</th>
            <th style={{ textAlign: "right", padding: "8px 6px" }}>البيان</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: "10px 6px", color: "#667085", textAlign: "center" }}>لا توجد أقساط مخصومة حتى تاريخ هذا الكشف</td></tr>
          ) : (
            payments.map((p, i) => {
              const rem = Math.max(0, amount - payments.slice(0, i + 1).reduce((s, x) => s + (Number(x.amount) || 0), 0));
              const isPayroll = p.source === "payroll";
              return (
                <tr key={i} style={{ borderBottom: "1px solid #eceef2" }}>
                  <td style={{ padding: "8px 6px", fontWeight: 600 }}>{p.month || "—"}</td>
                  <td style={{ padding: "8px 6px", fontWeight: 600 }}>{p.date || "—"}</td>
                  <td style={{ padding: "8px 6px", fontWeight: 700, color: "#15803d" }}>{formatCurrency(Number(p.amount) || 0)}</td>
                  <td style={{ padding: "8px 6px", fontWeight: 700, color: "#b45309" }}>{formatCurrency(rem)}</td>
                  <td style={{ padding: "8px 6px", color: "#667085" }}>{isPayroll ? "خصم من مسير الرواتب" : "سداد مباشر"}{p.by ? ` — ${p.by}` : ""}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {closed ? (
        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 700,
            color: "#dc2626",
            border: "2px dashed #dc2626",
            borderRadius: 10,
            padding: "10px",
          }}
        >
          هذه السلفة مغلقة وغير نشطة — تم استلام كامل المبلغ ({formatCurrency(paid)}) عبر {paidCount} دفعة شهرية
        </div>
      ) : (
        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 700,
            color: "#b45309",
            border: "2px dashed #b45309",
            borderRadius: 10,
            padding: "10px",
          }}
        >
          هذه السلفة نشطة — تُخصم {formatCurrency(loan?.monthly_installment || 0)} من مسير كل شهر (المتبقي: {formatCurrency(remaining)})
        </div>
      )}

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