import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, Plus, Trash2, Calculator, PieChart as PieIcon, BarChart3, TrendingUp, Printer } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Line, ComposedChart,
} from "recharts";
import { computeHrBudget, computeBudgetKpis, monthlyActualsFromPayrolls, budgetMonthlyPlan, BUDGET_INPUT_DEFAULTS } from "@/lib/hrBudget";
import { formatCurrency } from "@/lib/hr";
import { getCurrentOrgContext } from "@/lib/currentOrg";
import { printReport } from "@/lib/reportPrint";
import DocApprovalMark from "@/components/docs/DocApprovalMark";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#0d9488", "#4338ca", "#b45309", "#be123c"];

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// حقول المدخلات اليدوية — مجمّعة بنفس ترتيب البنود
const INPUT_SECTIONS = [
  {
    key: "salaries", ar: "الرواتب والبدلات", en: "Salaries & Allowances",
    fields: [
      { key: "overtime_annual", ar: "العمل الإضافي (سنوي)", en: "Overtime (annual)" },
      { key: "incentives_annual", ar: "الحوافز والمكافآت والعمولات (سنوي)", en: "Incentives & bonuses (annual)" },
      { key: "raise_pct", ar: "مخصص الزيادات السنوية %", en: "Annual raises %", pct: true },
    ],
  },
  {
    key: "gosi", ar: "التأمينات الاجتماعية", en: "Social Insurance (GOSI)",
    fields: [
      { key: "gosi_reserve_pct", ar: "احتياطي فروقات/غرامات %", en: "Differences reserve %", pct: true },
    ],
  },
  {
    key: "medical", ar: "التأمين الطبي", en: "Medical Insurance",
    fields: [
      { key: "medical_employee_premium", ar: "قسط الموظف السنوي (ر.س)", en: "Employee annual premium (SAR)" },
      { key: "dependents_count", ar: "عدد التابعين", en: "Dependents count" },
      { key: "medical_dependent_premium", ar: "قسط التابع السنوي (ر.س)", en: "Dependent annual premium (SAR)" },
      { key: "medical_upgrade", ar: "فروقات ترقية التغطية/أمراض مزمنة", en: "Coverage upgrades / chronic" },
      { key: "medical_renewal_pct", ar: "احتياطي زيادة التجديد %", en: "Renewal increase reserve %", pct: true },
    ],
  },
  {
    key: "iqama", ar: "الإقامة والجوازات والرخص", en: "Iqama, Visas & Permits",
    fields: [
      { key: "iqama_services", ar: "فحوصات وترجمة وتصديق وتأشيرات ونقل كفالة", en: "Medicals, translation, visas, transfers" },
    ],
  },
  {
    key: "housing", ar: "السكن والمرافق", en: "Housing & Utilities",
    fields: [
      { key: "housing_cash_annual", ar: "بدل السكن النقدي — الإجمالي السنوي المدفوع للموظفين", en: "Cash housing allowance — annual total paid to employees" },
      { key: "housing_rent", ar: "إيجارات سكن إداري/سكني", en: "Administrative / staff rent" },
      { key: "housing_utilities", ar: "كهرباء وماء", en: "Electricity & water" },
      { key: "housing_maintenance", ar: "صيانة وأثاث وإنترنت ورسوم بلدية", en: "Maintenance, furniture, internet, fees" },
      { key: "housing_tickets", ar: "تذاكر طيران سنوية للمقيمين", en: "Annual expat flight tickets" },
    ],
  },
  {
    key: "transport", ar: "النقل والسيارات", en: "Transport & Vehicles",
    fields: [
      { key: "fleet_fuel_monthly", ar: "وقود لكل سيارة (شهري)", en: "Fuel per car (monthly)" },
      { key: "fleet_maintenance_annual", ar: "صيانة لكل سيارة (سنوي)", en: "Maintenance per car (annual)" },
      { key: "fleet_insurance_annual", ar: "تأمين لكل سيارة (سنوي)", en: "Insurance per car (annual)" },
      { key: "fleet_inspection_fee", ar: "فحص دوري لكل سيارة", en: "Inspection per car" },
      { key: "rental_cars_count", ar: "عدد السيارات المؤجرة", en: "Rented cars count" },
      { key: "rental_monthly", ar: "الإيجار الشهري للسيارة المؤجرة", en: "Monthly rent per rented car" },
      { key: "fuel_allowance_beneficiaries", ar: "مستفيدي بدل البنزين (عدد)", en: "Fuel allowance beneficiaries" },
      { key: "fuel_allowance_monthly", ar: "بدل البنزين الشهري", en: "Monthly fuel allowance" },
    ],
  },
  {
    key: "eos", ar: "نهاية الخدمة والإجازات", en: "EOS & Leave",
    fields: [
      { key: "eos_settlements", ar: "تسويات وإنهاءات غير متوقعة", en: "Unexpected settlements" },
    ],
  },
  {
    key: "recruitment", ar: "التوظيف والاستقدام", en: "Recruitment",
    fields: [
      { key: "recruit_visas", ar: "رسوم تأشيرات واستقدام", en: "Visa & mobilization fees" },
      { key: "recruit_transfer", ar: "نقل كفالة/خدمات عبر قوى", en: "Sponsorship transfer via Qiwa" },
      { key: "recruit_medical", ar: "فحوصات وتصديقات وتذاكر تعيين", en: "Hiring medicals, attestations, tickets" },
      { key: "recruit_agency", ar: "مكاتب استقدام ووكالات توظيف", en: "Recruitment agencies" },
      { key: "recruit_ads", ar: "إعلانات ومنصات و اختبارات ومقابلات", en: "Ads, platforms, tests & interviews" },
      { key: "recruit_bonus", ar: "مكافأة تعيين/انتقال", en: "Joining / relocation bonus" },
    ],
  },
  {
    key: "training", ar: "التدريب والتطوير", en: "Training & Development",
    fields: [
      { key: "training_external", ar: "تدريب خارجي ودورات وشهادات", en: "External training & certifications" },
      { key: "training_internal", ar: "تدريب داخلي ومنصات تعليم", en: "Internal training & e-learning" },
      { key: "training_conferences", ar: "مؤتمرات ومعارض", en: "Conferences & exhibitions" },
      { key: "training_leaders", ar: "تطوير قيادات وتأهيل السعوديين", en: "Leadership & Saudi qualification" },
    ],
  },
  {
    key: "other", ar: "بنود إضافية", en: "Other Items",
    fields: [
      { key: "other_uniforms", ar: "زي موحد ومهمات", en: "Uniforms & gear" },
      { key: "other_care", ar: "رعاية تكميلية/تأمين حياة", en: "Supplementary care / life insurance" },
      { key: "other_children", ar: "بدل أطفال/تعليم", en: "Children / education" },
      { key: "other_welfare", ar: "أنشطة ورفاهية", en: "Activities & welfare" },
      { key: "other_legal", ar: "استشارات قانونية", en: "Legal consultations" },
      { key: "platform_extra", ar: "رسوم منصات إضافية", en: "Other platform fees" },
      { key: "contingency_pct", ar: "احتياطي طوارئ % من الإجمالي", en: "Contingency % of total", pct: true },
    ],
  },
];

export default function HrBudget() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { toast } = useToast();
  const t = isAr ? {
    title: "ميزانية الموارد البشرية السنوية", subtitle: "كل ريال يُصرف على الموظف معروف بالنسبة لك",
    loading: "جارٍ تحميل بيانات الميزانية...",
    inputs: "مدخلات الميزانية", inputsHint: "البنود المرتبطة بالموظفين محسوبة تلقائياً — أدخِل هنا بنود التكاليف الأخرى.",
    customPlatforms: "منصات مخصّصة", addPlatform: "إضافة منصة", platformName: "اسم المنصة", platformCost: "التكلفة السنوية",
    budgetTable: "بنود الميزانية السنوية", autoBadge: "تلقائي", inputBadge: "إدخال",
    total: "الإجمالي", contingency: (p) => `احتياطي طوارئ (${p}%)`, grandTotal: "إجمالي الميزانية السنوية",
    kpis: "مؤشرات الأداء", kpiCost: "تكلفة الموظف السنوية", kpiSalariesPct: "نسبة الرواتب من الميزانية",
    kpiTraining: "التدريب لكل موظف", kpiSaudization: "نسبة السعودة", kpiEos: "مخصص نهاية الخدمة % من الرواتب",
    kpiFleet: "تكلفة السيارة سنوياً", kpiHc: "العمالة (سعوديون / مقيمون / تابعون)", kpiVehicles: "عدد السيارات",
    charts: "الرسوم البيانية", chartBars: "مبالغ البنود السنوية", chartPie: "نسبة كل بند من الإجمالي",
    vsActual: "الميزانية مقابل الفعلي (شهرياً)", vsHint: "الفعلي = كشوف الرواتب المصروفة + حصة صاحب العمل في التأمينات.",
    plan: "الخطة (الميزانية ÷ 12)", actual: "الفعلي",
    save: "حفظ الميزانية", saving: "جارٍ الحفظ...", saved: "تم حفظ الميزانية", saveFail: "تعذّر الحفظ",
    print: "طباعة الميزانية", printing: "جارٍ تجهيز الطباعة...", printStampYear: (y) => `ميزانية الموارد البشرية — ${y}`,
    yearLabel: "سنة الميزانية", printHeadcount: "العمالة النشطة", printPrepared: "أُعدّت بواسطة", printDate: "تاريخ الإصدار",
  } : {
    title: "Annual HR Budget", subtitle: "Every riyal spent on employees is accounted for",
    loading: "Loading budget data...",
    inputs: "Budget inputs", inputsHint: "Employee-linked lines are computed automatically — enter the other cost lines here.",
    customPlatforms: "Custom platforms", addPlatform: "Add platform", platformName: "Platform name", platformCost: "Annual cost",
    budgetTable: "Annual budget lines", autoBadge: "Auto", inputBadge: "Input",
    total: "Total", contingency: (p) => `Contingency (${p}%)`, grandTotal: "Total annual budget",
    kpis: "KPIs", kpiCost: "Cost per employee", kpiSalariesPct: "Salaries % of budget",
    kpiTraining: "Training per employee", kpiSaudization: "Saudization rate", kpiEos: "EOS provision % of salaries",
    kpiFleet: "Cost per vehicle / year", kpiHc: "Workforce (Saudis / expats / dependents)", kpiVehicles: "Vehicles",
    charts: "Charts", chartBars: "Annual line amounts", chartPie: "Each line's share of total",
    vsActual: "Budget vs actual (monthly)", vsHint: "Actual = paid payroll sheets + employer GOSI share.",
    plan: "Plan (budget ÷ 12)", actual: "Actual",
    save: "Save budget", saving: "Saving...", saved: "Budget saved", saveFail: "Could not save",
    print: "Print budget", printing: "Preparing print...", printStampYear: (y) => `Annual HR Budget — ${y}`,
    yearLabel: "Budget year", printHeadcount: "Active workforce", printPrepared: "Prepared by", printDate: "Issue date",
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [org, setOrg] = useState(null);
  const [unified, setUnified] = useState("");
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [inputs, setInputs] = useState({ ...BUDGET_INPUT_DEFAULTS });
  const [recordId, setRecordId] = useState(null);
  const [savedMeta, setSavedMeta] = useState(null);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef(null);
  const [printMe, setPrintMe] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { org: current, unified: u } = await getCurrentOrgContext();
        setOrg(current); setUnified(u);
        const [emps, vehs, plats, pays] = await Promise.all([
          base44.entities.Employee.list("-created_date", 1000).catch(() => []),
          base44.entities.Vehicle.list("-created_date", 500).catch(() => []),
          base44.entities.PlatformSubscription.list("-created_date", 500).catch(() => []),
          base44.entities.Payroll.filter({ year }, "-created_date", 2000).catch(() => []),
        ]);
        setEmployees(emps); setVehicles(vehs); setPlatforms(plats); setPayrolls(pays);
      } catch { /* تُعرض المدخلات الافتراضية */ }
      setLoading(false);
    })();
  }, [year]);

  // تحميل الميزانية المحفوظة للسنة الحالية
  useEffect(() => {
    if (!unified) return;
    (async () => {
      try {
        const rows = await base44.entities.HrBudget.filter({ unified_number: unified, year }, "-created_date", 1);
        const row = rows && rows[0];
        if (row) {
          setRecordId(row.id);
          setSavedMeta({ date: row.created_date || "", by: row.prepared_by_name || "" });
          try { setInputs({ ...BUDGET_INPUT_DEFAULTS, ...(row.inputs_json ? JSON.parse(row.inputs_json) : {}) }); }
          catch { setInputs({ ...BUDGET_INPUT_DEFAULTS }); }
        } else {
          setRecordId(null);
          setSavedMeta(null);
          setInputs({ ...BUDGET_INPUT_DEFAULTS });
        }
      } catch { setRecordId(null); setSavedMeta(null); }
    })();
  }, [unified, year]);

  const budget = useMemo(
    () => computeHrBudget({ employees, org, vehicles, platformSubs: platforms, inputs }),
    [employees, org, vehicles, platforms, inputs]
  );
  const kpis = useMemo(() => computeBudgetKpis(budget), [budget]);
  const months = isAr ? MONTHS_AR : MONTHS_EN;
  const actualMonthly = useMemo(() => monthlyActualsFromPayrolls(payrolls, year), [payrolls, year]);
  const planMonthly = useMemo(() => budgetMonthlyPlan(budget.grandTotal), [budget.grandTotal]);
  const vsData = months.map((m, i) => ({ name: m, plan: planMonthly[i], actual: actualMonthly[i] }));

  const barsData = budget.categories.map((c) => ({ name: c.ar, short: isAr ? c.ar : c.en, value: c.total }));
  const pieData = budget.categories.filter((c) => c.total > 0).map((c) => ({ name: isAr ? c.ar : c.en, value: c.total }));

  const setField = (key, v) => setInputs((s) => ({ ...s, [key]: v === "" ? 0 : Number(v) || 0 }));

  const onPrint = async () => {
    if (!printRef.current) return;
    setPrinting(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      setPrintMe(me?.full_name || me?.name || me?.email || "");
      // ننتظر رسم قسم الطباعة (بعد تحديث اسم المُعِدّ) ثم نصدّر PDF بنفس ترويسة باقي مستندات النظام
      await new Promise((r) => setTimeout(r, 80));
      await printReport(printRef.current, {
        org,
        title: t.printStampYear(year),
        subtitle: t.title,
        landscape: true,
        // قبل الحفظ: نسخة مسودة لا تُؤرشف. بعد الحفظ: معتمدة وتُؤرشف على الخزنة.
        draft: !recordId,
      });
    } finally {
      setPrinting(false);
    }
  };

  const addPlatform = () => setInputs((s) => ({ ...s, custom_platforms: [...(s.custom_platforms || []), { label: "", amount: 0 }] }));
  const setPlatformField = (i, patch) => setInputs((s) => {
    const list = [...(s.custom_platforms || [])];
    list[i] = { ...list[i], ...patch };
    return { ...s, custom_platforms: list };
  });
  const removePlatform = (i) => setInputs((s) => ({ ...s, custom_platforms: (s.custom_platforms || []).filter((_, x) => x !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const payload = {
        unified_number: unified,
        year,
        inputs_json: JSON.stringify(inputs),
        grand_total: budget.grandTotal,
        headcount: budget.headcount.total,
        prepared_by_name: me?.full_name || me?.name || "",
        prepared_by_id: me?.id || me?.email || "",
      };
      if (recordId) await base44.entities.HrBudget.update(recordId, payload);
      else {
        const created = await base44.entities.HrBudget.create(payload);
        setRecordId(created?.id || null);
      }
      setSavedMeta({ date: new Date().toISOString(), by: payload.prepared_by_name });
      toast({ title: t.saved });
    } catch {
      toast({ title: t.saveFail, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground" dir={isAr ? "rtl" : "ltr"}>{t.loading}</div>;

  const pctFmt = (v) => `${(v || 0).toFixed(1)}%`;
  const savedDate = savedMeta?.date ? new Date(savedMeta.date).toLocaleDateString(isAr ? "ar-SA" : "en-GB") : "";

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t.yearLabel}</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())} className="w-24" />
            </div>
            <DocApprovalMark variant="chip" approved={!!recordId} isAr={isAr} date={savedDate} by={savedMeta?.by} />
            <Button variant="outline" onClick={onPrint} disabled={printing} className="gap-2">
              {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} {printing ? t.printing : t.print}
            </Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? t.saving : t.save}
            </Button>
          </div>
        }
      />

      {/* مؤشرات سريعة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <KpiCard icon={<Calculator size={18} />} label={t.kpiCost} value={formatCurrency(kpis.costPerEmployee)} />
        <KpiCard icon={<TrendingUp size={18} />} label={t.kpiSalariesPct} value={pctFmt(kpis.salariesPct)} />
        <KpiCard icon={<BarChart3 size={18} />} label={t.kpiTraining} value={formatCurrency(kpis.trainingPerEmployee)} />
        <KpiCard icon={<PieIcon size={18} />} label={t.kpiSaudization} value={pctFmt(kpis.saudizationPct)} />
        <KpiCard icon={<TrendingUp size={18} />} label={t.kpiEos} value={pctFmt(kpis.eosPctOfSalaries)} />
        <KpiCard icon={<BarChart3 size={18} />} label={t.kpiFleet} value={formatCurrency(kpis.fleetPerVehicle)} />
        <KpiCard icon={<TrendingUp size={18} />} label={t.kpiHc} value={`${budget.headcount.total} (${budget.headcount.saudis} / ${budget.headcount.expats} / ${budget.headcount.dependents})`} />
        <KpiCard icon={<BarChart3 size={18} />} label={t.kpiVehicles} value={String(budget.vehicles)} />
      </div>

      <div className="grid xl:grid-cols-5 gap-6 mb-7">
        {/* المدخلات */}
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">{t.inputs}</CardTitle></CardHeader>
          <CardContent className="space-y-5 max-h-[70vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground">{t.inputsHint}</p>
            {INPUT_SECTIONS.map((sec) => (
              <div key={sec.key}>
                <div className="font-semibold text-sm mb-2 text-primary">{isAr ? sec.ar : sec.en}</div>
                <div className="grid grid-cols-2 gap-3">
                  {sec.fields.map((f) => (
                    <div key={f.key}>
                      <Label className="text-[11px] leading-tight mb-1 block">{isAr ? f.ar : f.en}</Label>
                      <Input
                        type="number" min="0"
                        value={inputs[f.key] ?? 0}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {/* منصات مخصّصة */}
            <div>
              <div className="font-semibold text-sm mb-2 text-primary">{t.customPlatforms}</div>
              <div className="space-y-2">
                {(inputs.custom_platforms || []).map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder={t.platformName} value={p.label} onChange={(e) => setPlatformField(i, { label: e.target.value })} className="h-8 text-sm flex-1" />
                    <Input type="number" min="0" placeholder={t.platformCost} value={p.amount} onChange={(e) => setPlatformField(i, { amount: Number(e.target.value) || 0 })} className="h-8 text-sm w-28" />
                    <Button variant="ghost" size="icon" onClick={() => removePlatform(i)}><Trash2 size={14} /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPlatform} className="gap-1"><Plus size={14} /> {t.addPlatform}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جدول البنود */}
        <Card className="xl:col-span-3">
          <CardHeader><CardTitle className="text-base">{t.budgetTable}</CardTitle></CardHeader>
          <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
            {budget.categories.map((cat) => (
              <div key={cat.key} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                  <div className="font-semibold text-sm">{isAr ? cat.ar : cat.en}</div>
                  <div className="font-bold text-sm tabular-nums">{formatCurrency(cat.total)}</div>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {cat.items.map((it) => (
                      <tr key={it.key} className="border-t">
                        <td className="px-4 py-1.5">
                          {isAr ? it.ar : it.en}
                          <span className={cn("ms-2 text-[10px] px-1.5 py-0.5 rounded-full", it.source === "auto" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                            {it.source === "auto" ? t.autoBadge : t.inputBadge}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 tabular-nums text-left w-40">{formatCurrency(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div className="flex justify-between border-t pt-3 text-sm">
              <span>{t.contingency(budget.contingency_pct)}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(budget.contingency)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>{t.grandTotal}</span>
              <span className="tabular-nums text-primary">{formatCurrency(budget.grandTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية */}
      <Card className="mb-7">
        <CardHeader><CardTitle className="text-base">{t.charts}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="text-sm font-semibold mb-2">{t.chartBars}</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="short" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {barsData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">{t.chartPie}</div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الميزانية مقابل الفعلي */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t.vsActual}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">{t.vsHint}</p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={vsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />                  <Bar dataKey="actual" fill="#0891b2" radius={[4, 4, 0, 0]} name={t.actual} />
                  <Line dataKey="plan" stroke="#dc2626" strokeWidth={2} dot={false} name={t.plan} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* قسم الطباعة — خارج الشاشة، يُصدَّر PDF بلوحة أفقية بنفس ترويسة باقي مستندات النظام */}
      <div
        aria-hidden
        ref={printRef}
        dir={isAr ? "rtl" : "ltr"}
        style={{ position: "fixed", top: 0, right: isAr ? "auto" : "-99999px", left: isAr ? "-99999px" : "auto", width: "1075px", background: "#fff", color: "#0b1120", padding: 0, zIndex: -1, fontFamily: "inherit" }}
      >
        {/* ختم حالة الميزانية داخل المستند: مسودة قبل الحفظ، معتمدة بعده */}
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "10px" }}>
          <DocApprovalMark approved={!!recordId} isAr={isAr} date={savedDate} by={savedMeta?.by} />
        </div>

        {/* مؤشرات */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px", fontSize: "11px" }}>
          <tbody>
            <tr>
              {[
                [t.kpiCost, formatCurrency(kpis.costPerEmployee)],
                [t.kpiSalariesPct, pctFmt(kpis.salariesPct)],
                [t.kpiTraining, formatCurrency(kpis.trainingPerEmployee)],
                [t.kpiSaudization, pctFmt(kpis.saudizationPct)],
              ].map(([l, v]) => (
                <td key={l} style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: "9px", color: "#666" }}>{l}</div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>{v}</div>
                </td>
              ))}
            </tr>
            <tr>
              {[
                [t.kpiEos, pctFmt(kpis.eosPctOfSalaries)],
                [t.kpiFleet, formatCurrency(kpis.fleetPerVehicle)],
                [t.kpiHc, `${budget.headcount.total} (${budget.headcount.saudis} / ${budget.headcount.expats} / ${budget.headcount.dependents})`],
                [t.kpiVehicles, String(budget.vehicles)],
              ].map(([l, v]) => (
                <td key={l} style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: "9px", color: "#666" }}>{l}</div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>{v}</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* جدول البنود الكامل */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px", marginBottom: "10px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={{ border: "1px solid #94a3b8", padding: "5px 10px", textAlign: "right" }}>{t.budgetTable}</th>
              <th style={{ border: "1px solid #94a3b8", padding: "5px 10px", width: "90px", textAlign: "center" }}>{t.autoBadge}</th>
              <th style={{ border: "1px solid #94a3b8", padding: "5px 10px", width: "160px", textAlign: "center" }}>{t.total}</th>
            </tr>
          </thead>
          <tbody>
            {budget.categories.map((cat) => (
              <React.Fragment key={cat.key}>
                <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                  <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "5px 10px" }}>{isAr ? cat.ar : cat.en}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "5px 10px", textAlign: "center" }}>{formatCurrency(cat.total)}</td>
                </tr>
                {cat.items.map((it) => (
                  <tr key={it.key}>
                    <td style={{ border: "1px solid #e2e8f0", padding: "4px 10px" }}>{isAr ? it.ar : it.en}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "4px 10px", textAlign: "center", fontSize: "9px", color: it.source === "auto" ? "#059669" : "#64748b" }}>
                      {it.source === "auto" ? t.autoBadge : t.inputBadge}
                    </td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "4px 10px", textAlign: "center" }}>{formatCurrency(it.amount)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            <tr>
              <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "5px 10px", fontWeight: 600 }}>{t.contingency(budget.contingency_pct)}</td>
              <td style={{ border: "1px solid #cbd5e1", padding: "5px 10px", textAlign: "center" }}>{formatCurrency(budget.contingency)}</td>
            </tr>
            <tr style={{ background: "#f1f5f9", fontWeight: 800 }}>
              <td colSpan={2} style={{ border: "1px solid #94a3b8", padding: "6px 10px" }}>{t.grandTotal}</td>
              <td style={{ border: "1px solid #94a3b8", padding: "6px 10px", textAlign: "center", fontSize: "12px" }}>{formatCurrency(budget.grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* الرسوم البيانية — بنفس محتوى الشاشة لتطابق الأرقام */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "10px", fontWeight: 700, marginBottom: "4px" }}>{t.chartBars}</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="short" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={64} />
                <YAxis tick={{ fontSize: 9 }} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {barsData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "10px", fontWeight: 700, marginBottom: "4px" }}>{t.chartPie}</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={85} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 9 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, marginBottom: "4px" }}>{t.vsActual}</div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={vsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Bar dataKey="actual" fill="#0891b2" radius={[3, 3, 0, 0]} name={t.actual} />
              <Line dataKey="plan" stroke="#dc2626" strokeWidth={2} dot={false} name={t.plan} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* تذييل: المُعِدّ + التاريخ */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#666", borderTop: "1px solid #cbd5e1", paddingTop: "6px" }}>
          <span>{t.printPrepared}: {printMe || "—"}</span>
          <span>{t.printDate}: {new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
          <div className="font-bold text-sm tabular-nums truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}