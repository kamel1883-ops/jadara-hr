import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Input } from "@/components/ui/input";
import { Car, Plus, Pencil, Trash2, Shield, FileText, Wrench, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import VehicleDelegationDialog from "@/components/fleet/VehicleDelegationDialog";
import { expirySeverity, todayISO } from "@/lib/eos";
import { useI18n } from "@/lib/i18n";

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
  };
  const typeLabel = (v) => isAr ? { sedan: "سيدان", suv: "دفع رباعي", van: "فان", truck: "شاحنة", bus: "حافلة", other: "أخرى" }[v] || v : { sedan: "Sedan", suv: "SUV", van: "Van", truck: "Truck", bus: "Bus", other: "Other" }[v] || v;
  const vPlate = (v) => (isAr ? v.plate_number : (v.plate_number_en || v.plate_number)) || v.plate_number || v.plate_number_en;
  const vBrand = (v) => (isAr ? v.brand : (v.brand_en || v.brand)) || v.brand || v.brand_en;
  const vModel = (v) => (isAr ? v.model : (v.model_en || v.model)) || v.model || v.model_en;
  const tAr = isAr ? "عربي" : "Arabic";
  const tEn = isAr ? "إنجليزي" : "English";

  const empty = { plate_number: "", plate_number_en: "", vehicle_type: "sedan", brand: "", brand_en: "", model: "", model_en: "", year: new Date().getFullYear(), color: "", assigned_to: "", insurance_number: "", insurance_expiry: "", license_expiry: "", inspection_expiry: "", status: "active", notes: "" };

  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [delegVehicle, setDelegVehicle] = useState(null);

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
  const remove = async (v) => { if (!confirm(t.del(vPlate(v)))) return; await base44.entities.Vehicle.delete(v.id); load(); };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} action={<Button onClick={startAdd} className="gap-2"><Plus size={18} /> {t.add}</Button>} />

      {loading ? <div className="p-10 text-center text-muted-foreground">{t.loading}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.length === 0 && (
            <div className="col-span-full p-14 text-center bg-white rounded-2xl border border-border"><Car size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-muted-foreground">{t.empty}</p></div>
          )}
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700"><Car size={20} /></div>
                  <div><div className="font-bold">{vPlate(v)}</div><div className="text-xs text-muted-foreground">{vBrand(v)} {vModel(v)} · {v.year}</div></div>
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
                <ExpiryRow icon={Shield} label={t.insurance} date={v.insurance_expiry} t={t} />
                <ExpiryRow icon={FileText} label={t.license} date={v.license_expiry} t={t} />
                <ExpiryRow icon={Wrench} label={t.inspection} date={v.inspection_expiry} t={t} />
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <h3 className="font-semibold">{editing ? t.editT : t.addT}</h3>
            <div className="grid grid-cols-2 gap-3">
              <In label={`${t.plate} · ${tAr}`}><Input value={form.plate_number} onChange={(e) => set("plate_number", e.target.value)} required dir="rtl" /></In>
              <In label={`${t.plate} · ${tEn}`}><Input value={form.plate_number_en} onChange={(e) => set("plate_number_en", e.target.value)} dir="ltr" /></In>
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

function ExpiryRow({ icon: Icon, label, date, t }) {
  const sev = expirySeverity(date);
  const days = date ? Math.ceil((new Date(date) - new Date(todayISO())) / 86400000) : null;
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground"><Icon size={15} /> {label}</span>
      <span className={cn("text-xs px-2 py-1 rounded-lg border font-medium", sev.cls)}>{date ? `${date} ${t.daysLabel(days)}` : t.unspec}</span>
    </div>
  );
}
function In({ label, children }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}