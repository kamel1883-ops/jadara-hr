import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePortalI18n } from "@/lib/portalI18n";
import { writeRecordToVault, VAULT_MODULES } from "@/lib/vaultGeneric";
import VaultAttachments from "@/components/VaultAttachments";

const TYPES = [
  { value: "ethical", ar: "أخلاقية", en: "Ethical" },
  { value: "pressure", ar: "ضغط من موظف/مسؤول", en: "Pressure from staff" },
  { value: "sexual_harassment", ar: "تحرّش", en: "Harassment" },
  { value: "discrimination", ar: "تمييز", en: "Discrimination" },
  { value: "safety", ar: "سلامة مهنية", en: "Safety" },
  { value: "work_environment", ar: "بيئة عمل", en: "Work environment" },
  { value: "other", ar: "أخرى", en: "Other" },
];

const empty = { complaint_type: "work_environment", custom_type: "", description: "", is_confidential: false, documents: [] };

export default function ComplaintForm({ open, onClose, onSaved, employee, portalCreate }) {
  const { lang } = usePortalI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "رفع شكوى", emp: "الموظف", typeL: "نوع الشكوى", customL: "وصف النوع (عند اختيار «أخرى»)",
    descL: "تفاصيل الشكوى", confL: "سرية — تُعالج من الموارد البشرية فقط دون المدير المباشر",
    cancel: "إلغاء", submit: "إرسال الشكوى",
    warn: "تُرفع الشكوى للمدير المباشر ثم الموارد البشرية. عند الحل يُسجّل القرار ويُؤرشف المستند بين الأطراف.",
    attach: "مرفقات الشكوى (اختياري)",
  } : {
    title: "Submit a complaint", emp: "Employee", typeL: "Complaint type", customL: "Custom type (if Other)",
    descL: "Complaint details", confL: "Confidential — handled by HR only",
    cancel: "Cancel", submit: "Submit complaint",
    warn: "The complaint goes to your direct manager then HR. On resolution the decision is recorded and archived.",
    attach: "Complaint attachments (optional)",
  };

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm(empty); }, [open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      // السجل الكامل (الوصف/النوع المخصص) يُخزّن في الخزنة السعودية، Base44 يحتفظ بالبيانات الوصفية للفلترة
      const vaultData = {
        complaint_type: form.complaint_type,
        custom_type: form.complaint_type === "other" ? form.custom_type : "",
        description: form.description,
        is_confidential: !!form.is_confidential,
        // مرفقات الشكوى تُخزَّن في الخزنة السعودية داخل نفس سجل الشكوى الحسّاس
        documents: form.documents || [],
      };
      const complaintRef = await writeRecordToVault(VAULT_MODULES.complaints, null, vaultData);
      const payload = {
        employee_id: employee.id, employee_user_id: employee.user_id || "",
        employee_name: employee.full_name || "", department: employee.department || "",
        complaint_type: form.complaint_type,
        // إن نجحت الخزنة: لا نُخزّن الوصف في Base44. إن فشلت (وضع احتياطي): نُخزّنه محلياً
        custom_type: complaintRef ? "" : (form.complaint_type === "other" ? form.custom_type : ""),
        description: complaintRef ? "" : form.description,
        is_confidential: !!form.is_confidential,
        complaint_ref: complaintRef || "",
        submitted_date: new Date().toISOString().slice(0, 10),
        status: form.is_confidential ? "manager_approved" : "pending_manager",
        manager_status: form.is_confidential ? "approved" : "pending", hr_status: "pending",
      };
      if (portalCreate) await portalCreate(payload);
      else {
        await base44.entities.Complaint.create(payload);
        try { await base44.functions.invoke("notifyApprover", { type: "complaint", employeeId: employee.id, employeeName: employee.full_name, employeeNationalId: employee.national_id || "", employeeNumber: employee.employee_number || "", position: employee.position || "", status: payload.status }); } catch {}
      }
      onSaved?.(); onClose?.();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t.title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {t.emp}: <b className="text-foreground">{employee?.full_name}</b>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.typeL}</Label>
            <MobileSelect value={form.complaint_type} onValueChange={(v) => set("complaint_type", v)} placeholder={t.typeL} className="w-full">
              {TYPES.map((it) => (
                <MobileSelectItem key={it.value} value={it.value}>{isAr ? it.ar : it.en}</MobileSelectItem>
              ))}
            </MobileSelect>
          </div>
          {form.complaint_type === "other" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.customL}</Label>
              <Input value={form.custom_type} onChange={(e) => set("custom_type", e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.descL}</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} required />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_confidential} onChange={(e) => set("is_confidential", e.target.checked)} className="w-4 h-4 accent-violet-600" />
            {t.confL}
          </label>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">{t.attach}</div>
            <VaultAttachments
              value={form.documents}
              onChange={(v) => set("documents", v)}
              isAr={isAr}
              empRef={employee?.emp_ref || null}
              docType="complaint_attachment"
            />
          </div>
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{t.warn}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t.cancel}</Button>
            <Button type="submit" disabled={saving || !form.description.trim()}>
              {saving && <Loader2 size={16} className="animate-spin ml-2" />} {t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}