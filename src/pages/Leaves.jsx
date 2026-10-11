import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { CalendarDays, Clock, CheckCircle2, XCircle, Download, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { generateLeaveSettlement } from "@/lib/docGenerators";
import { StoredDocButton } from "@/components/VaultDocLink";
import { enrichEmployeesBatch, applySensitiveMap } from "@/lib/vaultSensitive";
import { getOrgOnce } from "@/lib/leaveBalance";
import PullToRefresh from "@/components/PullToRefresh";

export default function Leaves() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const typeLabel = isAr ? {
    annual: { label: "سنوية", cls: "bg-blue-50 text-blue-600" },
    sick: { label: "مرضية", cls: "bg-rose-50 text-rose-600" },
    emergency: { label: "طارئة", cls: "bg-amber-50 text-amber-600" },
    unpaid: { label: "بدون راتب", cls: "bg-slate-100 text-slate-600" },
    maternity: { label: "أمومة", cls: "bg-violet-50 text-violet-600" },
  } : {
    annual: { label: "Annual", cls: "bg-blue-50 text-blue-600" },
    sick: { label: "Sick", cls: "bg-rose-50 text-rose-600" },
    emergency: { label: "Emergency", cls: "bg-amber-50 text-amber-600" },
    unpaid: { label: "Unpaid", cls: "bg-slate-100 text-slate-600" },
    maternity: { label: "Maternity", cls: "bg-violet-50 text-violet-600" },
  };
  const statusLabel = isAr ? {
    pending_manager: { label: "بانتظار المدير", cls: "bg-amber-50 text-amber-600" },
    manager_approved: { label: "اعتمد المدير", cls: "bg-blue-50 text-blue-600" },
    hr_settled: { label: "مسودة الموارد", cls: "bg-violet-50 text-violet-600" },
    hr_approved: { label: "اعتمدت الموارد", cls: "bg-indigo-50 text-indigo-600" },
    awaiting_finance: { label: "بانتظار المالية", cls: "bg-violet-50 text-violet-600" },
    paid: { label: "صُرفت", cls: "bg-emerald-50 text-emerald-600" },
    completed: { label: "مكتملة", cls: "bg-emerald-50 text-emerald-600" },
    rejected: { label: "مرفوضة", cls: "bg-rose-50 text-rose-600" },
    pending: { label: "قيد المراجعة", cls: "bg-amber-50 text-amber-600" },
    approved: { label: "معتمدة", cls: "bg-emerald-50 text-emerald-600" },
  } : {
    pending_manager: { label: "Awaiting manager", cls: "bg-amber-50 text-amber-600" },
    manager_approved: { label: "Manager approved", cls: "bg-blue-50 text-blue-600" },
    hr_settled: { label: "HR draft", cls: "bg-violet-50 text-violet-600" },
    hr_approved: { label: "HR approved", cls: "bg-indigo-50 text-indigo-600" },
    awaiting_finance: { label: "Awaiting finance", cls: "bg-violet-50 text-violet-600" },
    paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-600" },
    completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-600" },
    rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-600" },
    pending: { label: "Under review", cls: "bg-amber-50 text-amber-600" },
    approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-600" },
  };
  const t = isAr ? {
    title: "إدارة الإجازات", subtitle: "متابعة طلبات الإجازات وأرصدتها وحالاتها",
    sTotal: "إجمالي الطلبات", sPending: "قيد المعالجة", sApproved: "معتمدة", sRejected: "مرفوضة",
    search: "بحث بالموظف أو السبب", type: "نوع الإجازة", allTypes: "كل الأنواع", status: "الحالة", allStatus: "كل الحالات",
    loading: "جارٍ التحميل...", empty: "لا توجد طلبات إجازات بعد — أنشئ طلباً جديداً",
    thEmp: "الموظف", thType: "النوع", thFrom: "من", thTo: "إلى", thDays: "الأيام", thReason: "السبب", thStatus: "الحالة",
    clearance: "معاينة/طباعة المخالصة", genClear: "توليد المخالصة",
  } : {
    title: "Leaves", subtitle: "Track leave requests, balances and statuses",
    sTotal: "Total requests", sPending: "In progress", sApproved: "Approved", sRejected: "Rejected",
    search: "Search by employee or reason", type: "Leave type", allTypes: "All types", status: "Status", allStatus: "All statuses",
    loading: "Loading...", empty: "No leave requests yet — create a new request",
    thEmp: "Employee", thType: "Type", thFrom: "From", thTo: "To", thDays: "Days", thReason: "Reason", thStatus: "Status",
    clearance: "View/Print Clearance", genClear: "Generate clearance",
  };

  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [org, setOrg] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    const [r, e, o] = await Promise.all([
      base44.entities.LeaveRequest.list("-created_date", 500),
      base44.entities.Employee.list("-created_date", 500),
      getOrgOnce(),
    ]);
    setRequests(r); setEmployees(e); setOrg(o); setLoading(false);
    const sens = await enrichEmployeesBatch(e);
    setEmployees(applySensitiveMap(e, sens));
  };
  useEffect(() => { load(); }, []);

  const empNat = (id) => employees.find((e) => e.id === id)?.national_id || "";

  const remove = async (id) => { await base44.entities.LeaveRequest.delete(id); load(); };

  const genClearance = async (leave) => {
    const emp = employees.find((x) => x.id === leave.employee_id);
    setBusy("l" + leave.id);
    try {
      await generateLeaveSettlement(leave, emp, org, requests.filter((x) => x.employee_id === leave.employee_id));
      await load();
    } finally { setBusy(null); }
  };

  const filtered = requests.filter((r) => {
    const text = `${r.employee_name || ""} ${r.reason || ""}`;
    if (q && !text.toLowerCase().includes(q.toLowerCase())) return false;
    if (typeFilter !== "all" && r.leave_type !== typeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => ["pending_manager", "manager_approved", "hr_approved", "awaiting_finance", "pending"].includes(r.status)).length,
    approved: requests.filter((r) => ["paid", "completed", "approved"].includes(r.status)).length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <PullToRefresh onRefresh={load}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<CalendarDays size={18} />} label={t.sTotal} value={stats.total} cls="bg-violet-50 text-violet-600" />
        <StatCard icon={<Clock size={18} />} label={t.sPending} value={stats.pending} cls="bg-amber-50 text-amber-600" />
        <StatCard icon={<CheckCircle2 size={18} />} label={t.sApproved} value={stats.approved} cls="bg-emerald-50 text-emerald-600" />
        <StatCard icon={<XCircle size={18} />} label={t.sRejected} value={stats.rejected} cls="bg-rose-50 text-rose-600" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder={t.type} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allTypes}</SelectItem>
            {Object.entries(typeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder={t.status} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStatus}</SelectItem>
            {Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
      ) : filtered.length === 0 ? (
        <div className="p-14 text-center bg-white rounded-2xl border border-border">
          <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.thEmp}</TableHead>
                <TableHead>{isAr ? "الهوية/الإقامة" : "National ID"}</TableHead>
                <TableHead>{t.thType}</TableHead>
                <TableHead>{t.thFrom}</TableHead>
                <TableHead>{t.thTo}</TableHead>
                <TableHead>{t.thDays}</TableHead>
                <TableHead>{t.thReason}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const tp = typeLabel[r.leave_type] || typeLabel.annual;
                const st = statusLabel[r.status] || statusLabel.pending_manager;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div>{employees.find((e) => e.id === r.employee_id)?.full_name || r.employee_name || "—"}</div>
                      {r.prepared_by_name && (
                        <div className="text-[10px] text-violet-600 mt-0.5">
                          {isAr ? "أُعدّت بواسطة" : "Prepared by"}: {r.prepared_by_name}{r.prepared_by_id ? ` — ${r.prepared_by_id}` : ""}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{empNat(r.employee_id) || "—"}</TableCell>
                    <TableCell><span className={cn("text-xs px-2 py-1 rounded-full font-medium", tp.cls)}>{tp.label}</span></TableCell>
                    <TableCell className="text-sm">{r.start_date}</TableCell>
                    <TableCell className="text-sm">{r.end_date}</TableCell>
                    <TableCell>
                      {Number(r.balance_deducted) > 0 ? (
                        <span className="font-semibold text-violet-700">{Number(r.balance_deducted)}</span>
                      ) : (r.days_count || 0)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">{r.reason || "—"}</TableCell>
                    <TableCell><span className={cn("text-xs px-2 py-1 rounded-full font-medium", st.cls)}>{st.label}</span></TableCell>
                    <TableCell>
                      {r.status === "completed" ? (
                        r.settlement_pdf_url ? (
                          <StoredDocButton value={r.settlement_pdf_url}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium">
                            <Download size={15} /> {t.clearance}
                          </StoredDocButton>
                        ) : (
                          <button onClick={() => genClearance(r)} disabled={busy === "l" + r.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium disabled:opacity-50">
                            {busy === "l" + r.id ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {t.genClear}
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      </PullToRefresh>
    </div>
  );
}

function StatCard({ icon, label, value, cls }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", cls)}>{icon}</div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}