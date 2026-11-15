import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, FilePlus2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// نموذج «طلب جديد» للموظف — نماذج إدارية بلا مستحقات مالية (تعريف راتب، تأمين طبي،
// تجديد إقامة، خروج نهائي، نقل كفالة، إنهاء علاقة، تجديد/عدم تجديد عقد، أخرى…).
// الطلب يُسجَّل كمستند ويمر على الموارد البشرية (اعتماد أو رفض) ويُحفظ قرارها وتاريخه.

const TYPES = [
  { key: "salary_definition", ar: "تعريف راتب", en: "Salary definition" },
  { key: "add_health_insurance", ar: "إضافة تأمين طبي", en: "Add health insurance" },
  { key: "iqama_renewal", ar: "تجديد الإقامة", en: "Iqama renewal" },
  { key: "final_exit", ar: "الخروج النهائي", en: "Final exit" },
  { key: "sponsorship_transfer", ar: "نقل الكفالة", en: "Sponsorship transfer" },
  { key: "contract_termination", ar: "إنهاء العلاقة التعاقدية", en: "Contract termination" },
  { key: "contract_renewal", ar: "تجديد العقد", en: "Contract renewal" },
  { key: "no_renewal_request", ar: "عدم الرغبة بتجديد العقد", en: "No renewal request" },
  { key: "experience_letter", ar: "شهادة خبرة", en: "Experience letter" },
  { key: "bank_account_update", ar: "تحديث الحساب البنكي", en: "Bank account update" },
  { key: "other", ar: "أخرى", en: "Other" },
];

export default function HrRequestForm({ open, onClose, onSaved, session, isAr }) {
  const [type, setType] = useState("salary_definition");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const t = isAr
    ? {
        title: "طلب جديد", typeLabel: "نوع الطلب", titleLabel: "عنوان الطلب",
        titlePh: "اكتب اسم الطلب كما تريده", descLabel: "وصف الطلب / الإشكالية",
        descPh: "اشرح الطلب أو المشكلة بالتفصيل…", reasonLabel: "سبب الطلب",
        reasonPh: "لماذا تقدّم هذا الطلب؟", attLabel: "مرفق (اختياري)",
        submit: "إرسال الطلب", cancel: "إلغاء", sending: "جارٍ الإرسال…",
        okTitle: "تم إرسال طلبك", okBody: "وصل طلبك إلى الموارد البشرية للاعتماد. ستُبلَّغ بالنتيجة في الإشعارات.",
        close: "إغلاق", typeReq: "اختر نوع الطلب", titleReq: "اكتب عنوان الطلب عند اختيار «أخرى»",
        descReq: "وصف الطلب مطلوب", fail: "تعذّر إرسال الطلب، حاول مرة أخرى.",
      }
    : {
        title: "New request", typeLabel: "Request type", titleLabel: "Request title",
        titlePh: "Name this request as you need", descLabel: "Request description / issue",
        descPh: "Explain the request or the issue in detail…", reasonLabel: "Reason",
        reasonPh: "Why are you submitting this request?", attLabel: "Attachment (optional)",
        submit: "Submit request", cancel: "Cancel", sending: "Submitting…",
        okTitle: "Request submitted", okBody: "Your request reached HR for approval. You will be notified of the result.",
        close: "Close", typeReq: "Select a request type", titleReq: "Enter a title when choosing “Other”",
        descReq: "Description is required", fail: "Could not submit the request, please try again.",
      };

  const reset = () => {
    setType("salary_definition"); setTitle(""); setDescription(""); setReason("");
    setFile(null); setErr(""); setDone(false); setBusy(false);
  };

  const closeAll = () => { reset(); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!description.trim()) { setErr(t.descReq); return; }
    if (type === "other" && !title.trim()) { setErr(t.titleReq); return; }
    setBusy(true);
    try {
      let attachmentRef = "";
      if (file) {
        const up = await base44.integrations.Core.UploadFile({ file });
        attachmentRef = up?.file_url || "";
      }
      const res = await base44.functions.invoke("portalData", {
        token: session?.token,
        employee_id: session?.employee_id,
        action: "create_hr_request",
        payload: {
          request_type: type,
          request_title: title.trim(),
          description: description.trim(),
          reason: reason.trim(),
          attachment_ref: attachmentRef,
        },
      });
      const data = res?.data || res;
      if (data?.ok) {
        setDone(true);
        if (onSaved) onSaved();
      } else {
        setErr(t.fail);
      }
    } catch (e2) {
      const d = e2?.response?.data || {};
      setErr(d?.error === "title_required" ? t.titleReq : d?.error === "description_required" ? t.descReq : t.fail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeAll()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FilePlus2 size={18} /> {t.title}</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-4 text-center space-y-3">
            <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
            <div className="font-semibold">{t.okTitle}</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.okBody}</p>
            <Button onClick={closeAll} className="mt-2">{t.close}</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.typeLabel}</Label>
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-0.5">
                {TYPES.map((x) => (
                  <button
                    key={x.key}
                    type="button"
                    onClick={() => setType(x.key)}
                    className={cn(
                      "text-xs rounded-lg border px-2.5 py-2 text-start transition",
                      type === x.key
                        ? "border-violet-400 bg-violet-50 text-violet-800 font-medium"
                        : "border-border bg-white text-muted-foreground hover:border-violet-200"
                    )}
                  >
                    {isAr ? x.ar : x.en}
                  </button>
                ))}
              </div>
            </div>

            {type === "other" && (
              <div className="space-y-1.5">
                <Label>{t.titleLabel}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePh} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t.descLabel}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descPh} rows={4} />
            </div>

            <div className="space-y-1.5">
              <Label>{t.reasonLabel}</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reasonPh} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>{t.attLabel}</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>

            {err && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{err}</div>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeAll} disabled={busy}>{t.cancel}</Button>
              <Button type="submit" disabled={busy} className="gap-2">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />}
                {busy ? t.sending : t.submit}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
