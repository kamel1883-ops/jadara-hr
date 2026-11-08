import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { TabScreenActiveContext } from "@/components/TabScreenActive";

// شاشات التبويبات الجذرية للشريط السفلي.
// تُبقي كل تبويب زاره المستخدم **مثبتاً في الذاكرة** (mount) وتُخفي غير النشط فقط،
// فلا تُعاد تهيئة الشاشة عند التبديل: النماذج والمرشحات والواجهة الفرعية وموضع التمرير
// تبقى كما تركها المستخدم — بلا أي تغيير على سلوك الويب أو المسارات.
const SCREENS = {
  "/app": lazy(() => import("@/pages/Dashboard")),
  "/notifications": lazy(() => import("@/pages/Notifications")),
  "/settings": lazy(() => import("@/pages/Settings")),
};

const Fallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
    <Loader2 className="animate-spin" size={20} />
  </div>
);

export default function TabScreens({ active }) {
  const [mounted, setMounted] = useState(() => [active]);
  const scrolls = useRef({});
  const prev = useRef(active);

  useEffect(() => {
    setMounted((list) => (list.includes(active) ? list : [...list, active]));
  }, [active]);

  // حفظ موضع التمرير لكل تبويب واستعادته عند العودة إليه
  useEffect(() => {
    const from = prev.current;
    if (from && from !== active) scrolls.current[from] = window.scrollY;
    prev.current = active;
    const y = scrolls.current[active] || 0;
    const id = requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
    return () => cancelAnimationFrame(id);
  }, [active]);

  return (
    <>
      {mounted.map((path) => {
        const Screen = SCREENS[path];
        if (!Screen) return null;
        return (
          <div key={path} hidden={path !== active} aria-hidden={path !== active}>
            <TabScreenActiveContext.Provider value={path === active}>
              <Suspense fallback={<Fallback />}>
                <Screen />
              </Suspense>
            </TabScreenActiveContext.Provider>
          </div>
        );
      })}
    </>
  );
}