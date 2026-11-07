import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { ScrollText, FileText, RotateCcw, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { enrichEmployeesBatch } from "@/lib/vaultSensitive";
import DelegationDocument from "./DelegationDocument";
import { writeRecordToVault, VAULT_MODULES } from "@/lib/vaultGeneric";

export default function VehicleDelegationDialog({ vehicle, employees, onClose, onSaved }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "توكيل واستلام المركبة",
    close: "إغلاق", loading: "جارٍ التحميل…",
    currentLabel: "السائق الحالي المُوكّل", id: "هوية", from: "من",
    noCurrent: "لا يوجد توكيل ساري لهذه المركبة.",
    reDelegateNote: "(إعادة توكيل — سينتهي التوكيل الحالي تلقائياً)",
    formTitle: (re) => `توكيل سائق للمركبة ${re ? t.reDelegateNote : ""}`,
    driver: "السائق (من قائمة الموظفين)", pickEmp: "اختر الموظف",
    delDate: "تاريخ التوكيل الفعلي", notes: "ملاحظات", notesPh: "اختياري",
    gen: "توليد وثيقة التوكيل",
    log: "سجل التوكيلات", noLog: "لا يوجد سجل.",
    active: "ساري", ended: "منتهٍ", doc: "وثيقة",
    ongoing: "ساري",
  } : {
    title: "Vehicle delegation & handover",
    close: "Close", loading: "Loading…",
    currentLabel: "Current delegated driver", id: "ID", from: "From",
    noCurrent: "No active delegation for this vehicle.",
    reDelegateNote: "(re-delegation — the current delegation ends automatically)",
    formTitle: (re) => `Delegate a driver to the vehicle ${re ? t.reDelegateNote : ""}`,
    driver: "Driver (from employees)", pickEmp: "Pick employee",
    delDate: "Actual delegation date", notes: "Notes", notesPh: "optional",
    gen: "Generate delegation document",
    log: "Delegation log", noLog: "No records.",
    active: "Active", ended: "Ended", doc: "Document",
    ongoing: "active",
  };
  const [list, setList] = useState([]);
  const [empId, setEmpId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [print, setPrint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrichedEmps, setEnrichedEmps] = useState(employees);

  useEffect(() => {
    let on = true;
    enrichEmployeesBatch(employees).then((m) => {
      if (on) setEnrichedEmps(employees.map((x) => (x.emp_ref ? { ...x, ...m[x.emp_ref] } : x)));
    });
    return () => { on = false; };
  }, [employees]);

  const load = async () => {
    setLoading(true);
    const recs = await base44.entities.VehicleDelegation.filter({ vehicle_id: vehicle.id }, "-delegation_date", 200);
    setList(recs);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const delegate = async () => {
    if (!empId || !date) return;
    setBusy(true);
    try {
      const cur = list.find((r) => r.is_current && r.status === "active");
      if (cur) {
        await base44.entities.VehicleDelegation.update(cur.id, { is_current: false, return_date: date, status: "returned" });
      }
      const emp = enrichedEmps.find((e) => e.id === empId);
      const plate = vehicle.plate_number || "";
      const label = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");
      const delNo = `TAW-${Date.now().toString().slice(-6)}`;
      // ملاحظات التوكيل الحسّاسة → تُخزّن في الخزنة السعودية
      const appointeeRef = await writeRecordToVault(VAULT_MODULES.appointees, null, {
        notes, delegation_number: delNo, plate_number: plate, vehicle_label: label,
        employee_name: emp?.full_name || "", delegation_date: date,
      });
      const rec = await base44.entities.VehicleDelegation.create({
        delegation_number: delNo,
        vehicle_id: vehicle.id,
        plate_number: plate,
        vehicle_label: label,
        employee_id: empId,
        employee_name: emp?.full_name || "",
        national_id: emp?.emp_ref ? "" : (emp?.national_id || ""),
        emp_ref: emp?.emp_ref || "",
        appointee_ref: appointeeRef || "",
        position: emp?.position || "",
        department: emp?.department || "",
        delegation_date: date,
        is_current: true,
        status: "active",
        notes: appointeeRef ? "" : notes,
      });
      await base44.entities.Vehicle.update(vehicle.id, { assigned_to: empId });
      await load();
      onSaved && onSaved();
      setPrint(rec);
      setEmpId(""); setNotes("");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><ScrollText size={18} className="text-violet-600" /> {t.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{vehicle.plate_number} · {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>{t.close}</Button>
        </div>

        {loading ? <div className="py-6 text-center text-sm text-muted-foreground">{t.loading}</div> : (
          <>
            {(() => { const cur = list.find((r) => r.is_current && r.status === "active"); return cur ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 mb-4 text-sm">
                <div className="font-medium text-emerald-700 mb-1">{t.currentLabel}</div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span><b>{cur.employee_name}</b></span>
                  <span className="text-muted-foreground">{t.id}: {cur.national_id || enrichedEmps.find((e) => e.id === cur.employee_id)?.national_id || "—"}</span>
                  <span className="text-muted-foreground">{t.from}: {cur.delegation_date}</span>
                  {cur.created_by_name && <span className="text-[11px] text-violet-700">{isAr ? "أُعدّت بواسطة" : "Prepared by"}: {cur.created_by_name}</span>}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-4 text-sm text-muted-foreground">{t.noCurrent}</div>
            ); })()}

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="font-medium text-sm">{t.formTitle(!!(list.find((r) => r.is_current && r.status === "active")))}</div>
              <div className="space-y-1.5">
                <Label>{t.driver}</Label>
                <MobileSelect value={empId} onValueChange={setEmpId} placeholder={t.pickEmp}>
                  {enrichedEmps.map((e) => (
                    <MobileSelectItem key={e.id} value={e.id}>{e.full_name} — {e.national_id || "—"} {e.position ? `· ${e.position}` : ""}</MobileSelectItem>
                  ))}
                </MobileSelect>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.delDate}</Label>
                  <Input type="date" lang={isAr ? "ar" : "en"} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.notes}</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPh} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={delegate} disabled={busy || !empId} className="gap-2">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} {t.gen}
                </Button>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-medium mb-2">{t.log}</div>
              {list.length === 0 ? <div className="text-xs text-muted-foreground">{t.noLog}</div> : (
                <div className="space-y-1.5">
                  {list.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                      <div>
                        <div className="font-medium">{r.employee_name} <span className="text-xs text-muted-foreground">({r.delegation_number})</span></div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{r.delegation_date} → {r.return_date || t.ongoing}</div>
                        {r.created_by_name && <div className="text-[11px] text-violet-700">{isAr ? "أُعدّت بواسطة" : "Prepared by"}: {r.created_by_name}{r.created_by_id ? ` — ${r.created_by_id}` : ""}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {r.is_current && r.status === "active" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{t.active}</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{t.ended}</span>
                        )}
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPrint(r)}><FileText size={13} /> {t.doc}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {print && <DelegationDocument delegation={print} onClose={() => { setPrint(null); load(); }} />}
    </div>
  );
}