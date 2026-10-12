import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import LicenseForm from "@/components/LicenseForm";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, ShieldCheck, Ban, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LICENSE_TYPES, typeMeta, expiryStatus, statusBadgeOf } from "@/lib/licenses";
import { useI18n } from "@/lib/i18n";
import { enrichRecordsWithVault, VAULT_MODULES } from "@/lib/vaultGeneric";

export default function Licenses() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "تراخيص المنشأة", subtitle: "متابعة تراخيص الجهات الحكومية وعقود الصيانة وتواريخ انتهائها — يمكنك إضافة أكثر من ترخيص وتجديده",
    add: "إضافة ترخيص", addAnother: "إضافة ترخيص آخر", renew: "تجديد",
    sActive: "تراخيص سارية", sSoon: "قاربت الانتهاء", sExpired: "منتهية", sNA: "لا ينطبق",
    loading: "جارٍ التحميل...",
    fill: "تعبئة بيانات الترخيص", markNA: "لا ينطبق على المنشأة", naMsg: "هذا الترخيص لا ينطبق على المنشأة", edit: "تعديل",
    licenseNo: "رقم الترخيص", durationL: "المدة", duration: (n) => n ? `${n} شهر` : "—", issue: "الإصدار", expiry: "الانتهاء",
    viewDoc: "عرض النسخة", noRecords: "لا توجد تراخيص مسجّلة بعد",
  } : {
    title: "Organization licenses", subtitle: "Track government licenses and maintenance contracts and their expiry dates — add multiple licenses and renew them",
    add: "Add license", addAnother: "Add another license", renew: "Renew",
    sActive: "Active", sSoon: "Expiring soon", sExpired: "Expired", sNA: "Not applicable",
    loading: "Loading...",
    fill: "Fill license data", markNA: "Not applicable to this org", naMsg: "This license does not apply to the org", edit: "Edit",
    licenseNo: "License number", durationL: "Duration", duration: (n) => n ? `${n} months` : "—", issue: "Issued", expiry: "Expiry",
    viewDoc: "View copy", noRecords: "No licenses recorded yet",
  };

  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [renewing, setRenewing] = useState(null);
  const [fixedType, setFixedType] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.License.list("-created_date", 500);
    setLicenses(data);
    setLoading(false);
    enrichRecordsWithVault(data, VAULT_MODULES.licenses, "license_ref", ["license_number", "issuing_authority", "notes"]).then(setLicenses);
  };
  useEffect(() => { load(); }, []);

  const recsOf = (type) => licenses.filter((l) => l.license_type === type);
  const customKeys = Array.from(new Set(licenses.filter((l) => l.license_type === "other").map((l) => l.custom_label || "other").filter((x) => x && x !== "other")));

  const openNew = (type) => { setEditing(null); setRenewing(null); setFixedType(type); setFormOpen(true); };
  const openEdit = (rec) => { setEditing(rec); setRenewing(null); setFixedType(rec.license_type === "other" ? null : rec.license_type); setFormOpen(true); };
  const openRenew = (rec) => { setEditing(null); setRenewing(rec); setFixedType(rec.license_type === "other" ? null : rec.license_type); setFormOpen(true); };

  const stats = { active: 0, expiring_soon: 0, expired: 0, not_applicable: 0 };
  licenses.forEach((rec) => {
    if (!rec || !rec.license_type) return;
    if (rec.not_applicable) { stats.not_applicable++; return; }
    const s = expiryStatus(rec.expiry_date, rec.not_applicable);
    if (stats[s] !== undefined) stats[s]++;
  });

  const groups = LICENSE_TYPES.filter((tt) => tt.key !== "other");

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
      ) : licenses.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">{t.noRecords}</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((tt) => (
            <GroupCard key={tt.key} type={tt} recs={recsOf(tt.key)} onAdd={() => openNew(tt.key)} onEdit={openEdit} onRenew={openRenew} t={t} />
          ))}
          {customKeys.length > 0 && customKeys.map((label) => {
            const recs = licenses.filter((l) => l.license_type === "other" && (l.custom_label || "other") === label);
            const fakeType = { key: "other", ar: { label, authority: "" }, en: { label, authority: "" } };
            return <GroupCard key={`other-${label}`} type={fakeType} recs={recs} onAdd={() => openNew("other")} onEdit={openEdit} onRenew={openRenew} t={t} />;
          })}
        </div>
      )}

      <LicenseForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} editing={editing} fixedType={fixedType} renewing={renewing} />
    </div>
  );
}

function GroupCard({ type, recs, onAdd, onEdit, onRenew, t }) {
  const meta = typeMeta(type.key);
  const cardLabel = type.key === "other" ? (recs[0]?.custom_label || "—") : meta.label;
  const worst = recs.length
    ? recs.map((r) => expiryStatus(r.expiry_date, r.not_applicable))
        .reduce((acc, s) => (s === "expired" ? "expired" : s === "expiring_soon" && acc !== "expired" ? "expiring_soon" : acc === "expired" ? "expired" : acc === "expiring_soon" ? "expiring_soon" : s), "active")
    : null;

  return (
    <div className={cn("bg-white rounded-2xl border p-5 flex flex-col gap-3", worst === "expired" ? "border-rose-200" : worst === "expiring_soon" ? "border-amber-200" : "border-border")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", !recs.length || recs.every((r) => r.not_applicable) ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white")}><ShieldCheck size={18} /></div>
          <div className="leading-tight"><div className="font-semibold text-sm">{cardLabel}</div><div className="text-[11px] text-muted-foreground">{meta.authority}</div></div>
        </div>
        {recs.length > 0 && worst && <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-medium", statusBadgeOf(worst).cls)}>{statusBadgeOf(worst).label}</span>}
      </div>

      {recs.length === 0 ? (
        <div className="flex flex-col gap-2 mt-1">
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5"><Plus size={15} /> {t.fill}</Button>
          <Button size="sm" variant="ghost" onClick={onAdd} className="gap-1.5 text-muted-foreground hover:bg-slate-100"><Ban size={14} /> {t.markNA}</Button>
        </div>
      ) : (
        <div className="mt-1 space-y-3">
          {recs.map((rec) => {
            const na = rec.not_applicable;
            const status = expiryStatus(rec.expiry_date, na);
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
                      <Info label={t.licenseNo} value={rec.license_number || "—"} />
                      <Info label={t.durationL} value={rec.duration_months ? t.duration(rec.duration_months) : "—"} />
                      <Info label={t.issue} value={rec.issue_date || "—"} />
                      <Info label={t.expiry} value={rec.expiry_date || "—"} highlight={status} />
                    </div>
                    {rec.notes && <div className="text-[11px] text-muted-foreground bg-white rounded-lg p-2 mt-2">{rec.notes}</div>}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(rec)} className="gap-1.5"><Pencil size={13} /> {t.edit}</Button>
                      <Button size="sm" variant="outline" onClick={() => onRenew(rec)} className="gap-1.5 text-violet-700 hover:bg-violet-50"><RefreshCw size={13} /> {t.renew}</Button>
                      {rec.document_url && (<a href={rec.document_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline self-center">{t.viewDoc}</a>)}
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