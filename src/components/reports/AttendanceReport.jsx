import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer, CalendarRange, Users2, CheckCircle2, Clock, XCircle, CalendarOff, Save } from "lucide-react";
import { printReport } from "@/lib/reportPrint";
import DocApprovalMark from "@/components/docs/DocApprovalMark";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { attendanceStatusLabel, isOrgWeeklyOff, todayISO } from "@/lib/hr";
import { useI18n } from "@/lib/i18n";

const MONTHS = {
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const WEEK_DAYS = {
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

// تقرير الحضور والانصراف الشهري — اختيار شهر وتصدير PDF
export default function AttendanceReport({ org }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const empOf = (id) => employees.find((e) => e.id === id);
  const [selKey, setSelKey] = useState("");
  const [exporting, setExporting] = useState(false);
  const [sheets, setSheets] = useState([]);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);
  const { toast } = useToast();

  const t = isAr ? {
    loading: "جارٍ تحميل سجلات الحضور الشهرية…",
    empty: "لا توجد سجلات حضور شهرية بعد — سيظهر هنا تقرير شهري قابل للتحميل PDF فور تسجيل أول حضور.",
    chooseMonth: "اختر الشهر",
    records: "سجل",
    btn: "تحميل تقرير الشهر PDF",
    exporting: "جارٍ التصدير…",
    total: "إجمالي السجلات", present: "حاضر", late: "متأخر", absent: "غائب", leave: "إجازة",
    thEmp: "الموظف", thId: "الهوية/الإقامة", thDay: "اليوم", thDate: "التاريخ", thIn: "الحضور", thOut: "الانصراف", thStatus: "الحالة",
    weeklyOff: "إجازة أسبوعية",
    pdfTitle: (m) => `تقرير الحضور والانصراف — ${m}`,
    pdfSub: (tot, c) => `إجمالي السجلات: ${tot} — حاضر: ${c.present} · متأخر: ${c.late} · غائب: ${c.absent} · إجازة: ${c.leave}`,
    save: "حفظ النسخة", saving: "جارٍ حفظ النسخة…",
    savedToast: "تم حفظ نسخة الشهر — التقرير الآن معتمد", savedFail: "تعذّر حفظ النسخة",
  } : {
    loading: "Loading monthly attendance records…",
    empty: "No monthly attendance records yet — a downloadable monthly PDF report will appear here as soon as the first attendance is recorded.",
    chooseMonth: "Select month",
    records: "records",
    btn: "Download monthly report PDF",
    exporting: "Exporting…",
    total: "Total records", present: "Present", late: "Late", absent: "Absent", leave: "Leave",
    thEmp: "Employee", thId: "ID / Iqama", thDay: "Day", thDate: "Date", thIn: "Check in", thOut: "Check out", thStatus: "Status",
    weeklyOff: "Weekly off",
    pdfTitle: (m) => `Attendance report — ${m}`,
    pdfSub: (tot, c) => `Total records: ${tot} — Present: ${c.present} · Late: ${c.late} · Absent: ${c.absent} · Leave: ${c.leave}`,
    save: "Save version", saving: "Saving version…",
    savedToast: "Month version saved — the report is now approved", savedFail: "Could not save the version",
  };

  const monthLabel = (y, m) => `${MONTHS[isAr ? "ar" : "en"][(m || 1) - 1] || ""} ${y}`;
  const dayName = (dStr) => {
    const d = new Date(String(dStr).slice(0, 10) + "T00:00:00");
    return isNaN(d.getTime()) ? "" : WEEK_DAYS[isAr ? "ar" : "en"][d.getDay()];
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [all, emps, versions] = await Promise.all([
          base44.entities.Attendance.list("-created_date", 1000),
          base44.entities.Employee.list("-created_date", 500),
          base44.entities.AttendanceSheet.list("-created_date", 200).catch(() => []),
        ]);
        setRecords(all || []);
        setEmployees(emps || []);
        setSheets(Array.isArray(versions) ? versions : []);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groups = useMemo(() => {
    const m = new Map();
    (records || []).forEach((r) => {
      const d = String(r.date || "").slice(0, 10);
      if (!d) return;
      const [y, mo] = d.split("-");
      const k = `${y}-${mo}`;
      if (!m.has(k)) m.set(k, { key: k, year: Number(y), month: Number(mo), rows: [] });
      m.get(k).rows.push(r);
    });
    return Array.from(m.values()).sort((a, b) => (b.year - a.year) || (b.month - a.month));
  }, [records]);

  useEffect(() => {
    if (!selKey && groups.length) setSelKey(groups[0].key);
  }, [groups, selKey]);

  const sel = groups.find((g) => g.key === selKey) || groups[0] || null;
  // النسخة المحفوظة للشهر: وجودها يعني أن التقرير معتمد، وغيابها يعني أنه مسودة
  const periodKey = sel ? `${sel.year}-${String(sel.month).padStart(2, "0")}` : "";
  const saved = sheets.find((s) => s.period_key === periodKey) || null;
  const savedDate = saved?.saved_at
    ? new Date(saved.saved_at).toLocaleDateString(isAr ? "ar-SA" : "en-GB")
    : (saved?.created_date ? new Date(saved.created_date).toLocaleDateString(isAr ? "ar-SA" : "en-GB") : "");

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, leave: 0 };
    (sel?.rows || []).forEach((r) => {
      if (c[r.status] != null) c[r.status] += 1;
    });
    return c;
  }, [sel]);

  const printOpts = () => ({
    org,
    title: t.pdfTitle(monthLabel(sel.year, sel.month)),
    subtitle: t.pdfSub(sel.rows.length, counts),
    landscape: true,
    // التقارير غير المحفوظة تُطبع مسودة ولا تُؤرشف، والمحفوظة معتمدة وتُؤرشف على الخزنة
    draft: !saved,
  });

  const onExport = async () => {
    if (!ref.current || !sel) return;
    setExporting(true);
    try {
      await printReport(ref.current, printOpts());
    } finally {
      setExporting(false);
    }
  };

  // حفظ نسخة الشهر: يثبّت الشهر كمعتمد ويؤرشف نسخته PDF بلا فتح نافذة الطباعة،
  // فيبقى الشهر — حتى الماضي منه — معتمداً عند الطباعة لاحقاً.
  const onSaveVersion = async () => {
    if (!ref.current || !sel) return;
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const payload = {
        unified_number: org?.unified_number || "",
        period_key: periodKey,
        year: sel.year,
        month: sel.month,
        status: "approved",
        records_count: sel.rows.length,
        present_count: counts.present,
        late_count: counts.late,
        absent_count: counts.absent,
        leave_count: counts.leave,
        saved_at: todayISO(),
        prepared_by_name: me?.full_name || me?.name || "",
        prepared_by_id: me?.id || me?.email || "",
      };
      if (saved) await base44.entities.AttendanceSheet.update(saved.id, payload);
      else await base44.entities.AttendanceSheet.create(payload);
      const rows = await base44.entities.AttendanceSheet.list("-created_date", 200).catch(() => []);
      if (Array.isArray(rows) && rows.length) setSheets(rows);
      // ننتظر ظهور ختم الاعتماد على التقرير قبل أرشفة النسخة
      await new Promise((r) => setTimeout(r, 150));
      await printReport(ref.current, { ...printOpts(), draft: false, open: false, docType: "attendance", fileName: `attendance-${periodKey}.pdf` });
      toast({ title: t.savedToast });
    } catch {
      toast({ title: t.savedFail, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
        {t.loading}
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="bg-white rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
        <CalendarRange className="mx-auto mb-3 text-muted-foreground/50" size={28} />
        {t.empty}
      </div>
    );
  }

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">{t.chooseMonth}</label>
          <select
            value={selKey}
            onChange={(e) => setSelKey(e.target.value)}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm font-medium min-w-[220px]"
          >
            {groups.map((g) => (
              <option key={g.key} value={g.key}>
                {monthLabel(g.year, g.month)} — {g.rows.length} {t.records}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onExport} variant="outline" disabled={exporting || !sel} className="gap-2">
          {exporting ? <Printer size={16} className="animate-spin" /> : <Printer size={16} />}
          {exporting ? t.exporting : t.btn}
        </Button>
        <Button onClick={onSaveVersion} disabled={saving || !sel} className="gap-2">
          {saving ? <Save size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? t.saving : t.save}
        </Button>
        <DocApprovalMark variant="chip" approved={!!saved} isAr={isAr} date={savedDate} by={saved?.prepared_by_name} />
      </div>

      {sel && (
        <div ref={ref} className="bg-white rounded-2xl border border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarRange size={16} className="text-violet-600" /> {monthLabel(sel.year, sel.month)}
            </h3>
            {/* ختم الحالة داخل التقرير: مسودة قبل حفظ النسخة، معتمد بعد الحفظ */}
            <DocApprovalMark approved={!!saved} isAr={isAr} date={savedDate} by={saved?.prepared_by_name} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <Stat icon={Users2} label={t.total} value={sel.rows.length} tone="violet" />
            <Stat icon={CheckCircle2} label={t.present} value={counts.present} tone="emerald" />
            <Stat icon={Clock} label={t.late} value={counts.late} tone="amber" />
            <Stat icon={XCircle} label={t.absent} value={counts.absent} tone="rose" />
            <Stat icon={CalendarOff} label={t.leave} value={counts.leave} tone="blue" />
          </div>

          <Table>
          <TableHeader>
          <TableRow>
            <TableHead>{t.thEmp}</TableHead>
            <TableHead className="text-center">{t.thId}</TableHead>
            <TableHead className="text-center">{t.thDay}</TableHead>
            <TableHead className="text-center">{t.thDate}</TableHead>
            <TableHead className="text-center">{t.thIn}</TableHead>
            <TableHead className="text-center">{t.thOut}</TableHead>
            <TableHead className="text-center">{t.thStatus}</TableHead>
          </TableRow>
          </TableHeader>
          <TableBody>
          {sel.rows.map((r) => {
            const s = attendanceStatusLabel(r.status);
            const dStr = String(r.date || "").slice(0, 10);
            const weeklyOff = isOrgWeeklyOff(dStr, org);
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{empOf(r.employee_id)?.full_name || r.employee_name || "—"}</TableCell>
                <TableCell className="text-center tabular-nums text-xs">{empOf(r.employee_id)?.national_id || r.national_id || "—"}</TableCell>
                <TableCell className="text-center text-xs">
                  <span className={cn("px-2 py-0.5 rounded-md", weeklyOff ? "bg-violet-50 text-violet-700 font-medium" : "text-muted-foreground")}>
                    {dayName(dStr) || "—"}
                    {weeklyOff && <span className="block text-[10px] text-violet-500">{t.weeklyOff}</span>}
                  </span>
                </TableCell>
                <TableCell className="text-center text-xs tabular-nums" dir="ltr">{dStr || "—"}</TableCell>
                <TableCell className="text-center tabular-nums">{r.check_in || "—"}</TableCell>
                <TableCell className="text-center tabular-nums">{r.check_out || "—"}</TableCell>
                <TableCell className="text-center">
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", s.cls)}>{s.label}</span>
                </TableCell>
              </TableRow>
            );
          })}
          </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <div className={cn("rounded-xl border p-3", tones[tone] || tones.violet)}>
      <div className="flex items-center gap-1.5 text-xs opacity-80">
        <Icon size={13} /> {label}
      </div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}