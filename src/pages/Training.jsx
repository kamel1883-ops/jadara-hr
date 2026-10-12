import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, GraduationCap, Search, Eye, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import TrainingPlanFormDialog from "@/components/training/TrainingPlanFormDialog";
import TrainingPlanDetailsDialog from "@/components/training/TrainingPlanDetailsDialog";
import { printSection } from "@/lib/sectionPrint";
import { enrichRecordsWithVault, VAULT_MODULES } from "@/lib/vaultGeneric";

const parseIds = (s) => {
  try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

export default function Training() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { toast } = useToast();
  const t = isAr ? {
    title: "التدريب والتطوير",
    subtitle: "إدارة الخطط التدريبية للموظفين والإدارات وتتبع أهدافها وتكلفتها",
    newPlan: "خطة تدريبية جديدة",
    searchPh: "ابحث باسم الخطة أو اسم الموظف أو رقمه — تظهر كل خطط الموظف المشمول",
    loading: "جارٍ التحميل...",
    emptyQ: "لا توجد خطط مطابقة لبحثك.",
    empty: "لا توجد خطط تدريبية بعد — ابدأ بإنشاء أول خطة.",
    confirmDel: "حذف هذه الخطة؟",
    delOk: "تم الحذف",
    delErr: "تعذر الحذف",
    loadErr: "تعذر التحميل",
    scopeDept: "جهة/قسم",
    scopeIndiv: "نطاق فردي",
    included: "مشمول",
    participantsLabel: "المشمولون:",
    goal: "الهدف",
    sar: "ريال",
    detailsBtn: "استعلام/التفاصيل",
    exportPdf: "طباعة PDF",
  } : {
    title: "Training & Development",
    subtitle: "Manage training plans for employees and departments and track their goals and costs",
    newPlan: "New training plan",
    searchPh: "Search by plan name, employee name or number — all plans for that employee appear",
    loading: "Loading...",
    emptyQ: "No plans match your search.",
    empty: "No training plans yet — start by creating your first plan.",
    confirmDel: "Delete this plan?",
    delOk: "Deleted",
    delErr: "Could not delete",
    loadErr: "Could not load",
    scopeDept: "Department",
    scopeIndiv: "Individual scope",
    included: "participants",
    participantsLabel: "Participants:",
    goal: "Goal",
    sar: "SAR",
    detailsBtn: "View / details",
    exportPdf: "Export PDF",
  };

  const statusMap = {
    draft: { ar: "مسودة", en: "Draft", cls: "bg-slate-100 text-slate-700" },
    in_progress: { ar: "قيد التنفيذ", en: "In progress", cls: "bg-amber-100 text-amber-800" },
    completed: { ar: "مكتملة", en: "Completed", cls: "bg-emerald-100 text-emerald-800" },
    cancelled: { ar: "ملغاة", en: "Cancelled", cls: "bg-red-100 text-red-700" },
  };

  const [plans, setPlans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [pl, emps] = await Promise.all([
        base44.entities.TrainingPlan.list("-created_date", 500),
        base44.entities.Employee.list("-created_date", 500).catch(() => []),
      ]);
      setPlans(pl || []);
      setEmployees(emps || []);
      enrichRecordsWithVault(pl || [], VAULT_MODULES.training, "training_ref", ["deficiency", "goal", "mechanism", "description"]).then(setPlans);
    } catch (e) { toast({ title: t.loadErr, description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setDialogOpen(true); };
  const del = async (p) => {
    if (!confirm(t.confirmDel)) return;
    try { await base44.entities.TrainingPlan.delete(p.id); toast({ title: t.delOk }); load(); }
    catch (e) { toast({ title: t.delErr, description: e.message, variant: "destructive" }); }
  };

  const ql = q.trim().toLowerCase();
  const matchedEmpIds = useMemo(() => {
    const s = new Set();
    if (!ql) return s;
    (employees || []).forEach((e) => {
      if ((e.full_name || "").toLowerCase().includes(ql) || (e.employee_number || "").toLowerCase().includes(ql)) s.add(e.id);
    });
    return s;
  }, [employees, ql]);

  const filtered = (plans || []).filter((p) => {
    if (!ql) return true;
    if ((p.title || "").toLowerCase().includes(ql)) return true;
    const names = p.employee_names || p.employee_name || "";
    if (names.toLowerCase().includes(ql)) return true;
    const ids = parseIds(p.employee_ids);
    for (const id of ids) { if (matchedEmpIds.has(id)) return true; }
    if (matchedEmpIds.has(p.employee_id)) return true;
    return false;
  });

  const exportPdf = () => {
    const columns = isAr ? [
      { label: "عنوان الخطة" }, { label: "النطاق" }, { label: "المشمولون", num: true },
      { label: "الحالة" }, { label: "التكلفة (ر.س)", num: true }, { label: "البداية" }, { label: "النهاية" },
    ] : [
      { label: "Plan title" }, { label: "Scope" }, { label: "Participants", num: true },
      { label: "Status" }, { label: "Cost (SAR)", num: true }, { label: "Start" }, { label: "End" },
    ];
    const rows = filtered.map((p) => {
      const st = statusMap[p.status] || statusMap.draft;
      const ids = parseIds(p.employee_ids);
      const count = ids.length || (p.employee_names ? p.employee_names.split(isAr ? "،" : ",").length : 0);
      return [
        p.title || "—",
        p.scope === "department" ? t.scopeDept + ": " + (p.department || "—") : t.scopeIndiv,
        count, isAr ? st.ar : st.en,
        p.cost || 0, p.start_date || "—", p.end_date || "—",
      ];
    });
    const summary = [
      { label: t.sar, value: filtered.reduce((s, p) => s + (Number(p.cost) || 0), 0).toLocaleString() },
      { label: isAr ? "خطط" : "Plans", value: filtered.length },
    ];
    printSection({ title: t.title, subtitle: t.subtitle, isAr, columns, rows, summary });
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf} disabled={filtered.length === 0}><Printer size={16} /> {t.exportPdf}</Button>
          <Button onClick={openNew}><Plus size={16} /> {t.newPlan}</Button>
        </div>
      } />

      <div className="bg-white rounded-2xl border border-border p-3 mb-4 flex items-center gap-2">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh} className="border-0 shadow-none focus-visible:ring-0 h-9" />
      </div>

      {loading ? (
        <div className="py-24 text-center text-muted-foreground">{t.loading}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 rounded-2xl border bg-card">
          <GraduationCap className="text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground mb-4">{q ? t.emptyQ : t.empty}</p>
          {!q && <Button onClick={openNew}><Plus size={16} /> {t.newPlan}</Button>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const st = statusMap[p.status] || statusMap.draft;
            const names = p.employee_names || p.employee_name || "";
            const ids = parseIds(p.employee_ids);
            const count = ids.length || (names ? names.split(isAr ? "،" : ",").length : 0);
            return (
              <Card key={p.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-foreground">{p.title}</div>
                  <Badge className={st.cls + " border-0"}>{isAr ? st.ar : st.en}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.scope === "department" ? <span>{t.scopeDept}: {p.department || "—"}</span> : <span>{t.scopeIndiv}</span>}
                  {count > 0 && <span className="mx-2">· {count} {t.included}</span>}
                </div>
                {(() => {
                  const ids = parseIds(p.employee_ids);
                  const list = ids.length ? ids : (p.employee_id ? [p.employee_id] : []);
                  const rows = list.map((id) => employees.find((e) => e.id === id)).filter(Boolean);
                  if (rows.length === 0 && !names) return null;
                  return (
                    <div className="text-xs text-slate-700 bg-muted/40 rounded-lg p-2 max-h-24 overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
                      <div className="font-medium text-muted-foreground mb-1">{t.participantsLabel}</div>
                      {rows.length > 0 ? rows.map((e) => (
                        <div key={e.id} className="py-0.5">
                          <div>{e.full_name}</div>
                          <div className="text-muted-foreground tabular-nums" dir="ltr">{e.national_id || "—"}</div>
                        </div>
                      )) : <div>{names}</div>}
                    </div>
                  );
                })()}
                {p.goal && <div className="text-sm text-muted-foreground line-clamp-2">{t.goal}: {p.goal}</div>}
                {(p.prepared_by_name || p.created_by_name) && <div className="text-[11px] text-violet-700 flex items-center gap-1">{isAr ? "أُعدّت بواسطة" : "Prepared by"}: {p.prepared_by_name || p.created_by_name}{(p.prepared_by_id || p.created_by_id) ? ` — ${p.prepared_by_id || p.created_by_id}` : ""}</div>}
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">{p.cost ? `${p.cost} ${t.sar}` : ""} {p.start_date ? `· ${p.start_date}` : ""}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setViewing(p)} title={t.detailsBtn}><Eye size={15} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil size={15} /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TrainingPlanFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} plan={editing} employees={employees} />
      <TrainingPlanDetailsDialog open={!!viewing} onClose={() => setViewing(null)} plan={viewing} />
    </div>
  );
}