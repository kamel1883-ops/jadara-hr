import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useI18n } from "@/lib/i18n";
import { SUPPORT_CATEGORIES } from "@/lib/supportCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/image";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import TurnstileWidget from "@/components/TurnstileWidget";
import Logo from "@/components/Logo";
import { ArrowRight, Headphones, Paperclip, X, Loader2, CheckCircle2, Upload } from "lucide-react";

export default function Support() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "الدعم الفني", sub: "أخبرنا عن إشكاليتك وسيتواصل معك فريق الدعم عبر بريدك الإلكتروني",
    catLabel: "فئة المشكلة *", catPh: "اختر القسم المتأثر به",
    subLabel: "نوع المشكلة", subPh: "اختر النوع",
    subjectLabel: "عنوان مختصر", subjectPh: "ملخص الإشكالية بكلمات قليلة",
    descLabel: "وصف الإشكالية *", descPh: "اشرح المشكلة بالتفصيل، الخطوات، والنتيجة المتوقعة…",
    nameLabel: "الاسم *", namePh: "اسمك الكامل",
    emailLabel: "البريد الإلكتروني *", emailPh: "سنسلّم الرد على هذا البريد",
    phoneLabel: "الجوال", phonePh: "(اختياري)",
    attachLabel: "مرفقات (صور توضح المشكلة)", attachHint: "حتى 6 صور",
    submit: "إرسال التذكرة", sending: "جارٍ الإرسال…",
    captcha: "أكمل التحقق البشري أولاً",
    okTitle: "تم استلام تذكرتك", okDesc: "رقم تذكرتك هو",
    okNote: "تم تحويلها لفريق الدعم الفني، وسيصلك الرد على بريدك الإلكتروني.",
    newTicket: "تذكرة جديدة", backHome: "العودة للموقع",
    err: "تعذّر الإرسال",
  } : {
    title: "Technical Support", sub: "Tell us your issue and our team will reply via email",
    catLabel: "Issue category *", catPh: "Select affected module",
    subLabel: "Issue type", subPh: "Select type",
    subjectLabel: "Short subject", subjectPh: "Briefly summarize the issue",
    descLabel: "Description *", descPh: "Describe the issue in detail, steps, and expected result…",
    nameLabel: "Name *", namePh: "Your full name",
    emailLabel: "Email *", emailPh: "Replies will be sent here",
    phoneLabel: "Phone", phonePh: "(optional)",
    attachLabel: "Attachments (screenshots)", attachHint: "Up to 6 images",
    submit: "Submit ticket", sending: "Sending…",
    captcha: "Complete human verification first",
    okTitle: "Ticket received", okDesc: "Your ticket number is",
    okNote: "It was forwarded to our support team; a reply will arrive at your email.",
    newTicket: "New ticket", backHome: "Back to site",
    err: "Failed to submit",
  };

  const [catKey, setCatKey] = useState("");
  const [subKey, setSubKey] = useState("");
  const [subject, setSubject] = useState("");
  const [desc, setDesc] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [attachments, setAttachments] = useState([]); // [{url, name}]
  const [uploading, setUploading] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null); // ticket_number
  const fileRef = useRef(null);

  const cat = SUPPORT_CATEGORIES.find((c) => c.key === catKey) || null;

  const onFiles = async (files) => {
    const list = Array.from(files || []).slice(0, 6 - attachments.length);
    if (!list.length) return;
    setUploading(true);
    try {
      for (const f of list) {
        const res = await base44.integrations.Core.UploadPublicFile({ file: f });
        const d = res?.data || res;
        const url = d?.file_url;
        if (url) setAttachments((a) => [...a, { url, name: f.name }].slice(0, 6));
      }
    } catch { setErr(isAr ? "فشل رفع المرفقات" : "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!catKey || !desc || !name || !email) { setErr(t.err); return; }
    if (!captcha) { setErr(t.captcha); return; }
    setBusy(true);
    try {
      const payload = {
        category: catKey,
        category_label: cat ? (isAr ? cat.ar : cat.en) : catKey,
        subcategory: subKey,
        subcategory_label: cat && subKey ? (cat.subs.find((s) => s.key === subKey) ? (isAr ? cat.subs.find((s) => s.key === subKey).ar : cat.subs.find((s) => s.key === subKey).en) : "") : "",
        subject, description: desc, client_name: name, client_email: email, client_phone: phone,
        attachment_urls: attachments.map((a) => a.url),
        captcha_token: captcha,
      };
      const res = await base44.functions.invoke("submitSupportTicket", payload);
      const d = res?.data || res;
      if (!d?.ok) throw new Error(d?.error || "fail");
      setDone(d.ticket_number);
    } catch (e2) { setErr(e2?.message || t.err); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F6F3FC] to-[#EFE9F8]">
        <div className="max-w-lg mx-auto px-5 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t.okTitle}</h1>
          <p className="text-muted-foreground mb-4">{t.okDesc}</p>
          <div className="inline-block bg-white border border-violet-200 rounded-xl px-6 py-3 text-2xl font-bold text-violet-700 tracking-wider mb-4">{done}</div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t.okNote}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" onClick={() => { setDone(null); setCatKey(""); setSubKey(""); setSubject(""); setDesc(""); setName(""); setEmail(""); setPhone(""); setAttachments([]); }}>{t.newTicket}</Button>
            <Button asChild className="gap-2"><Link to="/"><ArrowRight size={16} /> {t.backHome}</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F6F3FC] to-[#EFE9F8]">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/"><Logo tone="dark" size={40} /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-violet-700 flex items-center gap-1"><ArrowRight size={14} /> {isAr ? "الموقع" : "Site"}</Link>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center"><Headphones size={24} className="text-violet-700" /></div>
            <div>
              <h1 className="text-xl font-bold">{t.title}</h1>
              <p className="text-sm text-muted-foreground">{t.sub}</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.catLabel}</Label>
                <MobileSelect value={catKey} onValueChange={(v) => { setCatKey(v); setSubKey(""); }} placeholder={t.catPh}>
                  {SUPPORT_CATEGORIES.map((c) => <MobileSelectItem key={c.key} value={c.key}>{isAr ? c.ar : c.en}</MobileSelectItem>)}
                </MobileSelect>
              </div>
              <div className="space-y-1.5">
                <Label>{t.subLabel}</Label>
                <MobileSelect value={subKey} onValueChange={setSubKey} placeholder={t.subPh} disabled={!cat}>
                  {cat ? cat.subs.map((s) => <MobileSelectItem key={s.key} value={s.key}>{isAr ? s.ar : s.en}</MobileSelectItem>) : null}
                </MobileSelect>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.subjectLabel}</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t.subjectPh} maxLength={200} />
            </div>

            <div className="space-y-1.5">
              <Label>{t.descLabel}</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t.descPh} rows={5} maxLength={5000} required />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.nameLabel}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} required maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.emailLabel}</Label>
                <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.phoneLabel}</Label>
              <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePh} />
            </div>

            <div className="space-y-1.5">
              <Label>{t.attachLabel}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={uploading || attachments.length >= 6}>
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {isAr ? "إضافة صور" : "Add images"}
                </Button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Paperclip size={12} /> {t.attachHint}</span>
              </div>
              {attachments.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                  {attachments.map((a, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                      <Image src={a.url} fittingType="fill" className="w-full h-full" alt={a.name} />
                      <button type="button" onClick={() => setAttachments((arr) => arr.filter((_, j) => j !== i))} className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <TurnstileWidget onToken={setCaptcha} />

            {err && <div className="text-sm rounded-lg p-3 bg-rose-50 text-rose-700">{err}</div>}

            <Button type="submit" disabled={busy || !captcha} className="gap-2 w-full">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Headphones size={16} />} {busy ? t.sending : t.submit}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}