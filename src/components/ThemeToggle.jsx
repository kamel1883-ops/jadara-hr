import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// زر تبديل المظهر (فاتح / داكن) — المظهر الفاتح هو الافتراضي، والاختيار يُحفظ في الجهاز.
export default function ThemeToggle({ isAr = true, className = "" }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:px-3 sm:py-2 rounded-full sm:rounded-lg text-sm font-medium",
        "border border-[#E8DEF7] bg-white/70 text-[#6B5E8C] hover:bg-white hover:text-[#2A2340] transition",
        "dark:bg-card dark:border-border dark:text-muted-foreground dark:hover:text-foreground",
        className
      )}
      title={isDark ? (isAr ? "التبديل إلى المظهر الفاتح" : "Switch to light mode") : (isAr ? "التبديل إلى المظهر الداكن" : "Switch to dark mode")}
      aria-label={isDark ? (isAr ? "المظهر الفاتح" : "Light mode") : (isAr ? "المظهر الداكن" : "Dark mode")}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="hidden sm:inline">{isDark ? (isAr ? "فاتح" : "Light") : (isAr ? "داكن" : "Dark")}</span>
    </button>
  );
}