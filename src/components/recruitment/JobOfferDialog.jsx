import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { getCurrentOrgContext } from "@/lib/currentOrg";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import { renderToPdfBlob } from "@/lib/pdfDocs";
import JobOfferDoc from "@/components/docs/JobOfferDoc";
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
  return {
    establishment,
    logo: String(org.logo_url || "").trim(),
    unified: String(org.unified_number || tenant.unified_number || "").trim(),
    leaveDays: Number(org.annual_leave_days) === 30 ? "30" : "21",
  };
}

function blankMoney(v) {
  return String(v ?? "").trim() === "";
}

// تنزيل PDF فقط. أرقام العرض يكتبها مسؤول الموارد البشرية، ولا تُنسخ إلى سجل الموظف أو قرار التعيين.
export default function JobOfferDialog({ open, onOpenChange, applicant, job }) {
  const { toast } = useToast();
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: (n) => `عرض وظيفي — ${n}`,
    years: "مدة العرض الوظيفي بالسنوات",
    basic: "الراتب الأساسي",
    housing: "بدل السكن",
    transport: "بدل المواصلات",
    leave: "الإجازة السنوية",
    leave21: "21 يوماً في السنة",
    leave30: "30 يوماً في السنة",
    insurance: "التأمين الطبي إلزامي داخل المملكة العربية السعودية، ويظهر في العرض كما هو.",
    handHint: "المدة والراتب والبدلات والإجازة يكتبها مسؤول الموارد البشرية. تظهر في ملف العرض فقط، ولا تغيّر قرار التعيين.",
    body: "نص العرض",
    bodyPh: "يُولَّد النص تلقائياً ويمكن تعديله قبل التنزيل",
    extras: "بنود إضافية",
    extrasPh: "اكتب هنا أي بند غير موجود، مثل نسبة من الإيرادات أو تحمّل رسوم إقامة الزوجة والأولاد",
    gen: "توليد بالذكاء الاصطناعي",
    gening: "جارٍ التوليد...",
    download: "تنزيل PDF",
    downloading: "جارٍ التنزيل...",
    cancel: "إلغاء",
    noLogo: "لا يوجد شعار مرفوع لهذه المنشأة. سيظهر الاسم، ويظهر شعار جداره في الملف مثل بقية المستندات.",
    brandNote: "الملف يحمل شعار المنشأة واسمها، وشعار جداره، بنفس ترويسة المستندات الأخرى.",
    needYears: "أدخل مدة العرض الوظيفي بالسنوات",
    needBasic: "اكتب الراتب الأساسي",
    needBody: "اكتب نص العرض أو ولّده قبل التنزيل",
    genFail: "تعذر التوليد. يمكنك كتابة النص ثم تنزيله.",
    downOk: "تم تنزيل العرض الوظيفي",
    downFail: "تعذر إنشاء ملف PDF",
    mailHint: "بعد التنزيل أرسل الملف للمرشح بالبريد، والرد يكون بالبريد.",
  } : {
    title: (n) => `Job offer — ${n}`,
    years: "Offer length in years",
    basic: "Basic salary",
    housing: "Housing allowance",
    transport: "Transport allowance",
    leave: "Annual leave",
    leave21: "21 days per year",
    leave30: "30 days per year",
    insurance: "Medical insurance is mandatory in Saudi Arabia and is printed on the offer as is.",
    handHint: "Length, salary, allowances and leave are entered by HR. They appear on the offer file only and do not change the hiring decision.",
    body: "Offer text",
    bodyPh: "The text is generated automatically and can be edited before download",
    extras: "Additional terms",
    extrasPh: "Add any term that is not listed, such as a revenue share or covering a spouse and children's iqama fees",
    gen: "Generate with AI",
    gening: "Generating...",
    download: "Download PDF",
    downloading: "Downloading...",
    cancel: "Cancel",
    noLogo: "This establishment has no uploaded logo. Its name will appear, and the Jadara logo is included like other documents.",
    brandNote: "The file carries the establishment name and logo, plus the Jadara logo, using the same header as the other documents.",
    needYears: "Enter the offer length in years",
    needBasic: "Enter the basic salary",
    needBody: "Write or generate the offer text before downloading",
    genFail: "Generation failed. You can type the text and download it.",
    downOk: "Job offer downloaded",
    downFail: "Could not create the PDF",
    mailHint: "After download, email the file to the candidate. The reply comes by email.",
  };

  const [years, setYears] = useState("1");
  const [basic, setBasic] = useState("");
  const [housing, setHousing] = useState("");
  const [transport, setTransport] = useState("");
  const [leaveDays, setLeaveDays] = useState("21");
  const [body, setBody] = useState("");
  const [extras, setExtras] = useState("");
  const [identity, setIdentity] = useState({ establishment: "", logo: "", unified: "", leaveDays: "21" });
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const genToken = useRef(0);

  const buildPrompt = (idn) => {
    const who = idn.establishment || "";
    if (isAr) {
      return "اكتب نص عرض وظيفي رسمي بالعربية الفصحى، من غير عنوان ومن غير جدول. " +
        "المنشأة: " + who + ". " +
        "المرشح: " + (applicant?.full_name || "") + ". " +
        "الوظيفة: " + (job?.title || "") + ". " +
        (job?.department ? "الإدارة: " + job.department + ". " : "") +
        "لا تذكر مدة العقد ولا الراتب ولا البدلات ولا عدد أيام الإجازة ولا التأمين، لأن مسؤول الموارد البشرية يثبّتها في جدول مستقل. " +
        "لا تخترع بنوداً مالية أو نسباً. لا تستخدم أقواساً. اختم بطلب الرد عبر البريد الإلكتروني. أعد JSON فيه الحقل body فقط.";
    }
    return "Write a formal Arabic job-offer letter with no heading and no table. " +
      "Establishment: " + who + ". Candidate: " + (applicant?.full_name || "") + ". Role: " + (job?.title || "") + ". " +
      (job?.department ? "Department: " + job.department + ". " : "") +
      "Do not mention contract length, salary, allowances, leave days, or insurance, because HR fixes those in a separate table. " +
      "Do not invent financial terms or percentages. Do not use parentheses. Close by asking for a reply by email. Return JSON with a body field only.";
  };

  const generate = async (idn) => {
    const token = ++genToken.current;
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(idn),
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
    setBasic("");
    setHousing("");
    setTransport("");
    setLeaveDays("21");
    setBody("");
    setExtras("");
    (async () => {
      let idn = { establishment: "", logo: "", unified: "", leaveDays: "21" };
      try {
        idn = identityFrom(await getCurrentOrgContext());
      } catch { /* يبقى الاسم فارغاً */ }
      if (cancelled) return;
      setIdentity(idn);
      setLeaveDays(idn.leaveDays || "21");
      await generate(idn);
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
    if (blankMoney(basic)) { toast({ title: t.needBasic, variant: "destructive" }); return; }
    if (!body.trim()) { toast({ title: t.needBody, variant: "destructive" }); return; }
    const leave = leaveDays === "30" ? 30 : 21;
    setDownloading(true);
    try {
      const org = {
        name: identity.establishment,
        logo_url: identity.logo,
        unified_number: identity.unified,
      };
      const blob = await renderToPdfBlob(
        <JobOfferDoc
          applicant={applicant}
          job={job}
          org={org}
          years={yrs}
          basicSalary={Number(basic) || 0}
          housingAllowance={blankMoney(housing) ? 0 : Number(housing) || 0}
          transportAllowance={blankMoney(transport) ? 0 : Number(transport) || 0}
          annualLeaveDays={leave}
          body={body.trim()}
          extras={extras}
        />
      );
      const safeName = String(applicant?.full_name || "offer").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 40);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "عرض-وظيفي-" + safeName + ".pdf";
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title(applicant?.full_name || "")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 border rounded-xl p-3">
          {identity.logo ? <img src={identity.logo} alt="" className="h-11 w-auto max-w-[200px] object-contain" /> : null}
          <div className="text-sm">
            <div className="font-medium">{identity.establishment || "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">{identity.logo ? t.brandNote : t.noLogo}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t.years}</Label>
            <Input type="number" min={1} max={30} value={years} onChange={(e) => setYears(e.target.value)} />
          </div>
          <div>
            <Label>{t.leave}</Label>
            <Select value={leaveDays} onValueChange={setLeaveDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="21">{t.leave21}</SelectItem>
                <SelectItem value="30">{t.leave30}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>{t.basic}</Label>
            <Input type="number" min={0} value={basic} onChange={(e) => setBasic(e.target.value)} />
          </div>
          <div>
            <Label>{t.housing}</Label>
            <Input type="number" min={0} value={housing} onChange={(e) => setHousing(e.target.value)} />
          </div>
          <div>
            <Label>{t.transport}</Label>
            <Input type="number" min={0} value={transport} onChange={(e) => setTransport(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t.handHint}</p>
        <p className="text-xs text-muted-foreground">{t.insurance}</p>
        <div className="flex items-center justify-between gap-2">
          <Label>{t.body}</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => generate(identity)} disabled={generating}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {generating ? t.gening : t.gen}
          </Button>
        </div>
        <Textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.bodyPh} />
        <div>
          <Label>{t.extras}</Label>
          <Textarea rows={3} value={extras} onChange={(e) => setExtras(e.target.value)} placeholder={t.extrasPh} />
        </div>
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
