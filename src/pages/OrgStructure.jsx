import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Network, Users, Crown, Briefcase, ClipboardList, RefreshCw, FileText, FileType2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { buildOrgTree, orgStats, ROLE_LABELS, ROLE_ORDER, ROLE_STYLES, roleLabel } from "@/lib/orgTree";
import OrgChart from "@/components/OrgChart";
import { printOrgChartPDF, downloadOrgWord } from "@/lib/orgExport";

export default function OrgStructure() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "الهيكل التنظيمي", subtitle: "يُبنى الهيكل تلقائياً من بيانات الموظفين: المالك ← المدير التنفيذي ← مدراء الإدارات ← المشرفون ← الموظفون والعمال.",
    loading: "جارٍ تحميل الهيكل...", empty: "لا يوجد موظفون بعد. أضف موظفين من صفحة الموظفين مع تحديد المستوى الوظيفي والمدير المباشر، وسيظهر الهيكل هنا تلقائياً.",
    sTotal: "إجمالي القوى العاملة", sDepts: "عدد الإدارات", sManagers: "المدراء", sSupervisors: "المشرفون",
    viewChart: "مخطط هرمي", viewTree: "شجرة قائمة", viewDepts: "حسب الإدارة",
    reportsTo: "يرفع تقاريره إلى", deptMgr: "مدير الإدارة", noMgr: "غير محدد",
    members: "أعضاء", orphans: "بدون مدير مباشر",
    refresh: "تحديث", legend: "مفتاح المستويات",
    exportPdf: "طباعة PDF", exportWord: "تصدير Word",
    roleCount: (label, n) => `${label}: ${n}`,
  } : {
    title: "Organizational structure", subtitle: "Auto-built from employee data: Owner → Executive → Department managers → Supervisors → Staff & workers.",
    loading: "Loading org tree...", empty: "No employees yet. Add employees from the Employees page with a role level and a direct manager, and the tree will appear here automatically.",
    sTotal: "Total workforce", sDepts: "Departments", sManagers: "Managers", sSupervisors: "Supervisors",
    viewChart: "Org chart", viewTree: "Tree list", viewDepts: "By department",
    reportsTo: "Reports to", deptMgr: "Department manager", noMgr: "Not set",
    members: "members", orphans: "No direct manager",
    refresh: "Refresh", legend: "Role legend",
    exportPdf: "Print PDF", exportWord: "Export Word",
    roleCount: (label, n) => `${label}: ${n}`,
  };

  const [employees, setEmployees] = useState([]);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("chart");

  const load = async () => {
    setLoading(true);
    const [list, orgs] = await Promise.all([
      base44.entities.Employee.list("-created_date", 1000),
      listCurrentOrg().catch(() => []),
    ]);
    setEmployees(list);
    setOrg((orgs && orgs[0]) || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const exportOpts = { employees, lang, orgName: org?.name || "", logoUrl: org?.logo_url || "", unifiedNumber: org?.unified_number || "" };

  const tree = buildOrgTree(employees);
  const stats = orgStats(employees);
  const employeeName = (e) => e.full_name || e.position || e.employee_number || "—";
  const employeeSub = (e) => {
    const parts = [];
    if (e.department) parts.push(e.department);
    if (e.employee_number) parts.push(`#${e.employee_number}`);
    return parts.join(" • ");
  };
  const managerOf = (e) => employees.find((m) => m.id === e.manager_id);

  const renderNode = (node, depth = 0) => {
    const style = ROLE_STYLES[node.role_level] || ROLE_STYLES.employee;
    const kids = node._children || [];
    return (
      <div key={node.id}>
        <div className="flex items-stretch gap-0">
          <div className="flex items-center" style={{ width: depth > 0 ? depth * 28 : 0 }} aria-hidden="true">
            {depth > 0 && <div className="h-full w-px bg-border mr-3" />}
          </div>
          <div className="flex-1 flex items-center justify-between gap-3 bg-white border border-border rounded-xl px-4 py-3 my-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center shrink-0 text-lg`}>{style.icon}</div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate flex items-center gap-2">
                  {employeeName(node)}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>{roleLabel(node.role_level, lang)}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{employeeSub(node)}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
              {node.manager_id ? `${t.reportsTo}: ${employeeName(managerOf(node) || {})}` : ""}
            </div>
          </div>
        </div>
        {kids.length > 0 && <div>{kids.map((k) => renderNode(k, depth + 1))}</div>}
      </div>
    );
  };

  const orphanNodes = employees.filter((e) => !e.manager_id && e.role_level !== "owner" && e.role_level !== "executive");

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => printOrgChartPDF(exportOpts)} disabled={loading || employees.length === 0} className="gap-2"><FileText size={16} /> {t.exportPdf}</Button>
            <Button variant="outline" onClick={() => downloadOrgWord(exportOpts)} disabled={loading || employees.length === 0} className="gap-2"><FileType2 size={16} /> {t.exportWord}</Button>
            <Button variant="outline" onClick={load} className="gap-2"><RefreshCw size={16} /> {t.refresh}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Stat label={t.sTotal} value={stats.total} icon={Users} tint="slate" />
        <Stat label={t.sDepts} value={stats.departments.length} icon={Network} tint="violet" />
        <Stat label={t.sManagers} value={stats.byLevel.manager + stats.byLevel.executive + stats.byLevel.owner} icon={Crown} tint="amber" />
        <Stat label={t.sSupervisors} value={stats.byLevel.supervisor} icon={ClipboardList} tint="emerald" />
      </div>

      {/* مفتاح المستويات */}
      <div className="bg-white border border-border rounded-2xl p-3 mb-5 flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">{t.legend}:</span>
        {ROLE_ORDER.map((r) => {
          const s = ROLE_STYLES[r];
          return (
            <span key={r} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>
              {s.icon} {ROLE_LABELS[lang]?.[r] || r} ({stats.byLevel[r] || 0})
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Select value={view} onValueChange={setView}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="chart">{t.viewChart}</SelectItem>
            <SelectItem value="tree">{t.viewTree}</SelectItem>
            <SelectItem value="depts">{t.viewDepts}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">{t.empty}</div>
      ) : view === "chart" ? (
        <div className="relative overflow-hidden rounded-3xl p-6 border border-white/70 shadow-[0_18px_60px_-24px_rgba(11,23,59,0.38)]">
          {/* خلفية متدرجة ملوّنة + بقع ضبابية لإظهار تأثير الزجاج */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-amber-50/50 to-slate-100" />
          <div className="absolute -top-10 right-1/4 w-64 h-64 rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="absolute -bottom-12 left-1/4 w-72 h-72 rounded-full bg-amber-300/35 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-80 h-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-300/25 blur-3xl" />
          <div className="relative">
            <OrgChart roots={tree} lang={lang} dir={isAr ? "rtl" : "ltr"} />
            {orphanNodes.length > 0 && (
              <div className="mt-8 pt-4 border-t border-white/60">
                <div className="text-sm font-medium text-slate-700/80 mb-2">{t.orphans} ({orphanNodes.length})</div>
                <div className="flex flex-wrap gap-2">
                  {orphanNodes.map((e) => (
                    <span key={e.id} className="text-xs px-3 py-1.5 rounded-xl bg-white/40 backdrop-blur-md border border-white/80 shadow-sm text-slate-700">{employeeName(e)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : view === "tree" ? (
        <div>
          {/* عرض القمة: المالك والتنفيذيون */}
          {tree.map((n) => renderNode(n))}
          {orphanNodes.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-medium text-muted-foreground mb-2">{t.orphans} ({orphanNodes.length})</div>
              <div className="flex flex-wrap gap-2">
                {orphanNodes.map((e) => (
                  <span key={e.id} className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-border">{employeeName(e)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {stats.deptManagers.map((d) => (
            <div key={d.department} className="bg-white border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center"><Briefcase size={18} className="text-blue-600" /></div>
                  <div>
                    <div className="font-semibold text-sm">{d.department}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.manager ? `${t.deptMgr}: ${employeeName(d.manager)}` : t.noMgr} • {d.count} {t.members}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {employees.filter((e) => e.department === d.department).sort((a, b) => {
                  const order = ROLE_ORDER;
                  return order.indexOf(a.role_level) - order.indexOf(b.role_level);
                }).map((e) => {
                  const s = ROLE_STYLES[e.role_level] || ROLE_STYLES.employee;
                  return (
                    <div key={e.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <span className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center text-sm shrink-0`}>{s.icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{employeeName(e)}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{roleLabel(e.role_level, lang)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, tint = "violet" }) {
  const tints = {
    slate: "bg-slate-100 text-slate-600",
    violet: "bg-violet-100 text-violet-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tints[tint]}`}><Icon size={20} /></div>
      <div><div className="text-xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
    </div>
  );
}