import React from "react";
import BrandHeader from "@/components/docs/BrandHeader";
import { genDateBoth } from "@/lib/printDate";

export function contractYearsLabel(years) {
  const y = Math.max(1, parseInt(years, 10) || 1);
  if (y === 1) return "سنة واحدة";
  if (y === 2) return "سنتان";
  if (y >= 3 && y <= 10) return y + " سنوات";
  return y + " سنة";
}

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString() + " ريال";
}

function leaveLabel(days) {
  return (Number(days) === 30 ? "30" : "21") + " يوماً في السنة";
}

// نفس ترويسة بقية مستندات جداره: شعار المنشأة واسمها يميناً، وشعار جداره يساراً.
export default function JobOfferDoc({ applicant, job, org, years, basicSalary, housingAllowance, transportAllowance, annualLeaveDays, body, extras }) {
  const today = genDateBoth(true);
  const rows = [
    ["الاسم الكامل", applicant?.full_name || "—"],
    ["المسمى الوظيفي", job?.title || applicant?.job_title || "—"],
    ["الإدارة", job?.department || org?.name || "—"],
    ["مدة العرض الوظيفي", contractYearsLabel(years)],
    ["الراتب الأساسي", money(basicSalary)],
    ["بدل السكن", money(housingAllowance)],
    ["بدل المواصلات", money(transportAllowance)],
    ["الإجازة السنوية", leaveLabel(annualLeaveDays)],
    ["التأمين الطبي", "تأمين طبي إلزامي داخل المملكة العربية السعودية"],
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "Tajawal, IBM Plex Sans Arabic, sans-serif", padding: "44px", color: "#0f172a", width: "794px", background: "#fff" }}>
      <BrandHeader org={org} />

      <h1 style={{ fontSize: "21px", fontWeight: 800, textAlign: "center", marginBottom: "22px", color: "#0f172a" }}>عرض وظيفي</h1>

      <div style={{ fontSize: "14px", color: "#334155", marginBottom: "14px" }}>تاريخ العرض: {today}</div>

      <p style={{ fontSize: "14px", lineHeight: 2, marginBottom: "14px" }}>تتقدم المنشأة بهذا العرض الوظيفي للمرشح الآتي بيانه، وفق البنود التي اعتمدها مسؤول الموارد البشرية:</p>

      <table style={{ width: "100%", fontSize: "14px", marginBottom: "22px", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: "9px 12px", background: "#f5f3ff", fontWeight: 700, width: "30%" }}>{label}</td>
              <td style={{ padding: "9px 12px" }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: "14px", lineHeight: 2, whiteSpace: "pre-wrap", color: "#1e293b" }}>{body || ""}</div>

      {String(extras || "").trim() ? (
        <div style={{ marginTop: "18px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>بنود إضافية</div>
          <div style={{ fontSize: "14px", lineHeight: 2, whiteSpace: "pre-wrap", color: "#1e293b" }}>{String(extras).trim()}</div>
        </div>
      ) : null}

      <div style={{ fontSize: "13px", lineHeight: 2, marginTop: "18px", color: "#334155" }}>
        يرجى الرد على هذا العرض عبر البريد الإلكتروني.
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "56px", fontSize: "13px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "8px", width: "210px", color: "#334155" }}>المرسل إليه</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "8px", width: "210px", color: "#334155" }}>{org?.name || "المنشأة"}</div>
        </div>
      </div>

      <div style={{ marginTop: "30px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>تم إنشاء هذا المستند عبر منصة جداره | {today}</div>
    </div>
  );
}
