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
import { Shield, FileDown, Save, CheckCircle2, Wallet, Building2, ArrowRight } from "lucide-react";
import DocApprovalMark from "@/components/docs/DocApprovalMark";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/hr";
import { computeGOSI, gosiRateTable, isGosiSubscriber } from "@/lib/eos";
import { useI18n } from "@/lib/i18n";
import { printReport } from "@/lib/reportPrint";

export default function Gosi() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "التأمينات الاجتماعية", subtitle: "احتساب اشتراكات GOSI الشهرية للسعوديين والمقيمين وحفظها وتصديرها",
    backToPayroll: "العودة للرواتب",
    month: "الشهر", year: "السنة",
    months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    ratesInfo: "نسب الاشتراك المطبّقة (من ملف المنشأة):",
    catLegacy: "سعودي مباشرته قبل 3 يوليو 2024", catNew: "سعودي مباشرته من 3 يوليو 2024 (النسب السارية من يوليو 2026)", catExpat: "مقيم — مخاطر مهنية",
    catLegacyShort: "مباشرته قبل 3 يوليو 2024", catNewShort: "مباشرته من 3 يوليو 2024", catExpatShort: "مقيم — مخاطر مهنية",
    rEmp: "الموظف", rEmpr: "صاحب العمل",
    sTotalEmp: "إجمالي حصة الموظف", sTotalEmpr: "إجمالي حصة صاحب العمل", sGrand: "إجمالي الاشتراكات", sGross: "إجمالي الأجور الخاضعة", sCount: "عدد المشتركين",
    save: "حفظ سجلات الاشتراكات", saving: "جارٍ الحفظ...", saved: "محفوظ", notSaved: "غير محفوظ لهذا الشهر",
    pdf: "تحميل / طباعة PDF", exporting: "جارٍ التجهيز...",
    loading: "جارٍ التحميل...", empty: "لا يوجد مشتركون. التأمينات تتوقف فقط بعد فسخ العقد وإنهاء الخدمة.",
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
    catLegacy: "Saudi — commenced before 3 Jul 2024", catNew: "Saudi — commenced from 3 Jul 2024 (rates effective July 2026)", catExpat: "Expat — occupational hazards",
    catLegacyShort: "commenced before 3 Jul 2024", catNewShort: "commenced from 3 Jul 2024", catExpatShort: "expat — occupational hazards",
    rEmp: "employee", rEmpr: "employer",
    sTotalEmp: "Total employee share", sTotalEmpr: "Total employer share", sGrand: "Total subscriptions", sGross: "Total subject wages", sCount: "Subscribers",
    save: "Save subscription records", saving: "Saving...", saved: "Saved", notSaved: "Not saved for this month",
    pdf: "Download / Print PDF", exporting: "Preparing...",
    loading: "Loading...", empty: "No subscribers. Contributions stop only after the contract ends.",
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
    try {
      const [emps, orgs, recs] = await Promise.all([
        base44.entities.Employee.list("-created_date", 1000),
        listCurrentOrg(),
        base44.entities.GosiRecord.filter({ month, year }, "-created_date", 1000),
      ]);
      // كل أنواع الإجازة تبقى داخل الكشف. الإيقاف فقط عند فسخ العقد وإنهاء الخدمة.
      const employed = (Array.isArray(emps) ? emps : []).filter((e) => isGosiSubscriber(e));
      setEmployees(employed);
      setOrg(orgs?.[0] || null);
      setRecords(Array.isArray(recs) ? recs : []);
    } catch {
      setEmployees([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [month, year]);

  const rows = employees.map((emp) => {
    const gosi = computeGOSI({ employee: emp, org });
    return {
      employee_id: emp.id,
      employee_name: emp.full_name || "",
      employee_number: emp.employee_number || "",
      national_id: emp.national_id || "",
      emp_ref: emp.emp_ref || "",
      is_saudi: gosi.isSaudi,
      category: gosi.category,
      department: emp.department || "",
      gross_wage: Number(gosi.gross.toFixed(2)),
      employee_rate: gosi.employee_rate,
      employer_rate: gosi.employer_rate,
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
  const savedDate = records[0]?.created_date ? new Date(records[0].created_date).toLocaleDateString(isAr ? "ar-SA" : "en-GB") : "";

  const save = async () => {
    setSaving(true);
    try {
      if (records.length) await base44.entities.GosiRecord.deleteMany({ period_key: `${year}-${month}` });
      // عزل الهوية في الخزنة: يُحفظ emp_ref فقط، وتُترك national_id فارغة في السجل اللقطي
      // فئة الاشتراك للعرض فقط؛ الحقلان employee_rate/employer_rate يوثّقان النسبة المطبقة على كل موظف.
      const me = await base44.auth.me().catch(() => null);
      const payload = rows.map(({ category, ...r }) => ({
        ...r, national_id: "", emp_ref: r.emp_ref || "", month, year, period_key: `${year}-${month}`, status: "saved",
        prepared_by_name: me?.full_name || me?.name || "", prepared_by_id: me?.id || me?.email || "",
      }));
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
        // قبل الحفظ: مسودة لا تُؤرشف. بعد حفظ السجلات: معتمد ويُؤرشف على الخزنة.
        draft: !isSaved,
      });
    } finally { setExporting(false); }
  };

  const rates = gosiRateTable(org);

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
          <DocApprovalMark variant="chip" approved={isSaved} isAr={isAr} date={savedDate} by={records[0]?.prepared_by_name} />
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
        {t.ratesInfo}
        <div className="mt-1.5 grid grid-cols-1 md:grid-cols-3 gap-1.5">
          <div className="px-2 py-1 rounded-lg bg-white/70 border border-amber-200">
            {t.catLegacy}: <b>{rates.legacy.employee}%</b> {t.rEmp} + <b>{rates.legacy.employer}%</b> {t.rEmpr} = <b>{(rates.legacy.employee + rates.legacy.employer).toFixed(2)}%</b>
          </div>
          <div className="px-2 py-1 rounded-lg bg-white/70 border border-amber-200">
            {t.catNew}: <b>{rates.fresh.employee}%</b> {t.rEmp} + <b>{rates.fresh.employer}%</b> {t.rEmpr} = <b>{(rates.fresh.employee + rates.fresh.employer).toFixed(2)}%</b>
          </div>
          <div className="px-2 py-1 rounded-lg bg-white/70 border border-amber-200">
            {t.catExpat}: <b>{rates.expat.employer}%</b> {t.rEmpr} — {t.rEmp}: <b>0%</b>
          </div>
        </div>
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
          <div>
            {/* ترويسة الكشف + ختم الحالة: مسودة قبل حفظ السجلات، معتمد بعد الحفظ */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-slate-50/60">
              <div className="text-sm font-semibold">{t.title} — {t.months[month - 1]} {year}</div>
              <DocApprovalMark approved={isSaved} isAr={isAr} date={savedDate} by={records[0]?.prepared_by_name} />
            </div>
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
                    <td className="px-3 py-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", r.is_saudi ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>{r.is_saudi ? t.saudi : t.expat}</span>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                        {r.category === "saudi_new" ? t.catNewShort : r.category === "saudi_legacy" ? t.catLegacyShort : t.catExpatShort}
                      </div>
                    </td>
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
          </div>
        )}
      </div>
    </div>
  );
}