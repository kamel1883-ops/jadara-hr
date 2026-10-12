import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import SuccessionForm from "@/components/SuccessionForm";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Crown, AlertTriangle, ShieldCheck, GitBranch, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil } from "@/lib/eos";
import { useI18n } from "@/lib/i18n";
import { printSection } from "@/lib/sectionPrint";
import { enrichRecordsWithVault, VAULT_MODULES } from "@/lib/vaultGeneric";

export default function Succession() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const readinessLabel = isAr ? {
    ready_now: { label: "جاهز الآن", cls: "bg-emerald-50 text-emerald-600" },
    ready_1_2_years: { label: "1-2 سنة", cls: "bg-blue-50 text-blue-600" },
    ready_3_5_years: { label: "3-5 سنوات", cls: "bg-amber-50 text-amber-600" },
    development_needed: { label: "يحتاج تطوير", cls: "bg-rose-50 text-rose-600" },
  } : {
    ready_now: { label: "Ready now", cls: "bg-emerald-50 text-emerald-600" },
    ready_1_2_years: { label: "1-2 years", cls: "bg-blue-50 text-blue-600" },
    ready_3_5_years: { label: "3-5 years", cls: "bg-amber-50 text-amber-600" },
    development_needed: { label: "Development needed", cls: "bg-rose-50 text-rose-600" },
  };
  const posStatusLabel = isAr ? {
    active: { label: "مستقر", cls: "bg-emerald-50 text-emerald-600" },
    at_risk: { label: "عرضة للمغادرة", cls: "bg-amber-50 text-amber-600" },
    leaving: { label: "في طريقه للمغادرة", cls: "bg-rose-50 text-rose-600" },
    vacant: { label: "شاغر", cls: "bg-slate-100 text-slate-600" },
  } : {
    active: { label: "Stable", cls: "bg-emerald-50 text-emerald-600" },
    at_risk: { label: "At risk", cls: "bg-amber-50 text-amber-600" },
    leaving: { label: "Leaving", cls: "bg-rose-50 text-rose-600" },
    vacant: { label: "Vacant", cls: "bg-slate-100 text-slate-600" },
  };
  const riskCls = { low: "bg-emerald-50 text-emerald-600", medium: "bg-amber-50 text-amber-600", high: "bg-rose-50 text-rose-600" };
  const riskLabel = (v) => v === "high" ? (isAr ? "مرتفع" : "High") : v === "low" ? (isAr ? "منخفض" : "Low") : (isAr ? "متوسط" : "Medium");
  const t = isAr ? {
    title: "تخطيط التعاقب", subtitle: "تحديد المناصب الحرجة وإعداد المرشحين البدلاء لضمان استمرارية الأعمال", add: "خطة جديدة",
    critical: "مناصب حرجة / معرضة", readyNow: "بدلاء جاهزون الآن", vacant: "مناصب شاغرة",
    loading: "جارٍ التحميل...", empty: "لا توجد خطط تعاقب — ابدأ بتحديد المناصب الحرجة",
    holder: (n) => `الشاغل: ${n || "—"}`, succ: "البدليل", risk: "خطر المغادرة", impact: "الأثر",
    succC: "المرشح البديل", noSucc: "لم يُحدد بعد", devPlan: "خطة التطوير", due: "الموعد", late: "متأخر",
    exportPdf: "طباعة PDF",
  } : {
    title: "Succession planning", subtitle: "Identify critical positions and prepare successors to ensure business continuity", add: "New plan",
    critical: "Critical / at-risk roles", readyNow: "Ready successors", vacant: "Vacant roles",
    loading: "Loading...", empty: "No succession plans — start by identifying critical positions",
    holder: (n) => `Holder: ${n || "—"}`, succ: "Successor", risk: "Risk of loss", impact: "Impact",
    succC: "Successor", noSucc: "Not set yet", devPlan: "Development plan", due: "Due", late: "Late",
    exportPdf: "Export PDF",
  };

  const [plans, setPlans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [p, e] = await Promise.all([base44.entities.SuccessionPlan.list("-created_date", 500), base44.entities.Employee.list("-created_date", 500)]);
    setPlans(p); setEmployees(e); setLoading(false);
    enrichRecordsWithVault(p, VAULT_MODULES.succession, "succession_ref", ["development_plan", "notes"]).then(setPlans);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => { await base44.entities.SuccessionPlan.delete(id); load(); };

  const criticalCount = plans.filter((p) => p.position_status !== "active" || p.risk_of_loss === "high").length;
  const readyNowCount = plans.filter((p) => p.readiness_level === "ready_now").length;
  const vacantCount = plans.filter((p) => p.position_status === "vacant").length;

  const exportPdf = () => {
    const columns = isAr ? [
      { label: "المنصب" }, { label: "الإدارة" }, { label: "الشاغل" }, { label: "البدليل" },
      { label: "الجاهزية" }, { label: "حالة المنصب" }, { label: "خطر المغادرة" }, { label: "الأثر" },
    ] : [
      { label: "Position" }, { label: "Department" }, { label: "Holder" }, { label: "Successor" },
      { label: "Readiness" }, { label: "Position status" }, { label: "Risk of loss" }, { label: "Impact" },
    ];
    const rows = plans.map((p) => [
      p.position_title || "—", p.department || "—",
      p.current_holder_name || "—", p.successor_name || t.noSucc,
      (readinessLabel[p.readiness_level] || readinessLabel.development_needed).label,
      (posStatusLabel[p.position_status] || posStatusLabel.active).label,
      riskLabel(p.risk_of_loss), riskLabel(p.impact_of_loss),
    ]);
    const summary = [
      { label: t.critical, value: criticalCount },
      { label: t.readyNow, value: readyNowCount },
      { label: t.vacant, value: vacantCount },
    ];
    printSection({ title: t.title, subtitle: t.subtitle, isAr, columns, rows, summary });
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} action={(
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf} disabled={plans.length === 0} className="gap-2"><Printer size={17} /> {t.exportPdf}</Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2"><Plus size={18} /> {t.add}</Button>
        </div>
      )} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertTriangle size={20} /></div>
          <div><div className="text-xl font-bold">{criticalCount}</div><div className="text-xs text-muted-foreground">{t.critical}</div></div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><ShieldCheck size={20} /></div>
          <div><div className="text-xl font-bold">{readyNowCount}</div><div className="text-xs text-muted-foreground">{t.readyNow}</div></div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><Crown size={20} /></div>
          <div><div className="text-xl font-bold">{vacantCount}</div><div className="text-xs text-muted-foreground">{t.vacant}</div></div>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
      ) : plans.length === 0 ? (
        <div className="p-14 text-center bg-white rounded-2xl border border-border"><GitBranch size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-muted-foreground">{t.empty}</p></div>
      ) : (
        <div className="space-y-4">
          {plans.map((p) => {
            const ps = posStatusLabel[p.position_status] || posStatusLabel.active;
            const rl = readinessLabel[p.readiness_level] || readinessLabel.development_needed;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2"><Crown size={16} className="text-amber-500" />{p.position_title}</div>
                    <div className="text-xs text-muted-foreground">{p.department} • {t.holder(p.current_holder_name)}</div>
                    {(() => { const h = employees.find((e) => e.id === p.current_holder_id); return h?.national_id ? <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{h.national_id}</div> : null; })()}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={15} /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", ps.cls)}>{ps.label}</span>
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", rl.cls)}>{t.succ}: {rl.label}</span>
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", riskCls[p.risk_of_loss] || riskCls.medium)}>{t.risk}: {riskLabel(p.risk_of_loss)}</span>
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", riskCls[p.impact_of_loss] || riskCls.medium)}>{t.impact}: {riskLabel(p.impact_of_loss)}</span>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-muted-foreground mb-1">{t.succC}</div>
                  <div className="font-medium">{p.successor_name || t.noSucc}</div>
                  {(() => { const s = employees.find((e) => e.id === p.successor_id); return s?.national_id ? <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{s.national_id}</div> : null; })()}
                </div>
                {p.development_plan && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-1">{t.devPlan}</div>
                    <p className="text-sm">{p.development_plan}</p>
                    {p.development_deadline && (
                      <div className="text-xs text-muted-foreground mt-2">{t.due}: {p.development_deadline}{daysUntil(p.development_deadline) !== null && daysUntil(p.development_deadline) < 0 && (<span className="mr-2 text-rose-600 font-medium">{t.late}</span>)}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SuccessionForm open={showForm} employees={employees} editing={editing} onClose={() => setShowForm(false)} onSaved={load} />
    </div>
  );
}