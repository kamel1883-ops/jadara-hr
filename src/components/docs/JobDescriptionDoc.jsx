import React, { useEffect, useState } from "react";
import { listCurrentOrg } from "@/lib/currentOrg";
import BrandHeader from "@/components/docs/BrandHeader";

// مستند الوصف الوظيفي — يُستخدم للمشاهدة والطباعة PDF في ملف الموظف ونموذج الموظف
// الترويسة: شعار المنشأة أعلى اليمين، وشعار جداره أعلى اليسار.
export default function JobDescriptionDoc({ employee, text, isAr = true }) {
  const body = text ?? employee?.job_description;
  const [org, setOrg] = useState(null);

  useEffect(() => {
    let alive = true;
    listCurrentOrg()
      .then((r) => { if (alive) setOrg(r?.[0] || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // تقسيم الوصف إلى مقاطع لا تُكسر بين الصفحات: كل مقطع (محدد بـ --- أو عنوان markdown)
  // يبقى كتلة واحدة، فإذا لم يتسع له مكان في أسفل الصفحة ينتقل بكامله للصفحة التالية.
  const sections = React.useMemo(() => {
    const raw = String(body || "").replace(/\r/g, "");
    if (!raw.trim()) return [];
    return raw
      .split(/(?:^|\n)\s*---\s*(?:\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean)
      .flatMap((s) => {
        // داخل كل مقطع، افصل كذلك عند العناوين (### / ##) لتجنّب قطع العنوان عن نصه.
        const parts = s.split(/(\n(?:###|##)\s+[^\n]+)/g).filter((p) => p && p.trim());
        const out = [];
        let buf = "";
        for (const p of parts) {
          const isHead = /^\n?(###|##)\s+/.test(p);
          if (isHead) { if (buf.trim()) out.push(buf.trim()); buf = p; }
          else buf += p;
        }
        if (buf.trim()) out.push(buf.trim());
        return out.length ? out : [s];
      });
  }, [body]);

  return (
    <div style={{ fontFamily: "'Tajawal','IBM Plex Sans Arabic',sans-serif", color: "#0f172a", maxWidth: 800, margin: "0 auto" }}>
      <div className="jd-header">
        <BrandHeader org={org} />
      </div>
      <h1 className="text-lg font-bold mb-2.5">{isAr ? "الوصف الوظيفي" : "Job Description"}</h1>
      <div className="jd-meta flex flex-wrap gap-5 text-[13px] mb-4 px-3.5 py-3 rounded-xl border" style={{ background: "#f8fafc", borderColor: "#e2e8f0", color: "#334155" }}>
        <div><b style={{ color: "#0f172a" }}>{isAr ? "الاسم:" : "Name:"}</b> {employee?.full_name || ""}</div>
        {employee?.employee_number && <div><b style={{ color: "#0f172a" }}>{isAr ? "الرقم الوظيفي:" : "Emp. No:"}</b> {employee.employee_number}</div>}
        {employee?.position && <div><b style={{ color: "#0f172a" }}>{isAr ? "المسمى:" : "Position:"}</b> {employee.position}</div>}
        {employee?.department && <div><b style={{ color: "#0f172a" }}>{isAr ? "الإدارة:" : "Department:"}</b> {employee.department}</div>}
      </div>
      {sections.length === 0
        ? <div className="text-sm leading-relaxed">{body || "—"}</div>
        : sections.map((sec, i) => (
            <div key={i} className="jd-section text-sm whitespace-pre-line leading-relaxed mb-3">{sec}</div>
          ))}
    </div>
  );
}