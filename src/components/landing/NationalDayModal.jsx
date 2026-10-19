import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X, Copy, Check, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getActiveSeason } from "@/lib/seasonalVideo";
import { Image } from "@/components/ui/image";

// نافذة عرض اليوم الوطني السعودي 96 — تظهر عند كل تنقّل/تحديث على صفحات الموقع العامة.
// الخلفية الإعلانية هي صورة المرجع الحقيقية (أبراج الرياض + جدار الدرعية + نقوش سدو + رقم 96
// بشعار النخلة والسيفين)، وبطاقة سفلية تعرض النسبة 30٪ وكود JADARA-HR-96 مع زر نسخ.
const CODE = "JADARA-HR-96";
const DISCOUNT = "30%";
const PERSON_IMG =
  "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/35e1c7932_generated_image.png";
const BANNER_IMG =
  "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/eb6d89134_image.png";

const MARKETING_PATHS = new Set([
  "/", "/about", "/contact", "/quote",
  "/hr-system", "/payroll-system", "/attendance-system", "/performance-system",
  "/qiwa-mudad", "/wps-mudad", "/eos-calculator", "/contracts",
  "/privacy", "/refund-policy", "/affiliate-program",
]);

function isMarketingPath(path) {
  return (
    MARKETING_PATHS.has(path) ||
    path.startsWith("/blog") ||
    path.startsWith("/jobs")
  );
}

export default function NationalDayModal() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getActiveSeason()) return;
    if (!isMarketingPath(location.pathname)) return;
    const t = setTimeout(() => setOpen(true), 650);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const close = () => setOpen(false);
  const onBackdrop = (e) => { if (e.target === e.currentTarget) close(); };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {}
  };

  if (!open) return null;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onBackdrop}
    >
      <div className="relative w-full max-w-[960px] rounded-[1.75rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={close}
          aria-label={isAr ? "إغلاق" : "Close"}
          className="absolute top-3 z-30 w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-lg transition hover:brightness-110"
          style={{ insetInlineEnd: "0.75rem", background: "#3498db" }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="grid md:grid-cols-[38%,62%]">
          {/* صورة الشخص السعودي بالثوب */}
          <div className="relative min-h-[200px] md:min-h-[560px] bg-[#0a2418] order-1">
            <Image
              src={PERSON_IMG}
              alt={isAr ? "سعودي بالثوب والشماغ يحمل جهاز لوحي" : "Saudi man in thobe holding a tablet"}
              fittingType="fill"
              className="absolute inset-0 w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#003323]/30 md:to-[#003323]/60" />
          </div>

          {/* اللوحة الإعلانية — خلفية تدرّجية بهوية اليوم الوطني (أخضر + ذهبي) */}
          <div
            className="relative order-2 min-h-[300px] md:min-h-[560px] overflow-hidden"
            style={{ background: "linear-gradient(160deg, #0a4f34 0%, #063323 55%, #021a12 100%)" }}
          >
            {/* زخرفة زاوية: نقوش هندسية خفيفة */}
            <div
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 18% 22%, #d4af37 0, transparent 28%), radial-gradient(circle at 82% 78%, #7ff0c0 0, transparent 32%)",
              }}
            />
            {/* رقم 96 كعنصر زخرفي خلفي */}
            <div
              className="absolute select-none font-black text-white/10 leading-none pointer-events-none"
              style={{ fontSize: "min(46vw, 320px)", top: "4%", insetInlineEnd: "3%" }}
            >
              96
            </div>

            {/* بطاقة سفلية: النسبة + الكود مع نسخ + الزر */}
            <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 sm:p-5">
              <div
                className="w-[88%] sm:w-[62%] rounded-2xl px-4 sm:px-5 py-4 text-white shadow-2xl ring-1 ring-emerald-300/30"
                style={{ background: "rgba(0, 51, 35, 0.96)" }}
              >
                <div className="text-center">
                  <h3
                    className="font-extrabold leading-tight"
                    style={{ fontFamily: "var(--font-display)", fontSize: "clamp(18px, 2.6vw, 26px)" }}
                  >
                    {isAr ? "تخفيضات شاملة حتى" : "Discounts up to"}{" "}
                    <span style={{ color: "#7ff0c0" }}>{DISCOUNT}</span>
                  </h3>
                </div>

                {/* الكود + زر النسخ */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-white/85 font-semibold whitespace-nowrap">
                    {isAr ? "استخدم الكود:" : "Use code:"}
                  </span>
                  <div
                    className="flex-1 min-w-0 flex items-center justify-between rounded-lg px-3 py-2 bg-white/10 border border-emerald-300/40"
                    dir="ltr"
                  >
                    <span
                      className="font-black tracking-[0.14em] text-white truncate"
                      style={{ fontFamily: "ui-monospace, monospace", fontSize: "14px" }}
                    >
                      {CODE}
                    </span>
                    <button
                      type="button"
                      onClick={copyCode}
                      aria-label={isAr ? "نسخ الكود" : "Copy code"}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-emerald-100 hover:bg-white/10 transition"
                    >
                      {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                      {copied ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ" : "Copy")}
                    </button>
                  </div>
                </div>

                {/* زر الاكتشاف */}
                <button
                  type="button"
                  onClick={close}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 font-extrabold text-white shadow-lg transition hover:brightness-110"
                  style={{ background: "linear-gradient(90deg, #1f8a63 0%, #0a4f34 100%)" }}
                >
                  {isAr ? "اكتشف العروض الحصرية" : "Discover exclusive offers"}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}