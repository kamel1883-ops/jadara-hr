import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Loader2 } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { usePortalI18n, usePortalT } from "@/lib/portalI18n";
import { leaveFullTypeLabel } from "@/lib/hr";
import { uploadFileToVault } from "@/lib/vaultDocuments";
import { writeRecordToVault, VAULT_MODULES } from "@/lib/vaultGeneric";

export default function LeaveRequestForm({ open, onClose, onSaved, employees, currentUserEmployee, portalCreate }) {
  usePortalI18n();
  const t = usePortalT("leaveForm");

  const empty = {
    employee_id: "", leave_type: "annual", annual_leave_mode: "actual_travel",
    start_date: "", end_date: "", reason: "", is_full_clearance: false,
    permission_hours: 0, permission_minutes: 0,
  };

  const [form, setForm] = useState(empty);
  const [medicalFile, setMedicalFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        ...empty,
        employee_id: currentUserEmployee?.id || employees?.[0]?.id || "",
      });
      setMedicalFile(null); setErr("");
    }
  }, [open, currentUserEmployee, employees]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isSick = form.leave_type === "sick";
  const isAnnual = form.leave_type === "annual";
  const isPermission = form.leave_type === "permission";
  const days = form.start_date && form.end_date ? differenceInDays(parseISO(form.end_date), parseISO(form.start_date)) + 1 : 0;
  const totalPermissionMinutes = (Number(form.permission_hours) || 0) * 60 + (Number(form.permission_minutes) || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (isPermission) {
      if (!form.start_date || totalPermissionMinutes <= 0) { setErr(t.requireDuration || "حدّد المدة"); return; }
    } else if (days <= 0) return;
    if (isSick && !medicalFile) { setErr(t.requireMed); return; }
    setErr(""); setSaving(true);
    try {
      const emp = employees?.find((x) => x.id === form.employee_id);
      let medical_url = "";
      if (isSick && medicalFile) {
        medical_url = await uploadFileToVault(medicalFile, { empRef: emp?.emp_ref || null, docType: "medical_report" }) || "";
      }
      // نص السبب حسّاس → يُخزّن في الخزنة السعودية، Base44 يحتفظ بالبيانات الوصفية للفلترة
      const leaveRef = await writeRecordToVault(VAULT_MODULES.leaves, null, {
        reason: form.reason,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: isPermission ? form.start_date : form.end_date,
        days_count: isPermission ? 0 : days,
        permission_minutes: isPermission ? totalPermissionMinutes : 0,
      });
      const payload = {
        employee_id: form.employee_id,
        leave_type: form.leave_type,
        annual_leave_mode: isAnnual ? form.annual_leave_mode : "actual_travel",
        start_date: isPermission ? form.start_date : form.start_date,
        end_date: isPermission ? form.start_date : form.end_date,
        reason: leaveRef ? "" : form.reason,
        leave_ref: leaveRef || "",
        is_full_clearance: isPermission ? false : form.is_full_clearance,
        permission_minutes: isPermission ? totalPermissionMinutes : 0,
        employee_user_id: emp?.user_id || "",
        employee_name: emp ? emp.full_name : "",
        days_count: isPermission ? 0 : days,
        medical_report_url: medical_url,
        // كل الطلبات تذهب للمدير المباشر أولاً. معتمد الموارد البشرية يستطيع التصرف على
        // الطلب وإعتماده لاحقاً من صفحة الموافقات حتى قبل أن يوافق المدير المباشر.
        status: "pending_manager",
        manager_status: "pending", hr_status: "pending", finance_status: "pending",
      };
      if (portalCreate) await portalCreate(payload);
      else {
        await base44.entities.LeaveRequest.create(payload);
        // تنبيه المدير المباشر ببريد بوجود طلب إجازة ينتظر موافقته
        try { await base44.functions.invoke("notifyApprover", { type: "leave", employeeId: form.employee_id, employeeName: emp?.full_name, employeeNationalId: emp?.national_id || "", employeeNumber: emp?.employee_number || "", position: emp?.position || "", details: `إجازة من ${form.start_date} إلى ${form.end_date} (${days} يوم)`, status: "pending_manager" }); } catch {}
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t.title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.emp}</Label>
            <MobileSelect value={form.employee_id} onValueChange={(v) => set("employee_id", v)} placeholder={t.choose} disabled={!!currentUserEmployee}>
              
              
                {(employees || []).map((emp) => (
                  <MobileSelectItem key={emp.id} value={emp.id}>{emp.full_name} — {emp.national_id || "—"} {emp.department ? `· ${emp.department}` : ""}</MobileSelectItem>
                ))}
              
            </MobileSelect>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.type}</Label>
              <MobileSelect value={form.leave_type} onValueChange={(v) => set("leave_type", v)}>
                
                
                  <MobileSelectItem value="annual">{leaveFullTypeLabel("annual")}</MobileSelectItem>
                  <MobileSelectItem value="sick">{leaveFullTypeLabel("sick")}</MobileSelectItem>
                  <MobileSelectItem value="emergency">{leaveFullTypeLabel("emergency")}</MobileSelectItem>
                  <MobileSelectItem value="unpaid">{leaveFullTypeLabel("unpaid")}</MobileSelectItem>
                  <MobileSelectItem value="maternity">{leaveFullTypeLabel("maternity")}</MobileSelectItem>
                  <MobileSelectItem value="permission">{leaveFullTypeLabel("permission")}</MobileSelectItem>
                
              </MobileSelect>
            </div>
            {!isPermission && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.days}</Label>
                <Input value={days > 0 ? String(days) : ""} disabled placeholder={t.daysHint} />
                {days > 0 && <span className="text-xs text-muted-foreground">{t.daysHint}</span>}
              </div>
            )}
          </div>

          {isPermission ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.start}</Label>
                <Input type="date" lang="ar" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
              </div>
              <div className="space-y-1.5 rounded-lg border border-violet-200 bg-violet-50/60 p-3">
                <Label className="text-xs font-semibold text-violet-800">
                  {(t.permissionDurationLabel) || "مدة الاستئذان"}
                </Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">{(t.permissionHours) || "ساعات"}</Label>
                    <Input type="number" min={0} max={12} dir="ltr" value={form.permission_hours} onChange={(e) => set("permission_hours", Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">{(t.permissionMinutes) || "دقائق"}</Label>
                    <MobileSelect value={String(form.permission_minutes)} onValueChange={(v) => set("permission_minutes", Number(v))} placeholder="0">
                      
                      
                        {[0, 15, 20, 30, 40, 45, 50].map((m) => (
                          <MobileSelectItem key={m} value={String(m)}>{m}</MobileSelectItem>
                        ))}
                      
                    </MobileSelect>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[[1,0],[0,30],[1,30],[0,20],[1,40],[2,0]].map(([h,m]) => (
                    <button type="button" key={`${h}-${m}`} onClick={() => { set("permission_hours", h); set("permission_minutes", m); }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-100">
                      {h > 0 ? `${h} س` : ""}{h > 0 && m > 0 ? " و" : ""}{m > 0 ? `${m} د` : ""}{h === 0 && m === 0 ? "0" : ""}
                    </button>
                  ))}
                </div>
                {totalPermissionMinutes > 0 && (
                  <div className="text-xs text-violet-700 mt-2">
                    {Math.floor(totalPermissionMinutes / 60)} ساعة و {totalPermissionMinutes % 60} دقيقة ({totalPermissionMinutes} دقيقة)
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">{(t.permissionHint) || "طلب الاستئذان يمرّ بالمدير المباشر ثم الموارد البشرية ولا يحتاج إلى صرف مالي."}</p>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.start}</Label>
                  <Input type="date" lang="ar" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.end}</Label>
                  <Input type="date" lang="ar" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} required />
                </div>
              </div>

              {isAnnual && (
                <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <Label className="text-xs font-semibold text-amber-800">{t.modeLabel}</Label>
                  <MobileSelect value={form.annual_leave_mode} onValueChange={(v) => set("annual_leave_mode", v)}>
                    
                    
                      <MobileSelectItem value="actual_travel">{t.modeTravel}</MobileSelectItem>
                      <MobileSelectItem value="encash_continue">{t.modeEncash}</MobileSelectItem>
                    
                  </MobileSelect>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {form.annual_leave_mode === "encash_continue" ? t.modeEncashHint : t.modeTravelHint}
                  </p>
                </div>
              )}

              {isSick && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {t.med} <span className="text-rose-500">*</span>
                    <span className="text-rose-500 text-xs mr-1">{t.medReq}</span>
                  </Label>
                  <Input type="file" accept="image/*,application/pdf" onChange={(e) => setMedicalFile(e.target.files?.[0] || null)} required />
                  <p className="text-xs text-muted-foreground">{t.medNote}</p>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_full_clearance} onChange={(e) => set("is_full_clearance", e.target.checked)} className="w-4 h-4" />
                {t.full}
              </label>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.reason}</Label>
            <Textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} rows={3} />
          </div>
          {err && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg p-3">{err}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t.cancel}</Button>
            <Button type="submit" disabled={saving || (!isPermission && days <= 0)}>
              {saving && <Loader2 size={16} className="animate-spin ml-2" />} {t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}