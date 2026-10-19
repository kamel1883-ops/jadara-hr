import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import BusinessTripForm from "@/components/BusinessTripForm";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Pencil, Plane, MapPin, Wallet, Download, Loader2, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { generateBusinessTripApproval } from "@/lib/docGenerators";
import { StoredDocButton } from "@/components/VaultDocLink";
import { enrichEmployeesBatch, applySensitiveMap } from "@/lib/vaultSensitive";
import { getOrgOnce } from "@/lib/leaveBalance";
import PullToRefresh from "@/components/PullToRefresh";
import { enrichRecordsWithVault, VAULT_MODULES } from "@/lib/vaultGeneric";

export default function BusinessTrips() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const typeLabel = isAr ? {
    internal: { label: "داخلية", cls: "bg-blue-50 text-blue-600" },
    external: { label: "خارجية", cls: "bg-violet-50 text-violet-600" },
  } : {
    internal: { label: "Internal", cls: "bg-blue-50 text-blue-600" },
    external: { label: "External", cls: "bg-violet-50 text-violet-600" },
  };
  const statusLabel = isAr ? {
    draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600" },
    pending: { label: "قيد الاعتماد", cls: "bg-amber-50 text-amber-600" },
    approved: { label: "معتمدة", cls: "bg-blue-50 text-blue-600" },
    in_progress: { label: "قيد التنفيذ", cls: "bg-indigo-50 text-indigo-600" },
    completed: { label: "مكتملة", cls: "bg-emerald-50 text-emerald-600" },
    cancelled: { label: "ملغاة", cls: "bg-rose-50 text-rose-600" },
  } : {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
    pending: { label: "Pending", cls: "bg-amber-50 text-amber-600" },
    approved: { label: "Approved", cls: "bg-blue-50 text-blue-600" },
    in_progress: { label: "In progress", cls: "bg-indigo-50 text-indigo-600" },
    completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-600" },
    cancelled: { label: "Cancelled", cls: "bg-rose-50 text-rose-600" },
  };
  const transportLabel = isAr
    ? { plane: "طيران", car: "سيارة", bus: "حافلة", train: "قطار", none: "—" }
    : { plane: "Flight", car: "Car", bus: "Bus", train: "Train", none: "—" };
  const t = isAr ? {
    title: "رحلات العمل والانتداب", subtitle: "إدارة انتدابات الموظفين الداخلية والخارجية والتكاليف المرتبطة بها",
    sTotal: "إجمالي الرحلات", sInternal: "داخلية", sExternal: "خارجية", sCost: "إجمالي التكاليف",
    search: "بحث بالموظف أو الوجهة أو الغرض", type: "نوع الرحلة", allTypes: "كل الأنواع", status: "الحالة", allStatus: "كل الحالات",
    loading: "جارٍ التحميل...", empty: "لا توجد رحلات عمل بعد — ابدأ بإنشاء رحلة جديدة",
    thEmp: "الموظف", thType: "النوع", thDest: "الوجهة", thPeriod: "الفترة", thDays: "الأيام", thTransport: "التنقل", thCost: "التكلفة", thStatus: "الحالة",
    doc: "مستند الانتداب", genDoc: "توليد المستند",
    lockedTrip: "الانتداب معتمد — لا يمكن تعديله أو حذفه",
  } : {
    title: "Business Trips & Deputation", subtitle: "Manage internal and external employee trips and related costs",
    sTotal: "Total trips", sInternal: "Internal", sExternal: "External", sCost: "Total costs",
    search: "Search by employee, destination or purpose", type: "Trip type", allTypes: "All types", status: "Status", allStatus: "All statuses",
    loading: "Loading...", empty: "No business trips yet — create a new one",
    thEmp: "Employee", thType: "Type", thDest: "Destination", thPeriod: "Period", thDays: "Days", thTransport: "Transport", thCost: "Cost", thStatus: "Status",
    doc: "Trip document", genDoc: "Generate document",
    lockedTrip: "Approved deputation — cannot be edited or deleted",
  };

  const [trips, setTrips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [org, setOrg] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    const [tr, e, o] = await Promise.all([
      base44.entities.BusinessTrip.list("-created_date", 500),
      base44.entities.Employee.list("-created_date", 500),
      getOrgOnce(),
    ]);
    setTrips(tr); setEmployees(e); setOrg(o); setLoading(false);
    enrichRecordsWithVault(tr, VAULT_MODULES.businessTrips, "trip_ref", ["purpose", "employee_note", "notes"]).then(setTrips);
    const sens = await enrichEmployeesBatch(e);
    setEmployees(applySensitiveMap(e, sens));
  };
  useEffect(() => { load(); }, []);

  const empNat = (id) => employees.find((e) => e.id === id)?.national_id || "";

  // بعد اعتماد الانتداب لا تبقى صلاحية للتعديل أو الحذف — تُعرض النتيجة للاطلاع فقط.
  const LOCKED_TRIP = ["approved", "in_progress", "completed", "cancelled"];

  const genDoc = async (trip) => {
    const emp = employees.find((x) => x.id === trip.employee_id);
    setBusy("t" + trip.id);
    try { await generateBusinessTripApproval(trip, emp, org); await load(); }
    finally { setBusy(null); }
  };

  const filtered = trips.filter((tr) => {
    const emp = employees.find((x) => x.id === tr.employee_id);
    const text = `${tr.employee_name || ""} ${emp?.position || ""} ${tr.destination || ""} ${tr.purpose || ""}`;
    if (q && !text.toLowerCase().includes(q.toLowerCase())) return false;
    if (typeFilter !== "all" && tr.trip_type !== typeFilter) return false;
    if (statusFilter !== "all" && tr.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: trips.length,
    internal: trips.filter((tr) => tr.trip_type === "internal").length,
    external: trips.filter((tr) => tr.trip_type === "external").length,
    cost: trips.reduce((s, tr) => s + (Number(tr.total_cost) || 0), 0),
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <PullToRefresh onRefresh={load}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Plane size={18} />} label={t.sTotal} value={stats.total} cls="bg-violet-50 text-violet-600" />
        <StatCard icon={<MapPin size={18} />} label={t.sInternal} value={stats.internal} cls="bg-blue-50 text-blue-600" />
        <StatCard icon={<MapPin size={18} />} label={t.sExternal} value={stats.external} cls="bg-indigo-50 text-indigo-600" />
        <StatCard icon={<Wallet size={18} />} label={t.sCost} value={stats.cost.toLocaleString()} cls="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder={t.type} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allTypes}</SelectItem>
            <SelectItem value="internal">{typeLabel.internal.label}</SelectItem>
            <SelectItem value="external">{typeLabel.external.label}</SelectItem>
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
          <Plane size={40} className="mx-auto text-slate-300 mb-3" />
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
                <TableHead>{t.thDest}</TableHead>
                <TableHead>{t.thPeriod}</TableHead>
                <TableHead>{t.thDays}</TableHead>
                <TableHead>{t.thTransport}</TableHead>
                <TableHead>{t.thCost}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tr) => {
                const tp = typeLabel[tr.trip_type] || typeLabel.internal;
                const st = statusLabel[tr.status] || statusLabel.pending;
                return (
                  <TableRow key={tr.id}>
                    <TableCell className="font-medium">
                      <div>{employees.find((e) => e.id === tr.employee_id)?.full_name || tr.employee_name || "—"}</div>
                      {tr.prepared_by_name && (
                        <div className="text-[10px] text-violet-600 mt-0.5">
                          {isAr ? "أُعدّت بواسطة" : "Prepared by"}: {tr.prepared_by_name}{tr.prepared_by_id ? ` — ${tr.prepared_by_id}` : ""}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{empNat(tr.employee_id) || "—"}</TableCell>
                    <TableCell><span className={cn("text-xs px-2 py-1 rounded-full font-medium", tp.cls)}>{tp.label}</span></TableCell>
                    <TableCell>{tr.destination || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tr.start_date} ← {tr.end_date}</TableCell>
                    <TableCell>{tr.days_count || 0}</TableCell>
                    <TableCell className="text-sm">{transportLabel[tr.transport_mode] || "—"}</TableCell>
                    <TableCell className="font-medium">{(Number(tr.total_cost) || 0).toLocaleString()}</TableCell>
                    <TableCell><span className={cn("text-xs px-2 py-1 rounded-full font-medium", st.cls)}>{st.label}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center">
                        {LOCKED_TRIP.includes(tr.status) ? (
                          <span title={t.lockedTrip} className="p-1.5 rounded-lg text-slate-300 cursor-default"><Lock size={15} /></span>
                        ) : (
                          <button onClick={() => { setEditing(tr); setShowForm(true); }} title={isAr ? "تعديل" : "Edit"} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={15} /></button>
                        )}
                        {tr.status === "completed" ? (
                          tr.approval_pdf_url ? (
                            <StoredDocButton value={tr.approval_pdf_url}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium">
                              <Download size={15} /> {t.doc}
                            </StoredDocButton>
                          ) : (
                            <button onClick={() => genDoc(tr)} disabled={busy === "t" + tr.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium disabled:opacity-50">
                              {busy === "t" + tr.id ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {t.genDoc}
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      </PullToRefresh>

      <BusinessTripForm open={showForm} employees={employees} editing={editing} onClose={() => setShowForm(false)} onSaved={load} />
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