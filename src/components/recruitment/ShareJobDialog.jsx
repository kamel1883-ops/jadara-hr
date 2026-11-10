import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import { Copy, MessageCircle, Send, Linkedin, Mail, Globe } from "lucide-react";

export default function ShareJobDialog({ open, onOpenChange, job }) {
  const { toast } = useToast();
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "مشاركة إعلان الوظيفة", link: "رابط الإعلان", copied: "تم نسخ الرابط",
    wa: "واتساب", tg: "تيليجرام", li: "لينكدإن", mail: "بريد إلكتروني",
    saTitle: "انشر في منصات التوظيف السعودية",
    saHint: "يُفتح الموقع في نافذة جديدة — انسخ رابط الإعلان أعلاه والصقه في صفحة النشر.",
    shareText: (label) => `وظيفة شاغرة: ${label}`,
    mailBody: "تقدّم على الوظيفة عبر الرابط التالي:\n",
  } : {
    title: "Share the job posting", link: "Posting link", copied: "Link copied",
    wa: "WhatsApp", tg: "Telegram", li: "LinkedIn", mail: "Email",
    saTitle: "Post on Saudi job platforms",
    saHint: "The site opens in a new window — copy the posting link above and paste it on the posting page.",
    shareText: (label) => `Job opening: ${label}`,
    mailBody: "Apply for the job via the following link:\n",
  };
  const [url, setUrl] = useState("");

  useEffect(() => { if (job) setUrl(`${window.location.origin}/jobs/${job.id}`); }, [job]);

  const copy = () => { navigator.clipboard?.writeText(url); toast({ title: t.copied }); };
  const label = job?.title || "";
  const shareText = t.shareText(label);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${shareText} — ${url}`)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const mail = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(t.mailBody + url)}`;

  const saSites = [
    { name: "Indeed", url: "https://sa.indeed.com/employers/post-job", color: "bg-[#003A9B] hover:bg-[#002e78]" },
    { name: "Marjani", url: "https://www.marjani.com.sa", color: "bg-amber-600 hover:bg-amber-700" },
    { name: "Haraj", url: "https://haraj.com.sa", color: "bg-[#1f7a1f] hover:bg-[#175a17]" },
    { name: "Sabar", url: "https://www.sabar.sa", color: "bg-rose-600 hover:bg-rose-700" },
    { name: "Bayt", url: "https://www.bayt.com/ar/employers/post-job/", color: "bg-[#0A6CFF] hover:bg-[#0856cc]" },
    { name: "Wadheefa", url: "https://www.wadheefa.com", color: "bg-slate-600 hover:bg-slate-700" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t.title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground">{t.link}</label>
            <div className="flex gap-2 mt-1">
              <Input value={url} readOnly dir="ltr" />
              <Button size="icon" onClick={copy}><Copy size={16} /></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"><a href={wa} target="_blank" rel="noreferrer"><MessageCircle size={16} /> {t.wa}</a></Button>
            <Button asChild className="w-full gap-2 bg-sky-500 hover:bg-sky-600"><a href={tg} target="_blank" rel="noreferrer"><Send size={16} /> {t.tg}</a></Button>
            <Button asChild className="w-full gap-2 bg-blue-700 hover:bg-blue-800"><a href={li} target="_blank" rel="noreferrer"><Linkedin size={16} /> {t.li}</a></Button>
            <Button asChild className="w-full gap-2 bg-slate-700 hover:bg-slate-800"><a href={mail}><Mail size={16} /> {t.mail}</a></Button>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Globe size={14} className="text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">{t.saTitle}</label>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">{t.saHint}</p>
            <div className="grid grid-cols-2 gap-2">
              {saSites.map((s) => (
                <Button key={s.name} asChild className={`w-full gap-2 text-white ${s.color}`}>
                  <a href={s.url} target="_blank" rel="noreferrer"><Globe size={14} /> {s.name}</a>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}