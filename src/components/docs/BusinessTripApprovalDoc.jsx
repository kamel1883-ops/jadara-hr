import React from "react";
import BrandHeader from "@/components/docs/BrandHeader";
import { formatCurrency } from "@/lib/hr";
import { genDateBoth } from "@/lib/printDate";

// المستند قد يكون رابطاً قديماً أو رمز خزنة (doc_ref) — لا نطبع الرمز المعتّم على الورق
const docLine = (label, value) => {
  const v = String(value || "").trim();
  if (!v) return null;
  const isUrl = /^https?:\/\//i.test(v);
  return (
    <div style={{ fontSize: 11, color: "#2563eb", marginBottom: 6 }}>
      {label}: {isUrl ? v : "مرفق محفوظ في الخزنة السعودية — يُفتح من النظام"}
    </div>
  );
};

const tripTypeLabel = (t) => (t === "external" ? "خارجية" : "داخلية");
const transportLabel = (m) => ({
  plane: "طيران", car: "سيارة", bus: "حافلة", train: "قطار", none: "بدون",
}[m] || "—");

export default function BusinessTripApprovalDoc({ employee, trip, org }) {
  const rows = [
    ["اسم الموظف", employee?.full_name],
    ["الرقم الوظيفي", employee?.employee_number],
    ["الهوية / الإقامة", employee?.national_id || "—"],
    ["الإدارة", employee?.department || "—"],
    ["المسمى الوظيفي", employee?.position || "—"],
    ["نوع الانتداب", tripTypeLabel(trip?.trip_type)],
    ["الوجهة", trip?.destination || "—"],
    ["الغرض من الرحلة", trip?.purpose || "—"],
    ["وسيلة التنقل", transportLabel(trip?.transport_mode)],
    ["تاريخ البداية", trip?.start_date || "—"],
    ["تاريخ النهاية", trip?.end_date || "—"],
    ["عدد الأيام", `${trip?.days_count || 0} يوم`],
  ];
  const cost = (label, v) => (
    <tr key={label} style={{ borderBottom: "1px solid #eceef2" }}>
      <td style={{ padding: "9px 6px", width: "55%", color: "#667085", fontWeight: 600 }}>{label}</td>
      <td style={{ padding: "9px 6px", fontWeight: 700 }}>{formatCurrency(v)}</td>
    </tr>
  );
  return (
    <div dir="rtl" style={{ width: 794, padding: 32, fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif", color: "#0b1120", background: "#fff" }}>
      <BrandHeader org={org} />
      <h2 style={{ textAlign: "center", fontSize: 22, margin: "4px 0 6px" }}>مستند موافقة بالانتداب</h2>
      <p style={{ textAlign: "center", fontSize: 11, color: "#667085", margin: "0 0 16px" }}>
        اعتمدت هذه الموافقة من إدارة الموارد البشرية بتاريخ {trip?.approved_date || new Date().toISOString().slice(0, 10)}
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 14 }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} style={{ borderBottom: "1px solid #eceef2" }}>
              <td style={{ padding: "9px 6px", width: "42%", color: "#667085", fontWeight: 600 }}>{k}</td>
              <td style={{ padding: "9px 6px", fontWeight: 600 }}>{v || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 12, fontWeight: 700, color: "#667085", marginBottom: 6 }}>تفاصيل التكاليف</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 14 }}>
        <tbody>
          {cost("تكلفة التنقل", trip?.transport_cost)}
          {cost("تكلفة الإقامة", trip?.accommodation_cost)}
          {cost("إجمالي بدل الانتداب", trip?.per_diem_total)}
          {cost("تكاليف أخرى", trip?.other_costs)}
          {cost("سلفة على الحساب", trip?.advance_amount)}
          <tr style={{ borderBottom: "2px solid #0b1120", background: "#f8f9fb" }}>
            <td style={{ padding: "10px 6px", color: "#667085", fontWeight: 700 }}>إجمالي التكلفة</td>
            <td style={{ padding: "10px 6px", fontWeight: 800, fontSize: 15 }}>{formatCurrency(trip?.total_cost)}</td>
          </tr>
        </tbody>
      </table>

      {trip?.employee_note ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#667085", marginBottom: 4 }}>وصف الموظف للانتداب (السبب والخطة)</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, background: "#f8fafc", border: "1px solid #eceef2", borderRadius: 8, padding: 10 }}>
            {trip.employee_note}
          </div>
        </div>
      ) : null}

      {trip?.hr_note ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#667085", marginBottom: 4 }}>ملاحظات الموارد البشرية</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: 10 }}>
            {trip.hr_note}
          </div>
        </div>
      ) : null}

      {docLine("مستندات الموظف", trip?.employee_document_url)}
      {docLine("مستندات الموارد البشرية", trip?.hr_document_url)}

      <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <div>اسم المعتمد: {trip?.approver_name || "—"}</div>
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