import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useVaultTick } from "@/components/VaultLive";
import { enrichRecordsWithVault, VAULT_MODULES } from "@/lib/vaultGeneric";
import {
  FileText, ShieldCheck, Car, CalendarClock, Heart, Building2, Clock, AlertTriangle, CreditCard, Printer,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { printSection } from "@/lib/sectionPrint";

const DAY = 1000 * 60 * 60 * 24;
const HORIZON = 30 * DAY;

function classify(dateStr, today) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - today.getTime();
  const days = Math.round(diff / DAY);
  // فقط الموشك على الانتهاء خلال 30 يوماً مستقبلة — المنتهي فعلاً يُستبعد (الغرامة تطبق بعد الانتهاء)
  if (diff < 0) return null;
  if (diff <= HORIZON) return { days, status: "soon", expiry: dateStr };
  return null;
}

function buildExpiryItems({ licenses, subs, emps, vehicles }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out = [];
  for (const l of licenses) {
    if (l.not_applicable) continue;
    const c = classify(l.expiry_date, today);
    if (c) out.push({ category: "license", label: l.custom_label || l.license_type || "", identifier: l.license_number || "", expiry: c.expiry, days: c.days, status: c.status });
  }
  for (const s of subs) {
    if (s.not_applicable) continue;
    const c = classify(s.expiry_date, today);
    if (c) out.push({ category: "gov_subscription", label: s.custom_label || s.platform_key || "", identifier: s.account_id || "", expiry: c.expiry, days: c.days, status: c.status });
  }
  for (const e of emps) {
    if (e.status === "terminated" || e.status === "resigned") continue;
    const iq = classify(e.iqama_expiry, today);
    if (iq) out.push({ category: "iqama", label: e.full_name || "", identifier: e.national_id || e.employee_number || "", expiry: iq.expiry, days: iq.days, status: iq.status });
    const ct = classify(e.contract_end_date, today);
    if (ct) out.push({ category: "contract", label: e.full_name || "", identifier: e.employee_number || e.national_id || "", expiry: ct.expiry, days: ct.days, status: ct.status });
    const hi = classify(e.health_insurance_expiry, today);
    if (hi) out.push({ category: "health_insurance", label: e.full_name || "", identifier: e.national_id || "", expiry: hi.expiry, days: hi.days, status: hi.status });
    if (e.hire_date && e.status === "active") {
      const ph = new Date(e.hire_date + "T00:00:00");
      if (!isNaN(ph.getTime())) {
        const probEnd = new Date(ph.getTime() + 90 * DAY);
        const diff = probEnd.getTime() - today.getTime();
        const days = Math.round(diff / DAY);
        if (diff >= 0 && diff <= HORIZON) {
          out.push({ category: "probation", label: e.full_name || "", identifier: e.employee_number || e.national_id || "", expiry: probEnd.toISOString().slice(0, 10), days, status: "soon" });
        }
      }
    }
  }
  for (const v of vehicles) {
    const ident = v.plate_number || v.plate_number_en || "";
    const le = classify(v.license_expiry, today);
    if (le) out.push({ category: "vehicle_license", label: ident, identifier: ident, expiry: le.expiry, days: le.days, status: le.status });
    const ie = classify(v.insurance_expiry, today);
    if (ie) out.push({ category: "vehicle_insurance", label: ident, identifier: v.insurance_number || ident, expiry: ie.expiry, days: ie.days, status: ie.status });
    const pe = classify(v.inspection_expiry, today);
    if (pe) out.push({ category: "vehicle_inspection", label: ident, identifier: ident, expiry: pe.expiry, days: pe.days, status: pe.status });
  }
  out.sort((a, b) => a.days - b.days);
  return out;
}

export default function ExpiryReport() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const CATS = isAr ? {
    license: { label: "تراخيص المنشأة", icon: FileText, tint: "blue" },
    gov_subscription: { label: "اشتراكات حكومية", icon: Building2, tint: "indigo" },
    iqama: { label: "إقامات الموظفين", icon: CreditCard, tint: "violet" },
    contract: { label: "العقود الوظيفية", icon: FileText, tint: "slate" },
    health_insurance: { label: "التأمين الطبي", icon: Heart, tint: "rose" },
    probation: { label: "انتهاء فترة التجربة (90 يوماً)", icon: Clock, tint: "amber" },
    vehicle_license: { label: "رخص سير المركبات", icon: Car, tint: "cyan" },
    vehicle_insurance: { label: "تأمين المركبات", icon: ShieldCheck, tint: "emerald" },
    vehicle_inspection: { label: "الفحص الدوري", icon: CalendarClock, tint: "orange" },
  } : {
    license: { label: "Facility Licenses", icon: FileText, tint: "blue" },
    gov_subscription: { label: "Government Subscriptions", icon: Building2, tint: "indigo" },
    iqama: { label: "Employee Iqamas", icon: CreditCard, tint: "violet" },
    contract: { label: "Employment Contracts", icon: FileText, tint: "slate" },
    health_insurance: { label: "Medical Insurance", icon: Heart, tint: "rose" },
    probation: { label: "Probation (90 days)", icon: Clock, tint: "amber" },
    vehicle_license: { label: "Vehicle Licenses", icon: Car, tint: "cyan" },
    vehicle_insurance: { label: "Vehicle Insurance", icon: ShieldCheck, tint: "emerald" },
    vehicle_inspection: { label: "Periodic Inspection", icon: CalendarClock, tint: "orange" },
  };

  const t = isAr ? {
    title: "تقرير الموشكة على الانتهاء",
    subtitle: "كل ما ينتهي خلال 30 يوماً قادمة — تراخيص، اشتراكات حكومية، إقامات، عقود، تأمين طبي، مركبات، وفترة تجربة.",
    loading: "جارٍ التحميل...",
    empty: "لا توجد أي وثيقة موشكة على الانتهاء خلال 30 يوماً — كل شيء سارٍ ✅",
    soon: "خلال 30 يوماً",
    days: "يوم متبقٍ",
    item: "البند",
    ref: "المرجع",
    expiry: "تاريخ الانتهاء",
    status: "الحالة",
    total: "إجمالي التنبيهات",
    soonCount: "تقترب",
    exportPdf: "طباعة PDF",
  } : {
    title: "Approaching Expirations Report",
    subtitle: "Everything expiring within the next 30 days — licenses, gov subscriptions, iqamas, contracts, medical insurance, vehicles, probation. (Already-expired items are excluded — fines apply after expiry)",
    loading: "Loading...",
    empty: "No items expiring within 30 days — all valid ✅",
    soon: "Within 30d",
    days: "days left",
    item: "Item",
    ref: "Ref",
    expiry: "Expiry",
    status: "Status",
    total: "Total alerts",
    soonCount: "Approaching",
    exportPdf: "Export PDF",
  };

  const [sources, setSources] = useState(null);
  const [loading, setLoading] = useState(true);
  const tick = useVaultTick();

  useEffect(() => {
    (async () => {
      const [licenses, subs, emps, vehicles] = await Promise.all([
        base44.entities.License.list("-created_date", 2000),
        base44.entities.PlatformSubscription.list("-created_date", 2000),
        base44.entities.Employee.list("-created_date", 5000),
        base44.entities.Vehicle.list("-created_date", 2000),
      ]);
      setSources({ licenses, subs, emps, vehicles });
      setLoading(false);
      enrichRecordsWithVault(licenses, VAULT_MODULES.licenses, "license_ref", ["license_number", "issuing_authority", "notes"]).then((rows) => {
        setSources((cur) => (cur ? { ...cur, licenses: rows } : cur));
      });
    })();
  }, []);

  const items = useMemo(() => (sources ? buildExpiryItems(sources) : []), [sources, tick]);

  const soon = items;
  const exportPdf = () => {
    const columns = isAr ? [
      { label: "النوع" }, { label: "البند" }, { label: "المرجع", num: true },
      { label: "تاريخ الانتهاء" }, { label: "المتبقي", num: true }, { label: "الحالة" },
    ] : [
      { label: "Type" }, { label: "Item" }, { label: "Ref", num: true },
      { label: "Expiry" }, { label: "Days left", num: true }, { label: "Status" },
    ];
    const rows = items.map((it) => [
      (CATS[it.category]?.label) || it.category,
      it.label, it.identifier || "—", it.expiry,
      it.days + " " + t.days, t.soon,
    ]);
    printSection({
      title: t.title, subtitle: t.subtitle, isAr, columns, rows,
      summary: [{ label: t.total, value: items.length }, { label: t.soonCount, value: soon.length }],
    });
  };
  const tintCls = { blue: "bg-blue-50 text-blue-700 border-blue-200", indigo: "bg-indigo-50 text-indigo-700 border-indigo-200", violet: "bg-violet-50 text-violet-700 border-violet-200", slate: "bg-slate-50 text-slate-700 border-slate-200", rose: "bg-rose-50 text-rose-700 border-rose-200", amber: "bg-amber-50 text-amber-700 border-amber-200", cyan: "bg-cyan-50 text-cyan-700 border-cyan-200", emerald: "bg-emerald-50 text-emerald-700 border-emerald-200", orange: "bg-orange-50 text-orange-700 border-orange-200" };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="mt-8">
      <PageHeader title={t.title} subtitle={t.subtitle} action={items.length > 0 ? <Button variant="outline" onClick={exportPdf} className="gap-2"><Printer size={17} /> {t.exportPdf}</Button> : null} />

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-10 text-center">
          <ShieldCheck size={40} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-5">
            <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><AlertTriangle size={20} className="text-slate-700" /></div>
              <div><div className="text-xs text-muted-foreground">{t.total}</div><div className="text-lg font-bold">{items.length}</div></div>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Clock size={20} className="text-amber-600" /></div>
              <div><div className="text-xs text-muted-foreground">{t.soonCount}</div><div className="text-lg font-bold text-amber-600">{soon.length}</div></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-muted-foreground text-xs">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">{isAr ? "النوع" : "Type"}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.item}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.ref}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.expiry}</th>
                    <th className="text-right px-3 py-3 font-medium">{isAr ? "المتبقي" : "Days left"}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it, idx) => {
                    const cat = CATS[it.category] || { label: it.category, icon: FileText, tint: "slate" };
                    const Icon = cat.icon;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border", tintCls[cat.tint] || tintCls.slate)}>
                            <Icon size={13} /> {cat.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">{it.label}</td>
                        <td className="px-3 py-2 tabular-nums text-xs" dir="ltr">{it.identifier || "—"}</td>
                        <td className="px-3 py-2 tabular-nums">{it.expiry}</td>
                        <td className="px-3 py-2 font-semibold tabular-nums text-amber-600">
                          {it.days} {t.days}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                            {t.soon}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}