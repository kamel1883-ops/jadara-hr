import React, { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Plus, Trash2, Star, Loader2, Building2, MapPin, Upload, Pencil, Crosshair } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { branchHoursLabel } from "@/lib/branchHours";

const emptyForm = {
  name: "", city: "", address: "", phone: "", is_main: false, logo_url: "", lat: "", lng: "", radius: 50,
  custom_hours: false, work_start_time: "", work_end_time: "", work_hours_per_day: "", late_grace_minutes: 15,
};

export default function BranchManager({ open, onClose, onSaved }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "إدارة الفروع",
    desc: "حدّد لكل فرع شعاره وموقعه (خطوط الطول/العرض) ونطاق البصمة. الموظف يبصم من نطاق فرعه تلقائياً، فإن لم يحدد له فرع استخدم المقر الرئيسي.",
    add: "إضافة فرع", edit: "تعديل", name: "اسم الفرع *", city: "المدينة", address: "العنوان", phone: "الهاتف",
    logo: "شعار الفرع", uploadLogo: "رفع شعار", lat: "خط العرض", lng: "خط الطول", radius: "نطاق البصمة (متر)",
    geo: "استخدام موقعي الحالي", fetching: "جارٍ تحديد الموقع…", geoErr: "تعذر تحديد الموقع — فعّل صلاحية الموقع",
    geofenceHint: "اترك الإحداثيات فارغة لاعتماد المقر الرئيسي للمنشأة كبديل.",
    main: "الفرع الرئيسي", setMain: "تعيين كفرع رئيسي", mainBadge: "رئيسي", del: (n) => `حذف الفرع «${n}»؟`,
    empty: "لا توجد فروع بعد — أضف أول فرع الآن.", save: "حفظ", cancel: "إلغاء", saving: "جارٍ الحفظ…", new: "فرع جديد",
    delMainErr: "لا يمكن حذف الفرع الرئيسي. عيّن فرعاً رئيسياً آخر أولاً.",
    noGeo: "نطاق البصمة غير محدد — سيعتمد على المقر الرئيسي.",
    geoBadge: (r) => `نطاق ${r} م`,
    hoursQ: "هل هذا الفرع لديه ساعات عمل مختلفة تُعتمد في الرواتب؟",
    yes: "نعم", no: "لا",
    hoursYes: "يُعتمد الدوام المضبوط أدناه على موظفي هذا الفرع في البصمة واحتساب التأخير والغياب في الرواتب.",
    hoursNo: "يُعتمد على موظفي هذا الفرع دوام المنشأة العام المضبوط في الإعدادات.",
    start: "بداية الدوام", end: "نهاية الدوام", hoursPerDay: "ساعات العمل اليومية", grace: "سماح التأخير (دقيقة)",
    hoursBadge: (s) => `دوام الفرع ${s}`,
  } : {
    title: "Branches", desc: "Set each branch's logo, location (lat/lng) and fingerprint radius. Employees clock in from their own branch's geofence; if none is set, the main workplace is used as fallback.",
    add: "Add branch", edit: "Edit", name: "Branch name *", city: "City", address: "Address", phone: "Phone",
    logo: "Branch logo", uploadLogo: "Upload logo", lat: "Latitude", lng: "Longitude", radius: "Fingerprint radius (m)",
    geo: "Use my current location", fetching: "Locating…", geoErr: "Could not get location — enable location permission",
    geofenceHint: "Leave coordinates empty to fall back to the main workplace.",
    main: "Main branch", setMain: "Set as main", mainBadge: "Main", del: (n) => `Delete branch “${n}”?`,
    empty: "No branches yet — add your first branch.", save: "Save", cancel: "Cancel", saving: "Saving…", new: "New branch",
    delMainErr: "Cannot delete the main branch. Set another branch as main first.",
    noGeo: "No geofence set — falls back to the main workplace.",
    geoBadge: (r) => `${r} m radius`,
    hoursQ: "Does this branch have different working hours adopted in payroll?",
    yes: "Yes", no: "No",
    hoursYes: "The hours below are adopted for this branch's employees in clocking, lateness and payroll absence.",
    hoursNo: "This branch's employees follow the organization's general working hours from settings.",
    start: "Shift start", end: "Shift end", hoursPerDay: "Daily working hours", grace: "Late grace (minutes)",
    hoursBadge: (s) => `Branch hours ${s}`,
  };

  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const load = async () => {
    const list = await base44.entities.Branch.list("-is_main", 500);
    setBranches(list);
  };
  useEffect(() => { if (open) load(); }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const resetForm = () => setForm({ ...emptyForm });

  const editBranch = (b) => {
    setForm({
      name: b.name || "", city: b.city || "", address: b.address || "", phone: b.phone || "",
      is_main: !!b.is_main, logo_url: b.logo_url || "",
      lat: b.lat != null && b.lat !== "" ? b.lat : "", lng: b.lng != null && b.lng !== "" ? b.lng : "",
      radius: b.radius != null && b.radius !== "" ? b.radius : 50,
      custom_hours: !!b.custom_hours,
      work_start_time: b.work_start_time || "",
      work_end_time: b.work_end_time || "",
      work_hours_per_day: b.work_hours_per_day != null && b.work_hours_per_day !== "" ? b.work_hours_per_day : "",
      late_grace_minutes: b.late_grace_minutes != null && b.late_grace_minutes !== "" ? b.late_grace_minutes : 15,
      id: b.id,
    });
    setErr("");
  };

  const onPickLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      set("logo_url", up.file_url);
    } catch (e2) {
      setErr(e2?.message || "Error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const useMyLocation = () => {
    setGeoBusy(true); setErr("");
    if (!navigator.geolocation) { setErr(t.geoErr); setGeoBusy(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("lat", Number(pos.coords.latitude.toFixed(6)));
        set("lng", Number(pos.coords.longitude.toFixed(6)));
        setGeoBusy(false);
      },
      () => { setErr(t.geoErr); setGeoBusy(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setErr("");
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city, address: form.address, phone: form.phone,
        is_main: form.is_main,
        logo_url: form.logo_url,
        lat: form.lat === "" ? null : Number(form.lat),
        lng: form.lng === "" ? null : Number(form.lng),
        radius: Number(form.radius) || 50,
        custom_hours: !!form.custom_hours,
        work_start_time: form.work_start_time || "",
        work_end_time: form.work_end_time || "",
        work_hours_per_day: Number(form.work_hours_per_day) || 0,
        late_grace_minutes: Number(form.late_grace_minutes) || 0,
      };
      if (form.is_main) {
        await base44.entities.Branch.updateMany({ is_main: true }, { $set: { is_main: false } });
      }
      if (form.id) {
        await base44.entities.Branch.update(form.id, payload);
      } else {
        await base44.entities.Branch.create(payload);
      }
      resetForm();
      await load();
      onSaved?.();
    } catch (e2) {
      setErr(e2?.message || "Error");
    } finally { setSaving(false); }
  };

  const setMain = async (b) => {
    await base44.entities.Branch.updateMany({ is_main: true }, { $set: { is_main: false } });
    await base44.entities.Branch.update(b.id, { is_main: true });
    load(); onSaved?.();
  };

  const remove = async (b) => {
    if (b.is_main) { setErr(t.delMainErr); return; }
    if (!confirm(t.del(b.name))) return;
    await base44.entities.Branch.delete(b.id);
    if (form.id === b.id) resetForm();
    load(); onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setErr(""); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 size={18} /> {t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <form onSubmit={submit} className="rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{form.id ? t.edit : t.new}</h4>
              {form.id && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>{t.add}</Button>}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {form.logo_url ? (
                  <Image src={form.logo_url} fittingType="fit" className="h-full w-full" />
                ) : (
                  <ImageIcon size={26} className="text-slate-300" />
                )}
              </div>
              <div className="space-y-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {t.uploadLogo}
                </Button>
                {form.logo_url && <button type="button" onClick={() => set("logo_url", "")} className="text-xs text-rose-500 hover:underline block">{isAr ? "إزالة الشعار" : "Remove logo"}</button>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.name}</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.city}</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.address}</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.phone}</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.lat}</Label>
                <Input value={form.lat} onChange={(e) => set("lat", e.target.value)} dir="ltr" inputMode="decimal" placeholder="24.7136" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.lng}</Label>
                <Input value={form.lng} onChange={(e) => set("lng", e.target.value)} dir="ltr" inputMode="decimal" placeholder="46.6753" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.radius}</Label>
                <Input type="number" min={5} value={form.radius} onChange={(e) => set("radius", e.target.value)} dir="ltr" />
              </div>
            </div>

            {/* ساعات العمل: قرار مسؤول الموارد البشرية لكل فرع على حِدة */}
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="max-w-md">
                  <div className="text-sm font-medium">{t.hoursQ}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{form.custom_hours ? t.hoursYes : t.hoursNo}</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1 shrink-0">
                  <button type="button" onClick={() => set("custom_hours", true)}
                    className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", form.custom_hours ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-slate-50")}>{t.yes}</button>
                  <button type="button" onClick={() => set("custom_hours", false)}
                    className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", !form.custom_hours ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-slate-50")}>{t.no}</button>
                </div>
              </div>

              {form.custom_hours && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t.start}</Label>
                    <Input type="time" value={form.work_start_time} onChange={(e) => set("work_start_time", e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t.end}</Label>
                    <Input type="time" value={form.work_end_time} onChange={(e) => set("work_end_time", e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t.hoursPerDay}</Label>
                    <Input type="number" min={0} step="0.5" value={form.work_hours_per_day} onChange={(e) => set("work_hours_per_day", e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t.grace}</Label>
                    <Input type="number" min={0} value={form.late_grace_minutes} onChange={(e) => set("late_grace_minutes", e.target.value)} dir="ltr" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={useMyLocation} disabled={geoBusy}>
                {geoBusy ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />} {t.geo}
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_main} onChange={(e) => set("is_main", e.target.checked)} />
                {t.main}
              </label>
            </div>
            {err && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">{err}</div>}
            <p className="text-xs text-muted-foreground leading-relaxed">{t.geofenceHint}</p>

            <div className="flex items-center justify-end gap-2">
              {form.id && <Button type="button" variant="ghost" onClick={resetForm}>{t.cancel}</Button>}
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {t.save}
              </Button>
            </div>
          </form>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {branches.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">{t.empty}</div>}
            {branches.map((b) => {
              const hasGeo = b.lat != null && b.lat !== "" && b.lng != null && b.lng !== "";
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {b.logo_url ? <Image src={b.logo_url} fittingType="fit" className="h-full w-full" /> : <Building2 size={18} className="text-slate-300" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{b.name}</span>
                        {b.is_main && <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1"><Star size={9} className="fill-violet-700" /> {t.mainBadge}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin size={11} className={hasGeo ? "text-emerald-500" : "text-slate-300"} />
                        {hasGeo ? t.geoBadge(Number(b.radius) || 50) : t.noGeo}
                      </div>
                      {branchHoursLabel(b) && (
                        <div className="text-[11px] text-violet-600 font-medium mt-0.5">{t.hoursBadge(branchHoursLabel(b))}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => editBranch(b)} title={t.edit} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil size={15} /></button>
                    {!b.is_main && <button onClick={() => setMain(b)} title={t.setMain} className="p-2 rounded-lg hover:bg-amber-50 text-amber-600"><Star size={15} /></button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isAr ? "إغلاق" : "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}