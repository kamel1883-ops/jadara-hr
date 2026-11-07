import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Loader2 } from "lucide-react";
import { terminationReasons, reasonMeta, todayISO } from "@/lib/eos";
import { useI18n } from "@/lib/i18n";

const isResignationType = (r) => r === "resignation" || r === "employee_leave_with_rights";

export default function TerminateEmployeeDialog({ open, onClose, employee, onSaved }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "فسخ عقد الموظف",
    rec: "السبب / المادة النظامية",
    date: "تاريخ آخر يوم عمل",
    note: "ملاحظات الإنهاء",
    notePh: "بموجب المادة … / اتفاق الطرفين / لسبب … — يُسجّل في ملف الموظف",
    confirm: "فسخ العقد ونقل للأرشيف",
    warn: "سيُنقل الموظف إلى قائمة «غير النشطين (الأرشيف)» بتاريخ آخر يوم عمل المحدد، مع تسجيل السبب والمادة.",
    pick: "اختر سبب الفسخ…",
  } : {
    title: "Terminate contract",
    rec: "Reason / labor article",
    date: "Last working date",
    note: "Termination notes",
    notePh: "Under Art. … / mutual consent / for cause … — saved to employee file",
    confirm: "Terminate & archive",
    warn: "The employee moves to the “Inactive (archive)” list with the chosen last working date, reason and article.",
    pick: "Select termination reason…",
  };
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) { setReason(""); setDate(todayISO()); setNote(""); setErr(""); }
  }, [open, employee?.id]);

  const confirm = async () => {
    if (!reason) { setErr(isAr ? "اختر سبب الفسخ" : "Select a reason"); return; }
    setBusy(true); setErr("");
    try {
      const meta = reasonMeta(reason);
      const status = isResignationType(reason) ? "resigned" : "terminated";
      const tag = `${isAr ? "فسخ العقد" : "Termination"} (${meta.article || ""}${meta.note ? " — " + meta.note : ""})`;
      const desc = note
        ? [employee?.description, `${tag}: ${note}`].filter(Boolean).join("\n")
        : (employee?.description || tag);
      await base44.entities.Employee.update(employee.id, {
        status, termination_reason: reason, termination_date: date, description: desc,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e?.message || (isAr ? "تعذّر الفسخ" : "Failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t.title}</DialogTitle></DialogHeader>
        {employee && (
          <div className="space-y-4">
            <div className="text-sm font-medium">
              {employee.full_name}
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-xs text-muted-foreground">{employee.employee_number} — {employee.position}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.rec}</Label>
              <MobileSelect value={reason} onValueChange={setReason} placeholder={t.pick}>
                {terminationReasons.filter(r => r.value !== "none").map((r) => {
                  const m = isAr ? r.ar : r.en;
                  return (
                    <MobileSelectItem key={r.value} value={r.value}>
                      {m.label} — {m.article}
                    </MobileSelectItem>
                  );
                })}
              </MobileSelect>
              {reason && (
                <div className="text-xs text-muted-foreground bg-muted/60 rounded-lg p-2">
                  {reasonMeta(reason).note}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.date}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t.note}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t.notePh} />
            </div>
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{t.warn}</div>
            {err && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg p-2">{err}</div>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>{isAr ? "إلغاء" : "Cancel"}</Button>
          <Button variant="destructive" onClick={confirm} disabled={busy} className="gap-1">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {t.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}