import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import BrandHeader from "@/components/docs/BrandHeader";
import { useI18n } from "@/lib/i18n";
import { genDateBoth } from "@/lib/printDate";

export default function DelegationDocument({ delegation, onClose }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const chrome = isAr ? { title: "مستند توكيل واستلام مركبة", close: "إغلاق", print: "طباعة / PDF" }
    : { title: "Vehicle delegation document", close: "Close", print: "Print / PDF" };
  const [org, setOrg] = useState(null);
  useEffect(() => {
    listCurrentOrg().then((d) => setOrg(d[0] || null)).catch(() => {});
  }, []);

  const company = org?.name || "";

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="no-print sticky top-0 bg-white/90 backdrop-blur border-b px-5 py-3 flex items-center justify-between">
          <span className="font-semibold">{chrome.title}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>{chrome.close}</Button>
            <Button size="sm" onClick={() => window.print()} className="gap-1.5"><Printer size={15} /> {chrome.print}</Button>
          </div>
        </div>

        <div className="print-delegation p-8 text-[#111]" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif" }}>
          <BrandHeader org={org} />
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>رقم التوكيل: <b className="text-slate-700">{delegation.delegation_number}</b></span>
            <span>تاريخ الإصدار: {genDateBoth(isAr)}</span>
          </div>

          <h2 className="text-center font-bold text-xl my-6 text-[#0B2545]">
            خطاب تفويض واستلام مركبة
          </h2>

          <p className="leading-loose mb-4">
            تشهد إدارة <b>{company}</b> بأن السائق المذكور أدناه قد تم تفويضه واستلامه للمركبة الموضحة،
            وهو المسؤول الأول عنها من تاريخ التفويض وحتى تاريخ انتهاء التوكيل أو تسليم المركبة لسائق آخر،
            ويتحمل كامل المسؤولية القانونية والتشغيلية عنها وفق الأنظمة المرورية المعمول بها.
          </p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 my-5 text-sm">
            <Row k="اسم السائق المُوكّل" v={delegation.employee_name} />
            <Row k="الهوية / الإقامة" v={delegation.national_id} />
            <Row k="المسمى الوظيفي" v={delegation.position} />
            <Row k="الإدارة" v={delegation.department} />
            <Row k="رقم المركبة" v={delegation.plate_number} />
            <Row k="وصف المركبة" v={delegation.vehicle_label} />
            <Row k="تاريخ التوكيل الفعلي" v={delegation.delegation_date} />
            <Row k="تاريخ انتهاء التوكيل" v={delegation.return_date || "—"} />
          </div>

          <p className="leading-loose text-sm text-slate-700 mb-6">
            يقرّ المُوكّل بحسن استخدام المركبة وصيانتها وعدم استخدامها خارج نطاق العمل،
            ويتعهد بإعادتها فور انتهاء علاقته الوظيفية أو عند طلب الإدارة. وفي حال ترك العمل أو مغادرته،
            تُنهى هذه الوثيقة وتُولّد وثيقة جديدة للسائق البديل بتاريخ فعلي.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-10 text-sm">
            <Sig label="إدارة الموارد البشرية" />
            <Sig label="إدارة الأسطول" />
            <Sig label="السائق المُوكّل (توقيع/بصمة)" />
          </div>

          <p className="text-[11px] text-slate-400 mt-8 border-t pt-2">
            وثيقة آلية رقم {delegation.delegation_number} — صادر عن نظام جداره لإدارة الموارد البشرية.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex gap-2 border-b border-slate-200 pb-1.5">
      <span className="text-slate-500 min-w-[120px]">{k}:</span>
      <b className="flex-1">{v || "—"}</b>
    </div>
  );
}
function Sig({ label }) {
  return (
    <div className="text-center">
      <div className="h-16 border-b border-slate-400 mb-1" />
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  );
}