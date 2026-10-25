import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadMyRole, visibleInCompanyPortal } from "@/lib/roleNotifications";

const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("ar-EG")} · ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
};

export default function NotificationsBell({ tone = "light", align = "left" }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // جرس بوابة الشركات: يعرض إشعاراتي + إشعارات مرحلة الموارد البشرية فقط.
  // إشعارات المدير المباشر والمعتمد المالي موجّهة لأصحابها في بوابة الموظف — لا تظهر هنا لغيرهم.
  const load = async () => {
    try {
      const role = await loadMyRole();
      const n = await base44.entities.Notification.list("-created_date", 100);
      setItems((n || []).filter((x) => visibleInCompanyPortal(x, role)).slice(0, 30));
    } catch {}
  };
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const unread = items.filter((n) => !n.is_read).length;
  const markRead = async () => {
    if (!unread) return;
    // تعليم إشعاراتي المعروضة فقط — لا نمسّ إشعارات بقية المعتمدين.
    try { await Promise.all(items.filter((n) => !n.is_read).map((n) => base44.entities.Notification.update(n.id, { is_read: true }))); load(); } catch {}
  };
  const toggle = () => { const next = !open; setOpen(next); if (next && unread) setTimeout(markRead, 500); };

  const btnCls = tone === "light" ? "text-white/80 hover:text-white" : "text-foreground hover:text-foreground";

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className={cn("relative p-2 rounded-lg transition", btnCls)} aria-label="notifications">
        <Bell size={20} />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div dir="rtl" className={cn("absolute mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border bg-white shadow-2xl z-50 text-foreground text-right", align === "right" ? "right-0" : "left-0")}>
          <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
            <span className="font-semibold text-sm">الإشعارات</span>
            {unread > 0 && <button onClick={markRead} className="text-xs text-violet-600 flex items-center gap-1"><Check size={12} /> مقروء</button>}
          </div>
          {items.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">لا توجد إشعارات</div> :
            items.map((n) => (
              <div key={n.id} className={cn("px-5 py-3 border-b text-sm", n.is_read ? "bg-white" : "bg-violet-50")}>
                <div className="font-medium text-right">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed text-right break-words whitespace-pre-wrap">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground/70 mt-1 tabular-nums">{fmtDateTime(n.created_date)}</div>
              </div>
            ))}
          <Link to="/notifications" onClick={() => setOpen(false)} className="block w-full text-center text-xs text-violet-600 py-3 border-t hover:bg-violet-50">عرض كل الإشعارات</Link>
        </div>
      )}
    </div>
  );
}