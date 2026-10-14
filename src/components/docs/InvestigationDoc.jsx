import React from "react";
import BrandHeader from "@/components/docs/BrandHeader";
import { parseParties } from "@/lib/investigation";
import { genDateBoth } from "@/lib/printDate";

// طباعة محضر التحقيق — يعتمد ترويسة الهوية الموحدة نفسها المستخدمة في سائر مستندات النظام
// (كشف سلفة، مخالصة، محضر شكوى...): شعار المنشأة واسمها ورقمها الموحد أعلى اليمين،
// وشعار جداره أعلى اليسار. بيانات المنشأة تأتي من إعدادات المنشأة.
export default function InvestigationDoc({ record, org, isAr = true, typeLabel, labelOf }) {
  if (!record) return null;

  const parties = parseParties(record.parties || "[]");
  const subjects = parties.filter((p) => p.role !== "witness");
  const witnesses = parties.filter((p) => p.role === "witness");
  const nameOf = (p) => (labelOf ? labelOf(p.employee_id, p.employee_name) : p.employee_name || "—");

  const L = isAr ? {
    title: "محضر التحقيق",
    ref: "رقم المحضر",
    type: "نوع المخالفة",
    allegations: "الادعاء / سبب المحضر",
    subjects: "الموظفون المعنيون",
    witnesses: "الشهود",
    reply: "الرد",
    named: "أسماء شهود ذكرها الموظف",
    evidence: "الإثبات",
    recommendation: "التوصية",
    printed: "تاريخ الطباعة",
  } : {
    title: "Investigation report",
    ref: "Report no.",
    type: "Violation type",
    allegations: "Allegation / reason",
    subjects: "Employees concerned",
    witnesses: "Witnesses",
    reply: "Reply",
    named: "Witness names mentioned",
    evidence: "Evidence",
    recommendation: "Recommendation",
    printed: "Printed",
  };

  const Party = ({ p }) => (
    <div className="inv-party rounded-lg border border-slate-200 bg-slate-50 p-3 mb-2">
      <div className="font-bold text-sm mb-1">{nameOf(p)}</div>
      <div className="text-sm whitespace-pre-wrap leading-relaxed"><b>{L.reply}:</b> {p.reply || "—"}</div>
      {p.witness_names ? <div className="text-xs text-slate-600 mt-1"><b>{L.named}:</b> {p.witness_names}</div> : null}
      {p.evidence_ref ? <div className="text-xs text-slate-600 mt-1"><b>{L.evidence}:</b> {p.evidence_ref}</div> : null}
    </div>
  );

  const Section = ({ title, children }) => (
    <div className="mb-4">
      <div className="text-xs font-bold text-slate-500 mb-1">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );

  return (
    <div
      className="print-investigation bg-white text-slate-800"
      dir={isAr ? "rtl" : "ltr"}
      style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',ui-sans-serif,system-ui,sans-serif" }}
    >
      <BrandHeader org={org} />

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-bold">{L.title}</h2>
        <div className="text-sm"><b>{L.ref}:</b> {record.ref_no || "—"}</div>
        {typeLabel ? <div className="text-sm text-slate-600"><b>{L.type}:</b> {typeLabel}</div> : null}
      </div>
      <hr className="border-slate-200 my-3" />

      <Section title={L.allegations}>
        <p className="whitespace-pre-wrap leading-relaxed">{record.allegations || "—"}</p>
      </Section>

      <Section title={L.subjects}>
        {subjects.length === 0 ? "—" : subjects.map((p, i) => <Party key={p.employee_id || i} p={p} />)}
      </Section>

      <Section title={L.witnesses}>
        {witnesses.length === 0 ? "—" : witnesses.map((p, i) => <Party key={p.employee_id || i} p={p} />)}
      </Section>

      <Section title={L.recommendation}>
        <p className="whitespace-pre-wrap leading-relaxed">{record.recommendation || "—"}</p>
      </Section>

      <footer className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-500">
        {L.printed}: {genDateBoth(isAr)}
      </footer>
    </div>
  );
}
