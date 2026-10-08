import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Shield, FileDown, Save, CheckCircle2, BadgeCheck, Wallet, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/hr";
import { computeGOSI } from "@/lib/eos";
import { useI18n } from "@/lib/i18n";
import { printReport } from "@/lib/reportPrint";
import { enrichEmployeesBatch } from "@/lib/vaultSensitive";

export default function Gosi() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "التأمينات الاجتماعية", subtitle: "احتساب اشتراكات GOSI الشهرية للسعوديين والمقيمين وحفظها وتصديرها",
    backToPayroll: "العودة للرواتب",
    month: "الشهر", year: "السنة",
    months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    ratesInfo: "نسب الاشتراك المطبّقة (من ملف المنشأة):",
    saudiEmp: "الموظف السعودي", saudiEmpr: "صاحب العمل (سعودي)", expatEmpr: "صاحب العمل (مقيم)",
    sTotalEmp: "إجمالي حصة الموظف", sTotalEmpr: "إجمالي حصة صاحب العمل", sGrand: "إجمالي الاشتراكات", sGross: "إجمالي الأجور الخاضعة", sCount: "عدد المشتركين",
    save: "حفظ سجلات الاشتراكات", saving: "جارٍ الحفظ...", saved: "محفوظ", notSaved: "غير محفوظ لهذا الشهر",
    pdf: "تحميل / طباعة PDF", exporting: "جارٍ التجهيز...",
    loading: "جارٍ التحميل...", empty: "لا يوجد موظفون على رأس العمل.",
    savedOn: "آخر حفظ:",
    thN: "#", thEmp: "الموظف", thId: "الهوية/الإقامة", thType: "النوع", thGross: "الأجر الخاضع",
    thEmpRate: "نسبة الموظف", thEmpShare: "حصة الموظف", thEmprRate: "نسبة صاحب العمل", thEmprShare: "حصة صاحب العمل", thTotal: "إجمالي الاشتراك",
    saudi: "سعودي", expat: "مقيم",
  } : {
    title: "Social Insurance (GOSI)", subtitle: "Monthly GOSI subscriptions for Saudis and expats — save, export",
    backToPayroll: "Back to Payroll",
    month: "Month", year: "Year",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    ratesInfo: "Applied contribution rates (from organization profile):",
    saudiEmp: "Saudi employee", saudiEmpr: "Employer (Saudi)", expatEmpr: "Employer (Expat)",
    sTotalEmp: "Total employee share", sTotalEmpr: "Total employer share", sGrand: "Total subscriptions", sGross: "Total subject wages", sCount: "Subscribers",
    save: "Save subscription records", saving: "Saving...", saved: "Saved", notSaved: "Not saved for this month",
    pdf: "Download / Print PDF", exporting: "Preparing...",
    loading: "Loading...", empty: "No active employees.",
    savedOn: "Last saved:",
    thN: "#", thEmp: "Employee", thId: "ID/Iqama", thType: "Type", thGross: "Subject wage",
    thEmpRate: "Employee %", thEmpShare: "Employee share", thEmprRate: "Employer %", thEmprShare: "Employer share", thTotal: "Total",
    saudi: "Saudi", expat: "Expat",
  };

  const [employees, setEmployees] = useState([]);
  const [org, setOrg] = useState(null);
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const emps = await base44.entities.Employee.filter({ status: "active" }, "-created_date", 500);
    const sensMap = await enrichEmployeesBatch(emps);
    setEmployees(emps.map((e) => (e.emp_ref ? { ...e, ...sensMap[e.emp_ref] } : e)));
    const orgs = await listCurrentOrg();
    setOrg(orgs[0]);
    const recs = await base44.entities.GosiRecord.filter({ month, year }, "-created_date", 1000);
    setRecords(recs);
    setLoading(false);
  };
  useEffect(() => { load(); }, [month, year]);

  const rows = employees.map((emp) => {
    const gosi = computeGOSI({ employee: emp, org });
    const empRate = gosi.isSaudi ? (Number(org?.gosi_saudi_employee_rate) || 9.75) : 0;
    const emprRate = gosi.isSaudi ? (Number(org?.gosi_saudi_employer_rate) || 9.75) : (Number(org?.gosi_expat_employer_rate) || 2);
    return {
      employee_id: emp.id,
      employee_name: emp.full_name || "",
      employee_number: emp.employee_number || "",
      national_id: emp.national_id || "",
      emp_ref: emp.emp_ref || "",
      is_saudi: gosi.isSaudi,
      department: emp.department || "",
      gross_wage: Number(gosi.gross.toFixed(2)),
      employee_rate: empRate,
      employer_rate: emprRate,
      gosi_employee: Number(gosi.gosi_employee.toFixed(2)),
      gosi_employer: Number(gosi.gosi_employer.toFixed(2)),
      gosi_total: Number((gosi.gosi_employee + gosi.gosi_employer).toFixed(2)),
    };
  });

  const totalEmp = rows.reduce((s, r) => s + r.gosi_employee, 0);
  const totalEmpr = rows.reduce((s, r) => s + r.gosi_employer, 0);
  const totalGrand = totalEmp + totalEmpr;
  const totalGross = rows.reduce((s, r) => s + r.gross_wage, 0);
  const isSaved = records.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      if (records.length) await base44.entities.GosiRecord.deleteMany({ period_key: `${year}-${month}` });
      // عزل الهوية في الخزنة: يُحفظ emp_ref فقط، وتُترك national_id فارغة في السجل اللقطي
      const payload = rows.map((r) => ({ ...r, national_id: "", emp_ref: r.emp_ref || "", month, year, period_key: `${year}-${month}`, status: "saved" }));
      if (payload.length) await base44.entities.GosiRecord.bulkCreate(payload);
      await load();
    } finally { setSaving(false); }
  };

  const exportPdf = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      await printReport(sheetRef.current, {
        org,
        title: isAr ? `كشف التأمينات الاجتماعية ${t.months[month - 1]} ${year}` : `GOSI sheet ${t.months[month - 1]} ${year}`,
        subtitle: isAr ? `إجمالي الاشتراكات: ${formatCurrency(totalGrand)} — ${rows.length} موظف` : `Total: ${formatCurrency(totalGrand)} — ${rows.length} employees`,
      });
    } finally { setExporting(false); }
  };

  const saudiEmpRate = Number(org?.gosi_saudi_employee_rate) || 9.75;
  const saudiEmprRate = Number(org?.gosi_saudi_employer_rate) || 9.75;
  const expatRate = Number(org?.gosi_expat_employer_rate) || 2;

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={
          <Button asChild variant="outline" className="gap-2">
            <Link to="/payroll"><ArrowRight size={16} style={{ transform: isAr ? "none" : "scaleX(-1)" }} /> {t.backToPayroll}</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Wallet} label={t.sGross} value={formatCurrency(totalGross)} tint="slate" />
        <StatCard icon={Shield} label={t.sTotalEmp} value={formatCurrency(totalEmp)} tint="amber" />
        <StatCard icon={Building2} label={t.sTotalEmpr} value={formatCurrency(totalEmpr)} tint="violet" />
        <StatCard icon={CheckCircle2} label={t.sGrand} value={formatCurrency(totalGrand)} tint="green" />
      </div>

      <div className="bg-white rounded-2xl border border-border p-4 mb-5 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t.month}</label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {t.months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t.year}</label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" />
          </div>
          <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-emerald-50 border border-emerald-200">
            {isSaved ? <CheckCircle2 size={15} className="text-emerald-600" /> : <BadgeCheck size={15} className="text-slate-400" />}
            <span className={cn("text-xs font-medium", isSaved ? "text-emerald-700" : "text-slate-500")}>{isSaved ? t.saved : t.notSaved}</span>
            {isSaved && records[0]?.created_date && <span className="text-[11px] text-muted-foreground">{t.savedOn} {new Date(records[0].created_date).toLocaleDateString(isAr ? "ar-SA" : "en-GB")}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving || rows.length === 0} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Save size={16} /> {saving ? t.saving : t.save}
          </Button>
          <Button onClick={exportPdf} disabled={exporting || rows.length === 0} variant="outline" className="gap-2">
            <FileDown size={16} /> {exporting ? t.exporting : t.pdf}
          </Button>
        </div>
      </div>

      <div className="mb-4 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 leading-relaxed">
        {t.ratesInfo} {t.saudiEmp}: <b>{saudiEmpRate}%</b> — {t.saudiEmpr}: <b>{saudiEmprRate}%</b> — {t.expatEmpr}: <b>{expatRate}%</b>
      </div>

      <div ref={sheetRef} className="relative bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
        ) : rows.length === 0 ? (
          <div className="p-14 text-center">
            <Shield size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-muted-foreground">{t.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-muted-foreground text-xs">
                <tr>
                  <th className="text-right px-3 py-3 font-medium">{t.thN}</th>
                  <th className="text-right px-4 py-3 font-medium sticky right-0 bg-slate-50">{t.thEmp}</th>
                  <th className="text-right px-3 py-3 font-medium">{t.thId}</th>
                  <th className="text-right px-3 py-3 font-medium">{t.thType}</th>
                  <th className="text-right px-3 py-3 font-medium">{t.thGross}</th>
                  <th className="text-right px-3 py-3 font-medium text-amber-600">{t.thEmpRate}</th>
                  <th className="text-right px-3 py-3 font-medium text-amber-600">{t.thEmpShare}</th>
                  <th className="text-right px-3 py-3 font-medium text-violet-600">{t.thEmprRate}</th>
                  <th className="text-right px-3 py-3 font-medium text-violet-600">{t.thEmprShare}</th>
                  <th className="text-right px-3 py-3 font-medium">{t.thTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={r.employee_id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium sticky right-0 bg-white">{r.employee_name}</td>
                    <td className="px-3 py-2 tabular-nums">{r.national_id || "—"}</td>
                    <td className="px-3 py-2"><span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", r.is_saudi ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>{r.is_saudi ? t.saudi : t.expat}</span></td>
                    <td className="px-3 py-2 tabular-nums">{formatCurrency(r.gross_wage)}</td>
                    <td className="px-3 py-2 text-amber-700">{r.is_saudi ? `${r.employee_rate}%` : "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-amber-700">{formatCurrency(r.gosi_employee)}</td>
                    <td className="px-3 py-2 text-violet-700">{r.employer_rate}%</td>
                    <td className="px-3 py-2 tabular-nums text-violet-700">{formatCurrency(r.gosi_employer)}</td>
                    <td className="px-3 py-2 font-bold tabular-nums">{formatCurrency(r.gosi_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-border">
                  <td colSpan={4} className="px-4 py-3 text-right">{t.sCount}: {rows.length}</td>
                  <td className="px-3 py-3 tabular-nums">{formatCurrency(totalGross)}</td>
                  <td colSpan={1} className="px-3 py-3"></td>
                  <td className="px-3 py-3 tabular-nums text-amber-700">{formatCurrency(totalEmp)}</td>
                  <td colSpan={1} className="px-3 py-3"></td>
                  <td className="px-3 py-3 tabular-nums text-violet-700">{formatCurrency(totalEmpr)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatCurrency(totalGrand)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}