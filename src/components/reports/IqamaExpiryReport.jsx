import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useVaultTick } from "@/components/VaultLive";
import { CreditCard, AlertTriangle, CalendarClock, XCircle, Printer } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { printSection } from "@/lib/sectionPrint";

const DAY = 1000 * 60 * 60 * 24;
// شرط التنبيه: الإقامة التي تنتهي خلال 90 يوماً أو أقل (تشمل المنتهية فعلاً كأكثر إلحاحاً) — موحّدة مع نافذة تنبيهات لوحة التحكم.
const HORIZON = 90 * DAY;

export default function IqamaExpiryReport() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "تقرير الإقامات القاربت على الانتهاء",
    subtitle: "حصر كل الإقامات التي تنتهي خلال 90 يوماً أو أقل — للتنبيه وتجديد الإقامة قبل تراكم الغرامات.",
    loading: "جارٍ التحميل...",
    empty: "لا توجد إقامات موشكة على الانتهاء خلال 90 يوماً ✅",
    total: "إجمالي التنبيهات",
    expired: "منتهية فعلاً",
    soon: "خلال 90 يوماً",
    emp: "الموظف", natId: "الهوية/الإقامة", dept: "الإدارة", pos: "المسمى",
    expiry: "تاريخ انتهاء الإقامة", days: "المتبقي", status: "الحالة",
    expiredBadge: "منتهية", soonBadge: "قاربت", daysUnit: "يوم", na: "—",
    exportPdf: "طباعة PDF",
  } : {
    title: "Iqama Expiry Report",
    subtitle: "All iqamas expiring within 90 days or less — alert to renew before fines accumulate.",
    loading: "Loading...",
    empty: "No iqamas expiring within 90 days ✅",
    total: "Total alerts", expired: "Already expired",     soon: "Within 90 days",
    emp: "Employee", natId: "ID/Iqama", dept: "Department", pos: "Position",
    expiry: "Iqama expiry", days: "Days left", status: "Status",
    expiredBadge: "Expired", soonBadge: "Approaching", daysUnit: "days", na: "—",
    exportPdf: "Export PDF",
  };

  const [emps, setEmps] = useState([]);
  const [loading, setLoading] = useState(true);
  const tick = useVaultTick();

  useEffect(() => {
    base44.entities.Employee.list("-created_date", 5000).then((list) => {
      setEmps(list || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const items = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const out = [];
    for (const e of emps) {
      if (e.status === "terminated" || e.status === "resigned") continue;
      if (!e.iqama_expiry) continue;
      const d = new Date(e.iqama_expiry + "T00:00:00");
      if (isNaN(d.getTime())) continue;
      const diff = d.getTime() - today.getTime();
      const days = Math.round(diff / DAY);
      if (diff <= HORIZON) {
        out.push({
          id: e.id, name: e.full_name || "", national_id: e.national_id || "",
          department: e.department || "", position: e.position || "",
          expiry: e.iqama_expiry, days, expired: diff < 0,
        });
      }
    }
    out.sort((a, b) => a.days - b.days);
    return out;
  }, [emps, tick]);

  const expiredCount = items.filter((i) => i.expired).length;
  const soonCount = items.length - expiredCount;

  const exportPdf = () => {
    const columns = isAr ? [
      { label: "الموظف" }, { label: "الهوية/الإقامة", num: true }, { label: "الإدارة" },
      { label: "المسمى" }, { label: "تاريخ الانتهاء" }, { label: "المتبقي", num: true }, { label: "الحالة" },
    ] : [
      { label: "Employee" }, { label: "ID/Iqama", num: true }, { label: "Department" },
      { label: "Position" }, { label: "Expiry" }, { label: "Days left", num: true }, { label: "Status" },
    ];
    const rows = items.map((it) => [
      it.name, it.national_id || t.na, it.department || t.na, it.position || t.na,
      it.expiry, (it.expired ? Math.abs(it.days) : it.days) + " " + t.daysUnit,
      it.expired ? t.expiredBadge : t.soonBadge,
    ]);
    printSection({
      title: t.title, subtitle: t.subtitle, isAr, columns, rows,
      summary: [{ label: t.total, value: items.length }, { label: t.expired, value: expiredCount }, { label: t.soon, value: soonCount }],
    });
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="mt-8">
      <PageHeader title={t.title} subtitle={t.subtitle} action={items.length > 0 ? <Button variant="outline" onClick={exportPdf} className="gap-2"><Printer size={17} /> {t.exportPdf}</Button> : null} />

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-10 text-center">
          <CreditCard size={40} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><AlertTriangle size={20} className="text-slate-700" /></div>
              <div><div className="text-xs text-muted-foreground">{t.total}</div><div className="text-lg font-bold">{items.length}</div></div>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center"><XCircle size={20} className="text-rose-600" /></div>
              <div><div className="text-xs text-muted-foreground">{t.expired}</div><div className="text-lg font-bold text-rose-600">{expiredCount}</div></div>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><CalendarClock size={20} className="text-amber-600" /></div>
              <div><div className="text-xs text-muted-foreground">{t.soon}</div><div className="text-lg font-bold text-amber-600">{soonCount}</div></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-muted-foreground text-xs">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">{t.emp}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.natId}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.dept}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.pos}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.expiry}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.days}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium">{it.name}</td>
                      <td className="px-3 py-2 tabular-nums text-xs" dir="ltr">{it.national_id || t.na}</td>
                      <td className="px-3 py-2 text-xs">{it.department || t.na}</td>
                      <td className="px-3 py-2 text-xs">{it.position || t.na}</td>
                      <td className="px-3 py-2 tabular-nums">{it.expiry}</td>
                      <td className={cn("px-3 py-2 font-semibold tabular-nums", it.expired ? "text-rose-600" : "text-amber-600")}>
                        {it.expired ? `${Math.abs(it.days)} ${t.daysUnit}` : `${it.days} ${t.daysUnit}`}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium",
                          it.expired ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                          {it.expired ? t.expiredBadge : t.soonBadge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}