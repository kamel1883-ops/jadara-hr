import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { portalSession } from "@/lib/portalSession";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * جرس إشعارات المالك — إشعارات العمل فقط (فترات التجربة، الاشتراكات، المدفوعات).
 * لا تُعرض هنا أي إشعارات تخص موظفي المنشآت أو طلباتهم: تلك تبقى داخل بوابة المنشأة وحدها،
 * فلا تصل بيانات أي منشأة إلى بوابة المالك.
 */
const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("ar-EG")} · ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
};

export default function OwnerNotificationsBell({ align = "left", isAr = true }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const call = (action) => {
    const session = portalSession.load();
    if (!session?.token || !session?.employee_id) return Promise.resolve(null);
    return base44.functions
      .invoke("portalData", { token: session.token, employee_id: session.employee_id, action })
      .then((res) => res?.data || res)
      .catch(() => null);
  };

  const load = async () => {
    const data = await call("owner_notifications");
    if (data?.ok) setItems(data.notifications || []);
  };
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, []);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const unread = items.filter((n) => !n.is_read).length;
  const markRead = async () => {
    if (!unread) return;
    await call("owner_notifications_read");
    load();
  };
  const toggle = () => { const next = !open; setOpen(next); if (next && unread) setTimeout(markRead, 500); };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative p-2 rounded-lg transition text-foreground hover:text-foreground" aria-label="business notifications">
        <Bell size={20} />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div dir={isAr ? "rtl" : "ltr"} className={cn("absolute mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border bg-white shadow-2xl z-50 text-foreground", isAr ? "text-right" : "text-left", align === "right" ? "right-0" : "left-0")}>
          <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
            <span className="font-semibold text-sm">{isAr ? "إشعارات العمل" : "Business notifications"}</span>
            {unread > 0 && <button onClick={markRead} className="text-xs text-violet-600 flex items-center gap-1"><Check size={12} /> {isAr ? "مقروء" : "Read"}</button>}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">{isAr ? "لا توجد إشعارات عمل" : "No business notifications"}</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className={cn("px-5 py-3 border-b text-sm", n.is_read ? "bg-white" : "bg-violet-50")}>
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed break-words whitespace-pre-wrap">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground/70 mt-1 tabular-nums">{fmtDateTime(n.created_date)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}