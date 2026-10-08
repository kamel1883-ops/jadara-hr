import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentOrgContext, invalidateCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Globe2, Settings2, TrendingUp, AlertTriangle, ShieldCheck, Info, UserX, Building2 } from "lucide-react";
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { BAND_META, computeNitaqat, saudisNeededForSafe } from "@/lib/nitaqat";
import NitaqatActivitySelect from "@/components/NitaqatActivitySelect";
import NitaqatIsicSelect from "@/components/NitaqatIsicSelect";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function Nitaqat() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { toast } = useToast();
  const t = isAr ? {
    title: "النطاقات (نسبة التوطين)", subtitle: "حساب نطاق كيانك وفق معادلة «نطاقات المطور» المعتمدة في الدليل الإجرائي 2026 لوزارة الموارد البشرية",
    activityLabel: "النشاط المعتمد (رمز النشاط)",
    activityHint: "ابحث برمز النشاط أو باسمه — من قائمة الأنشاط الـ41 المعتمدة لدى مكتب العمل.",
    isicLabel: "النشاط الاقتصادي الرسمي (الدليل الوطني للأنشطة الاقتصادية ISIC4 — وزارة التجارة)",
    isicHint: "ابحث برمز النشاط أو باسمه — أكثر من 2,800 نشاط رسمي.",
    isicNote: "النشاط الاقتصادي مأخوذ من الدليل الوطني الرسمي للأنشطة الاقتصادية (2,800 نشاط). أما احتساب النطاق فيعتمد على نشاط «نطاقات» الرسمي المنشور في دليل وزارة الموارد البشرية (41 نشاطاً)، إذ لا تنشر الوزارة جدول الربط بين النشاط الاقتصادي ونشاط نطاقات.",
    saudis: "سعوديون نشطون", expats: "مقيمون نشطون", total: "إجمالي العمالة النشطة", pct: "نسبة التوطين",
    currentBand: "النطاق الحالي",
    formulaNote: "تُحتسب حدود النطاقات بمعادلة «نطاقات المطور»: الحد = م × لوغ(إجمالي العمالة) + ث — حيث يختلف (م، ث) حسب النشاط. النتيجة الرسمية المعتمدة تظهر على منصة قوى.",
    provNote: "الثوابت الموثّقة رسمياً متاحة لنشاط البيع بالجملة والتجزئة العامة؛ باقي الأنشطة تستخدم ثوابت تقديرية حتى استكمال جدول المرفق الأول. النتيجة استرشادية.",
    microNote: "الكيان متناهي الصغر (أقل من 6 عاملين): يكفي توظيف سعودي واحد (ولو كان المالك) للبقاء في النطاق الأخضر.",
    bandsH: "نسب النطاقات لنشاطك عند حجم عمالتك الحالي",
    saudNeeded: "السعوديون المطلوبون للخروج من النطاق الأحمر",
    benefits: "المزايا المتاحة في هذا النطاق", risks: "الإشكاليات والمخاطر",
    noBenefits: "لا توجد مزايا في هذا النطاق", noRisks: "لا توجد إشكاليات في هذا النطاق",
    saved: "تم تحديث النشاط", saving: "جارٍ الحفظ...",
    tierSafe: "آمن", tierWarn: "تحذير", tierDanger: "خطر",
  } : {
    title: "Nitaqat (Saudization)", subtitle: "Compute your band using the official Developed-Nitaqat formula from the 2026 MHRSD procedural guide",
    activityLabel: "Official activity (code)",
    activityHint: "Search by code or name — from the 41 activities approved by the Ministry of Labor.",
    isicLabel: "Official economic activity (National ISIC4 guide — Ministry of Commerce)",
    isicHint: "Search by code or name — 2,800+ official activities.",
    isicNote: "Your economic activity comes from the official National ISIC4 guide (2,800 activities). The band calculation uses the official Nitaqat activity published in the MHRSD guide (41 activities), because the ministry does not publish the mapping table between the two.",
    saudis: "Active Saudis", expats: "Active expats", total: "Total active workforce", pct: "Saudization %",
    currentBand: "Current band",
    formulaNote: "Band limits use the Developed-Nitaqat formula: Limit = m × ln(total headcount) + c — where (m, c) vary by activity. The official result appears on the Qiwa platform.",
    provNote: "Officially verified coefficients are available for Wholesale & General Retail; other activities use provisional coefficients pending Annex 1. Result is indicative.",
    microNote: "Micro entity (under 6 workers): one Saudi hire (even the owner) keeps you in Green.",
    bandsH: "Nitaqat thresholds for your activity at your current headcount",
    saudNeeded: "Saudis needed to leave the Red band",
    benefits: "Benefits available in this band", risks: "Issues & risks",
    noBenefits: "No benefits in this band", noRisks: "No issues in this band",
    saved: "Activity updated", saving: "Saving...",
    tierSafe: "Safe", tierWarn: "Warning", tierDanger: "Danger",
  };

  const [org, setOrg] = useState(null);
  const [counts, setCounts] = useState({ saudis: 0, expats: 0 });
  const [loading, setLoading] = useState(true);
  const [savingActivity, setSavingActivity] = useState(false);
  const [tenantUnified, setTenantUnified] = useState("");

  useEffect(() => {
    (async () => {
      let activityCode = "10";
      try {
        // نشاط منشأة العميل نفسه فقط (بمطابقة الرقم الموحّد لمنشأته)
        const { org: current, unified } = await getCurrentOrgContext();
        setTenantUnified(unified);
        if (current) { setOrg(current); activityCode = current.nitaqat_activity || "10"; }
      } catch (_) {}
      try {
        const emps = await base44.entities.Employee.list("-created_date", 1000);
        const active = emps.filter((e) => e.status !== "terminated" && e.status !== "resigned");
        setCounts({
          saudis: active.filter((e) => e.is_saudi).length,
          expats: active.filter((e) => !e.is_saudi).length,
        });
      } catch (_) {}
      void activityCode;
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-10 text-center text-muted-foreground">{t.subtitle}</div>;

  const activityCode = org?.nitaqat_activity || "10";
  const result = computeNitaqat(counts.saudis, counts.expats, activityCode);
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

  const onActivityChange = (code) => saveActivity({ nitaqat_activity: code });

  const onIsicChange = ({ code, name, group }) => saveActivity({
    isic_activity_code: code,
    isic_activity_name: name,
    isic_activity_group: group,
  });

  const th = result.thresholds;
  const bandBars = [
    { name: isAr ? "أحمر" : "Red", from: 0, to: th.green_low, color: BAND_META.red.color },
    { name: isAr ? "أخضر منخفض" : "Low green", from: th.green_low, to: th.green_medium, color: BAND_META.green_low.color },
    { name: isAr ? "أخضر متوسط" : "Medium green", from: th.green_medium, to: th.green_high, color: BAND_META.green_medium.color },
    { name: isAr ? "أخضر مرتفع" : "High green", from: th.green_high, to: th.platinum, color: BAND_META.green_high.color },
    { name: isAr ? "بلاتيني" : "Platinum", from: th.platinum, to: 100, color: BAND_META.platinum.color },
  ].map((b) => ({ ...b, width: Math.max(0, b.to - b.from) }));

  const gaugeData = [{ name: t.pct, value: result.saudizationPct, fill: result.band.color }];

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {/* Activity selector */}
      <div className="bg-white rounded-2xl border border-border p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 size={14} /> {t.isicLabel}
              </div>
              <NitaqatIsicSelect
                code={org?.isic_activity_code}
                name={org?.isic_activity_name}
                group={org?.isic_activity_group}
                onChange={onIsicChange}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Settings2 size={14} /> {t.activityLabel}
              </div>
              <NitaqatActivitySelect value={activityCode} onChange={onActivityChange} placeholder={t.activityHint} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground sm:max-w-xs leading-relaxed">
            {t.isicHint}
          </div>
        </div>
        <div className="flex items-start gap-2 mt-3 rounded-xl bg-violet-50 border border-violet-200 p-3">
          <Info size={16} className="text-violet-600 shrink-0 mt-0.5" />
          <div className="text-xs text-violet-800 leading-relaxed">{t.formulaNote}</div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{t.isicNote}</p>
        <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">⚠ {t.provNote}</p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-5 mb-6">
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
        {result.micro && (
          <div className="flex items-start gap-2 mt-4 rounded-xl bg-sky-50 border border-sky-200 p-3">
            <UserX size={16} className="text-sky-600 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-800 leading-relaxed">{t.microNote}</div>
          </div>
        )}
      </div>

      {/* Thresholds bar */}
      <div className="bg-white rounded-2xl border border-border p-5 mb-6">
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
      </div>

      {/* Implications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
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