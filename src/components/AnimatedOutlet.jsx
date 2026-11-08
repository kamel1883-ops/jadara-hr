import React, { useEffect, useRef } from "react";
import { useOutlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Renders the matched child route inside a keyed motion.div so that
 * route changes animate as a horizontal slide via AnimatePresence.
 *
 * الاتجاه يتبع نوع التنقل:
 * - تنقل للأمام (نقر رابط/زر): الشاشة الجديدة تنزلق من اليمين (RTL).
 * - زر الرجوع الفيزيائي/زر المتصفح (popstate): تعود الشاشة السابقة
 *   من الاتجاه المعاكس، فيبدو الرجوع طبيعياً كما في التطبيقات الأصلية.
 *
 * Including `location.state.refreshKey` in the key lets the bottom nav
 * force a remount (stack reset) when the active tab is re-selected.
 */
export default function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const refreshKey = location.state?.refreshKey;
  const key = location.pathname + (refreshKey ? `::${refreshKey}` : "");

  // اتجاه التنقل: 1 للأمام، -1 للرجوع — يُضبط من حدث popstate قبل إعادة الرسم
  const dirRef = useRef(1);

  useEffect(() => {
    const onPop = () => { dirRef.current = -1; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // بعد اكتمال الانتقال يعود الاتجاه الافتراضي (للأمام) للتنقل التالي
  useEffect(() => { dirRef.current = 1; }, [key]);

  const dir = dirRef.current;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, x: dir === 1 ? 60 : -60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: dir === 1 ? -60 : 60 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}