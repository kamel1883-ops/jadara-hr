import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowLeft, Zap, ChevronLeft, Mail, Linkedin, Twitter } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import Logo from "@/components/Logo";
import LanguageToggle from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

const WHATSAPP = "https://wa.me/966594700782";
const SALES_EMAIL = "info@jadara-hr.com";
const SOCIAL = {
  linkedin: "https://www.linkedin.com/company/%D8%AC%D8%AF%D8%A7%D8%B1%D8%A9-%D9%84%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D9%88%D8%A7%D8%B1%D8%AF-%D8%A7%D9%84%D8%A8%D8%B4%D8%B1%D9%8A%D8%A9",
  twitter: "https://x.com/jadarahr",
};

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

// صفحة هبوط متخصصة بمحتوى موجه (SEO) — تُمرَّر عبر `content` ثمار وثنائية اللغة.
export default function FeatureLanding({ content }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const c = isAr ? content.ar : content.en;

  useEffect(() => {
    document.title = c.seo.title;
    setMeta("description", c.seo.description);
    setMeta("keywords", c.seo.keywords);
    setMetaProp("og:title", c.seo.title);
    setMetaProp("og:description", c.seo.description);
    setMetaProp("og:type", "website");
    setMetaProp("og:url", `https://jadara-hr.com${content.path}`);
    setLink("canonical", `https://jadara-hr.com${content.path}`);

    // JSON-LD: FAQPage — لتفعيل النتائج الغنية (Rich Results) في جوجل لأسئلة الصفحة.
    let faq = document.getElementById("fl-faq-jsonld");
    if (c.faqs && c.faqs.length) {
      const ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: c.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      };
      if (!faq) {
        faq = document.createElement("script");
        faq.id = "fl-faq-jsonld";
        faq.type = "application/ld+json";
        document.head.appendChild(faq);
      }
      faq.textContent = JSON.stringify(ld);
    } else if (faq) {
      faq.remove();
    }

    // JSON-LD: BreadcrumbList — يثبّت ترتيب الصفحة داخل الموقع (يقوّي توضيح السياق لجوجل).
    let bc = document.getElementById("fl-breadcrumb-jsonld");
    if (!bc) {
      bc = document.createElement("script");
      bc.id = "fl-breadcrumb-jsonld";
      bc.type = "application/ld+json";
      document.head.appendChild(bc);
    }
    bc.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: isAr ? "الرئيسية" : "Home", item: "https://jadara-hr.com/" },
        { "@type": "ListItem", position: 2, name: c.titleHi || c.seo.title, item: `https://jadara-hr.com${content.path}` },
      ],
    });
  }, [c, content.path, isAr]);

  return (
    <div className="min-h-screen bg-[#F6F3FC] text-foreground antialiased" dir={isAr ? "rtl" : "ltr"}>
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-violet-300/40 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full bg-violet-200/35 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-fuchsia-200/25 blur-[120px]" />
      </div>

      {/* شريط علوي */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo tone="dark" size={42} />
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-base text-foreground/70">
            <Link to="/" className="hover:text-violet-700 transition">{isAr ? "الرئيسية" : "Home"}</Link>
            <Link to="/quote" className="hover:text-violet-700 transition">{isAr ? "عرض السعر" : "Quote"}</Link>
            <Link to="/about" className="hover:text-violet-700 transition">{isAr ? "من نحن" : "About"}</Link>
            <Link to="/contact" className="hover:text-violet-700 transition">{isAr ? "تواصل" : "Contact"}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link to="/company-login" className="text-base text-foreground/70 hover:text-violet-700 px-3 py-2 rounded-lg hidden sm:block">{isAr ? "بوابة الشركات" : "Company Portal"}</Link>
            <Link to="/quote" className="text-base bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl font-medium text-white shadow-lg shadow-violet-600/30 transition inline-flex items-center gap-1.5">
              <Zap size={15} /> {isAr ? "ابدأ الآن" : "Get Started"}
            </Link>
          </div>
        </div>
      </header>

      {/* فتاحة الموقع */}
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-12 text-center">
        <motion.div initial="hidden" animate="show" variants={fadeUp}>
          <div className="inline-flex items-center gap-2 bg-violet-100 border border-violet-200 rounded-full px-3 py-1 text-sm text-violet-700 mb-5">
            {c.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            {c.titlePre}{" "}
            <span className="bg-gradient-to-l from-violet-600 via-fuchsia-500 to-violet-700 bg-clip-text text-transparent">{c.titleHi}</span>
          </h1>
          <p className="text-muted-foreground text-lg mt-6 max-w-3xl mx-auto leading-relaxed">{c.hero}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to="/quote" className="bg-violet-600 hover:bg-violet-700 px-6 py-3.5 rounded-2xl font-semibold text-white shadow-xl shadow-violet-600/30 inline-flex items-center gap-2 transition">
              <Zap size={18} /> {c.ctaPrimary}
            </Link>
            <Link to="/" className="bg-white hover:bg-violet-50 border border-violet-200 text-foreground px-6 py-3.5 rounded-2xl font-medium transition inline-flex items-center gap-1.5">
              {isAr ? "كل المميزات" : "All features"} <ArrowLeft size={16} style={{ transform: isAr ? "none" : "scaleX(-1)" }} />
            </Link>
          </div>
        </motion.div>

        {c.heroImg && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative mt-12 max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-400/30 to-fuchsia-300/20 rounded-[2rem] blur-2xl" />
            <div className="relative rounded-[2rem] border border-violet-100 overflow-hidden shadow-2xl">
              <img src={c.heroImg} alt={c.titleHi} className="w-full h-[340px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-950/30 via-transparent to-transparent" />
            </div>
          </motion.div>
        )}
      </section>

      {/* نقاط الألم / الكلمات المفتاحية */}
      {c.painPoints?.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 py-10">
          <div className="bg-white border border-violet-100 rounded-3xl p-7">
            <div className="font-semibold mb-3 text-foreground">{c.painTitle}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {c.painPoints.map((p) => (
                <div key={p} className="flex items-start gap-2 text-base text-foreground/80">
                  <Check size={16} className="text-violet-600 mt-0.5 shrink-0" /> <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* المميزات */}
      {c.features?.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 py-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-violet-100 border border-violet-200 rounded-full px-3 py-1 text-sm text-violet-700">{c.featuresTag}</div>
            <h2 className="text-3xl font-extrabold mt-4 text-foreground" style={{ fontFamily: "var(--font-display)" }}>{c.featuresTitle}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {c.features.map((f) => {
              const I = f.icon;
              return (
                <motion.div key={f.t} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
                  className="bg-white hover:bg-violet-50/50 border border-violet-100 rounded-3xl p-6 transition-all hover:-translate-y-1 hover:border-violet-200">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-4">
                    <I size={22} className="text-violet-600" />
                  </div>
                  <div className="font-semibold text-lg text-foreground">{f.t}</div>
                  <div className="text-muted-foreground text-base mt-2 leading-relaxed">{f.d}</div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* خطوات العمل */}
      {c.steps?.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 py-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{c.stepsTitle}</h2>
          </div>
          <div className="space-y-4">
            {c.steps.map((s, i) => (
              <motion.div key={s.t} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
                className="flex gap-4 items-start bg-white border border-violet-100 rounded-2xl p-5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center font-bold text-violet-700 shrink-0">{i + 1}</div>
                <div>
                  <div className="font-semibold text-foreground">{s.t}</div>
                  <div className="text-muted-foreground text-base mt-1 leading-relaxed">{s.d}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* الأسئلة الشائعة */}
      {c.faqs?.length > 0 && (
        <section className="max-w-3xl mx-auto px-5 py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{c.faqTitle}</h2>
          </div>
          <div className="space-y-3">
            {c.faqs.map((f) => (
              <details key={f.q} className="group bg-white border border-violet-100 rounded-2xl p-5">
                <summary className="cursor-pointer font-semibold flex items-center justify-between gap-2 list-none text-foreground">
                  {f.q}
                  <ChevronLeft size={18} className="text-muted-foreground group-open:-rotate-45 transition shrink-0" style={{ transform: isAr ? "none" : "scaleX(-1)" }} />
                </summary>
                <p className="text-muted-foreground text-base mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* دعوة لاتخاذ إجراء */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-gradient-to-l from-violet-100 via-violet-50 to-fuchsia-50 p-8 sm:p-10 text-center">
          <div className="absolute -top-12 -left-12 w-60 h-60 rounded-full bg-violet-300/40 blur-3xl" />
          <h2 className="relative text-2xl sm:text-3xl font-extrabold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{c.ctaTitle}</h2>
          <p className="relative text-muted-foreground mt-3 max-w-2xl mx-auto">{c.ctaDesc}</p>
          <div className="relative flex flex-wrap justify-center gap-3 mt-7">
            <Link to="/quote" className="bg-violet-600 text-white hover:bg-violet-700 px-6 py-3.5 rounded-2xl font-semibold shadow-xl shadow-violet-600/30 inline-flex items-center gap-2 transition">
              <Zap size={18} /> {c.ctaPrimary}
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="bg-white hover:bg-violet-50 border border-violet-200 text-foreground px-6 py-3.5 rounded-2xl font-medium inline-flex items-center gap-2 transition">
              <WhatsAppIcon size={20} className="text-[#25D366]" /> {isAr ? "واتساب مباشر" : "WhatsApp"}
            </a>
          </div>
        </div>
      </section>

      {/* التذييل */}
      <footer className="border-t border-violet-100 mt-6 bg-white/60">
        <div className="max-w-7xl mx-auto px-5 py-10 grid sm:grid-cols-3 gap-8 text-base text-muted-foreground">
          <div>
            <div className="mb-2"><Logo tone="dark" size={36} /></div>
            <p>{isAr ? "منصة الموارد البشرية السعودية المتكاملة." : "The integrated Saudi HR platform."}</p>
            <div className="flex items-center gap-2 mt-4">
              <a href={SOCIAL.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors"><Linkedin size={17} className="text-violet-600" /></a>
              <a href={SOCIAL.twitter} target="_blank" rel="noreferrer" aria-label="X" className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors"><Twitter size={17} className="text-violet-600" /></a>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="font-medium text-foreground mb-1">{isAr ? "تواصل معنا" : "Contact"}</div>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-violet-700"><WhatsAppIcon size={14} className="text-[#25D366]" /> WhatsApp: +966 594700782</a>
            <a href={`mailto:${SALES_EMAIL}`} className="flex items-center gap-2 hover:text-violet-700"><Mail size={14} /> {SALES_EMAIL}</a>
          </div>
          <div className="space-y-1.5">
            <div className="font-medium text-foreground mb-1">{isAr ? "روابط المنصة" : "Platform"}</div>
            <Link to="/" className="block hover:text-violet-700">{isAr ? "الرئيسية" : "Home"}</Link>
            <Link to="/hr-system" className="block hover:text-violet-700">{isAr ? "نظام موارد بشرية" : "HR System"}</Link>
            <Link to="/payroll-system" className="block hover:text-violet-700">{isAr ? "نظام رواتب" : "Payroll System"}</Link>
            <Link to="/attendance-system" className="block hover:text-violet-700">{isAr ? "نظام الحضور والانصراف" : "Attendance System"}</Link>
            <Link to="/performance-system" className="block hover:text-violet-700">{isAr ? "نظام إدارة الأداء" : "Performance System"}</Link>
            <Link to="/quote" className="block hover:text-violet-700">{isAr ? "عرض السعر" : "Quote"}</Link>
            <Link to="/about" className="block hover:text-violet-700">{isAr ? "من نحن" : "About"}</Link>
            <Link to="/contact" className="block hover:text-violet-700">{isAr ? "تواصل" : "Contact"}</Link>
          </div>
        </div>
        <div className="text-center text-muted-foreground/70 text-sm pb-6">© 2026 {isAr ? "جداره" : "Jadara"} — {isAr ? "جميع الحقوق محفوظة" : "All rights reserved"}</div>
      </footer>
    </div>
  );
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setMetaProp(prop, content) {
  let el = document.querySelector(`meta[property="${prop}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
  el.setAttribute("href", href);
}