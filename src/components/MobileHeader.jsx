import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Headphones, Menu } from "lucide-react";
import Logo from "@/components/Logo";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageToggle from "@/components/LanguageToggle";
import ThemeToggle from "@/components/ThemeToggle";

// هيدر الجوال الموحّد للتطبيق الداخلي:
// - شاشة جذرية (تبويب من الشريط السفلي): شعار جداره + عنوان القسم.
// - شاشة فرعية: زر رجوع ظاهر (هدف لمس 44px) + عنوان الصفحة.
// الرجوع ينسجم مع سجل المتصفح/الـ WebView، ويعود للأصل عند فتح رابط عميق مباشرة.
export default function MobileHeader({ isAr, isRoot, title, onOpenMenu, onOpenSupport }) {
  const location = useLocation();
  const navigate = useNavigate();

  const goBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === "number" && idx > 0) { navigate(-1); return; }
    if (location.key && location.key !== "default") { navigate(-1); return; }
    const parent = location.pathname.replace(/\/[^/]+\/?$/, "") || "/app";
    navigate(parent.startsWith("/app") || parent === "" ? parent : "/app");
  };

  return (
    <header
      className="lg:hidden min-h-16 bg-gradient-to-b from-[#F6F3FC] to-[#EFE9F8] dark:from-card dark:to-card text-[#2A2340] dark:text-foreground border-b border-[#E2D6F4] dark:border-border flex items-center justify-between gap-2 px-4 sticky top-0 z-20"
      style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isRoot ? (
          <>
            <Link to="/app" className="shrink-0"><Logo tone="dark" size={34} /></Link>
            <span className="font-extrabold text-[15px] text-[#2A2340] dark:text-foreground truncate">{title}</span>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={goBack}
              className="w-11 h-11 -ms-1.5 rounded-full bg-white/70 dark:bg-card border border-[#E8DEF7] dark:border-border flex items-center justify-center text-[#4A3F66] dark:text-foreground active:scale-95 transition shrink-0"
              aria-label={isAr ? "رجوع" : "Back"}
            >
              <ArrowRight size={22} style={{ transform: isAr ? "none" : "scaleX(-1)" }} />
            </button>
            <span className="text-[15px] font-bold text-[#2A2340] dark:text-foreground truncate">{title}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenSupport}
          className="relative w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-300/50 active:scale-95 transition"
          aria-label={isAr ? "الدعم الفني" : "Support"}
        >
          <Headphones size={18} />
        </button>
        <NotificationsBell tone="dark" />
        <ThemeToggle isAr={isAr} />
        <LanguageToggle />
        <button
          type="button"
          onClick={onOpenMenu}
          className="w-10 h-10 flex items-center justify-center text-[#6B5E8C] dark:text-muted-foreground"
          aria-label={isAr ? "القائمة" : "Menu"}
        >
          <Menu size={22} />
        </button>
      </div>
    </header>
  );
}