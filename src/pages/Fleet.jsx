import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Input } from "@/components/ui/input";
import { Car, Plus, Pencil, Shield, FileText, Wrench, ScrollText, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Clock, ShieldCheck, Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import VehicleDelegationDialog from "@/components/fleet/VehicleDelegationDialog";
import { expirySeverity, todayISO } from "@/lib/eos";
import { useI18n } from "@/lib/i18n";

const DAY = 86400000;

export default function Fleet() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "إدارة الأسطول", subtitle: "متابعة المركبات وانتهاء الرخص والفحص والتأمين", add: "مركبة جديدة",
    loading: "جارٍ التحميل...", empty: "لا توجد مركبات مسجلة",
    del: (n) => `حذف المركبة ${n}؟`, owner: "المسؤول", noneItem: "بدون",
    editT: "تعديل مركبة", addT: "إضافة مركبة",
    plate: "رقم اللوحة", type: "النوع", brand: "الماركة", model: "الموديل", year: "سنة الصنع", color: "اللون",
    status: "الحالة", active: "سارية", maintenance: "صيانة", outOfService: "خارج الخدمة",
    insExp: "انتهاء التأمين", insNo: "رقم التأمين", licExp: "انتهاء رخصة السير", inspExp: "انتهاء الفحص الفني",
    insurance: "التأمين", license: "رخصة السير", inspection: "الفحص الفني", cancel: "إلغاء", save: "حفظ",
    unspec: "غير محدد", daysLabel: (d) => `(${d >= 0 ? "+" : ""}${d} يوم)`,
    plateLetters: "حروف اللوحة", plateLettersPh: "مثال: أ ب ج", plateType: "نوع اللوحة", plateTypePh: "مثال: خاصة",
    syncNow: "تحديث من «تم»", syncing: "جارٍ التحديث…", lastSync: "آخر تحديث", never: "لم يتم التحديث بعد",
    syncOk: "تم تحديث تواريخ المركبة من «تم».", syncLocked: (d) => `التحديث متاح بعد ${d} يوم`,
    syncLockedShort: "مقفل 7 أيام", syncFailed: "تعذّر التحديث", notConfigured: "خدمة «تم» غير مفعّلة",
    docs: "بيانات الوثائق", tammBadge: "من «تم»", manualBadge: "يدوي",
    badPlate: "أدخل رقم اللوحة والحروف أولاً.", infoTitle: "كيف يعمل التحديث؟",
    infoBody: "يتم جلب تاريخ انتهاء رخصة السير والتأمين والفحص الدوري مباشرة من منصة «تم» الحكومية. التحديث التلقائي كل سبت، واليدوي متاح مرة كل 7 أيام لكل مركبة.",
  } : {
    title: "Fleet management", subtitle: "Track vehicles, license, inspection and insurance expiry", add: "New vehicle",
    loading: "Loading...", empty: "No vehicles registered",
    del: (n) => `Delete vehicle ${n}?`, owner: "Owner", noneItem: "None",
    editT: "Edit vehicle", addT: "Add vehicle",
    plate: "Plate number", type: "Type", brand: "Brand", model: "Model", year: "Year", color: "Color",
    status: "Status", active: "Active", maintenance: "Maintenance", outOfService: "Out of service",
    insExp: "Insurance expiry", insNo: "Insurance number", licExp: "License expiry", inspExp: "Inspection expiry",
    insurance: "Insurance", license: "License", inspection: "Inspection", cancel: "Cancel", save: "Save",
    unspec: "Unspecified", daysLabel: (d) => `(${d >= 0 ? "+" : ""}${d} days)`,
    plateLetters: "Plate letters", plateLettersPh: "e.g. A B C", plateType: "Plate type", plateTypePh: "e.g. Private",
    syncNow: "Refresh from Tamm", syncing: "Refreshing…", lastSync: "Last sync", never: "Never synced",
    syncOk: "Vehicle dates refreshed from Tamm.", syncLocked: (d) => `Next refresh in ${d} day(s)`,
    syncLockedShort: "Locked for 7 days", syncFailed: "Refresh failed", notConfigured: "Tamm service not configured",
    docs: "Document dates", tammBadge: "From Tamm", manualBadge: "Manual",
    badPlate: "Enter plate number and letters first.", infoTitle: "How does refresh work?",
    infoBody: "Registration, insurance and periodic inspection expiry dates are pulled directly from the Tamm government platform. Automatic sync runs every Saturday; manual refresh is allowed once per 7 days per vehicle.",
  };
  const typeLabel = (v) => isAr ? { sedan: "سيدان", suv: "دفع رباعي", van: "فان", truck: "شاحنة", bus: "حافلة", other: "أخرى" }[v] || v : { sedan: "Sedan", suv: "SUV", van: "Van", truck: "Truck", bus: "Bus", other: "Other" }[v] || v;
  const vPlate = (v) => (isAr ? v.plate_number : (v.plate_number_en || v.plate_number)) || v.plate_number || v.plate_number_en;
  const vBrand = (v) => (isAr ? v.brand : (v.brand_en || v.brand)) || v.brand || v.brand_en;
  const vModel = (v) => (isAr ? v.model : (v.model_en || v.model)) || v.model || v.model_en;
  const tAr = isAr ? "عربي" : "Arabic";
  const tEn = isAr ? "إنجليزي" : "English";

  const empty = { plate_number: "", plate_number_en: "", plate_letters: "", plate_type: "", vehicle_type: "sedan", brand: "", brand_en: "", model: "", model_en: "", year: new Date().getFullYear(), color: "", assigned_to: "", insurance_number: "", insurance_expiry: "", license_expiry: "", inspection_expiry: "", status: "active", notes: "" };

  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [delegVehicle, setDelegVehicle] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [notice, setNotice] = useState(null); // { type, text }

  const load = async () => {
    const data = await base44.entities.Vehicle.list("-created_date", 500);
    setVehicles(data);
    const emps = await base44.entities.Employee.filter({ status: "active" }, "-created_date", 500);
    setEmployees(emps);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (v) => { setEditing(v); setForm({ ...empty, ...v }); setOpen(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (editing) await base44.entities.Vehicle.update(editing.id, form);
    else await base44.entities.Vehicle.create(form);
    setOpen(false); load();
  };

  // حالة القفل: تُحسب من آخر مزامنة فعلية، وحدها الدالة الخلفية هي المرجع النهائي
  const syncState = (v) => {
    const last = v.tamm_sync_at ? new Date(v.tamm_sync_at).getTime() : 0;
    if (!last) return { can: true, daysLeft: 0, nextAt: null };
    const next = last + 7 * DAY;
    const left = Math.ceil((next - Date.now()) / DAY);
    return { can: Date.now() >= next, daysLeft: left > 0 ? left : 0, nextAt: new Date(next) };
  };

  const syncVehicle = async (v) => {
    if (syncingId) return;
    if (!String(v.plate_number || v.plate_number_en || "").trim()) {
      setNotice({ type: "error", text: t.badPlate });
      return;
    }
    setSyncingId(v.id);
    setNotice(null);
    try {
      const res = await base44.functions.invoke("vehicleSync", { action: "sync", vehicle_id: v.id });
      const data = res?.data || res || {};
      if (data?.error === "cooldown") setNotice({ type: "warn", text: data.message || t.syncLockedShort });
      else if (data?.error) setNotice({ type: "error", text: data.message || data.error });
      else setNotice({ type: data.ok ? "success" : "warn", text: data.message || (data.ok ? t.syncOk : t.syncFailed) });
      await load();
    } catch (err) {
      setNotice({ type: "error", text: err?.message || t.syncFailed });
    } finally {
      setSyncingId(null);
    }
  };

  // أي تغيير في الملف اليدوي يُظهر التاريخ الأصلي فقط؛ الأحدث يُعرض من مصدره
  const docValue = (v, syncedField, manualField) => {
    const s = v[syncedField];
    const m = v[manualField];
    return { date: s || m || "", fromTamm: Boolean(s) };
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} action={<Button onClick={startAdd} className="gap-2"><Plus size={18} /> {t.add}</Button>} />

      {notice && (
        <div className={cn(
          "mb-4 rounded-xl border px-4 py-3 text-sm flex items-start gap-2",
          notice.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800",
          notice.type === "warn" && "bg-amber-50 border-amber-200 text-amber-800",
          notice.type === "error" && "bg-rose-50 border-rose-200 text-rose-800",
        )}>
          {notice.type === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {loading ? <div className="p-10 text-center text-muted-foreground">{t.loading}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.length === 0 && (
            <div className="col-span-full p-14 text-center bg-white rounded-2xl border border-border"><Car size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-muted-foreground">{t.empty}</p></div>
          )}
          {vehicles.map((v) => {
            const st = syncState(v);
            const busy = syncingId === v.id;
            const lic = docValue(v, "tamm_sync_license_expiry", "license_expiry");
            const ins = docValue(v, "tamm_sync_insurance_expiry", "insurance_expiry");
            const insp = docValue(v, "tamm_sync_inspection_expiry", "inspection_expiry");
            return (
              <div key={v.id} className="bg-white rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700"><Car size={20} /></div>
                    <div>
                      <div className="font-bold">{vPlate(v)}</div>
                      <div className="text-xs text-muted-foreground">{vBrand(v)} {vModel(v)} · {v.year}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setDelegVehicle(v)} title="توكيل ووثيقة" className="p-2 rounded-lg hover:bg-violet-50 text-violet-600"><ScrollText size={15} /></button>
                    <button onClick={() => startEdit(v)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil size={15} /></button>
                  </div>
                </div>

                {v.assigned_to && (() => { const oe = employees.find((e) => e.id === v.assigned_to); return (
                  <div className="mb-3">
                    <div className="text-sm font-medium">{oe?.full_name || v.assigned_to}</div>
                    <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{oe?.national_id || "—"}</div>
                  </div>
                ); })()}

                <div className="space-y-2 text-sm">
                  <ExpiryRow icon={Shield} label={t.insurance} doc={ins} t={t} badge={t.tammBadge} />
                  <ExpiryRow icon={FileText} label={t.license} doc={lic} t={t} badge={t.tammBadge} />
                  <ExpiryRow icon={Wrench} label={t.inspection} doc={insp} t={t} badge={t.tammBadge} />
                </div>

                <div className="mt-4 pt-3 border-t border-border/70 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={12} /> {t.lastSync}</span>
                    <span className="tabular-nums" dir="ltr">{v.tamm_sync_at ? new Date(v.tamm_sync_at).toLocaleDateString("en-GB") : t.never}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={st.can ? "default" : "outline"}
                    disabled={busy || !st.can}
                    onClick={() => syncVehicle(v)}
                    className="w-full gap-2"
                    title={st.can ? t.syncNow : t.syncLocked(st.daysLeft)}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : st.can ? <RefreshCw size={14} /> : <Lock size={14} />}
                    {busy ? t.syncing : st.can ? t.syncNow : `${t.syncLockedShort} · ${st.daysLeft}`}
                  </Button>
                  {v.tamm_sync_message && !st.can && (
                    <div className={cn(
                      "text-[11px] rounded-lg px-2 py-1.5 border",
                      v.tamm_sync_status === "failed" ? "bg-rose-50 border-rose-200 text-rose-700"
                        : v.tamm_sync_status === "partial" ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-emerald-50 border-emerald-200 text-emerald-800"
                    )}>{v.tamm_sync_message}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
        <Info size={15} className="mt-0.5 shrink-0" />
        <div><span className="font-semibold">{t.infoTitle} </span>{t.infoBody}</div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <h3 className="font-semibold">{editing ? t.editT : t.addT}</h3>
            <div className="grid grid-cols-2 gap-3">
              <In label={`${t.plate} · ${tAr}`}><Input value={form.plate_number} onChange={(e) => set("plate_number", e.target.value)} required dir="rtl" /></In>
              <In label={`${t.plate} · ${tEn}`}><Input value={form.plate_number_en} onChange={(e) => set("plate_number_en", e.target.value)} dir="ltr" /></In>
              <In label={t.plateLetters}><Input value={form.plate_letters} onChange={(e) => set("plate_letters", e.target.value)} placeholder={t.plateLettersPh} dir="rtl" /></In>
              <In label={t.plateType}><Input value={form.plate_type} onChange={(e) => set("plate_type", e.target.value)} placeholder={t.plateTypePh} /></In>
              <In label={t.type}>
                <MobileSelect value={form.vehicle_type} onValueChange={(v) => set("vehicle_type", v)}>
                  {["sedan","suv","van","truck","bus","other"].map((tt) => <MobileSelectItem key={tt} value={tt}>{typeLabel(tt)}</MobileSelectItem>)}
                </MobileSelect>
              </In>
              <In label={`${t.brand} · ${tAr}`}><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} dir="rtl" /></In>
              <In label={`${t.brand} · ${tEn}`}><Input value={form.brand_en} onChange={(e) => set("brand_en", e.target.value)} dir="ltr" /></In>
              <In label={`${t.model} · ${tAr}`}><Input value={form.model} onChange={(e) => set("model", e.target.value)} dir="rtl" /></In>
              <In label={`${t.model} · ${tEn}`}><Input value={form.model_en} onChange={(e) => set("model_en", e.target.value)} dir="ltr" /></In>
              <In label={t.year}><Input type="number" value={form.year} onChange={(e) => set("year", Number(e.target.value))} /></In>
              <In label={t.color}><Input value={form.color} onChange={(e) => set("color", e.target.value)} /></In>
              <In label={t.owner}>
                <MobileSelect value={form.assigned_to} onValueChange={(v) => set("assigned_to", v)} placeholder={t.noneItem}>
                  {employees.map((e) => <MobileSelectItem key={e.id} value={e.id}>{e.full_name} — {e.national_id || "—"}</MobileSelectItem>)}
                </MobileSelect>
              </In>
              <In label={t.status}>
                <MobileSelect value={form.status} onValueChange={(v) => set("status", v)}>
                  <MobileSelectItem value="active">{t.active}</MobileSelectItem>
                  <MobileSelectItem value="under_maintenance">{t.maintenance}</MobileSelectItem>
                  <MobileSelectItem value="out_of_service">{t.outOfService}</MobileSelectItem>
                </MobileSelect>
              </In>
              <In label={t.insExp}><Input type="date" lang={isAr ? "ar" : "en"} value={form.insurance_expiry} onChange={(e) => set("insurance_expiry", e.target.value)} /></In>
              <In label={t.insNo}><Input value={form.insurance_number} onChange={(e) => set("insurance_number", e.target.value)} /></In>
              <In label={t.licExp}><Input type="date" lang={isAr ? "ar" : "en"} value={form.license_expiry} onChange={(e) => set("license_expiry", e.target.value)} /></In>
              <In label={t.inspExp}><Input type="date" lang={isAr ? "ar" : "en"} value={form.inspection_expiry} onChange={(e) => set("inspection_expiry", e.target.value)} /></In>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
              <Button type="submit">{t.save}</Button>
            </div>
          </form>
        </div>
      )}

      {delegVehicle && (
        <VehicleDelegationDialog vehicle={delegVehicle} employees={employees} onClose={() => setDelegVehicle(null)} onSaved={load} />
      )}
    </div>
  );
}

function ExpiryRow({ icon: Icon, label, doc, t, badge }) {
  const date = doc?.date || "";
  const sev = expirySeverity(date);
  const days = date ? Math.ceil((new Date(date) - new Date(todayISO())) / DAY) : null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon size={15} /> {label}
        {doc?.fromTamm && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            <ShieldCheck size={10} /> {badge}
          </span>
        )}
      </span>
      <span className={cn("text-xs px-2 py-1 rounded-lg border font-medium whitespace-nowrap", sev.cls)}>{date ? `${date} ${t.daysLabel(days)}` : t.unspec}</span>
    </div>
  );
}

function In({ label, children }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}
