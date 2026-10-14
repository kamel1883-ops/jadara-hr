import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import PlatformSubscriptionForm from "@/components/PlatformSubscriptionForm";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Globe, Ban, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_TYPES, platformMeta, remainingDays, expiryStatus, statusBadgeOf } from "@/lib/platforms";
import { useI18n } from "@/lib/i18n";
import { StoredDocButton } from "@/components/VaultDocLink";

export default function PlatformSubscriptions() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "اشتراكات المنصات الحكومية", subtitle: "متابعة اشتراكات المنصات الحكومية وتواريخ انتهائها والمتبقي منها — يمكنك إضافة أكثر من اشتراك لكل منصة وتجديدها",
    add: "إضافة اشتراك", addAnother: "إضافة اشتراك آخر", renew: "تجديد",
    sActive: "سارية", sSoon: "قاربت الانتهاء", sExpired: "منتهية", sNA: "لا ينطبق",
    loading: "جارٍ التحميل...",
    fill: "تعبئة بيانات الاشتراك", markNA: "لا ينطبق على المنشأة", naMsg: "هذا الاشتراك لا ينطبق على المنشأة", edit: "تعديل",
    account: "رقم الحساب", start: "البداية", expiry: "الانتهاء", remaining: "المتبقي",
    days: (n) => `${n} يوم`, expired: "منتهي منذ", viewDoc: "عرض الوثيقة",
    noRecords: "لا توجد اشتراكات مسجّلة بعد", usedPlatforms: "منصات مضافة مخصّصة",
  } : {
    title: "Government Platform Subscriptions", subtitle: "Track government platform subscriptions, expiry dates and remaining days — add multiple subscriptions per platform and renew them",
    add: "Add subscription", addAnother: "Add another subscription", renew: "Renew",
    sActive: "Active", sSoon: "Expiring soon", sExpired: "Expired", sNA: "Not applicable",
    loading: "Loading...",
    fill: "Fill subscription data", markNA: "Not applicable to this org", naMsg: "This subscription does not apply to the org", edit: "Edit",
    account: "Account", start: "Start", expiry: "Expiry", remaining: "Remaining",
    days: (n) => `${n} days`, expired: "Expired since", viewDoc: "View doc",
    noRecords: "No subscriptions recorded yet", usedPlatforms: "Custom added platforms",
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [renewing, setRenewing] = useState(null);
  const [fixedKey, setFixedKey] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PlatformSubscription.list("-created_date", 500);
    setItems(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = (key) => { setEditing(null); setRenewing(null); setFixedKey(key); setFormOpen(true); };
  const openEdit = (rec) => { setEditing(rec); setRenewing(null); setFixedKey(rec.platform_key === "other" ? null : rec.platform_key); setFormOpen(true); };
  const openRenew = (rec) => { setEditing(null); setRenewing(rec); setFixedKey(rec.platform_key === "other" ? null : rec.platform_key); setFormOpen(true); };

  const recsOf = (key) => items.filter((l) => l.platform_key === key);
  const customKeys = Array.from(new Set(items.filter((l) => l.platform_key === "other").map((l) => l.custom_label || "other").filter((x) => x && x !== "other")));

  const stats = { active: 0, expiring_soon: 0, expired: 0, not_applicable: 0 };
  items.forEach((rec) => {
    if (!rec || !rec.platform_key) return;
    if (rec.not_applicable) { stats.not_applicable++; return; }
    const s = expiryStatus(rec.expiry_date, rec.not_applicable);
    if (stats[s] !== undefined) stats[s]++;
  });

  const groups = PLATFORM_TYPES.filter((tt) => tt.key !== "other");

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} action={<Button onClick={() => openNew(null)} className="gap-2"><Plus size={18} /> {t.add}</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <Stat label={t.sActive} value={stats.active} cls="text-emerald-600" />
        <Stat label={t.sSoon} value={stats.expiring_soon} cls="text-amber-600" />
        <Stat label={t.sExpired} value={stats.expired} cls="text-rose-600" />
        <Stat label={t.sNA} value={stats.not_applicable} cls="text-slate-500" />
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">{t.noRecords}</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((tt) => (
            <GroupCard
              key={tt.key}
              type={tt}
              recs={recsOf(tt.key)}
              onAdd={() => openNew(tt.key)}
              onEdit={openEdit}
              onRenew={openRenew}
              t={t}
              isAr={isAr}
            />
          ))}
          {customKeys.length > 0 && (
            <>
              {customKeys.map((label) => {
                const recs = items.filter((l) => l.platform_key === "other" && (l.custom_label || "other") === label);
                const fakeType = { key: "other", ar: { label, authority: "" }, en: { label, authority: "" } };
                return (
                  <GroupCard
                    key={`other-${label}`}
                    type={fakeType}
                    recs={recs}
                    onAdd={() => openNew("other")}
                    onEdit={openEdit}
                    onRenew={openRenew}
                    t={t}
                    isAr={isAr}
                  />
                );
              })}
            </>
          )}
        </div>
      )}

      <PlatformSubscriptionForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} editing={editing} fixedKey={fixedKey} renewing={renewing} />
    </div>
  );
}

function GroupCard({ type, recs, onAdd, onEdit, onRenew, t, isAr }) {
  const meta = platformMeta(type.key);
  const cardLabel = type.key === "other" ? (recs[0]?.custom_label || "—") : meta.label;
  const worst = recs.length
    ? recs.map((r) => expiryStatus(r.expiry_date, r.not_applicable))
        .reduce((acc, s) => (s === "expired" ? "expired" : s === "expiring_soon" && acc !== "expired" ? "expiring_soon" : acc === "expired" ? "expired" : acc === "expiring_soon" ? "expiring_soon" : s), "active")
    : null;

  return (
    <div className={cn("bg-white rounded-2xl border p-5 flex flex-col gap-3", worst === "expired" ? "border-rose-200" : worst === "expiring_soon" ? "border-amber-200" : "border-border")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", !recs.length || recs.every((r) => r.not_applicable) ? "bg-slate-100 text-slate-400" : "bg-violet-900 text-white")}><Globe size={18} /></div>
          <div className="leading-tight"><div className="font-semibold text-sm">{cardLabel}</div><div className="text-[11px] text-muted-foreground">{meta.authority}</div></div>
        </div>
        {recs.length > 0 && worst && <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-medium", statusBadgeOf(worst).cls)}>{statusBadgeOf(worst).label}</span>}
      </div>

      {recs.length === 0 ? (
        <div className="flex flex-col gap-2 mt-1">
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5"><Plus size={15} /> {t.fill}</Button>
          <Button size="sm" variant="ghost" onClick={() => onAdd} className="gap-1.5 text-muted-foreground hover:bg-slate-100"><Ban size={14} /> {t.markNA}</Button>
        </div>
      ) : (
        <div className="mt-1 space-y-3">
          {recs.map((rec) => {
            const na = rec.not_applicable;
            const status = expiryStatus(rec.expiry_date, na);
            const rem = remainingDays(rec.expiry_date, na);
            return (
              <div key={rec.id} className="rounded-xl bg-slate-50/70 border border-border/60 p-3">
                {na ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t.naMsg}</span>
                    <Button size="sm" variant="outline" onClick={() => onEdit(rec)} className="gap-1.5"><Pencil size={13} /> {t.edit}</Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Info label={t.account} value={rec.account_id || "—"} />
                      <Info label={t.expiry} value={rec.expiry_date || "—"} highlight={status} />
                      <Info label={t.start} value={rec.start_date || "—"} />
                      <Info label={t.remaining} value={rem === null ? "—" : rem < 0 ? `${t.expired} ${Math.abs(rem)}` : `${rem} ${isAr ? "يوم" : "days"}`} highlight={rem !== null && rem < 0 ? "expired" : rem !== null && rem <= 30 ? "expiring_soon" : null} />
                    </div>
                    {rec.notes && <div className="text-[11px] text-muted-foreground bg-white rounded-lg p-2 mt-2">{rec.notes}</div>}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(rec)} className="gap-1.5"><Pencil size={13} /> {t.edit}</Button>
                      <Button size="sm" variant="outline" onClick={() => onRenew(rec)} className="gap-1.5 text-violet-700 hover:bg-violet-50"><RefreshCw size={13} /> {t.renew}</Button>
                      {rec.document_url && (<StoredDocButton value={rec.document_url} isAr={isAr} className="text-xs text-blue-600 hover:underline self-center">{t.viewDoc}</StoredDocButton>)}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          <Button size="sm" variant="ghost" onClick={onAdd} className="gap-1.5 self-start text-violet-700 hover:bg-violet-50"><Plus size={14} /> {t.addAnother}</Button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, highlight }) {
  return (
    <div className={cn("rounded-lg p-2 bg-white", highlight === "expired" && "bg-rose-50", highlight === "expiring_soon" && "bg-amber-50")}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
function Stat({ label, value, cls }) {
  return (<div className="bg-white rounded-2xl border border-border p-4"><div className="text-xs text-muted-foreground">{label}</div><div className={cn("text-2xl font-bold mt-1", cls)}>{value}</div></div>);
}