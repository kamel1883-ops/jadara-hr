import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Printer, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalI18n, portalDir } from "@/lib/portalI18n";
import { attendanceDisplayStatus, attendanceOpDate, attendanceElapsedMs, formatWorkDuration } from "@/lib/hr";
import OnDutyTimer from "@/components/OnDutyTimer";

const STATUS_CLS = {
  present: "bg-emerald-50 text-emerald-700",
  late: "bg-amber-50 text-amber-700",
  leave: "bg-sky-50 text-sky-700",
  absent: "bg-rose-50 text-rose-600",
  holiday: "bg-slate-100 text-slate-600",
};

export default function ManagerAttendanceSection({ records = [], subs = [] }) {
  const { lang } = usePortalI18n();
  const isAr = lang === "ar";
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const sorted = [...records].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (!q.trim()) return sorted;
    const term = q.trim();
    return sorted.filter((r) => (r.national_id || "").includes(term) || (r.employee_name || "").includes(term));
  }, [records, q]);

  const statusLabel = (record) => attendanceDisplayStatus(record).label;

  const print = () => window.print();

  return (
    <div className="mt-6 print-attendance" dir={portalDir(lang)}>
      <div className="flex items-center justify-between mb-2 gap-2 no-print">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Calendar size={14} /> {isAr ? "الحضور والانصراف لمرؤوسيك" : "Subordinates' attendance"}
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute top-1/2 -translate-y-1/2 start-2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isAr ? "بحث بالموظف أو الهوية" : "Search by employee / ID"}
              className="h-8 w-52 text-xs ps-7"
            />
          </div>
          {q && <button onClick={() => setQ("")} className="text-xs text-muted-foreground hover:text-foreground">{isAr ? "مسح" : "Clear"}</button>}
          <Button size="sm" variant="outline" onClick={print} className="h-8 text-xs gap-1">
            <Printer size={14} /> {isAr ? "طباعة" : "Print"}
          </Button>
        </div>
      </div>

      {/* ترويسة الطباعة */}
      <div className="hidden print:block mb-4">
        <h2 className="text-lg font-bold">{isAr ? "سجل الحضور والانصراف — المرؤوسون" : "Attendance record — Subordinates"}</h2>
        <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US")}</p>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground">
          <div className="col-span-3">{isAr ? "الموظف" : "Employee"}</div>
          <div className="col-span-2">{isAr ? "الهوية" : "National ID"}</div>
          <div className="col-span-2">{isAr ? "التاريخ" : "Date"}</div>
          <div className="col-span-1">{isAr ? "الحضور" : "In"}</div>
          <div className="col-span-1">{isAr ? "الانصراف" : "Out"}</div>
          <div className="col-span-1">{isAr ? "الساعات" : "Hrs"}</div>
          <div className="col-span-2">{isAr ? "الحالة" : "Status"}</div>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">{isAr ? "لا توجد سجلات" : "No records"}</div>
        ) : rows.map((r, i) => (
          <div key={r.id || i} className="grid grid-cols-12 gap-2 px-3 py-2.5 text-xs border-t items-center">
            <div className="col-span-3 font-medium truncate">{r.employee_name || "—"}</div>
            <div className="col-span-2 text-muted-foreground tabular-nums" dir="ltr">{r.national_id || "—"}</div>
            <div className="col-span-2 text-muted-foreground">{r.date || "—"}</div>
            <div className="col-span-1 tabular-nums">
            <div>{r.check_in || "—"}</div>
            {r.check_in && <div className="text-[10px] text-muted-foreground">{attendanceOpDate(r, "in")}</div>}
          </div>
            <div className="col-span-1 tabular-nums">
            <div>{r.check_out || "—"}</div>
            {r.check_out && <div className="text-[10px] text-muted-foreground">{attendanceOpDate(r, "out")}</div>}
            {r.auto_closed && <div className="text-[10px] text-amber-600">{isAr ? "تلقائي" : "auto"}</div>}
          </div>
            <div className="col-span-1 tabular-nums">
              <div>{Number(r.work_hours || 0).toFixed(1)}</div>
              {r.check_in && (r.check_out ? (
                <div className="text-[10px] text-muted-foreground">{formatWorkDuration(attendanceElapsedMs(r), isAr ? "ar" : "en")}</div>
              ) : (
                <OnDutyTimer record={r} isAr={isAr} className="text-[10px] text-muted-foreground" />
              ))}
            </div>
            <div className="col-span-2">
              <span className={cn("px-1.5 py-0.5 rounded-full text-[11px]", STATUS_CLS[r.status] || "bg-slate-100 text-slate-600")}>
                {statusLabel(r)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}