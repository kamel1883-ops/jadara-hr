import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bell, ClipboardList, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { pathForTab } from "@/lib/tabStacks";

// شريط التبويب السفلي (جوال/تابلت أقل من 1024px) — المسارات الأساسية الأربعة.
// الشاشات الداخلية تبقى مثبتة في TabScreens فلا تُفقد حالتها عند التبديل.
const TABS = [
  { to: "/app", ar: "الرئيسية", en: "Dashboard", icon: LayoutDashboard },
  { to: "/notifications", ar: "الإشعارات", en: "Notifications", icon: Bell },
  { to: "/portal", ar: "طلباتي", en: "My Requests", icon: ClipboardList, page: true },
  { to: "/settings", ar: "الإعدادات", en: "Settings", icon: SettingsIcon },
];

export default function BottomTabBar({ onNavigate }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  const handleClick = (item) => {
    onNavigate?.();
    if (item.page) {
      // بوابة الموظف (/portal) صفحة قائمة بذاتها لها سياقها الخاص — تُفتح مباشرة
      window.location.assign(item.to);
      return;
    }
    if (isActive(item.to)) {
      // إعادة الضغط على التبويب النشط: العودة لأعلى الشاشة فقط — دون فقدان الحالة
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // العودة للتبويب تستعيد آخر شاشة فرعية داخله (حزمة تنقل مستقلة لكل تبويب)
    navigate(pathForTab(item.to));
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#F6F3FC]/95 dark:bg-card/95 backdrop-blur border-t border-[#E2D6F4] dark:border-border flex items-stretch justify-around"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={isAr ? "التنقل السفلي" : "Bottom navigation"}
    >
      {TABS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to);
        return (
          <button
            key={item.to}
            type="button"
            onClick={() => handleClick(item)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 min-h-[56px] py-2 text-[11px] font-semibold transition-colors active:scale-95",
              active ? "text-[#7C5CE6] dark:text-violet-300" : "text-[#8B7AB8] dark:text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "w-9 h-6 flex items-center justify-center rounded-full transition-colors",
                active && "bg-violet-100 dark:bg-violet-500/20"
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 2} />
            </span>
            {isAr ? item.ar : item.en}
          </button>
        );
      })}
    </nav>
  );
}