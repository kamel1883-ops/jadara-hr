import React from "react";
import {
  Sparkles, Gift, Check, Calendar, CreditCard, Users, Zap, Server, ShieldCheck,
} from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { PRICING_TIERS_AR, PRICING_TIERS_EN, FULL_FEATURES_AR, FULL_FEATURES_EN } from "@/lib/pricing";
import { SALES_WA_LINK, SALES_EMAIL } from "@/components/landing/HostingProvider";

// قسم الباقات — بهوية جداره اللونية: كحلي عميق #0B2545 + ذهبي راقٍ #CBA83A.
// التخطيط: قائمة عمودية واحدة للشرائح الخمس (كل شريحة صف كامل) + بطاقة التجربة المجانية أسفلهم.
// خطوط أكبر ومساحة عرض أوسع بدل six cramped columns.
const GOLD = "#7C5CE6";
const GOLD_DARK = "#6D45D6";
const GOLD_SOFT = "#F5F2FC";
const GOLD_LIGHT = "#C4B5FD";
const NAVY = "#5B3FD6";
const GREY = "#5B5566";
const CARD = "#F8F6FC";
const BORDER = "#E9E2F7";

export default function PricingColumns({ isAr = true, onStartTrial, onBuyTier }) {
  const tiers = isAr ? PRICING_TIERS_AR : PRICING_TIERS_EN;
  const feats = isAr ? FULL_FEATURES_AR : FULL_FEATURES_EN;
  const currency = isAr ? "ر.س" : "SAR";
  const perYear = isAr ? "/ سنوياً" : "/year";
  const includes = isAr ? "تشمل كل المميزات:" : "All features:";

  return (
    <section id="pricing" className="max-w-[1400px] mx-auto px-4 lg:px-10 py-14">
      <div className="bg-white rounded-[2rem] p-6 sm:p-10 text-foreground shadow-xl shadow-violet-900/10 border border-violet-100">
        {/* ترويسة */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 text-base font-semibold rounded-full px-4 py-1.5" style={{ background: GOLD_SOFT, color: GOLD_DARK }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
            {isAr ? "• باقات الاشتراك السنوي" : "• Annual subscription plans"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-5 mb-3" style={{ fontFamily: "var(--font-display)", color: NAVY }}>
            {isAr ? <>اختر الباقة المناسبة <span style={{ color: GOLD_DARK }}>لمؤسستك</span></> : <>Choose the plan that fits <span style={{ color: GOLD_DARK }}>your organization</span></>}
          </h2>
          <p className="text-base leading-relaxed" style={{ color: GREY }}>
            {isAr ? "كل باقة تشمل جميع ميزات المنصة كاملة — الفرق في شريحة عدد الموظفين والسعر السنوي فقط." : "Every plan includes the full feature set — only the headcount tier and annual price differ."}
          </p>
        </div>

        {/* قائمة الشرائح الخمس — كل شريحة صفّ كامل عريض */}
        <div className="mt-10 space-y-4">
          {tiers.map((t, idx) => {
            const featured = t.id === "advanced";
            return (
              <div
                key={t.id}
                className="rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-stretch gap-5 transition hover:shadow-lg"
                style={{
                  background: CARD,
                  border: featured ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
                  boxShadow: featured ? "0 10px 30px -12px rgba(201,168,58,.35)" : "0 1px 3px rgba(16,24,40,.04)",
                }}
              >
                {/* Zone 1: هوية الشريحة */}
                <div className="lg:w-[260px] lg:shrink-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-base font-bold rounded-full px-3 py-1" style={{ background: GOLD_SOFT, color: GOLD_DARK }}>
                      <Sparkles size={14} /> {t.tier}
                    </span>
                    {featured && (
                      <span className="inline-flex items-center gap-1 text-sm font-bold rounded-full px-3 py-1 text-white" style={{ background: NAVY }}>
                        {isAr ? "الأكثر طلباً" : "Most popular"}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-lg font-extrabold leading-tight" style={{ fontFamily: "var(--font-display)", color: NAVY }}>
                    {isAr ? `شريحة ${t.tier}` : `${t.tier} tier`}
                  </div>
                  <div className="mt-1 text-base font-semibold" style={{ color: GREY }}>{t.range}</div>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "#718096" }}>{t.note}</p>
                </div>

                {/* Zone 2: السعر */}
                <div className="lg:w-[230px] lg:shrink-0 flex flex-col justify-center border-t lg:border-t-0 lg:border-r-0 pt-4 lg:pt-0" style={{ borderColor: BORDER }}>
                  {t.contact ? (
                    <>
                      <div className="text-3xl font-extrabold" style={{ color: NAVY, fontFamily: "var(--font-display)" }}>
                        {isAr ? "تواصل معنا" : "Contact us"}
                      </div>
                      <div className="text-sm font-medium mt-1" style={{ color: GREY }}>{isAr ? "لعرض سعر مخصّص" : "for a custom quote"}</div>
                      <div className="mt-3 rounded-xl p-2.5" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: GREY }}>{isAr ? "أكثر من 1,000 موظف" : "1,000+ employees"}</span>
                          <span className="font-extrabold" style={{ color: GOLD_DARK }}>{isAr ? "سعر مخصّص" : "Custom"}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-end gap-1.5">
                        <span className="text-4xl font-extrabold" style={{ color: NAVY, fontFamily: "var(--font-display)" }}>
                          {t.yearly.toLocaleString()}{t.custom ? "+" : ""}
                        </span>
                        <span className="text-base font-semibold mb-1.5" style={{ color: GREY }}>{currency}</span>
                      </div>
                      <div className="text-sm font-medium mt-0.5" style={{ color: GREY }}>{perYear}</div>

                      <div className="mt-3 rounded-xl p-2.5" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: GREY }}>{isAr ? "إجمالي السنة الأولى" : "Year 1 total"}</span>
                          <span className="font-extrabold" style={{ color: GOLD_DARK }}>
                            {t.custom ? (isAr ? "تأثير خاص" : "Custom") : `${t.year1.toLocaleString()} ${currency}`}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Zone 3: المميزات */}
                <div className="flex-1 min-w-0 border-t lg:border-t-0 pt-4 lg:pt-0" style={{ borderColor: BORDER }}>
                  <div className="text-base font-bold mb-2.5" style={{ color: NAVY }}>{includes}</div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5">
                    {feats.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-base leading-relaxed">
                        <Check size={15} className="mt-0.5 shrink-0" strokeWidth={3} style={{ color: GOLD }} />
                        <span className="font-medium" style={{ color: GREY }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Zone 4: زر الشراء / التواصل */}
                <div className="lg:w-[170px] lg:shrink-0 flex items-center justify-center border-t lg:border-t-0 pt-4 lg:pt-0" style={{ borderColor: BORDER }}>
                  {t.contact ? (
                    <div className="w-full flex flex-col gap-2">
                      <a
                        href={SALES_WA_LINK}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full rounded-xl py-3.5 text-base font-bold text-white inline-flex items-center justify-center gap-2 transition hover:brightness-110 shadow-md"
                        style={{ background: "#16a34a", boxShadow: "0 8px 20px -8px #16a34a" }}
                      >
                        <WhatsAppIcon size={20} />
                        {isAr ? "تواصل معنا على واتساب" : "Contact us on WhatsApp"}
                      </a>
                      <a href={`mailto:${SALES_EMAIL}`} className="text-center text-xs font-semibold" style={{ color: GREY }}>
                        {SALES_EMAIL}
                      </a>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBuyTier?.(t)}
                      className="w-full rounded-xl py-3.5 text-base font-bold text-white inline-flex items-center justify-center gap-2 transition hover:brightness-110 shadow-md"
                      style={{ background: NAVY, boxShadow: `0 8px 20px -8px ${NAVY}` }}
                    >
                      <Zap size={18} />
                      {isAr ? "شراء الباقة" : "Buy plan"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* بطاقة التجربة المجانية — أسفل القائمة، بعرض كامل بأسلوب الصورة المرجعية */}
        <div className="mt-6 rounded-2xl overflow-hidden flex flex-col lg:flex-row" style={{ border: `2px solid ${NAVY}`, background: "#fff", boxShadow: "0 18px 40px -18px rgba(11,37,69,.35)" }}>
          {/* يمين: هوية التجربة */}
          <div className="lg:w-[320px] p-6 sm:p-8 flex flex-col justify-center" style={{ background: NAVY, color: "#fff" }}>
            <span className="inline-flex items-center gap-1.5 self-start text-base font-bold rounded-full px-3 py-1" style={{ background: "rgba(201,168,58,.22)", color: GOLD_LIGHT }}>
              <Gift size={14} /> {isAr ? "مجاناً" : "Free"}
            </span>
            <div className="mt-4 flex items-end gap-1.5">
              <span className="text-5xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>0</span>
              <span className="text-base font-semibold mb-2" style={{ color: "#A0AEC0" }}>{currency}</span>
            </div>
            <div className="text-base font-medium mt-1" style={{ color: "#A0AEC0" }}>{isAr ? "/ 30 يوماً" : "/ 30 days"}</div>
            <h3 className="mt-3 text-xl font-extrabold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              {isAr ? "تجربة مجانية 30 يوماً" : "30-day free trial"}
            </h3>
            <div className="flex items-center flex-wrap gap-3 mt-3 text-sm" style={{ color: "#CBD5E0" }}>
              <span className="inline-flex items-center gap-1"><Calendar size={14} style={{ color: GOLD_LIGHT }} /> {isAr ? "30 يوماً" : "30d"}</span>
              <span className="inline-flex items-center gap-1"><CreditCard size={14} style={{ color: GOLD_LIGHT }} /> {isAr ? "بدون بطاقة" : "No card"}</span>
              <span className="inline-flex items-center gap-1"><Users size={14} style={{ color: GOLD_LIGHT }} /> {isAr ? "فريق كامل" : "Team"}</span>
            </div>
          </div>

          {/* يسار: المميزات + الزر */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} style={{ color: GOLD }} />
              <span className="text-lg font-extrabold" style={{ color: NAVY, fontFamily: "var(--font-display)" }}>
                {isAr ? "جرّب المنصة كاملة مجاناً" : "Try the full platform free"}
              </span>
            </div>
            <div className="text-base mb-4" style={{ color: GREY }}>
              {isAr ? "تستمتع بكل ميزات المنصة كاملة خلال فترة التجربة — دون أي التزام أو بطاقة ائتمان." : "Full feature access during the trial — no commitment, no credit card."}
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-2">
              {feats.slice(0, 9).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-base leading-relaxed">
                  <Check size={15} className="mt-0.5 shrink-0" strokeWidth={3} style={{ color: GOLD }} />
                  <span className="font-medium" style={{ color: GREY }}>{f}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onStartTrial}
              className="mt-6 self-start inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-bold text-white transition hover:brightness-110 shadow-md"
              style={{ background: NAVY, boxShadow: `0 8px 20px -8px ${NAVY}` }}
            >
              <Zap size={18} />
              {isAr ? "ابدأ تجربتك المجانية" : "Start free trial"}
            </button>
          </div>
        </div>

        <p className="text-center text-base mt-6" style={{ color: "#9CA3AF" }}>
          {isAr ? "جميع الأسعار سنوية شاملة الضريبة. تُحدّد الشريحة وفق عدد الموظفين. كل باقة تشمل كل المميزات." : "All prices annual, tax-inclusive. Tier by headcount. Every plan includes all features."}
        </p>
      </div>
    </section>
  );
}