import React from "react";

const fmtDate = (v) => {
  if (!v) return "";
  try { return new Date(v).toLocaleDateString("ar-SA-u-ca-gregory", { year: "numeric", month: "long", day: "numeric" }); } catch { return String(v); }
};

// محتوى إنذار واحد — الترويسة (شعار المنشأة يميناً + جدارة يساراً)
// تُضاف تلقائياً من printReport/buildPrintWrapper، فلا نكررها هنا.
export default function WarningDoc({ warning, employee }) {  const emp = employee || {};
  const name = emp?.full_name || warning?.employee_name || "—";
  const natId = emp?.national_id || warning?.national_id || "";
  return (
    <div dir="rtl">
      <h1 style={{ textAlign: "center", fontSize: 18, marginBottom: 20 }}>إنذار</h1>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>اسم الموظف:</strong> {name}
        </div>
        {natId ? (
          <div style={{ marginBottom: 8 }}>
            <strong>رقم الهوية/الإقامة:</strong> {natId}
          </div>
        ) : null}
        {warning?.department ? (
          <div style={{ marginBottom: 8 }}>
            <strong>القسم:</strong> {warning?.department}
          </div>
        ) : null}
        {warning?.violation_category ? (
          <div style={{ marginBottom: 8 }}>
            <strong>نوع المخالفة:</strong> {warning?.violation_category}
          </div>
        ) : null}
        {warning?.warning_level ? (
          <div style={{ marginBottom: 8 }}>
            <strong>درجة الإنذار:</strong> {warning?.warning_level}
          </div>
        ) : null}
        {warning?.article_reference ? (
          <div style={{ marginBottom: 8 }}>
            <strong>رقم المادة/المرجع:</strong> {warning?.article_reference}
          </div>
        ) : null}
        {warning?.incident_date ? (
          <div style={{ marginBottom: 8 }}>
            <strong>تاريخ الواقعة:</strong> {fmtDate(warning?.incident_date)}
          </div>
        ) : null}
        {warning?.session_date ? (
          <div style={{ marginBottom: 8 }}>
            <strong>تاريخ الجلسة/التسليم:</strong> {fmtDate(warning?.session_date)}
          </div>
        ) : null}
      </div>

      {warning?.description ? (
        <div style={{ marginBottom: 16 }}>
          <strong>تفصيل المخالفة:</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{warning?.description}</div>
        </div>
      ) : null}

      {warning?.investigation_summary ? (
        <div style={{ marginBottom: 16 }}>
          <strong>ملخص التحقيق/البيان:</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{warning?.investigation_summary}</div>
        </div>
      ) : null}

      {warning?.notes ? (
        <div style={{ marginBottom: 16 }}>
          <strong>ملاحظات:</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{warning?.notes}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ marginBottom: 8 }}>أعده:</div>
          <div style={{ fontWeight: 600 }}>{warning?.prepared_by_name || "—"}</div>
          {warning?.prepared_by_id ? (
            <div style={{ fontSize: 12 }}>{warning?.prepared_by_id}</div>
          ) : null}
          {warning?.prepared_at ? (
            <div style={{ fontSize: 12 }}>{fmtDate(warning?.prepared_at)}</div>
          ) : null}
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ marginBottom: 8 }}>توقيع الموظف بالعلم:</div>
          <div style={{ height: 40, borderBottom: "1px dashed #666" }}></div>
          <div style={{ marginTop: 8, fontSize: 12 }}>التاريخ: / /</div>
        </div>
      </div>
    </div>
  );
}
