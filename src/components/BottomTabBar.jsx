import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, CalendarDays, ClipboardCheck, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { pathForTab } from "@/lib/tabStacks";

// شريط التبويب السفلي — التنقل بين الشاشات الجذرية دون إعادة تهيئتها.
// الشاشات تبقى مثبتة في TabScreens (حالة كاملة: نماذج، مرشحات، واجهة فرعية، تمرير)،
// لذلك لا يُرسل أي مفتاح تحديث ولا يُعاد تركيب المسار عند التبديل.
const TABS = [
  { to: "/app", ar: "الرئيسية", en: "Dashboard", icon: LayoutDashboard },
  { to: "/attendance", ar: "الحضور", en: "Attendance", icon: CalendarDays },
  { to: "/approvals", ar: "الموافقات", en: "Approvals", icon: ClipboardCheck },
  { to: "/settings", ar: "الإعدادات", en: "Settings", icon: SettingsIcon },
];

export default function BottomTabBar({ onNavigate }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  const handleClick = (to) => {
    onNavigate?.();
    if (isActive(to)) {
      // إعادة الضغط على التبويب النشط: العودة لأعلى الشاشة فقط — دون فقدان الحالة
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // العودة للتبويب تستعيد آخر شاشة فرعية داخله (حزمة تنقل مستقلة لكل تبويب)
    navigate(pathForTab(to));
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#F6F3FC]/95 dark:bg-card/95 backdrop-blur border-t border-[#E2D6F4] dark:border-border flex items-stretch justify-around"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
    >
      {TABS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to);
        return (
          <button
            key={item.to}
            type="button"
            onClick={() => handleClick(item.to)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[11px] font-semibold transition-colors",
              active ? "text-[#7C5CE6]" : "text-[#8B7AB8]"
            )}
          >
            <Icon size={20} />
            {isAr ? item.ar : item.en}
          </button>
        );
      })}
    </nav>
  );
}