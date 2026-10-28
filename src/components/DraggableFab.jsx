import React, { useEffect, useRef, useState } from "react";

// زر عائم قابل للسحب (لمس + ماوس) — يحفظ موضعه في المتصفح ويبقى داخل حدود الشاشة،
// فلا يحجب الأزرار أو الجداول في بوابة الاشتراكات أو بوابة الموظف (جوال / تطبيق).
export default function DraggableFab({ storageKey, onClick, className = "", title, size = 56, children }) {
  const readPosition = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") return saved;
    } catch (_e) {}
    return null;
  };

  const [pos, setPos] = useState(readPosition);
  const startRef = useRef(null);
  const movedRef = useRef(false);
  const draggingRef = useRef(false);

  const clamp = (x, y) => {
    const w = typeof window !== "undefined" ? window.innerWidth : 360;
    const h = typeof window !== "undefined" ? window.innerHeight : 640;
    const pad = 8;
    return {
      x: Math.max(pad, Math.min(x, w - size - pad)),
      y: Math.max(pad, Math.min(y, h - size - pad)),
    };
  };

  // يبقى الزر مرئياً بالكامل عند تدوير الجوال أو تغيير حجم الشاشة
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    startRef.current = { x: e.clientX, y: e.clientY, px: rect.left, py: rect.top };
    movedRef.current = false;
    draggingRef.current = true;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_e) {}
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    // عتبة صغيرة لتمييز السحب عن النقر العادي
    if (!movedRef.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    movedRef.current = true;
    setPos(clamp(startRef.current.px + dx, startRef.current.py + dy));
  };

  const onPointerUp = (e) => {
    draggingRef.current = false;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch (_e) {}
    if (movedRef.current) {
      setPos((p) => {
        try { localStorage.setItem(storageKey, JSON.stringify(p)); } catch (_e) {}
        return p;
      });
    }
  };

  const handleClick = () => {
    if (movedRef.current) { movedRef.current = false; return; }
    if (onClick) onClick();
  };

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={handleClick}
      title={title}
      aria-label={title}
      style={pos ? { touchAction: "none", left: pos.x, top: pos.y, bottom: "auto" } : { touchAction: "none", left: 20, bottom: 20 }}
      className={"fixed z-40 select-none cursor-grab active:cursor-grabbing " + className}
    >
      {children}
    </button>
  );
}