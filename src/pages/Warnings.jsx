import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import WarningForm from "@/components/WarningForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertTriangle, Plus, ScrollText, Search } from "lucide-react";
import { VIOLATION_CATEGORIES, WARNING_LEVELS, categoryById, levelById, LABOR_POLICY_INTRO } from "@/lib/laborPolicy";
import { useI18n } from "@/lib/i18n";
import { enrichRecordsWithVault, VAULT_MODULES } from "@/lib/vaultGeneric";
import { cn } from "@/lib/utils";

export default function Warnings() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "سياسة العمل والإنذارات", subtitle: "مرجع سياسة العمل وإصدار الإنذارات الذكية المرسلة لبوابة الموظف دون ورق",
    intro: LABOR_POLICY_INTRO.ar,
    newBtn: "إنشاء إنذار", policy: "سياسة العمل (المواد والمخالفات)", warnings: "الإنذارات الصادرة",
    search: "بحث باسم/رقم الموظف...", filterCat: "كل المخالفات", filterLevel: "كل الدرجات", filterStatus: "كل الحالات",
    no: "لا توجد إنذارات", thEmp: "الموظف", thCat: "المخالفة", thLevel: "الدرجة", thArticle: "المرجع", thIncident: "الواقعة", thSession: "الجلسة", thStatus: "الحالة",
    sent: "مرسلة", ack: "مطّلع", total: "إجمالي الإنذارات", firsts: "إنذارات أولى", finals: "إنذارات نهائية/فصل",
  } : {
    title: "Labor Policy & Warnings", subtitle: "Labor policy reference and paperless smart warnings sent to the employee portal",
    intro: LABOR_POLICY_INTRO.en,
    newBtn: "Create warning", policy: "Labor policy (articles & violations)", warnings: "Issued warnings",
    search: "Search by name/number...", filterCat: "All violations", filterLevel: "All levels", filterStatus: "All statuses",
    no: "No warnings", thEmp: "Employee", thCat: "Violation", thLevel: "Level", thArticle: "Reference", thIncident: "Incident", thSession: "Session", thStatus: "Status",
    sent: "Sent", ack: "Acknowledged", total: "Total warnings", firsts: "First warnings", finals: "Final/Termination",
  };

  const [employees, setEmployees] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("all");
  const [fLevel, setFLevel] = useState("all");

  const load = async () => {
    setLoading(true);
    const [e, w] = await Promise.all([
      base44.entities.Employee.list("-created_date", 1000),
      base44.entities.Warning.list("-created_date", 1000),
    ]);
    setEmployees(e);
    setWarnings(w);
    setLoading(false);
    enrichRecordsWithVault(w, VAULT_MODULES.warnings, "warning_ref", ["description", "investigation_summary", "notes"]).then(setWarnings);
  };
  useEffect(() => { load(); }, []);

  const empName = (w) => {
    const e = employees.find((x) => x.id === w.employee_id);
    return e ? e.full_name : (w.employee_name || w.employee_id);
  };
  const empNat = (w) => {
    const e = employees.find((x) => x.id === w.employee_id);
    return e ? (e.national_id || "") : (w.national_id || "");
  };

  const filtered = warnings.filter((w) => {
    const name = empName(w);
    if (q && !name.includes(q) && !(w.employee_name || "").includes(q)) return false;
    if (fCat !== "all" && w.violation_category !== fCat) return false;
    if (fLevel !== "all" && w.warning_level !== fLevel) return false;
    return true;
  });

  const countFirst = warnings.filter((w) => w.warning_level === "first").length;
  const countFinal = warnings.filter((w) => w.warning_level === "third" || w.warning_level === "termination").length;

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} action={<Button onClick={() => setOpen(true)} className="gap-2"><Plus size={18} /> {t.newBtn}</Button>} />

      <div className="bg-white rounded-2xl border border-border p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0"><ScrollText size={20} className="text-violet-600" /></div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.intro}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={AlertTriangle} label={t.total} value={warnings.length} tint="rose" />
        <StatCard icon={AlertTriangle} label={t.firsts} value={countFirst} tint="amber" />
        <StatCard icon={AlertTriangle} label={t.finals} value={countFinal} tint="violet" />
      </div>

      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ScrollText size={16} className="text-slate-400" /> {t.policy}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
        {VIOLATION_CATEGORIES.map((c0) => {
          const c = categoryById(c0.id, lang);
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-semibold text-sm">{c.label}</h4>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium",
                  c.severity === "termination" ? "bg-red-600 text-white border-red-700" :
                  c.severity === "high" ? "bg-rose-50 text-rose-700 border-rose-200" :
                  c.severity === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-slate-50 text-slate-600 border-slate-200")}>
                  {c.severity === "termination" ? (isAr ? "فصل" : "Termination") : c.severity === "high" ? (isAr ? "عالية" : "High") : c.severity === "medium" ? (isAr ? "متوسطة" : "Medium") : (isAr ? "منخفضة" : "Low")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{c.article}</p>
              <p className="text-xs text-foreground"><b>{isAr ? "التوجير:" : "Consequence:"}</b> {c.consequence}</p>
            </div>
          );
        })}
      </div>

      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-slate-400" /> {t.warnings}</h3>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="ps-9" />
        </div>
        <Select value={fCat} onValueChange={setFCat}>
          <SelectTrigger className="w-44"><SelectValue placeholder={t.filterCat} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filterCat}</SelectItem>
            {VIOLATION_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{isAr ? c.ar : c.en}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fLevel} onValueChange={setFLevel}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t.filterLevel} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filterLevel}</SelectItem>
            {WARNING_LEVELS.map((l) => <SelectItem key={l.id} value={l.id}>{isAr ? l.ar : l.en}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-xs text-muted-foreground">
              <th className="text-right font-medium px-4 py-3">{t.thEmp}</th>
              <th className="text-right font-medium px-4 py-3">{isAr ? "الهوية/الإقامة" : "National ID"}</th>
              <th className="text-right font-medium px-4 py-3">{t.thCat}</th>
              <th className="text-right font-medium px-4 py-3">{t.thLevel}</th>
              <th className="text-right font-medium px-4 py-3 hidden md:table-cell">{t.thArticle}</th>
              <th className="text-right font-medium px-4 py-3 hidden md:table-cell">{t.thIncident}</th>
              <th className="text-right font-medium px-4 py-3 hidden lg:table-cell">{t.thSession}</th>
              <th className="text-right font-medium px-4 py-3">{t.thStatus}</th>
              <th className="text-right font-medium px-4 py-3">{isAr ? "أُعدّت بواسطة" : "Prepared by"}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">—</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">{t.no}</td></tr>
            ) : filtered.map((w) => {
              const c = categoryById(w.violation_category, lang);
              const lv = levelById(w.warning_level, lang);
              return (
                <tr key={w.id} className="border-t border-border">
                  <td className="px-4 py-3">{empName(w)}<div className="text-xs text-muted-foreground">{w.department || ""}</div></td>
                  <td className="px-4 py-3 tabular-nums text-xs" dir="ltr">{empNat(w) || "—"}</td>
                  <td className="px-4 py-3">{c?.label || w.violation_category}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", lv.cls)}>{lv.label}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-[280px] truncate">{c?.article || w.article_reference}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{w.incident_date || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{w.session_date || "—"}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{w.status === "acknowledged" ? t.ack : t.sent}</span></td>
                  <td className="px-4 py-3 text-[11px] text-violet-700">{w.prepared_by_name ? `${w.prepared_by_name}${w.prepared_by_id ? ` — ${w.prepared_by_id}` : ""}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <WarningForm open={open} onClose={() => setOpen(false)} onSaved={load} employees={employees} />
    </div>
  );
}