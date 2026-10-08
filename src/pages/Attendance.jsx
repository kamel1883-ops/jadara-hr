import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Time24Input from "@/components/ui/time24";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { CalendarCheck, Plus, Save, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayISO, attendanceStatusLabel, isOrgWeeklyOff, dayNameAr } from "@/lib/hr";
// dayNameAr يُستخدم فقط في الفرع العربي للإجازة الأسبوعية؛ الفرع الإنجليزي يستخدم toLocaleDateString داخل العنصر.
import { useI18n } from "@/lib/i18n";
import AttendanceReport from "@/components/reports/AttendanceReport";
import { enrichEmployeesBatch } from "@/lib/vaultSensitive";
import PullToRefresh from "@/components/PullToRefresh";

export default function Attendance() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "الحضور والانصراف", subtitle: "متابعة سجل الحضور اليومي للموظفين",
    date: "التاريخ", status: "الحالة", all: "كل الحالات", present: "حاضر", late: "متأخر", absent: "غائب", leave: "إجازة",
    newH: "تسجيل حضور جديد", emp: "الموظف", choose: "اختر الموظف", in: "الحضور", out: "الانصراف", record: "تسجيل",
    loading: "جارٍ التحميل...", empty: "لا توجد سجلات لهذا اليوم", del: "حذف",
    allBranches: "كل الفروع", branch: "الفرع", thEmp: "الموظف", thBranch: "الفرع", thIn: "الحضور", thOut: "الانصراف", thStatus: "الحالة", thActions: "إجراءات",
  } : {
    title: "Attendance", subtitle: "Track daily employee attendance",
    date: "Date", status: "Status", all: "All statuses", present: "Present", late: "Late", absent: "Absent", leave: "Leave",
    newH: "New attendance record", emp: "Employee", choose: "Select employee", in: "Check in", out: "Check out", record: "Record",
    loading: "Loading...", empty: "No records for this day", del: "Delete",
    allBranches: "All branches", branch: "Branch", thEmp: "Employee", thBranch: "Branch", thIn: "Check in", thOut: "Check out", thStatus: "Status", thActions: "Actions",
  };

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [newRec, setNewRec] = useState({ employee_id: "", check_in: "08:00", check_out: "16:00", status: "present" });
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const list = await listCurrentOrg();
        setOrg(list?.[0] || null);
      } catch {}
    })();
  }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await base44.entities.Attendance.filter({ date }, "-created_date", 500);
    setRecords(data);
    const emps = await base44.entities.Employee.filter({ status: "active" }, "-created_date", 500);
    const sensMap = await enrichEmployeesBatch(emps);
    setEmployees(emps.map((x) => (x.emp_ref ? { ...x, ...sensMap[x.emp_ref] } : x)));
    try { const brs = await base44.entities.Branch.list("-is_main", 500); setBranches(brs); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [date]);

  const filtered = records
    .filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter((r) => branchFilter === "all" || r.branch_id === branchFilter);

  const addRecord = async (e) => {
    e.preventDefault();
    if (!newRec.employee_id) return;
    setCreating(true);
    const emp = employees.find((x) => x.id === newRec.employee_id);
    const br = branches.find((b) => b.id === emp?.branch_id);
    await base44.entities.Attendance.create({
      employee_id: newRec.employee_id,
      employee_name: emp ? emp.full_name : "",
      national_id: emp?.emp_ref ? "" : (emp ? (emp.national_id || "") : ""),
      emp_ref: emp?.emp_ref || "",
      date, check_in: newRec.check_in, check_out: newRec.check_out,
      status: newRec.status, work_hours: 8,
      branch_id: emp?.branch_id || null, branch_name: br?.name || emp?.branch_name || "",
    });
    setNewRec({ employee_id: "", check_in: "08:00", check_out: "16:00", status: "present" });
    setCreating(false);
    load();
  };

  const updateStatus = async (rec, status) => { await base44.entities.Attendance.update(rec.id, { status }); load(); };
  const remove = async (rec) => { await base44.entities.Attendance.delete(rec.id); load(); };

  return (
    <PullToRefresh onRefresh={() => load(true)}>
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {isOrgWeeklyOff(date, org) && (
        <div className="bg-violet-50 border border-violet-200 text-violet-700 rounded-2xl px-4 py-2.5 mb-4 text-sm font-medium flex items-center gap-2">
          <CalendarOff size={16} /> {isAr ? `يوم ${dayNameAr(date)} — ضمن الإجازة الأسبوعية للمنشأة` : `${new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })} — weekly off day`}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-border p-4 mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t.date}</label>
          <Input type="date" lang={isAr ? "ar" : "en"} value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-44" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t.status}</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.all}</SelectItem>
              <SelectItem value="present">{t.present}</SelectItem>
              <SelectItem value="late">{t.late}</SelectItem>
              <SelectItem value="absent">{t.absent}</SelectItem>
              <SelectItem value="leave">{t.leave}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t.branch}</label>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allBranches}</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <form onSubmit={addRecord} className="bg-white rounded-2xl border border-border p-4 mb-5">
        <h3 className="font-semibold mb-4">{t.newH}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">{t.emp}</label>
            <Select value={newRec.employee_id} onValueChange={(v) => setNewRec({ ...newRec, employee_id: v })}>
              <SelectTrigger><SelectValue placeholder={t.choose} /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.national_id || "—"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t.in}</label>
            <Time24Input value={newRec.check_in} onChange={(v) => setNewRec({ ...newRec, check_in: v })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t.out}</label>
            <Time24Input value={newRec.check_out} onChange={(v) => setNewRec({ ...newRec, check_out: v })} />
          </div>
          <Button type="submit" disabled={creating} className="gap-2"><Plus size={18} /> {t.record}</Button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <CalendarCheck size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-muted-foreground">{t.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-muted-foreground text-xs">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">{isAr ? "الرقم" : "#"}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.thEmp}</th>
                  <th className="text-right px-4 py-3 font-medium">{isAr ? "الهوية/الإقامة" : "National ID"}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.thBranch}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.thIn}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.thOut}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.thStatus}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.thActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <div>{employees.find((e) => e.id === r.employee_id)?.full_name || r.employee_name}</div>
                      {r.prepared_by_name && (
                        <div className="text-[10px] text-violet-600 mt-0.5">
                          {isAr ? "أُعدّت بواسطة" : "Prepared by"}: {r.prepared_by_name}{r.prepared_by_id ? ` — ${r.prepared_by_id}` : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{r.national_id || (employees.find((e) => e.id === r.employee_id)?.national_id || "—")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.branch_name || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{r.check_in || "-"}</td>
                    <td className="px-4 py-3 tabular-nums">{r.check_out || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <Select value={r.status} onValueChange={(v) => updateStatus(r, v)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">{t.present}</SelectItem>
                          <SelectItem value="late">{t.late}</SelectItem>
                          <SelectItem value="absent">{t.absent}</SelectItem>
                          <SelectItem value="leave">{t.leave}</SelectItem>
                        </SelectContent>
                      </Select>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <CalendarCheck size={20} className="text-violet-600" /> {isAr ? "تقرير الحضور الشهري (PDF)" : "Monthly attendance report (PDF)"}
        </h3>
        <AttendanceReport org={org} />
      </div>
    </div>
    </PullToRefresh>
  );
}

function StatusBadge({ status }) {
  const s = attendanceStatusLabel(status);
  return <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", s.cls)}>{s.label}</span>;
}