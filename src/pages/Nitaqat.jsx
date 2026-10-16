import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentOrgContext, invalidateCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import { Users, UserCheck, Globe2, TrendingUp, AlertTriangle, ShieldCheck, Info, RefreshCw, CloudDownload, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { BAND_META, computeNitaqat, findActivity, loadNitaqatCatalog, refreshNitaqatCatalog, saudisNeededForSafe } from "@/lib/nitaqat";
import NitaqatIsicSelect from "@/components/NitaqatIsicSelect";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function Nitaqat() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { toast } = useToast();
  const t = isAr ? {
    title: "النطاقات (نسبة التوطين)", subtitle: "النطاق من النشاط التفصيلي للمنشأة وعدد السعوديين وعدد الوافدين",
    isicHint: "اختر النشاط الرئيسي، ثم النشاط التفصيلي الذي يندرج تحته.",
    chooseActivity: "اختر النشاط التفصيلي حتى يُحسب النطاق. العدد يُؤخذ من الموظفين النشطين: سعوديون ووافدون.",
    noFormula: "هذا النشاط التفصيلي ظاهر في الدليل، ولا توجد له معادلة توطين منشورة، لذلك لا يُعرض له نطاق.",
    saudis: "سعوديون نشطون", expats: "مقيمون نشطون", total: "إجمالي العمالة النشطة", pct: "نسبة التوطين",
    currentBand: "النطاق الحالي",
    formulaNote: "الحد = م × لوغ(إجمالي العمالة) + ث. الثوابت (م، ث) خاصة بالنشاط التفصيلي المختار، والنسبة = السعوديون ÷ (السعوديون + الوافدون).",
    provNote: "يتغير النطاق إذا تغيّر النشاط أو عدد السعوديين أو عدد الوافدين.",
    microNote: "الكيان متناهي الصغر (أقل من 6 عاملين): يكفي توظيف سعودي واحد (ولو كان المالك) للبقاء في النطاق الأخضر.",
    bandsH: "نسب النطاقات لنشاطك عند حجم عمالتك الحالي",
    saudNeeded: "السعوديون المطلوبون للخروج من النطاق الأحمر",
    benefits: "المزايا المتاحة في هذا النطاق", risks: "الإشكاليات والمخاطر",
    noBenefits: "لا توجد مزايا في هذا النطاق", noRisks: "لا توجد إشكاليات في هذا النطاق",
    saved: "تم تحديث النشاط", saving: "جارٍ الحفظ...",
    tierSafe: "آمن", tierWarn: "تحذير", tierDanger: "خطر",
    syncTitle: "بيانات النسب من المصدر الرسمي (منصة قوى)",
    syncNow: "مزامنة الآن", syncing: "جارٍ المزامنة…",
    lastSync: "آخر مزامنة", sourceLabel: "المصدر", activitiesLabel: "نشاط تفصيلي",
    statusOk: "مُزامَن مع المصدر الرسمي — أي تعديل وزاري في النسب ينتقل إلى النظام تلقائياً.",
    statusUnchanged: "لا تغيير في نسب النشاط منذ آخر مزامنة مع المصدر الرسمي.",
    statusFailed: "تعذّر الاتصال بالمصدر الرسمي الآن — المعروض هو آخر نسخة رسمية مخزّنة، ولم تُفقَد أي بيانات.",
    statusBundled: "النسخة المُرفقة مع النظام — اضغط «مزامنة الآن» للقراءة من المصدر الرسمي.",
    syncDone: "تمت المزامنة مع المصدر الرسمي", syncFail: "تعذّر الاتصال بالمصدر الرسمي",
    importLabel: "اعتماد نسخة رسمية محدّثة", importing: "جارٍ قراءة الملف…",
    importHint: "إن حدّثت الوزارة النسب ونزّلت الملف الرسمي من منصة قوى، ارفعه هنا فيُعتمد فوراً لدى كل المنشآت.",
    importDone: "تم اعتماد النسخة الرسمية المحدّثة", importFail: "ملف غير صالح — تأكد أنه ملف النسب الرسمي",
  } : {
    title: "Nitaqat (Saudization)", subtitle: "The band comes from the detailed activity plus the Saudi and expat counts",
    isicHint: "Choose the main activity, then the detailed activity under it.",
    chooseActivity: "Choose the detailed activity to calculate the band. Counts come from active employees: Saudis and expats.",
    noFormula: "This detailed activity is in the guide, but it has no published Saudization formula, so no band is shown.",
    saudis: "Active Saudis", expats: "Active expats", total: "Total active workforce", pct: "Saudization %",
    currentBand: "Current band",
    formulaNote: "Limit = m × ln(total headcount) + c. The coefficients belong to the selected detailed activity. The rate is Saudis ÷ (Saudis + expats).",
    provNote: "The band changes when the activity, the Saudi count, or the expat count changes.",
    microNote: "Micro entity (under 6 workers): one Saudi hire (even the owner) keeps you in Green.",
    bandsH: "Nitaqat thresholds for your activity at your current headcount",
    saudNeeded: "Saudis needed to leave the Red band",
    benefits: "Benefits available in this band", risks: "Issues & risks",
    noBenefits: "No benefits in this band", noRisks: "No issues in this band",
    saved: "Activity updated", saving: "Saving...",
    tierSafe: "Safe", tierWarn: "Warning", tierDanger: "Danger",
    syncTitle: "Ratios from the official source (Qiwa)",
    syncNow: "Sync now", syncing: "Syncing…",
    lastSync: "Last sync", sourceLabel: "Source", activitiesLabel: "detailed activities",
    statusOk: "Synced with the official source — any ministerial change to the ratios flows into the system automatically.",
    statusUnchanged: "No change in the activity ratios since the last sync with the official source.",
    statusFailed: "The official source could not be reached now — what you see is the last official data stored, and nothing was lost.",
    statusBundled: "The copy bundled with the system — press “Sync now” to read from the official source.",
    syncDone: "Synced with the official source", syncFail: "Could not reach the official source",
    importLabel: "Approve an updated official file", importing: "Reading the file…",
    importHint: "If the Ministry updates the ratios and you download the official file from Qiwa, upload it here and it applies instantly to every company.",
    importDone: "The updated official file was applied", importFail: "Invalid file — make sure it is the official Nitaqat file",
  };

  const [org, setOrg] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [counts, setCounts] = useState({ saudis: 0, expats: 0 });
  const [loading, setLoading] = useState(true);
  const [savingActivity, setSavingActivity] = useState(false);
  const [tenantUnified, setTenantUnified] = useState("");
  const [catalogMeta, setCatalogMeta] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        // نشاط منشأة العميل نفسه فقط (بمطابقة الرقم الموحّد لمنشأته)
        const { org: current, unified } = await getCurrentOrgContext();
        setTenantUnified(unified);
        if (current) setOrg(current);
      } catch (_) {}
      try {
        const emps = await base44.entities.Employee.list("-created_date", 1000);
        const active = emps.filter((e) => e.status !== "terminated" && e.status !== "resigned");
        setCounts({
          saudis: active.filter((e) => e.is_saudi).length,
          expats: active.filter((e) => !e.is_saudi).length,
        });
      } catch (_) {}
      setLoading(false);
    })();
    loadNitaqatCatalog().then((c) => { setCatalog(c); setCatalogMeta(c?.meta || null); }).catch(() => {});
  }, []);

  if (loading) return <div className="p-10 text-center text-muted-foreground">{t.subtitle}</div>;

  const activity = findActivity(catalog, org?.isic_activity_code);
  const result = computeNitaqat(counts.saudis, counts.expats, activity);
  const need = saudisNeededForSafe(result);

  // يحفظ حقول النشاط على سجل إعدادات منشأة العميل، ويُنشئ السجل مربوطاً برقم منشأته إن لم يوجد
  const saveActivity = async (fields) => {
    setSavingActivity(true);
    try {
      const payload = tenantUnified ? { ...fields, unified_number: tenantUnified } : fields;
      const updated = org?.id
        ? await base44.entities.Organization.update(org.id, payload)
        : await base44.entities.Organization.create(payload);
      setOrg({ ...(org || {}), ...updated, ...fields });
      invalidateCurrentOrg();
      toast({ title: t.saved });
    } catch (_) {} finally { setSavingActivity(false); }
  };

  const onIsicChange = ({ code, name, group }) => saveActivity({
    isic_activity_code: code,
    isic_activity_name: name,
    isic_activity_group: group,
  });

  // مزامنة فورية مع المصدر الرسمي (منصة قوى) — ينتقل بعدها أي تعديل في النسب إلى النظام.
  const syncNow = async () => {
    setSyncing(true);
    try {
      const { catalog: fresh, result } = await refreshNitaqatCatalog();
      setCatalog(fresh);
      setCatalogMeta(fresh?.meta || null);
      if (result && result.ok === false) toast({ title: t.syncFail, variant: "destructive" });
      else toast({ title: t.syncDone });
    } catch (_) {
      toast({ title: t.syncFail, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // اعتماد ملف النسب الرسمي المحدّث (من منصة قوى): يُخزَّن ويُعمَّم على كل المنشآت فوراً.
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { catalog: fresh, result } = await refreshNitaqatCatalog({ payload: text, source_name: file.name });
      setCatalog(fresh);
      setCatalogMeta(fresh?.meta || null);
      toast({ title: result?.ok ? t.importDone : t.importFail, variant: result?.ok ? undefined : "destructive" });
    } catch (_) {
      toast({ title: t.importFail, variant: "destructive" });
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };
  const th = result.thresholds;
  const bandBars = th ? [
    { name: isAr ? "أحمر" : "Red", from: 0, to: th.green_low, color: BAND_META.red.color },
    { name: isAr ? "أخضر منخفض" : "Low green", from: th.green_low, to: th.green_medium, color: BAND_META.green_low.color },
    { name: isAr ? "أخضر متوسط" : "Medium green", from: th.green_medium, to: th.green_high, color: BAND_META.green_medium.color },
    { name: isAr ? "أخضر مرتفع" : "High green", from: th.green_high, to: th.platinum, color: BAND_META.green_high.color },
    { name: isAr ? "بلاتيني" : "Platinum", from: th.platinum, to: 100, color: BAND_META.platinum.color },
  ].map((b) => ({ ...b, width: Math.max(0, b.to - b.from) })) : [];

  const gaugeData = [{ name: t.pct, value: result.saudizationPct, fill: result.band?.color || "#94a3b8" }];

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="bg-white rounded-2xl border border-border p-5 mb-6">
        <NitaqatIsicSelect
          code={org?.isic_activity_code}
          group={org?.isic_activity_group}
          onChange={onIsicChange}
        />
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{t.isicHint}</p>
        <div className="flex items-start gap-2 mt-3 rounded-xl bg-violet-50 border border-violet-200 p-3">
          <Info size={16} className="text-violet-600 shrink-0 mt-0.5" />
          <div className="text-xs text-violet-800 leading-relaxed">{t.formulaNote}</div>
        </div>
        <p className="text-[11px] text-amber-700 mt-2 leading-relaxed">{t.provNote}</p>
      </div>

      {/* المصدر الرسمي للنسب + المزامنة */}
      <div className="bg-white rounded-2xl border border-border p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
              <CloudDownload size={19} className="text-violet-600" />
            </div>
            <div>
              <div className="font-semibold text-sm">{t.syncTitle}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {catalogMeta?.source_name || "—"}
                {catalogMeta?.fetched_at ? ` · ${t.lastSync}: ${String(catalogMeta.fetched_at).slice(0, 16).replace("T", " ")}` : ""}
                {catalogMeta?.activities ? ` · ${catalogMeta.activities} ${t.activitiesLabel}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing} className="gap-2">
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {syncing ? t.syncing : t.syncNow}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => importRef.current?.click()} disabled={importing} className="gap-2">
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {importing ? t.importing : t.importLabel}
            </Button>
            <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={onImportFile} />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{t.importHint}</p>
        <div
          className={cn(
            "mt-3 text-xs rounded-xl border p-2.5 leading-relaxed",
            catalogMeta?.status === "failed"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : catalogMeta?.status === "bundled"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
          )}
        >
          {catalogMeta?.status === "failed"
            ? t.statusFailed
            : catalogMeta?.status === "bundled"
              ? t.statusBundled
              : catalogMeta?.status === "unchanged"
                ? t.statusUnchanged
                : t.statusOk}
        </div>
      </div>

      {!result.band && (
        <div className="bg-white rounded-2xl border border-border p-5 mb-6 text-sm text-muted-foreground leading-relaxed">
          {activity && !activity.bands ? t.noFormula : t.chooseActivity}
        </div>
      )}

      {result.band && <div className="bg-white rounded-2xl border border-border p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Gauge */}
          <div className="flex flex-col items-center">
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={gaugeData} startAngle={180} endAngle={0}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: "#f1f5f9" }} dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="-mt-16 text-center">
              <div className="text-3xl font-extrabold tabular-nums" style={{ color: result.band.color }}>{result.saudizationPct}%</div>
              <div className="text-xs text-muted-foreground">{t.pct}</div>
            </div>
          </div>

          {/* Band badge */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-2">{t.currentBand}</div>
            <div
              className="inline-flex flex-col items-center justify-center w-40 h-40 rounded-3xl border-4"
              style={{ borderColor: result.band.ring, background: result.band.bg }}
            >
              <span className="text-2xl font-extrabold" style={{ color: result.band.color }}>
                {isAr ? result.band.ar : result.band.en}
              </span>
              <span className="text-[11px] mt-1 px-3 py-0.5 rounded-full font-semibold text-white" style={{ background: result.band.color }}>
                {result.band.tier === "safe" ? t.tierSafe : result.band.tier === "warning" ? t.tierWarn : t.tierDanger}
              </span>
            </div>
            {savingActivity && <div className="text-[11px] text-muted-foreground mt-2">{t.saving}</div>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox icon={UserCheck} label={t.saudis} value={counts.saudis} tint="text-emerald-700 bg-emerald-50" />
            <StatBox icon={Globe2} label={t.expats} value={counts.expats} tint="text-sky-700 bg-sky-50" />
            <StatBox icon={Users} label={t.total} value={result.total} tint="text-violet-700 bg-violet-50" />
            <StatBox icon={TrendingUp} label={t.pct} value={`${result.saudizationPct}%`} tint="text-amber-700 bg-amber-50" />
          </div>
        </div>
      </div>}

      {result.band && <div className="bg-white rounded-2xl border border-border p-5 mb-6">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><TrendingUp size={18} className="text-violet-600" /> {t.bandsH}</h3>
        <p className="text-[11px] text-muted-foreground mb-4">
          {isAr ? "الأخضر المنخفض" : "Low Green"}: {th.green_low}% · {isAr ? "المتوسط" : "Medium"}: {th.green_medium}% · {isAr ? "المرتفع" : "High"}: {th.green_high}% · {isAr ? "بلاتيني" : "Platinum"}: {th.platinum}%
        </p>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bandBars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={isAr ? 90 : 100} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v, n, p) => [`${p.payload.from}% — ${p.payload.to}%`, isAr ? "النسبة" : "Range"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="width" radius={[6, 6, 6, 6]} minPointSize={2}>
                {bandBars.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Bar>
              <ReferenceLine x={result.saudizationPct} stroke="#7c3aed" strokeWidth={2} strokeDasharray="6 4"
                label={{ value: `${result.saudizationPct}%`, position: "top", fill: "#7c3aed", fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}

      {result.band && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-emerald-700"><ShieldCheck size={18} /> {t.benefits}</h3>
          {result.band.benefits_ar.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noBenefits}</p>
          ) : (
            <ul className="space-y-2">
              {result.band.benefits_ar.map((b, i) => (
                <li key={i} className="text-sm flex gap-2 items-start"><span className="text-emerald-600 mt-0.5">✓</span><span>{b}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className={cn("font-semibold mb-3 flex items-center gap-2", result.band.tier === "danger" ? "text-rose-700" : "text-amber-700")}>
            <AlertTriangle size={18} /> {t.risks}
          </h3>
          {result.band.risks_ar.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noRisks}</p>
          ) : (
            <ul className="space-y-2">
              {result.band.risks_ar.map((r, i) => (
                <li key={i} className="text-sm flex gap-2 items-start"><span className={cn("mt-0.5", result.band.tier === "danger" ? "text-rose-600" : "text-amber-600")}>⚠</span><span>{r}</span></li>
              ))}
            </ul>
          )}
          {need > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {t.saudNeeded}: <b className="text-lg">{need}</b> {isAr ? "سعودي/سعودية إضافي" : "more Saudis"}
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}

function StatBox({ icon: Icon, label, value, tint }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", tint)}><Icon size={20} /></div>
      <div><div className="text-xl font-bold tabular-nums">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
    </div>
  );
}