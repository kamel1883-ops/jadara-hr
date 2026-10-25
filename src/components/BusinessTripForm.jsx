import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { usePortalI18n, usePortalT } from "@/lib/portalI18n";
import { writeRecordToVault, VAULT_MODULES } from "@/lib/vaultGeneric";

const empty = {
  employee_id: "", trip_type: "internal", destination: "", purpose: "",
  start_date: "", end_date: "", transport_mode: "car",
  transport_cost: 0, accommodation_cost: 0, per_diem: 0,
  other_costs: 0, advance_amount: 0, notes: "",
  employee_note: "", employee_document_url: ""
};

export default function BusinessTripForm({ open, onClose, onSaved, employees, editing, currentUserEmployee, portalCreate }) {
  usePortalI18n();
  const t = usePortalT("tripForm");

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);

  const uploadEmpDoc = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("employee_document_url", file_url);
    } catch (e) {
      setErr(e?.message || t.uploadFail);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...empty, ...editing } : { ...empty, employee_id: currentUserEmployee?.id || employees?.[0]?.id || "" });
      setErr("");
    }
  }, [open, editing, employees]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const days = form.start_date && form.end_date ? differenceInDays(parseISO(form.end_date), parseISO(form.start_date)) + 1 : 0;
  const perDiemTotal = (Number(form.per_diem) || 0) * (days > 0 ? days : 0);
  const total = (Number(form.transport_cost) || 0) + (Number(form.accommodation_cost) || 0) + perDiemTotal + (Number(form.other_costs) || 0);
  const emp = employees?.find((x) => x.id === form.employee_id);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employee_id) { setErr(t.errEmp); return; }
    if (days <= 0) { setErr(t.errDates); return; }
    setSaving(true); setErr("");
    try {
      // الغرض/ملاحظات الموظف/الملاحظات حسّاسة → تُخزّن في الخزنة السعودية
      const vaultData = {
        purpose: form.purpose, employee_note: form.employee_note, notes: form.notes,
        destination: form.destination, trip_type: form.trip_type,
        transport_cost: Number(form.transport_cost) || 0,
        accommodation_cost: Number(form.accommodation_cost) || 0,
        per_diem: Number(form.per_diem) || 0, per_diem_total: perDiemTotal,
        other_costs: Number(form.other_costs) || 0, advance_amount: Number(form.advance_amount) || 0,
        total_cost: total, days_count: days,
      };
      const tripRef = editing?.trip_ref
        ? await writeRecordToVault(VAULT_MODULES.businessTrips, editing.trip_ref, vaultData)
        : await writeRecordToVault(VAULT_MODULES.businessTrips, null, vaultData);
      const payload = {
        ...form,
        employee_name: emp ? emp.full_name : "",
        employee_user_id: emp?.user_id || currentUserEmployee?.user_id || "",
        transport_cost: Number(form.transport_cost) || 0,
        accommodation_cost: Number(form.accommodation_cost) || 0,
        per_diem: Number(form.per_diem) || 0,
        other_costs: Number(form.other_costs) || 0,
        advance_amount: Number(form.advance_amount) || 0,
        days_count: days, per_diem_total: perDiemTotal, total_cost: total,
        trip_ref: tripRef || editing?.trip_ref || "",
        purpose: tripRef ? "" : form.purpose,
        employee_note: tripRef ? "" : form.employee_note,
        notes: tripRef ? "" : form.notes,
      };
      if (editing) await base44.entities.BusinessTrip.update(editing.id, payload);
      else if (portalCreate) await portalCreate({ ...payload, status: "pending_manager", manager_status: "pending" });
      else {
        await base44.entities.BusinessTrip.create({ ...payload, status: "pending_manager", manager_status: "pending" });
        // تنبيه المدير المباشر ببريد بوجود طلب انتداب ينتظر موافقته
        try { await base44.functions.invoke("notifyApprover", { type: "trip", employeeId: form.employee_id, employeeName: emp?.full_name, employeeNationalId: emp?.national_id || "", employeeNumber: emp?.employee_number || "", position: emp?.position || "", details: `انتداب إلى ${form.destination || ""}`, status: "pending_manager" }); } catch {}
      }
      onSaved?.(); onClose?.();
    } catch (error) {
      setErr(error?.message || t.fail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? t.editT : t.newT}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.emp}</Label>
              <Select value={form.employee_id} onValueChange={(v) => set("employee_id", v)} disabled={!!currentUserEmployee || !!editing}>
                <SelectTrigger><SelectValue placeholder={t.choose} /></SelectTrigger>
                <SelectContent>
                  {(employees || []).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name} — {emp.national_id || "—"} {emp.department ? `· ${emp.department}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.tripType}</Label>
              <Select value={form.trip_type} onValueChange={(v) => set("trip_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">{t.internal}</SelectItem>
                  <SelectItem value="external">{t.external}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.dest}</Label>
              <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder={t.destPh} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.transport}</Label>
              <Select value={form.transport_mode} onValueChange={(v) => set("transport_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plane">{t.plane}</SelectItem>
                  <SelectItem value="car">{t.car}</SelectItem>
                  <SelectItem value="bus">{t.bus}</SelectItem>
                  <SelectItem value="train">{t.train}</SelectItem>
                  <SelectItem value="none">{t.none}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.start}</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.end}</Label>
              <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{t.days}</Label><Input value={days > 0 ? days : ""} disabled /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{t.perDiem}</Label><Input type="number" min="0" value={form.per_diem} onChange={(e) => set("per_diem", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{t.transportCost}</Label><Input type="number" min="0" value={form.transport_cost} onChange={(e) => set("transport_cost", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{t.accommodation}</Label><Input type="number" min="0" value={form.accommodation_cost} onChange={(e) => set("accommodation_cost", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{t.other}</Label><Input type="number" min="0" value={form.other_costs} onChange={(e) => set("other_costs", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{t.advance}</Label><Input type="number" min="0" value={form.advance_amount} onChange={(e) => set("advance_amount", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs font-medium text-muted-foreground">{t.purpose}</Label><Input value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder={t.purposePh} /></div>
          </div>

          <div className="rounded-xl bg-muted/60 p-4 flex flex-wrap justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{t.perDiemTotal} <b className="text-foreground">{perDiemTotal.toLocaleString()}</b></span>
            <span className="text-muted-foreground">{t.total} <b className="text-foreground">{total.toLocaleString()}</b></span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.descLabel}</Label>
            <Textarea value={form.employee_note} onChange={(e) => set("employee_note", e.target.value)} rows={3} placeholder={t.descPh} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.docsLabel}</Label>
            <Input type="file" onChange={(e) => uploadEmpDoc(e.target.files?.[0])} disabled={uploading} />
            {uploading && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> {t.uploading}</div>}
            {form.employee_document_url && <div className="text-xs text-emerald-600 break-all">✓ {form.employee_document_url}</div>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.notes}</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>

          {err && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg p-3">{err}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t.cancel}</Button>
            <Button type="submit" disabled={saving || days <= 0}>
              {saving && <Loader2 size={16} className="animate-spin ml-2" />} {editing ? t.save : t.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}