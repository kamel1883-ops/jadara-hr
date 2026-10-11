import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { getCurrentOrgContext } from "@/lib/currentOrg";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import { renderToPdfBlob } from "@/lib/pdfDocs";
import JobOfferDoc, { contractYearsLabel } from "@/components/docs/JobOfferDoc";
import { Download, Loader2, Sparkles } from "lucide-react";

function offerText(res) {
  const data = res && res.data ? res.data : res || {};
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("{")) {
      try { return String(JSON.parse(trimmed).body || "").trim(); } catch { return trimmed; }
    }
    return trimmed;
  }
  return String(data.body || data.response || data.text || "").trim();
}

function identityFrom(ctx) {
  const org = ctx?.org || {};
  const tenant = ctx?.tenant || {};
  const establishment = String(org.name || tenant.name || "").trim();
  const company = String(tenant.name || org.name || "").trim();
  return {
    establishment,
    company,
    logo: String(org.logo_url || "").trim(),
    unified: String(org.unified_number || tenant.unified_number || "").trim(),
  };
}

// تنزيل PDF فقط. لا يُحفظ على طلب التوظيف ولا يغيّر التعيين أو الراتب أو تواريخ العقد.
export default function JobOfferDialog({ open, onOpenChange, applicant, job }) {
  const { toast } = useToast();
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: (n) => `عرض وظيفي — ${n}`,
    years: "مدة العقد بالسنوات",
    yearsHint: "تظهر هذه المدة في ملف PDF فقط. لا تغيّر قرار التعيين، ولا الراتب، ولا تاريخ المباشرة.",
    body: "نص العرض",
    bodyPh: "يُولَّد النص تلقائياً ويمكن تعديله قبل التنزيل",
    gen: "توليد بالذكاء الاصطناعي",
    gening: "جارٍ التوليد...",
    download: "تنزيل PDF",
    downloading: "جارٍ التنزيل...",
    cancel: "إلغاء",
    company: "الشركة",
    noLogo: "لا يوجد شعار مرفوع لهذه المنشأة. سيظهر الاسم في الملف.",
    needYears: "أدخل عدد سنوات العقد",
    needBody: "اكتب نص العرض أو ولّده قبل التنزيل",
    genFail: "تعذر التوليد. يمكنك كتابة النص ثم تنزيله.",
    downOk: "تم تنزيل العرض الوظيفي",
    downFail: "تعذر إنشاء ملف PDF",
    mailHint: "بعد التنزيل أرسل الملف للمرشح بالبريد، والرد يكون بالبريد. قرار التعيين خطوة مستقلة بعد ذلك.",
  } : {
    title: (n) => `Job offer — ${n}`,
    years: "Contract length in years",
    yearsHint: "This length appears on the PDF only. It does not change the hiring decision, salary, or start date.",
    body: "Offer text",
    bodyPh: "The text is generated automatically and can be edited before download",
    gen: "Generate with AI",
    gening: "Generating...",
    download: "Download PDF",
    downloading: "Downloading...",
    cancel: "Cancel",
    company: "Company",
    noLogo: "This establishment has no uploaded logo. The name will still appear on the file.",
    needYears: "Enter the contract length in years",
    needBody: "Write or generate the offer text before downloading",
    genFail: "Generation failed. You can type the text and download it.",
    downOk: "Job offer downloaded",
    downFail: "Could not create the PDF",
    mailHint: "After download, email the file to the candidate. The reply comes by email. The hiring decision is a separate later step.",
  };

  const [years, setYears] = useState("1");
  const [body, setBody] = useState("");
  const [identity, setIdentity] = useState({ establishment: "", company: "", logo: "", unified: "" });
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const genToken = useRef(0);

  const buildPrompt = (idn, yrs) => {
    const duration = contractYearsLabel(yrs, isAr);
    const who = idn.establishment || idn.company || "";
    if (isAr) {
      return "اكتب نص عرض وظيفي رسمي بالعربية الفصحى، من غير عنوان ومن غير جدول. " +
        "المنشأة: " + who + ". " +
        (idn.company && idn.company !== who ? "الشركة: " + idn.company + ". " : "") +
        "المرشح: " + (applicant?.full_name || "") + ". " +
        "الوظيفة: " + (job?.title || "") + ". " +
        (job?.department ? "الإدارة: " + job.department + ". " : "") +
        "مدة العقد: " + duration + ". " +
        "لا تذكر مدة العقد ولا عدد السنوات داخل النص، لأنها تظهر في جدول مستقل. " +
        "لا تذكر أي راتب أو مبلغ مالي، ولا تاريخ مباشرة، ولا تاريخ انتهاء. " +
        "لا تستخدم أقواساً. اختم بطلب الرد عبر البريد الإلكتروني. أعد JSON فيه الحقل body فقط.";
    }
    return "Write a formal job-offer letter with no heading and no table. " +
      "Establishment: " + who + ". " +
      (idn.company && idn.company !== who ? "Company: " + idn.company + ". " : "") +
      "Candidate: " + (applicant?.full_name || "") + ". " +
      "Role: " + (job?.title || "") + ". " +
      (job?.department ? "Department: " + job.department + ". " : "") +
      "Contract length: " + duration + ". " +
      "Do not repeat the contract length inside the letter, because it appears in a separate table. " +
      "Do not mention any salary, amount, start date, or end date. " +
      "Do not use parentheses. Close by asking for a reply by email. Return JSON with a body field only.";
  };

  const generate = async (idn, yrs) => {
    const token = ++genToken.current;
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(idn, yrs),
        response_json_schema: {
          type: "object",
          properties: { body: { type: "string" } },
          required: ["body"],
        },
      });
      if (genToken.current !== token) return;
      const text = offerText(res);
      if (text) setBody(text);
      else toast({ title: t.genFail, variant: "destructive" });
    } catch (e) {
      if (genToken.current !== token) return;
      toast({ title: t.genFail, description: e.message, variant: "destructive" });
    } finally {
      if (genToken.current === token) setGenerating(false);
    }
  };

  useEffect(() => {
    if (!open || !applicant) return;
    let cancelled = false;
    setYears("1");
    setBody("");
    (async () => {
      let idn = { establishment: "", company: "", logo: "", unified: "" };
      try {
        idn = identityFrom(await getCurrentOrgContext());
      } catch { /* يبقى الاسم فارغاً ويُكمَل من النص */ }
      if (cancelled) return;
      setIdentity(idn);
      await generate(idn, 1);
    })();
    return () => {
      cancelled = true;
      genToken.current += 1;
      setGenerating(false);
    };
  }, [open, applicant?.id]);

  const download = async () => {
    const yrs = parseInt(years, 10);
    if (!yrs || yrs < 1) { toast({ title: t.needYears, variant: "destructive" }); return; }
    if (!body.trim()) { toast({ title: t.needBody, variant: "destructive" }); return; }
    setDownloading(true);
    try {
      const org = {
        name: identity.establishment || identity.company,
        logo_url: identity.logo,
        unified_number: identity.unified,
      };
      const blob = await renderToPdfBlob(
        <JobOfferDoc
          applicant={applicant}
          job={job}
          org={org}
          companyName={identity.company}
          years={yrs}
          body={body.trim()}
          isAr={isAr}
        />
      );
      const safeName = String(applicant?.full_name || "offer").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 40);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (isAr ? "عرض-وظيفي-" : "job-offer-") + safeName + ".pdf";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); try { a.remove(); } catch (e) {} }, 1200);
      toast({ title: t.downOk });
    } catch (e) {
      toast({ title: t.downFail, description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title(applicant?.full_name || "")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 border rounded-xl p-3">
          {identity.logo ? <img src={identity.logo} alt="" className="h-12 max-w-[120px] object-contain" /> : null}
          <div className="text-sm">
            <div className="font-medium">{identity.establishment || "—"}</div>
            {identity.company && identity.company !== identity.establishment ? (
              <div className="text-muted-foreground">{t.company}: {identity.company}</div>
            ) : null}
            {!identity.logo ? <div className="text-xs text-muted-foreground mt-1">{t.noLogo}</div> : null}
          </div>
        </div>
        <div>
          <Label>{t.years}</Label>
          <Input type="number" min={1} max={30} value={years} onChange={(e) => setYears(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">{t.yearsHint}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label>{t.body}</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => generate(identity, years)} disabled={generating}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {generating ? t.gening : t.gen}
          </Button>
        </div>
        <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.bodyPh} />
        <p className="text-xs text-muted-foreground">{t.mailHint}</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button type="button" onClick={download} disabled={downloading || generating}>
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {downloading ? t.downloading : t.download}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
