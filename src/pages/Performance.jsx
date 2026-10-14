import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import PerformanceForm from "@/components/PerformanceForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Star, Target, TrendingUp, Award, ArrowUpRight, RotateCcw, Search, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { printSection } from "@/lib/sectionPrint";
import { enrichRecordsWithVault, VAULT_MODULES } from "@/lib/vaultGeneric";
import { VaultDocsView } from "@/components/VaultAttachments";

export default function Performance() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const recLabel = isAr ? {
    none: { label: "بدون", cls: "bg-slate-100 text-slate-600" }, maintain: { label: "إبقاء", cls: "bg-blue-50 text-blue-600" },
    promote: { label: "ترقية", cls: "bg-emerald-50 text-emerald-600" }, bonus: { label: "حافز", cls: "bg-violet-50 text-violet-600" },
    warn: { label: "إنذار", cls: "bg-amber-50 text-amber-600" }, terminate: { label: "إنهاء", cls: "bg-rose-50 text-rose-600" },
  } : {
    none: { label: "None", cls: "bg-slate-100 text-slate-600" }, maintain: { label: "Maintain", cls: "bg-blue-50 text-blue-600" },
    promote: { label: "Promote", cls: "bg-emerald-50 text-emerald-600" }, bonus: { label: "Bonus", cls: "bg-violet-50 text-violet-600" },
    warn: { label: "Warn", cls: "bg-amber-50 text-amber-600" }, terminate: { label: "Terminate", cls: "bg-rose-50 text-rose-600" },
  };
  const statusLabel = isAr ? {
    draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600" }, submitted: { label: "مُرسلة", cls: "bg-blue-50 text-blue-600" },
    acknowledged: { label: "معتمدة", cls: "bg-violet-50 text-violet-600" }, completed: { label: "مكتملة", cls: "bg-emerald-50 text-emerald-600" },
  } : {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" }, submitted: { label: "Submitted", cls: "bg-blue-50 text-blue-600" },
    acknowledged: { label: "Acknowledged", cls: "bg-violet-50 text-violet-600" }, completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-600" },
  };
  const ratingCls = (r) => r >= 4.5 ? "text-emerald-600 bg-emerald-50" : r >= 3.5 ? "text-blue-600 bg-blue-50" : r >= 2.5 ? "text-amber-600 bg-amber-50" : "text-rose-600 bg-rose-50";
  const t = isAr ? {
    title: "الأداء والمسارات الوظيفية", subtitle: "تقييم الأداء الدوري وإدارة المسارات الوظيفية والترقيات", add: "تقييم جديد",
    tabReviews: "تقييمات الأداء", tabPaths: "المسارات الوظيفية",
    loading: "جارٍ التحميل...", empty: "لا توجد تقييمات بعد — ابدأ بإنشاء تقييم أداء جديد",
    ready: "جاهز للترقية", noGrade: "غير محدد", perYear: (y, p) => `${y} / ${p}`,
    ladderH: "سلم الدرجات الوظيفية", gradeEmpty: "لا توجد بيانات درجات وظيفية", empCount: (n) => `${n} موظف`,
    promoH: "مرشحو الترقية", promoEmpty: "لا يوجد مرشحون للترقية حالياً",
    reopen: "إعادة التقييم", reopenAsk: "سيُعاد فتح هذا التقييم كمسودة لإعادة التقييم. متابعة؟",
    searchId: "بحث برقم الهوية...", noMatch: "لا توجد نتائج مطابقة لرقم الهوية",
    exportPdf: "طباعة PDF",
  } : {
    title: "Performance & career paths", subtitle: "Periodic performance reviews and career path management", add: "New review",
    tabReviews: "Performance reviews", tabPaths: "Career paths",
    loading: "Loading...", empty: "No reviews yet — create a new performance review",
    ready: "Promotion ready", noGrade: "Unspecified", perYear: (y, p) => `${y} / ${p}`,
    ladderH: "Job grade ladder", gradeEmpty: "No job grade data", empCount: (n) => `${n} employees`,
    promoH: "Promotion candidates", promoEmpty: "No promotion candidates currently",
    reopen: "Re-evaluate", reopenAsk: "This review will be reopened as a draft for re-evaluation. Continue?",
    searchId: "Search by ID...", noMatch: "No results match this ID",
    exportPdf: "Export PDF",
  };

  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [idQuery, setIdQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const [r, e] = await Promise.all([
      base44.entities.Performance.list("-created_date", 500),
      base44.entities.Employee.list("-created_date", 500),
    ]);
    setReviews(r); setEmployees(e);
    try { setUser(await base44.auth.me()); } catch {}
    setLoading(false);
    enrichRecordsWithVault(r, VAULT_MODULES.performance, "perf_ref", ["goals", "personal_goals", "behaviors", "tasks_coverage", "tasks_amendments", "strengths", "improvements", "notes", "documents"]).then(setReviews);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => { await base44.entities.Performance.delete(id); load(); };
  const reopen = async (r) => {
    if (!window.confirm(t.reopenAsk)) return;
    await base44.entities.Performance.update(r.id, { status: "draft" });
    load();
  };

  const gradeLadder = (() => {
    const map = {};
    for (const e of employees) {
      if (e.status !== "active" && e.status !== "on_leave") continue;
      const g = e.job_grade || t.noGrade;
      if (!map[g]) map[g] = [];
      map[g].push(e);
    }
    return Object.entries(map).map(([grade, emps]) => ({ grade, emps })).sort((a, b) => b.emps.length - a.emps.length);
  })();

  const promotionCandidates = reviews.filter((r) => r.promotion_ready || r.recommendation === "promote").filter((r, i, arr) => arr.findIndex((x) => x.employee_id === r.employee_id) === i);

  const q = idQuery.trim();
  const matchIds = new Set();
  if (q) employees.forEach((e) => { if ((e.national_id || "").includes(q)) matchIds.add(e.id); });
  const filteredReviews = q ? reviews.filter((r) => matchIds.has(r.employee_id)) : reviews;
  const filteredLadder = gradeLadder.map(({ grade, emps }) => ({ grade, emps: q ? emps.filter((e) => matchIds.has(e.id)) : emps })).filter((g) => g.emps.length > 0);
  const filteredPromos = q ? promotionCandidates.filter((r) => matchIds.has(r.employee_id)) : promotionCandidates;

  const exportPdf = () => {
    const empName = (id) => employees.find((e) => e.id === id)?.full_name || "—";
    const empNat = (id) => employees.find((e) => e.id === id)?.national_id || "—";
    const recL = (v) => (recLabel[v] || recLabel.none).label;
    const stL = (v) => (statusLabel[v] || statusLabel.draft).label;
    const columns = isAr ? [
      { label: "الموظف" }, { label: "الهوية", num: true }, { label: "الإدارة" },
      { label: "الفترة" }, { label: "التقييم", num: true }, { label: "التوصية" },
      { label: "الحالة" }, { label: "الدرجة الحالية" }, { label: "الدرجة المستهدفة" },
    ] : [
      { label: "Employee" }, { label: "National ID", num: true }, { label: "Department" },
      { label: "Period" }, { label: "Rating", num: true }, { label: "Recommendation" },
      { label: "Status" }, { label: "Current grade" }, { label: "Target grade" },
    ];
    const rows = filteredReviews.map((r) => [
      empName(r.employee_id), empNat(r.employee_id), r.department || "—",
      t.perYear(r.period_year, r.review_period),
      r.overall_rating > 0 ? (Math.round(r.overall_rating * 10) / 10) + " / 5" : "—",
      recL(r.recommendation), stL(r.status),
      r.current_grade || "—", r.target_grade || "—",
    ]);
    printSection({ title: t.title, subtitle: t.tabReviews, isAr, columns, rows });
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} action={(
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf} className="gap-2" disabled={filteredReviews.length === 0}><Printer size={17} /> {t.exportPdf}</Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2"><Plus size={18} /> {t.add}</Button>
        </div>
      )} />

      <div className="relative max-w-md mt-2 mb-3">
        <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
        <Input value={idQuery} onChange={(e) => setIdQuery(e.target.value)} placeholder={t.searchId} className="ps-9" inputMode="numeric" />
      </div>

      <Tabs defaultValue="reviews" className="mt-2">
        <TabsList>
          <TabsTrigger value="reviews">{t.tabReviews}</TabsTrigger>
          <TabsTrigger value="paths">{t.tabPaths}</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
          ) : filteredReviews.length === 0 ? (
            <div className="p-14 text-center bg-white rounded-2xl border border-border"><Star size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-muted-foreground">{q ? t.noMatch : t.empty}</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReviews.map((r) => {
                const rec = recLabel[r.recommendation] || recLabel.none;
                const st = statusLabel[r.status] || statusLabel.draft;
                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-border p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{employees.find((e) => e.id === r.employee_id)?.full_name || r.employee_name}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">{employees.find((e) => e.id === r.employee_id)?.national_id || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.department} • {t.perYear(r.period_year, r.review_period)}</div>
                      </div>
                      {r.overall_rating > 0 && (<span className={cn("shrink-0 text-xs font-bold px-2 py-1 rounded-full", ratingCls(r.overall_rating))}>{Math.round(r.overall_rating * 10) / 10} / 5</span>)}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn("text-xs px-2 py-1 rounded-full font-medium", rec.cls)}>{rec.label}</span>
                      <span className={cn("text-xs px-2 py-1 rounded-full font-medium", st.cls)}>{st.label}</span>
                      {r.promotion_ready && (<span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-50 text-emerald-600 flex items-center gap-1"><ArrowUpRight size={12} /> {t.ready}</span>)}
                    </div>
                    {(r.target_grade || r.current_grade) && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Target size={14} />{r.current_grade || "—"} ← <span className="font-medium text-foreground">{r.target_grade || "—"}</span></div>
                    )}
                    {r.review_type === "goal_setting"
                      ? (r.personal_goals || r.behaviors || r.tasks_coverage) && <p className="text-xs text-muted-foreground line-clamp-2">{r.personal_goals || r.behaviors || r.tasks_coverage}</p>
                      : r.goals && <p className="text-xs text-muted-foreground line-clamp-2">{r.goals}</p>}
                    <VaultDocsView value={r.documents} isAr={isAr} />
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <span className="text-xs text-muted-foreground">{r.review_date || ""}</span>
                      <div className="flex gap-1">
                        {(r.status === "acknowledged" || r.status === "completed") && (
                          <button onClick={() => reopen(r)} title={t.reopen} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" aria-label={t.reopen}><RotateCcw size={15} /></button>
                        )}
                        <button onClick={() => { setEditing(r); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={15} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paths">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp size={16} /> {t.ladderH}</h3>
              {filteredLadder.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground bg-white rounded-2xl border border-border text-sm">{q ? t.noMatch : t.gradeEmpty}</div>
              ) : filteredLadder.map(({ grade, emps }) => (
                <div key={grade} className="bg-white rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">{grade}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{t.empCount(emps.length)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {emps.map((e) => (<span key={e.id} className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 border border-border"><span className="block">{e.full_name}</span><span className="block text-[10px] text-muted-foreground tabular-nums" dir="ltr">{e.national_id || "—"}</span></span>))}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Award size={16} /> {t.promoH}</h3>
              {filteredPromos.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground bg-white rounded-2xl border border-border text-sm">{q ? t.noMatch : t.promoEmpty}</div>
              ) : filteredPromos.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-border p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{employees.find((e) => e.id === r.employee_id)?.full_name || r.employee_name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{employees.find((e) => e.id === r.employee_id)?.national_id || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.department}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Target size={12} /> {r.current_grade || "—"} → {r.target_grade || "—"}</div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className={cn("text-sm font-bold", ratingCls(r.overall_rating))}>{Math.round(r.overall_rating * 10) / 10}/5</div>
                    <div className="text-xs text-muted-foreground">{r.period_year}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <PerformanceForm open={showForm} employees={employees} editing={editing} user={user} onClose={() => setShowForm(false)} onSaved={load} />
    </div>
  );
}