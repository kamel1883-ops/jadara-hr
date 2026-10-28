import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { loadMyRole, visibleInCompanyPortal } from "@/lib/roleNotifications";
import PullToRefresh from "@/components/PullToRefresh";

const TYPE_LABEL = {
  attendance: { ar: "حضور", en: "Attendance" },
  approval: { ar: "موافقات", en: "Approval" },
  general: { ar: "عام", en: "General" },
};

const fmtDateTime = (iso, isAr) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString(isAr ? "ar-EG" : "en-GB");
  const time = d.toLocaleTimeString(isAr ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
};

export default function Notifications() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "الإشعارات", subtitle: "سجل كامل بكل الإشعارات السابقة — تبقى محفوظة دائماً",
    search: "بحث في العنوان أو النص…", allTypes: "كل الأنواع", markAll: "تعليم الكل كمقروء",
    empty: "لا توجد إشعارات", unread: "غير مقروء", loading: "جارٍ التحميل…",
    thType: "النوع", thTitle: "العنوان", thDate: "التاريخ والوقت", thStatus: "الحالة",
  } : {
    title: "Notifications", subtitle: "Full history of all past notifications — always preserved",
    search: "Search title or body…", allTypes: "All types", markAll: "Mark all read",
    empty: "No notifications", unread: "Unread", loading: "Loading…",
    thType: "Type", thTitle: "Title", thDate: "Date & time", thStatus: "Status",
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // صفحة إشعارات بوابة الشركات: نفس نطاق الجرس (إشعاراتي + مرحلة الموارد فقط).
  const load = async () => {
    setLoading(true);
    try {
      const role = await loadMyRole();
      const data = await base44.entities.Notification.list("-created_date", 500);
      setItems((data || []).filter((n) => visibleInCompanyPortal(n, role)));
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const unread = items.filter((n) => !n.is_read).length;
  const markAll = async () => {
    if (!unread) return;
    try {
      await Promise.all(filtered.filter((n) => !n.is_read).map((n) => base44.entities.Notification.update(n.id, { is_read: true })));
      load();
    } catch {}
  };

  const types = ["all", ...Array.from(new Set(items.map((i) => i.type).filter(Boolean)))];
  const filtered = items
    .filter((n) => typeFilter === "all" || n.type === typeFilter)
    .filter((n) => {
      if (!q.trim()) return true;
      const s = q.trim().toLowerCase();
      return String(n.title || "").toLowerCase().includes(s) || String(n.body || "").toLowerCase().includes(s);
    });

  return (
    <PullToRefresh onRefresh={load}>
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={
          <Button onClick={markAll} disabled={!unread} variant="outline" className="gap-2">
            <Check size={16} /> {t.markAll} {unread > 0 ? `(${unread})` : ""}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="sm:max-w-xs" />
        <div className="flex gap-2 flex-wrap">
          {types.map((ty) => (
            <button
              key={ty}
              onClick={() => setTypeFilter(ty)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition",
                typeFilter === ty ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted")}
            >
              {ty === "all" ? t.allTypes : (TYPE_LABEL[ty]?.[lang] || ty)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{t.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <Bell size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-muted-foreground">{t.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-muted-foreground text-xs">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">{t.thType}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.thTitle}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.thDate}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.thStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((n) => (
                  <tr key={n.id} className={cn("hover:bg-slate-50", !n.is_read && "bg-violet-50/60")}>
                    <td className="px-4 py-3">
                      {n.type ? <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{TYPE_LABEL[n.type]?.[lang] || n.type}</span> : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed break-words whitespace-pre-wrap">{n.body}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{fmtDateTime(n.created_date, isAr)}</td>
                    <td className="px-4 py-3">
                      {n.is_read
                        ? <span className="text-xs text-muted-foreground">{isAr ? "مقروء" : "Read"}</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-violet-600"><span className="w-2 h-2 rounded-full bg-violet-500" /> {t.unread}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}