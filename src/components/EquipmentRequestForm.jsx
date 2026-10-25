import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePortalI18n, portalDir } from "@/lib/portalI18n";

const ITEM_TYPES = [
  { value: "laptop", ar: "لابتوب", en: "Laptop" },
  { value: "phone", ar: "جوال", en: "Mobile phone" },
  { value: "work_phone", ar: "جوال عمل", en: "Work phone" },
  { value: "sim", ar: "شريحة جوال", en: "SIM card" },
  { value: "tablet", ar: "جهاز لوحي", en: "Tablet" },
  { value: "clothing", ar: "ملابس عمل", en: "Work clothing" },
  { value: "camera", ar: "كاميرا", en: "Camera" },
  { value: "tool", ar: "أداة/عدة", en: "Tool" },
  { value: "other", ar: "أخرى", en: "Other" },
];

const empty = { item_type: "laptop", custom_type: "", item_label: "", reason: "" };

export default function EquipmentRequestForm({ open, onClose, onSaved, employee, portalCreate }) {
  const { lang } = usePortalI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "طلب عهدة", emp: "الموظف", typeL: "نوع العهدة", customL: "وصف النوع (عند اختيار «أخرى»)",
    labelL: "البيان / الوصف", reasonL: "سبب الطلب", cancel: "إلغاء", submit: "إرسال الطلب",
    warn: "يُرسل الطلب للمدير المباشر ثم الموارد البشرية للاعتماد، وعند اعتماده يُسجّل في ملف العهد لديك.",
  } : {
    title: "Equipment request", emp: "Employee", typeL: "Equipment type", customL: "Custom type (if Other)",
    labelL: "Description / label", reasonL: "Reason", cancel: "Cancel", submit: "Submit request",
    warn: "The request goes to your direct manager then HR for approval. Once approved it is recorded in your custody file.",
  };

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm(empty); }, [open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.item_label.trim()) return;
    setSaving(true);
    try {
      const payload = {
        employee_id: employee.id, employee_user_id: employee.user_id || "",
        employee_name: employee.full_name || "",
        item_type: form.item_type,
        custom_type: form.item_type === "other" ? form.custom_type : "",
        item_label: form.item_label, reason: form.reason,
        request_date: new Date().toISOString().slice(0, 10),
        status: "pending_manager", manager_status: "pending", hr_status: "pending",
      };
      if (portalCreate) await portalCreate(payload);
      else {
        await base44.entities.EquipmentRequest.create(payload);
        try { await base44.functions.invoke("notifyApprover", { type: "equipment", employeeId: employee.id, employeeName: employee.full_name, employeeNationalId: employee.national_id || "", employeeNumber: employee.employee_number || "", position: employee.position || "", details: `عهدة: ${form.item_label}`, status: "pending_manager" }); } catch {}
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
            <Select value={form.item_type} onValueChange={(v) => set("item_type", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((it) => (
                  <SelectItem key={it.value} value={it.value}>{isAr ? it.ar : it.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.item_type === "other" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.customL}</Label>
              <Input value={form.custom_type} onChange={(e) => set("custom_type", e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.labelL}</Label>
            <Input value={form.item_label} onChange={(e) => set("item_label", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.reasonL}</Label>
            <Textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} rows={2} />
          </div>
          <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg p-3">{t.warn}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t.cancel}</Button>
            <Button type="submit" disabled={saving || !form.item_label.trim()}>
              {saving && <Loader2 size={16} className="animate-spin ml-2" />} {t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}