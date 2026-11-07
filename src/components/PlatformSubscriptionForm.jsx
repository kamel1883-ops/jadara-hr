import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { PLATFORM_TYPES, platformMeta } from "@/lib/platforms";
import { differenceInMonths, parseISO } from "date-fns";
import { useI18n } from "@/lib/i18n";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";

const empty = {
  platform_key: "", custom_label: "", account_id: "",
  subscriber_name: "", start_date: "", expiry_date: "",
  duration_months: "", annual_cost: 0, auto_renewal: false,
  not_applicable: false, notes: "", document_url: "",
};

export default function PlatformSubscriptionForm({ open, onClose, onSaved, editing, fixedKey, renewing }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr
    ? {
        edit: "تعديل اشتراك منصة",
        add: "تعبئة بيانات الاشتراك",
        renew: "تجديد اشتراك منصة",
        type: "نوع المنصة",
        choose: "اختر المنصة",
        custom: "اسم المنصة المخصص",
        customPh: "مثال: منصة رؤية غير مدرجة",
        na: "لا ينطبق هذا الاشتراك على المنشأة",
        account: "رقم الحساب / المشترك",
        subscriber: "الاسم المسجّل",
        start: "تاريخ بداية الاشتراك",
        expiry: "تاريخ انتهاء الاشتراك",
        duration: "مدة الاشتراك (أشهر)",
        durationPh: (c) => (c ? `محسوبة: ${c} شهر` : "اتركه فارغاً ليُحسب تلقائياً"),
        cost: "التكلفة السنوية (ريال)",
        auto: "تجديد تلقائي",
        notes: "ملاحظات",
        cancel: "إلغاء",
        save: "حفظ",
      }
    : {
        edit: "Edit subscription",
        add: "Fill subscription data",
        renew: "Renew platform subscription",
        type: "Platform",
        choose: "Select platform",
        custom: "Custom platform name",
        customPh: "e.g. An unlisted platform",
        na: "This subscription does not apply to the org",
        account: "Account / Subscriber number",
        subscriber: "Registered name",
        start: "Subscription start date",
        expiry: "Subscription expiry date",
        duration: "Duration (months)",
        durationPh: (c) => (c ? `Computed: ${c} months` : "Leave empty to auto-compute"),
        cost: "Annual cost (SAR)",
        auto: "Auto renewal",
        notes: "Notes",
        cancel: "Cancel",
        save: "Save",
      };

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) setForm({ ...empty, ...editing });
      else if (renewing) setForm({ ...empty, ...renewing, start_date: "", expiry_date: "", duration_months: "", document_url: "", not_applicable: false, id: undefined });
      else setForm({ ...empty, platform_key: fixedKey || "" });
    }
  }, [open, editing, fixedKey, renewing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const computedDuration =
    form.start_date && form.expiry_date
      ? differenceInMonths(parseISO(form.expiry_date), parseISO(form.start_date))
      : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.platform_key) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        duration_months: Number(form.duration_months) || computedDuration || 0,
        annual_cost: Number(form.annual_cost) || 0,
        not_applicable: !!form.not_applicable,
        auto_renewal: !!form.auto_renewal,
      };
      if (editing?.id) await base44.entities.PlatformSubscription.update(editing.id, payload);
      else await base44.entities.PlatformSubscription.create(payload); // includes renewing → new record
      onSaved?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t.edit : renewing ? t.renew : t.add}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.type}</Label>
            <MobileSelect value={form.platform_key} onValueChange={(v) => set("platform_key", v)} disabled={!!fixedKey} placeholder={t.choose}>
              {PLATFORM_TYPES.map((tt) => (
                <MobileSelectItem key={tt.key} value={tt.key}>{platformMeta(tt.key).label}</MobileSelectItem>
              ))}
            </MobileSelect>
          </div>

          {form.platform_key === "other" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.custom}</Label>
              <Input
                value={form.custom_label}
                onChange={(e) => set("custom_label", e.target.value)}
                placeholder={t.customPh}
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.not_applicable}
              onChange={(e) => set("not_applicable", e.target.checked)}
              className="w-4 h-4"
            />
            {t.na}
          </label>

          {!form.not_applicable && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.account}</Label>
                  <Input
                    value={form.account_id}
                    onChange={(e) => set("account_id", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.subscriber}</Label>
                  <Input
                    value={form.subscriber_name}
                    onChange={(e) => set("subscriber_name", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.start}</Label>
                  <Input
                    type="date"
                    lang={isAr ? "ar" : "en"}
                    value={form.start_date}
                    onChange={(e) => set("start_date", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.expiry}</Label>
                  <Input
                    type="date"
                    lang={isAr ? "ar" : "en"}
                    value={form.expiry_date}
                    onChange={(e) => set("expiry_date", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.duration}</Label>
                  <Input
                    type="number"
                    value={form.duration_months || (computedDuration ?? "")}
                    onChange={(e) => set("duration_months", e.target.value)}
                    placeholder={t.durationPh(computedDuration)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.cost}</Label>
                  <Input
                    type="number"
                    value={form.annual_cost}
                    onChange={(e) => set("annual_cost", e.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.auto_renewal}
                  onChange={(e) => set("auto_renewal", e.target.checked)}
                  className="w-4 h-4"
                />
                {t.auto}
              </label>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.notes}</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin ml-2" />}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}