import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import EmployeeForm from "@/components/EmployeeForm";
import EmployeeImport from "@/components/EmployeeImport";
import BranchManager from "@/components/BranchManager";
import EmployeeTripsDialog from "@/components/EmployeeTripsDialog";
import EmployeeProfileDialog from "@/components/EmployeeProfileDialog";
import TerminateEmployeeDialog from "@/components/TerminateEmployeeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { repairOrgLeaves } from "@/lib/leaveRepair";
import { Plus, Search, Pencil, Users, Network, Upload, GitBranch, Plane, FileText, UserX, Printer, Wrench, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatCurrency, statusEmployeeLabel } from "@/lib/hr";
import { useI18n } from "@/lib/i18n";
import { ROLE_LABELS, ROLE_ORDER, ROLE_STYLES, roleLabel } from "@/lib/orgTree";
import { reasonMeta } from "@/lib/eos";
import { printEmployeeList } from "@/lib/employeePrint";
import { revertExpiredLeaves } from "@/lib/leaveBalance";
import { enrichEmployeesBatch, applySensitiveMap } from "@/lib/vaultSensitive";
import PullToRefresh from "@/components/PullToRefresh";

const isInactive = (e) => e.status === "terminated" || e.status === "resigned";

export default function Employees() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "الموظفون", subtitle: "إدارة بيانات وملفات الموظفين", add: "موظف جديد", importBtn: "استيراد من Excel", branchesBtn: "إدارة الفروع",
    search: "ابحث بالاسم أو الرقم الوظيفي أو الهوية... (يشمل النشطين وغير النشطين)", allDepts: "كل الإدارات", allRoles: "كل المستويات", allBranches: "كل الفروع", loading: "جارٍ التحميل...",
    empty: "لا يوجد موظفون مطابقون",
    activeHead: "الموظفون النشطون", inactiveHead: "الموظفون غير النشطون (الأرشيف)",
    thNum: "الرقم", thName: "الاسم", thNat: "الهوية/الإقامة", thPos: "المسمى", thDept: "الإدارة", thBranch: "الفرع", thRole: "المستوى", thStatus: "الحالة", thSalary: "الراتب", thActions: "إجراءات",
    thTermReason: "سبب الإنهاء", thTermDate: "تاريخ الإنهاء",
    del: (n) => `حذف الموظف ${n}؟`, terminateTitle: "فسخ عقد", profileTitle: "ملف الموظف", tripsTitle: "انتدابات",
    yearFilter: "السنة", allYears: "كل السنوات", noInactive: "لا يوجد موظفون تركوا العمل",
    exportPdf: "طباعة PDF",
    repairBtn: "إصلاح رصيد الإجازات",
    repairTitle: "إصلاح رصيد إجازات الموظفين",
    repairDesc: "يعيد حساب رصيد كل موظف نشط من مصدر الحقيقة: المستحق تناسبياً من تاريخ المباشرة حسب سياسة المنشأة (21/30)، والمستخدم = الرصيد الافتتاحي + الإجازات السنوية المعتمدة فقط (لا مرضية ولا بدون راتب ولا طارئة).",
    repairReset: "تصفير الأرصدة الافتتاحية (لمن ثبت أن قيمته خطأ فقط)",
    repairResetHint: "يفعّل هذا فقط إذا كانت الأرصدة الافتتاحية كلها أُدخلتخطأً ولا تخص أحداً (مثل بيانات تجريبية) — يصبح الرصيد الافتتاحي 0 لكل موظف.",
    repairDocs: "إعادة توليد مخالصات الإجازات (تستبدل القديمة)",
    repairRun: "ابدأ الإصلاح", repairRunning: (n, total, name) => `جارٍ إصلاح ${n} من ${total} — ${name}`,
    repairDone: (empN, docN, keptN) => `تم إصلاح ${empN} موظفاً — أُعيد توليد ${docN} مخالصة (بدّلت القديمة) وبقيت ${keptN} مطابقة كما هي`,
    repairPartial: (failed) => `تعذّر إصلاح ${failed} موظف — أعد المحاولة`,
    repairNoOrg: "لا توجد بيانات منشأة", close: "إغلاق",
  } : {
    title: "Employees", subtitle: "Manage employee data and profiles", add: "New employee", importBtn: "Import from Excel", branchesBtn: "Branches",
    search: "Search by name, employee number or ID... (active & inactive)", allDepts: "All departments", allRoles: "All levels", allBranches: "All branches", loading: "Loading...",
    empty: "No matching employees",
    activeHead: "Active employees", inactiveHead: "Inactive employees (archive)",
    thNum: "Number", thName: "Name", thNat: "National ID", thPos: "Title", thDept: "Department", thBranch: "Branch", thRole: "Level", thStatus: "Status", thSalary: "Salary", thActions: "Actions",
    thTermReason: "Termination reason", thTermDate: "Termination date",
    del: (n) => `Delete employee ${n}?`, terminateTitle: "Terminate", profileTitle: "Profile", tripsTitle: "Trips",
    yearFilter: "Year", allYears: "All years", noInactive: "No terminated employees",
    exportPdf: "Export PDF",
    repairBtn: "Repair leave balances",
    repairTitle: "Repair employee leave balances",
    repairDesc: "Recomputes every active employee from the source of truth: accrued proportionally from the hire date per org policy (21/30), used = opening balance + approved annual leaves only (no sick/unpaid/emergency).",
    repairReset: "Reset opening balances (only those proven wrong)",
    repairResetHint: "Enable only if every opening balance was entered by mistake and belongs to no one (e.g. demo data) — each employee's opening balance becomes 0.",
    repairDocs: "Regenerate leave settlements (replace old ones)",
    repairRun: "Start repair", repairRunning: (n, total, name) => `Repairing ${n} of ${total} — ${name}`,
    repairDone: (empN, docN, keptN) => `Repaired ${empN} employee(s) — regenerated ${docN} settlement(s) replacing old ones, kept ${keptN} matching as-is`,
    repairPartial: (failed) => `Could not repair ${failed} employee(s) — try again`,
    repairNoOrg: "No organization data", close: "Close",
  };

  const [employees, setEmployees] = useState([]);
  const [org, setOrg] = useState(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tripsOpen, setTripsOpen] = useState(false);
  const [tripsEmp, setTripsEmp] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEmp, setProfileEmp] = useState(null);
  const [termOpen, setTermOpen] = useState(false);
  const [termEmp, setTermEmp] = useState(null);
  const [myUnified, setMyUnified] = useState("");
  const loadSeq = useRef(0);
  const [repairOpen, setRepairOpen] = useState(false);
  const [repairReset, setRepairReset] = useState(false);
  const [repairDocs, setRepairDocs] = useState(true);
  const [repairBusy, setRepairBusy] = useState(false);
  const [repairProg, setRepairProg] = useState(null);
  const [repairResult, setRepairResult] = useState(null);

  const runRepair = async () => {
    if (!org) return;
    setRepairBusy(true); setRepairResult(null);
    try {
      const list = employees.filter((e) => e && !isInactive(e));
      const results = await repairOrgLeaves(list, org, {
        resetPrior: repairReset,
        regenerateDocs: repairDocs,
        onProgress: ({ index, total, employee }) => setRepairProg({ index: index + 1, total, name: employee?.full_name || "" }),
      });
      const fixed = results.filter((r) => !r.error).length;
      const docs = results.reduce((s, r) => s + (r.docs || 0), 0);
      const kept = results.reduce((s, r) => s + (r.kept || 0), 0);
      setRepairResult({ fixed, docs, kept, failed: results.length - fixed });
      load();
    } finally {
      setRepairBusy(false); setRepairProg(null);
    }
  };

  const load = async () => {
    const seq = ++loadSeq.current;
    // نحمّل المنشأة أولاً لنعرف الرقم الموحد، ثم نفلتر الموظفين به — عزل تام بين المنشآت
    const [orgs, tenantRes] = await Promise.all([
      listCurrentOrg(),
      base44.functions.invoke("getMyTenant", {}).catch(() => null),
    ]);
    if (seq !== loadSeq.current) return;
    const td = tenantRes?.data || tenantRes;
    const un = String(td?.tenant?.unified_number || "").trim();
    setMyUnified(un);
    const data = un
      ? await base44.entities.Employee.filter({ unified_number: un }, "-created_date", 500)
      : await base44.entities.Employee.list("-created_date", 500);
    if (seq !== loadSeq.current) return;
    const reverted = await revertExpiredLeaves(data);
    if (seq !== loadSeq.current) return;
    const rows = reverted.length ? data.map((e) => reverted.includes(e.id) ? { ...e, status: "active" } : e) : data;
    setEmployees(rows);
    // تحديث أي نافذة مفتوحة لتشاهد القيم المحدّثة بعد أي إصلاح/إعادة تحميل (بنفس المعرّف)
    setEditTarget((cur) => (cur && rows.find((x) => x.id === cur.id)) || cur);
    setProfileEmp((cur) => (cur && rows.find((x) => x.id === cur.id)) || cur);
    setOrg(orgs[0] || null);
    setLoading(false);
    // الهوية وتاريخ الميلاد والجوال في الخزنة السعودية. طلب واحد للقائمة كلها، للعرض فقط.
    const sensPromise = enrichEmployeesBatch(rows);
    // تعبئة رجعية آمنة: أي موظف أنشأه هذا المسؤول ويفتقد الرقم الموحّد يُربط بمنشأته.
    const meId = (await base44.auth.me().catch(() => null))?.id;
    const orphans = (rows || []).filter((e) => !e.unified_number && e.created_by_id === meId);
    if (orphans.length && un) {
      try {
        await base44.entities.Employee.bulkUpdate(orphans.map((e) => ({ id: e.id, unified_number: un })));
        if (seq !== loadSeq.current) return;
        setEmployees((cur) => cur.map((e) => (orphans.find((o) => o.id === e.id) ? { ...e, unified_number: un } : e)));
      } catch {}
    }
    const sensMap = await sensPromise;
    if (seq !== loadSeq.current) return;
    setEmployees((cur) => applySensitiveMap(cur, sensMap));
  };
  useEffect(() => { load(); }, []);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  const branchNames = Array.from(new Set(employees.map((e) => e.branch_name).filter(Boolean)));
  const matches = (e) => {
    const q = search.trim().toLowerCase();
    const matchQ = !q ||
      e.employee_number?.toLowerCase().includes(q) ||
      e.full_name?.toLowerCase().includes(q) ||
      e.national_id?.toLowerCase().includes(q) ||
      e.position?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q);
    const matchD = deptFilter === "all" || e.department === deptFilter;
    const matchB = branchFilter === "all" || e.branch_name === branchFilter;
    const matchR = roleFilter === "all" || e.role_level === roleFilter;
    return matchQ && matchD && matchB && matchR;
  };
  const byHireAsc = (a, b) => String(a.hire_date || "9999-99-99").localeCompare(String(b.hire_date || "9999-99-99"));
  const activeList = employees.filter((e) => !isInactive(e) && matches(e)).sort(byHireAsc);
  const inactiveRaw = employees.filter((e) => isInactive(e) && matches(e)).sort(byHireAsc);
  const years = Array.from(new Set(inactiveRaw.map((e) => e.termination_date?.slice(0, 4)).filter(Boolean))).sort((a, b) => b - a);
  const inactiveList = yearFilter === "all" ? inactiveRaw : inactiveRaw.filter((e) => e.termination_date?.slice(0, 4) === yearFilter);

  const remove = async (emp) => {
    if (!confirm(t.del(emp.employee_number))) return;
    // Optimistic UI: remove from local state instantly, rollback on error
    const snapshot = employees;
    setEmployees((cur) => cur.filter((e) => e.id !== emp.id));
    try {
      await base44.entities.Employee.delete(emp.id);
    } catch (e) {
      setEmployees(snapshot); // rollback
    }
  };

  return (
    <PullToRefresh onRefresh={load}>
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={(
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => { setEditTarget(null); setFormOpen(true); }} className="gap-2"><Plus size={18} /> {t.add}</Button>
            <Button variant="outline" onClick={() => setBranchOpen(true)} className="gap-2"><GitBranch size={18} /> {t.branchesBtn}</Button>
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2"><Upload size={18} /> {t.importBtn}</Button>
            <Button variant="outline" onClick={() => { setRepairResult(null); setRepairOpen(true); }} className="gap-2"><Wrench size={18} /> {t.repairBtn}</Button>
          </div>
        )}
      />

      {/* إصلاح رصيد الإجازات — يعيد الحساب من مصدر الحقيقة ويعيد توليد المخالصات */}
      <Dialog open={repairOpen} onOpenChange={(v) => { if (!repairBusy) setRepairOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.repairTitle}</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">{t.repairDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={repairReset} onChange={(e) => setRepairReset(e.target.checked)} disabled={repairBusy} className="mt-0.5 w-4 h-4 accent-rose-600" />
              <span>
                {t.repairReset}
                <span className="block text-[11px] text-rose-600 mt-0.5 leading-relaxed">{t.repairResetHint}</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={repairDocs} onChange={(e) => setRepairDocs(e.target.checked)} disabled={repairBusy} className="mt-0.5 w-4 h-4 accent-violet-600" />
              <span>{t.repairDocs}</span>
            </label>
            {repairProg && (
              <div className="text-xs text-muted-foreground bg-slate-50 rounded-lg p-2">
                {t.repairRunning(repairProg.index, repairProg.total, repairProg.name)}
              </div>
            )}
            {repairResult && (
              <div className={cn("text-xs rounded-lg p-2", repairResult.failed ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                {t.repairDone(repairResult.fixed, repairResult.docs, repairResult.kept || 0)}
                {repairResult.failed ? ` — ${t.repairPartial(repairResult.failed)}` : ""}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setRepairOpen(false)} disabled={repairBusy}>{t.close}</Button>
              <Button onClick={runRepair} disabled={repairBusy || !org} className="gap-2">
                {repairBusy ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />} {t.repairRun}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-2xl border border-border">
        <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-border">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} className="pr-10" />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder={t.allBranches} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allBranches}</SelectItem>
              {branchNames.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder={t.allDepts} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allDepts}</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue placeholder={t.allRoles} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allRoles}</SelectItem>
              {ROLE_ORDER.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[isAr ? "ar" : "en"][r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground bg-white rounded-2xl border border-border mt-4">{t.loading}</div>
      ) : (
        <div className="space-y-6 mt-4">
          {/* Active */}
          <section>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{t.activeHead}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{activeList.length}</span>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={activeList.length === 0}
                onClick={() => printEmployeeList({ list: activeList, title: t.activeHead, subtitle: t.subtitle, isAr, org, kind: "active" })}>
                <Printer size={15} /> {t.exportPdf}
              </Button>
            </div>
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              {activeList.length === 0 ? (
                <div className="p-14 text-center">
                  <Users size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-muted-foreground">{t.empty}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-muted-foreground text-xs">
                      <tr>
                        <th className="text-right px-4 py-3 font-medium">{t.thNum}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thName}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thNat}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thPos}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thDept}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thBranch}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thRole}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thStatus}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thSalary}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activeList.map((emp, i) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium">{i + 1}</td>
                          <td className="px-4 py-3 font-medium">
                            <div>{emp.full_name}</div>
                            {emp.hired_by_name && (
                              <div className="text-[10px] text-violet-600 mt-0.5">
                                {isAr ? "أُعدّت بواسطة" : "Prepared by"}: {emp.hired_by_name}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium tabular-nums">{emp.national_id || "—"}</td>
                          <td className="px-4 py-3">{emp.position}</td>
                          <td className="px-4 py-3 text-muted-foreground">{emp.department}</td>
                          <td className="px-4 py-3">
                            {emp.branch_name ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-violet-50 text-violet-700"><GitBranch size={11} /> {emp.branch_name}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3"><RoleBadge level={emp.role_level} lang={lang} /></td>
                          <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                          <td className="px-4 py-3 tabular-nums">{formatCurrency((emp.base_salary || 0) + (emp.housing_allowance || 0) + (emp.transport_allowance || 0) + (emp.other_allowances || 0))}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => { setEditTarget(emp); setFormOpen(true); }} title={isAr ? "تعديل" : "Edit"} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil size={16} /></button>
                              <button onClick={() => { setProfileEmp(emp); setProfileOpen(true); }} title={t.profileTitle} className="p-2 rounded-lg hover:bg-amber-50 text-amber-600"><FileText size={16} /></button>
                              <button onClick={() => { setTripsEmp(emp); setTripsOpen(true); }} title={t.tripsTitle} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Plane size={16} /></button>
                              <button onClick={() => { setTermEmp(emp); setTermOpen(true); }} title={t.terminateTitle} className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"><UserX size={16} /></button>
                              <Link to="/org-structure" title={isAr ? "عرض في الهيكل" : "Org chart"} className="p-2 rounded-lg hover:bg-violet-50 text-violet-600"><Network size={16} /></Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Inactive / archive */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{t.inactiveHead}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{inactiveList.length}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="gap-1.5" disabled={inactiveList.length === 0}
                  onClick={() => printEmployeeList({ list: inactiveList, title: t.inactiveHead, subtitle: t.subtitle, isAr, org, kind: "inactive" })}>
                  <Printer size={15} /> {t.exportPdf}
                </Button>
                {years.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t.yearFilter}:</span>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allYears}</SelectItem>
                        {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              {inactiveList.length === 0 ? (
                <div className="p-14 text-center">
                  <Users size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-muted-foreground">{t.noInactive}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-muted-foreground text-xs">
                      <tr>
                        <th className="text-right px-4 py-3 font-medium">{t.thNum}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thName}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thNat}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thPos}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thDept}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thStatus}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thTermReason}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thTermDate}</th>
                        <th className="text-right px-4 py-3 font-medium">{t.thActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {inactiveList.map((emp, i) => {
                        const meta = emp.termination_reason && emp.termination_reason !== "none" ? reasonMeta(emp.termination_reason) : null;
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium cursor-pointer" onClick={() => { setProfileEmp(emp); setProfileOpen(true); }}>{i + 1}</td>
                            <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                            <td className="px-4 py-3 font-medium tabular-nums">{emp.national_id || "—"}</td>
                            <td className="px-4 py-3">{emp.position}</td>
                            <td className="px-4 py-3 text-muted-foreground">{emp.department}</td>
                            <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                            <td className="px-4 py-3">
                              {meta ? (
                                <div>
                                  <div className="text-xs font-medium">{meta.label}</div>
                                  <div className="text-xs text-muted-foreground">{meta.article} · {meta.note}</div>
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{emp.termination_date || "—"}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button onClick={() => { setProfileEmp(emp); setProfileOpen(true); }} title={t.profileTitle} className="p-2 rounded-lg hover:bg-amber-50 text-amber-600"><FileText size={16} /></button>
                                <button onClick={() => { setTripsEmp(emp); setTripsOpen(true); }} title={t.tripsTitle} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Plane size={16} /></button>
                                <button onClick={() => { setEditTarget(emp); setFormOpen(true); }} title={isAr ? "تعديل" : "Edit"} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <EmployeeForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} employee={editTarget} unifiedNumber={myUnified} />
      <EmployeeImport open={importOpen} onClose={() => setImportOpen(false)} onSaved={load} />
      <BranchManager open={branchOpen} onClose={() => setBranchOpen(false)} onSaved={load} />
      <EmployeeTripsDialog open={tripsOpen} onClose={() => setTripsOpen(false)} employee={tripsEmp} />
      <EmployeeProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} employee={profileEmp} org={org} onOpenTrips={() => { setProfileOpen(false); setTripsOpen(true); }} />
      <TerminateEmployeeDialog open={termOpen} onClose={() => setTermOpen(false)} employee={termEmp} onSaved={load} />
    </div>
    </PullToRefresh>
  );
}

function StatusBadge({ status }) {
  return <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusEmployeeLabel(status).cls)}>{statusEmployeeLabel(status).label}</span>;
}
function RoleBadge({ level, lang }) {
  const s = ROLE_STYLES[level] || ROLE_STYLES.employee;
  return <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1", s.bg, s.text)}><span>{s.icon}</span>{roleLabel(level, lang)}</span>;
}