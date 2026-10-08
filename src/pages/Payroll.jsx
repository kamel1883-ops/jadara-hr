import React, { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
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
import { Wallet, FileCheck, Clock, TrendingUp, Sparkles, CheckCircle2, Shield, Fingerprint, FileDown, RotateCcw, FileSpreadsheet, Check, X, Send, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, payrollStatusLabel, todayISO } from "@/lib/hr";
import { useI18n } from "@/lib/i18n";
import { printReport } from "@/lib/reportPrint";
import { downloadMudadExcel } from "@/lib/mudadExcel";
import { downloadCashPayrollExcel } from "@/lib/cashPayrollExcel";
import PayrollPrintSheet from "@/components/reports/PayrollPrintSheet";
import { enrichEmployeesBatch } from "@/lib/vaultSensitive";

// === مساعدات احتساب الرواتب — مشتركة مع بوابة الموظف (المُفوّض بصلاحية الرواتب) ===
import {
  PAID_STATUSES, computeWorkDaysSet, computeWorkDaysInMonth,
  computeDailyWage, computeHourlyWage, computeAbsentDeduction, computeNetFromAttendance,
} from "@/lib/payrollCompute";

export default function Payroll() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "الرواتب", subtitle: "معالجة كشوفات الرواتب الشهرية",
    gen: "توليد كشف الشهر", gening: "جارٍ التوليد...",
    sNet: "إجمالي الصافي", sBonus: "إجمالي الحوافز", sGosi: "تأمينات الموظفين", sDed: "إجمالي الخصومات", sPaid: "رواتب مصروفة",
    info: "الراتب يُحسب بحسب الحضور الفعلي: يُخصم الغياب (أيام وساعات) ويُفصَّل عدده وقيمته في الكشف والطباعة. لا توجد سجلات حضور = راتب 0. أيام الإجازة الأسبوعية الرسمية لا تُحسب غياباً. لمدير الموارد البشرية صلاحية تعديل أيام/ساعات الغياب يدوياً.",
    month: "الشهر", year: "السنة",
    months: ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    monthStatus: "حالة كشف الشهر:", empCount: (n) => `(${n} موظف)`, approve: "اعتماد كشف الشهر", pay: "صرف الكشف",
    loading: "جارٍ التحميل...", empty: 'لا توجد كشوفات لهذا الشهر — اضغط "توليد كشف الشهر"',
    pdf: "تحميل / طباعة PDF", printDraft: "طباعة كمسودة", excel: "تحميل Excel", reopen: "إعادة فتح للتعديل وإعادة الاعتماد", exporting: "جارٍ التجهيز...",
    mudadSend: "تحويل الرواتب إلى مدد", mudadEmpty: "لا توجد رواتب معتمدة أو مصروفة لتوليد ملف مدد.",
    totMudad: "إجمالي التحويل عبر مدد", totCash: "إجمالي رواتب الكاش", totAll: "الإجمالي الكلي للرواتب",
    printMudadDraft: "طباعة مسودة رواتب مدد", printCashDraft: "طباعة مسودة رواتب الكاش",
    printMudadFinal: "طباعة رواتب مدد معتمدة", printCashFinal: "طباعة رواتب الكاش المعتمدة",
    cashExport: "صرف الرواتب الكاش (Excel)", cashEmpty: "لا توجد رواتب كاش معتمدة لتوليد الكشف.",
    gosi: "التأمينات الاجتماعية", gosiHint: "احتساب اشتراكات GOSI وحفظها وتصديرها",
    thEmp: "الموظف", thBase: "أساسي", thHouse: "سكن", thTrans: "مواصلات", thBonus: "حوافز", thOvertime: "عمل إضافي", thGosi: "تأمينات (موظف)", thAbsent: "غياب (يوم/قيمة)", thAbsentHours: "غياب (ساعة/قيمة)", thDed: "خصومات أخرى", thLoan: "سلفة", thNet: "الصافي", thIncl: "يشمل الصرف", thStatus: "الحالة", thMethod: "طريقة الصرف", mudadBadge: "مدد", cashBadge: "كاش",
    totalIncludedLabel: "إجمالي الرواتب للمشمولين بالصرف هذا الشهر", excludedHint: (n) => `${n} موظف مستثنى من صرف هذا الشهر`, allIncluded: "كل الموظفين مشمولون بالصرف",
  } : {
    title: "Payroll", subtitle: "Process monthly payroll sheets",
    gen: "Generate month sheet", gening: "Generating...",
    sNet: "Total net", sBonus: "Total bonus", sGosi: "Employee GOSI", sDed: "Total deductions", sPaid: "Paid salaries",
    info: "Salary is based on actual attendance: absence (days & hours) is deducted with its count and value shown in the sheet and print. No attendance records = salary 0. Official weekly days off are never counted as absence. HR may adjust absence days/hours manually.",
    month: "Month", year: "Year",
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    monthStatus: "Month sheet status:", empCount: (n) => `(${n} employees)`, approve: "Approve sheet", pay: "Pay sheet",
    loading: "Loading...", empty: 'No sheets for this month — click "Generate month sheet"',
    pdf: "Download / Print PDF", printDraft: "Print draft", excel: "Download Excel", reopen: "Reopen to edit & re-approve", exporting: "Preparing...",
    mudadSend: "Send salaries to Mudad", mudadEmpty: "No approved or paid salaries to generate a Mudad file.",
    totMudad: "Total via Mudad (WPS)", totCash: "Total cash salaries", totAll: "Grand total payroll",
    printMudadDraft: "Print Mudad draft", printCashDraft: "Print cash draft",
    printMudadFinal: "Print approved Mudad", printCashFinal: "Print approved cash",
    cashExport: "Cash payroll (Excel)", cashEmpty: "No approved cash salaries to generate the sheet.",
    gosi: "Social Insurance (GOSI)", gosiHint: "Calculate, save and export GOSI subscriptions",
    thEmp: "Employee", thBase: "Base", thHouse: "Housing", thTrans: "Transport", thBonus: "Bonus", thOvertime: "Overtime", thGosi: "GOSI (emp)", thAbsent: "Absent (days/value)", thAbsentHours: "Absent (hrs/value)", thDed: "Other deductions", thLoan: "Loan", thNet: "Net", thIncl: "Include pay", thStatus: "Status", thMethod: "Method", mudadBadge: "Mudad", cashBadge: "Cash",
    totalIncludedLabel: "Total payroll for employees included in this month's pay", excludedHint: (n) => `${n} employee(s) excluded from this month's pay`, allIncluded: "All employees are included in pay",
  };

  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [org, setOrg] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [batching, setBatching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sheetRef = React.useRef(null);

  // إغناء بيانات الموظفين بالحقول الحساسة من الخزنة السعودية (وضع احتياطي للنمط القديم)
  const enrichEmps = async (emps) => {
    const map = await enrichEmployeesBatch(emps);
    return emps.map((e) => (e.emp_ref ? { ...e, ...map[e.emp_ref] } : e));
  };
  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Payroll.filter({ month, year }, "-created_date", 500);
    setPayrolls(data);
    const emps = await base44.entities.Employee.filter({ status: "active" }, "-created_date", 500);
    setEmployees(await enrichEmps(emps));
    const orgs = await listCurrentOrg();
    setOrg(orgs[0]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [month, year]);

  const generate = async () => {
    setGenerating(true);
    // جلب الموظفين الفعليين النشطين لحظة التوليد (يستبني من ترك العمل تلقائياً، ويضم المنضمين الجدد)
    const activeEmps = await base44.entities.Employee.filter({ status: "active" }, "-created_date", 500);
    setEmployees(await enrichEmps(activeEmps));
    const existing = new Set(payrolls.map((p) => p.employee_id));
    const mm = String(month).padStart(2, "0");
    const startDate = `${year}-${mm}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${mm}-${String(endDay).padStart(2, "0")}`;
    const attRecords = await base44.entities.Attendance.filter({ date: { $gte: startDate, $lte: endDate } }, "-created_date", 2000);
    // أيام العمل الرسمية المعتمدة بالمنشأة (0=الأحد ... 6=السبت). الأيام خارجها = إجازة أسبوعية لا تُحسب.
    const orgFresh = (org && org.work_days) ? org : ((await listCurrentOrg())[0] || {});
    const workDaysSet = computeWorkDaysSet(orgFresh.work_days);
    const workDaysInMonth = computeWorkDaysInMonth(year, month, workDaysSet);
    const workHoursPerDay = Number(orgFresh.work_hours_per_day) || 0;
    // إحصاء أيام الحضور المدفوعة لكل موظف: present/late/leave/holiday ضمن أيام العمل الرسمية فقط
    const paidDaysByEmp = {};
    // إحصاء ساعات النقص (التغيب الجزئي) لكل موظف: الفرق بين ساعات اليوم المطلوبة وساعات العمل الفعلية في أيام الحضور
    const shortfallByEmp = {};
    for (const a of attRecords) {
      if (!a.employee_id) continue;
      if (!PAID_STATUSES.has(a.status)) continue;
      const dow = a.date ? new Date(a.date + "T00:00:00").getDay() : -1;
      if (dow >= 0 && !workDaysSet.has(dow)) continue;
      paidDaysByEmp[a.employee_id] = (paidDaysByEmp[a.employee_id] || 0) + 1;
      if (workHoursPerDay > 0 && (a.status === "present" || a.status === "late")) {
        const wh = Number(a.work_hours) || 0;
        const gap = Number((workHoursPerDay - wh).toFixed(2));
        if (gap > 0) shortfallByEmp[a.employee_id] = Number(((shortfallByEmp[a.employee_id] || 0) + gap).toFixed(2));
      }
    }
    const created = [];
    const updates = [];
    const existingDrafts = {};
    for (const p of payrolls) if (p.employee_id && p.status === "draft") existingDrafts[p.employee_id] = p;
    for (const emp of activeEmps) {
      const base = Number(emp.base_salary) || 0;
      const housing = Number(emp.housing_allowance) || 0;
      const transport = Number(emp.transport_allowance) || 0;
      const other = Number(emp.other_allowances) || 0;
      const gross = base + housing + transport + other;
      const paidDays = Math.min(paidDaysByEmp[emp.id] || 0, workDaysInMonth);
      const absentDays = Math.max(0, workDaysInMonth - paidDays);
      const absentHours = shortfallByEmp[emp.id] || 0;
      const absentDeduction = computeAbsentDeduction(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay);
      if (existing.has(emp.id)) {
        // مزامنة القيم المالية + إعادة حساب الصافي بحسب أيام الحضور من ملف الموظف الحالي
        const p = existingDrafts[emp.id];
        if (p) updates.push({
          id: p.id,
          base_salary: base, housing_allowance: housing, transport_allowance: transport, other_allowances: other,
          gross_salary: gross, national_id: emp.emp_ref ? "" : (emp.national_id || p.national_id || ""), emp_ref: emp.emp_ref || p.emp_ref || "",
          employee_name: emp.full_name || p.employee_name || "",
          salary_payment_method: emp.salary_payment_method || p.salary_payment_method || "mudad",
          absent_days: absentDays, absent_hours: absentHours, absent_deduction: absentDeduction,
          net_salary: computeNetFromAttendance(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay, p.bonus, p.overtime_amount, p.deductions, p.loan_installment),
        });
        continue;
      }
      created.push({
        employee_id: emp.id, employee_name: emp.full_name || "", national_id: emp.emp_ref ? "" : (emp.national_id || ""), emp_ref: emp.emp_ref || "",
        month, year, salary_payment_method: emp.salary_payment_method || "mudad",
        base_salary: base, housing_allowance: housing, transport_allowance: transport, other_allowances: other,
        gross_salary: gross, bonus: 0, deductions: 0, loan_installment: 0,
        overtime_hours: 0, overtime_amount: 0,
        absent_days: absentDays, absent_hours: absentHours, absent_deduction: absentDeduction,
        net_salary: computeNetFromAttendance(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay, 0, 0, 0, 0), status: "draft",
      });
    }
    if (created.length > 0) await base44.entities.Payroll.bulkCreate(created);
    if (updates.length > 0) await base44.entities.Payroll.bulkUpdate(updates);
    setGenerating(false);
    load();
  };

  // إعادة مزامنة القيم المالية لكل سجلات الكشف من ملفات الموظفين الحالية (مع إعادة احتساب الصافي بحسب الحضور)
  const syncFromEmployees = async () => {
    setGenerating(true);
    try {
      const activeEmps = await base44.entities.Employee.filter({ status: "active" }, "-created_date", 500);
      setEmployees(await enrichEmps(activeEmps));
      const empById = {};
      for (const e of activeEmps) empById[e.id] = e;
      const workDaysInMonth = computeWorkDaysInMonth(year, month, computeWorkDaysSet(org?.work_days));
      const workHoursPerDay = Number(org?.work_hours_per_day) || 0;
      const updates = [];
      for (const p of payrolls) {
        const emp = empById[p.employee_id];
        if (!emp) continue;
        const base = Number(emp.base_salary) || 0;
        const housing = Number(emp.housing_allowance) || 0;
        const transport = Number(emp.transport_allowance) || 0;
        const other = Number(emp.other_allowances) || 0;
        const gross = base + housing + transport + other;
        const absentDays = p.absent_days || 0;
        const absentHours = p.absent_hours || 0;
        const absentDeduction = computeAbsentDeduction(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay);
        updates.push({
          id: p.id,
          base_salary: base, housing_allowance: housing, transport_allowance: transport, other_allowances: other,
          gross_salary: gross, absent_deduction: absentDeduction,
          net_salary: computeNetFromAttendance(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay, p.bonus, p.overtime_amount, p.deductions, p.loan_installment),
          salary_payment_method: emp.salary_payment_method || p.salary_payment_method || "mudad",
          national_id: emp.emp_ref ? "" : (emp.national_id || p.national_id || ""),
          emp_ref: emp.emp_ref || p.emp_ref || "",
          employee_name: emp.full_name || p.employee_name || "",
        });
      }
      if (updates.length) await base44.entities.Payroll.bulkUpdate(updates);
      load();
    } finally { setGenerating(false); }
  };

  const orgWorkDaysInMonth = () => computeWorkDaysInMonth(year, month, computeWorkDaysSet(org?.work_days));
  const orgWorkHoursPerDay = () => Number(org?.work_hours_per_day) || 0;

  const updateField = async (id, field, value) => {
    const rec = payrolls.find((p) => p.id === id);
    const updated = { ...rec, [field]: Number(value) || 0 };
    updated.gross_salary = (updated.base_salary || 0) + (updated.housing_allowance || 0) + (updated.transport_allowance || 0) + (updated.other_allowances || 0);
    const wdh = orgWorkDaysInMonth();
    updated.absent_deduction = computeAbsentDeduction(updated.gross_salary, updated.absent_days, updated.absent_hours, wdh, orgWorkHoursPerDay());
    updated.net_salary = computeNetFromAttendance(updated.gross_salary, updated.absent_days, updated.absent_hours, wdh, orgWorkHoursPerDay(), updated.bonus, updated.overtime_amount, updated.deductions, updated.loan_installment);
    await base44.entities.Payroll.update(id, updated);
    setPayrolls((p) => p.map((x) => (x.id === id ? updated : x)));
  };

  const overrideAbsentDays = async (id, days) => {
    const rec = payrolls.find((p) => p.id === id);
    const abs = Math.max(0, Number(days) || 0);
    const wdh = orgWorkDaysInMonth();
    const gross = Number(rec.gross_salary) || (Number(rec.base_salary) || 0);
    const updated = { ...rec, absent_days: abs };
    updated.absent_deduction = computeAbsentDeduction(gross, abs, rec.absent_hours, wdh, orgWorkHoursPerDay());
    updated.net_salary = computeNetFromAttendance(gross, abs, rec.absent_hours, wdh, orgWorkHoursPerDay(), rec.bonus, rec.overtime_amount, rec.deductions, rec.loan_installment);
    await base44.entities.Payroll.update(id, updated);
    setPayrolls((p) => p.map((x) => (x.id === id ? updated : x)));
  };

  const overrideAbsentHours = async (id, hours) => {
    const rec = payrolls.find((p) => p.id === id);
    const hrs = Math.max(0, Number(hours) || 0);
    const wdh = orgWorkDaysInMonth();
    const gross = Number(rec.gross_salary) || (Number(rec.base_salary) || 0);
    const updated = { ...rec, absent_hours: hrs };
    updated.absent_deduction = computeAbsentDeduction(gross, rec.absent_days, hrs, wdh, orgWorkHoursPerDay());
    updated.net_salary = computeNetFromAttendance(gross, rec.absent_days, hrs, wdh, orgWorkHoursPerDay(), rec.bonus, rec.overtime_amount, rec.deductions, rec.loan_installment);
    await base44.entities.Payroll.update(id, updated);
    setPayrolls((p) => p.map((x) => (x.id === id ? updated : x)));
  };

  const toggleInclude = async (id) => {
    const rec = payrolls.find((p) => p.id === id);
    const next = rec.include_in_payroll === false ? true : false;
    setPayrolls((p) => p.map((x) => (x.id === id ? { ...x, include_in_payroll: next } : x)));
    try { await base44.entities.Payroll.update(id, { include_in_payroll: next }); }
    catch (e) { load(); }
  };

  const approveAll = async () => {
    setBatching(true);
    const updates = payrolls.filter((p) => p.status === "draft" && p.include_in_payroll !== false).map((p) => ({ id: p.id, status: "approved", prepared_by_name: "مسؤول الموارد البشرية", prepared_by_id: "" }));
    if (updates.length) alert(isAr ? `سيتم اعتماد رواتب ${updates.length} موظف مشمول فقط` : `Only ${updates.length} included employees will be approved`);
    if (updates.length) await base44.entities.Payroll.bulkUpdate(updates);
    setBatching(false); load();
  };
  const payAll = async () => {
    setBatching(true);
    const target = payrolls.filter((p) => p.status === "approved" && p.include_in_payroll !== false);
    const updates = target.map((p) => ({ id: p.id, status: "paid", paid_date: todayISO() }));
    if (updates.length) await base44.entities.Payroll.bulkUpdate(updates);
    const updated = payrolls.map((p) => (target.find((tg) => tg.id === p.id) ? { ...p, status: "paid", paid_date: todayISO() } : p));
    setPayrolls(updated);
    setBatching(false);
    load();
  };

  // إعادة فتح الكشف للتعديل وإعادة الاعتماد (من مدفوع ← معتمد)
  const reopen = async () => {
    setBatching(true);
    const updates = payrolls.filter((p) => p.status === "paid").map((p) => ({ id: p.id, status: "approved", paid_date: null }));
    if (updates.length) await base44.entities.Payroll.bulkUpdate(updates);
    setBatching(false); load();
  };

  // توليد كشف PDF لقناة محددة (مدد/كاش) — يبني جدول طباعة نظيف (مستقل عن الجدول التفاعلي)
  // بحيث تبقى الأعمدة الثابتة (أساسي/سكن/مواصلات/الإجمالي) ظاهرة دائماً، ولا تظهر الأعمدة
  // الديناميكية (حوافز/عمل إضافي/خصومات/سلفة/بدلات أخرى/غياب) إلا إن وُجدت قيمة لأحد الموظفين.
  const exportPdf = async (opts = {}) => {
    setExporting(true);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      const method = opts.method;
      const scoped = payrolls.filter((p) => p.include_in_payroll !== false && methodOf(p) === method);
      if (scoped.length === 0) return;
      const scopeTotal = scoped.reduce((s, p) => s + (Number(p.net_salary) || 0), 0);
      const monthName = t.months[month - 1];
      const methodLabel = method === "cash"
        ? (isAr ? "رواتب الكاش" : "Cash payroll")
        : (isAr ? "رواتب مدد" : "Mudad payroll");
      const titlePrefix = opts.draft
        ? (isAr ? `مسودة ${methodLabel}` : `Draft ${methodLabel}`)
        : (isAr ? `${methodLabel} معتمدة` : `Approved ${methodLabel}`);
      flushSync(() => {
        root.render(
          <PayrollPrintSheet
            payrolls={scoped}
            employees={employees}
            workDaysInMonth={orgWorkDaysInMonth()}
            workHoursPerDay={orgWorkHoursPerDay()}
            isAr={isAr}
          />
        );
      });
      const tableNode = container.firstChild;
      if (!tableNode) return;
      await printReport(tableNode, {
        org,
        title: `${titlePrefix} — ${monthName} ${year}`,
        subtitle: isAr
          ? `الإجمالي: ${formatCurrency(scopeTotal)} — ${scoped.length} موظف`
          : `Total: ${formatCurrency(scopeTotal)} — ${scoped.length} employees`,
        stamp: !opts.draft && scoped.some((p) => p.status !== "draft"),
        draft: !!opts.draft,
        landscape: true,
      });
    } finally {
      root.unmount();
      container.remove();
      setExporting(false);
    }
  };

  const includedPayrolls = payrolls.filter((p) => p.include_in_payroll !== false);
  const excludedPayrolls = payrolls.filter((p) => p.include_in_payroll === false);
  const includedCount = includedPayrolls.length;
  const excludedCount = excludedPayrolls.length;
  const totalNet = includedPayrolls.reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalBonus = includedPayrolls.reduce((s, p) => s + (p.bonus || 0), 0);
  const totalDed = includedPayrolls.reduce((s, p) => s + (p.deductions || 0) + (p.absent_deduction || 0), 0);
  const paidCount = includedPayrolls.filter((p) => p.status === "paid").length;
  const totalPaid = includedPayrolls.filter((p) => p.status === "paid").reduce((s, p) => s + (Number(p.net_salary) || 0), 0);
  const anyDraft = includedPayrolls.some((p) => p.status === "draft");
  const anyApproved = includedPayrolls.some((p) => p.status === "approved");
  const monthStatus = includedPayrolls.length && includedPayrolls.every((p) => p.status === "paid") ? "paid" : anyDraft ? "draft" : anyApproved ? "approved" : "draft";

  // تحديد طريقة الصرف لكل سجل: لقطة من سجل الرواتب، وإلا من ملف الموظف، وإلا «مدد» افتراضياً
  const empMap = {};
  for (const e of employees) empMap[e.id] = e;
  // طريقة الصرف: يُعتمد ملف الموظف الحي أولاً (يعكس أي تغيير في الإعداد) ثم لقطة سجل الرواتب
  const methodOf = (p) => empMap[p.employee_id]?.salary_payment_method || p.salary_payment_method || "mudad";
  const mudadPayrolls = includedPayrolls.filter((p) => methodOf(p) === "mudad");
  const cashPayrolls = includedPayrolls.filter((p) => methodOf(p) === "cash");
  const totalMudad = mudadPayrolls.reduce((s, p) => s + (Number(p.net_salary) || 0), 0);
  const totalCash = cashPayrolls.reduce((s, p) => s + (Number(p.net_salary) || 0), 0);
  const anyApprovedMudad = mudadPayrolls.some((p) => p.status === "approved");
  const anyApprovedCash = cashPayrolls.some((p) => p.status === "approved");

  // تحويل المسير إلى مدد: يولّد ملف مسير الرواتب (xlsx) المطابق لنموذج مدد ويفتح بوابة الرفع
  const sendToMudad = async () => {
    if (!anyApprovedMudad) {
      alert(isAr
        ? "اعتمد رواتب مدد أولاً قبل التحويل إلى مدد."
        : "Approve Mudad salaries before sending to Mudad.");
      return;
    }
    setBatching(true);
    try {
      const mudadOnly = payrolls.filter((p) => p.include_in_payroll !== false && methodOf(p) === "mudad");
      const n = await downloadMudadExcel({ payrolls: mudadOnly, employees, org, month, year });
      if (n === 0) { alert(t.mudadEmpty); return; }
      window.open("https://mudad.com.sa/home/payroll/regular/bulk", "_blank", "noopener,noreferrer");
      alert(isAr
        ? `تم توليد ملف مسير الرواتب لمدد (${n} موظف) بصيغة xlsx محمية.\n\nالخطوات:\n1) سجّل الدخول في بوابة «مدد» التي فُتحت في تبويب جديد.\n2) من قائمة «إدارة الرواتب ← الرواتب الشهرية» اضغط «رفع ملف الرواتب» واسحب الملف.\n3) اضغط «رفع» ثم اعتمد المسير — ثم يحوّل البنك المرتبط الرواتب إلى حسابات الموظفين.`
        : `Mudad payroll file generated (${n} employees) as a protected xlsx.\n\nSteps:\n1) Sign in to the Mudad portal opened in the new tab.\n2) From "Payroll Management ► Monthly Salaries" choose "Upload Payroll File" and drop the file.\n3) Click "Upload" then approve the payroll — your linked bank will transfer salaries to employees.`);
    } catch (e) {
      alert(isAr ? "تعذّر توليد ملف مدد." : "Failed to generate the Mudad file.");
    } finally {
      setBatching(false);
    }
  };

  // تصدير كشف رواتب الكاش (xlsx) — يُطبع كمسودة حتى قبل الاعتماد، ويشمل كل رواتب الكاش المشمولة
  const exportCashPayroll = async () => {
    setBatching(true);
    try {
      const cashOnly = payrolls.filter((p) => p.include_in_payroll !== false && methodOf(p) === "cash");
      const n = await downloadCashPayrollExcel({ payrolls: cashOnly, employees, month, year, monthName: t.months[month - 1] });
      if (n === 0) { alert(t.cashEmpty); return; }
      alert(isAr ? `تم توليد كشف رواتب الكاش (${n} موظف).` : `Cash payroll sheet generated (${n} employees).`);
    } catch (e) {
      alert(isAr ? "تعذّر توليد كشف الكاش." : "Failed to generate the cash sheet.");
    } finally {
      setBatching(false);
    }
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/gosi"><Shield size={18} /> {t.gosi}</Link>
            </Button>
            <Button onClick={generate} disabled={generating} className="gap-2">
               <Sparkles size={18} /> {generating ? t.gening : t.gen}
             </Button>
             <Button onClick={syncFromEmployees} disabled={generating} variant="outline" className="gap-2">
               <RotateCcw size={16} /> {isAr ? "تحديث الرواتب من ملفات الموظفين" : "Sync salaries from employee files"}
             </Button>
            </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Wallet} label={t.sNet} value={formatCurrency(totalNet)} tint="green" />
        <StatCard icon={TrendingUp} label={t.sBonus} value={formatCurrency(totalBonus)} tint="violet" />
        <StatCard icon={Clock} label={t.sDed} value={formatCurrency(totalDed)} tint="rose" />
        <StatCard icon={CheckCircle2} label={t.sPaid} value={paidCount} tint="blue" />
      </div>

      <div className="mb-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
        <Fingerprint size={14} /> {t.info}
      </div>

      <div className="bg-white rounded-2xl border border-border p-4 mb-5 flex gap-3 items-end">
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
      </div>

      {payrolls.length > 0 && !loading && (
        <div className="bg-white rounded-2xl border border-border p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t.monthStatus}</span>
            <span className={cn("px-3 py-1 rounded-full font-medium text-xs", payrollStatusLabel(monthStatus).cls)}>{payrollStatusLabel(monthStatus).label}</span>
            <span className="text-xs text-muted-foreground">{t.empCount(payrolls.length)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {anyDraft ? (
              <>
                {mudadPayrolls.length > 0 && (<Button onClick={() => exportPdf({ draft: true, method: "mudad" })} disabled={exporting} variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"><FileDown size={16} /> {exporting ? t.exporting : t.printMudadDraft}</Button>)}
                {cashPayrolls.length > 0 && (<Button onClick={() => exportPdf({ draft: true, method: "cash" })} disabled={exporting} variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"><FileDown size={16} /> {exporting ? t.exporting : t.printCashDraft}</Button>)}
                <Button onClick={approveAll} disabled={batching} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><FileCheck size={16} /> {batching ? t.exporting : t.approve}</Button>
              </>
            ) : (
              <>
                {mudadPayrolls.length > 0 && (<Button onClick={sendToMudad} disabled={batching} className="gap-2 bg-[#0B2545] hover:bg-[#14315a] text-white"><Send size={16} /> {t.mudadSend}</Button>)}
                {cashPayrolls.length > 0 && (<Button onClick={exportCashPayroll} disabled={batching} variant="outline" className="gap-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50"><Banknote size={16} /> {t.cashExport}</Button>)}
                {mudadPayrolls.length > 0 && (<Button onClick={() => exportPdf({ method: "mudad" })} disabled={exporting} variant="outline" className="gap-2"><FileDown size={16} /> {exporting ? t.exporting : t.printMudadFinal}</Button>)}
                {cashPayrolls.length > 0 && (<Button onClick={() => exportPdf({ method: "cash" })} disabled={exporting} variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"><FileDown size={16} /> {exporting ? t.exporting : t.printCashFinal}</Button>)}
              </>
            )}
          </div>
        </div>
      )}

            {payrolls.length > 0 && !loading && (
            <div className="bg-gradient-to-l from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-2xl p-4 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#0B2545]/5 border border-[#0B2545]/15 p-3 text-center">
                <div className="text-xs font-medium text-[#0B2545]/70">{t.totMudad}</div>
                <div className="text-xl font-extrabold text-[#0B2545] tabular-nums mt-1">{formatCurrency(totalMudad)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{isAr ? `${mudadPayrolls.length} موظف` : `${mudadPayrolls.length} employees`}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                <div className="text-xs font-medium text-emerald-700">{t.totCash}</div>
                <div className="text-xl font-extrabold text-emerald-700 tabular-nums mt-1">{formatCurrency(totalCash)}</div>
                <div className="text-[10px] text-emerald-700/70 mt-0.5">{isAr ? `${cashPayrolls.length} موظف` : `${cashPayrolls.length} employees`}</div>
              </div>
              <div className="rounded-xl bg-slate-900/95 text-white p-3 text-center">
                <div className="text-xs font-medium text-white/70">{t.totAll}</div>
                <div className="text-xl font-extrabold tabular-nums mt-1">{formatCurrency(totalMudad + totalCash)}</div>
                <div className="text-[10px] text-white/60 mt-0.5">{isAr ? `${includedCount} موظف` : `${includedCount} employees`}</div>
              </div>
            </div>
            <div className="text-xs text-emerald-700 mt-3 text-center">
              {excludedCount > 0 ? t.excludedHint(excludedCount) : t.allIncluded}
            </div>
            </div>
            )}

            <div ref={sheetRef} className="relative bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
        ) : payrolls.length === 0 ? (
          <div className="p-14 text-center">
            <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-muted-foreground">{t.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-muted-foreground text-[11px]">
                <tr>
                  <th className="text-center px-2 py-1.5 font-medium">{t.thIncl}</th>
                  <th className="text-right px-3 py-1.5 font-medium sticky right-0 bg-slate-50 z-10">{t.thEmp}</th>
                  <th className="text-right px-2 py-1.5 font-medium">{isAr ? "الهوية/الإقامة" : "National ID"}</th>
                  <th className="text-right px-2 py-1.5 font-medium">{t.thBase}</th>
                  <th className="text-right px-2 py-1.5 font-medium">{t.thHouse}</th>
                  <th className="text-right px-2 py-1.5 font-medium">{t.thTrans}</th>
                  <th className="text-right px-2 py-1.5 font-medium font-bold text-slate-700">{isAr ? "الإجمالي" : "Gross"}</th>
                  <th className="text-right px-2 py-1.5 font-medium text-emerald-600">{t.thBonus}</th>
                  <th className="text-right px-2 py-1.5 font-medium text-blue-600">{t.thOvertime}</th>
                  <th className="text-right px-2 py-1.5 font-medium">{t.thAbsent}</th>
                  <th className="text-right px-2 py-1.5 font-medium">{t.thAbsentHours}</th>
                  <th className="text-right px-2 py-1.5 font-medium text-rose-600">{t.thDed}</th>
                  <th className="text-right px-2 py-1.5 font-medium text-violet-600">{t.thLoan}</th>
                  <th className="text-right px-2 py-1.5 font-medium font-bold text-primary sticky left-0 bg-slate-50 z-10">{t.thNet}</th>
                  <th className="text-right px-2 py-1.5 font-medium">{t.thMethod}</th>
                  <th className="text-right px-2 py-1.5 font-medium">{t.thStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payrolls.map((p) => {
                   const included = p.include_in_payroll !== false;
                   return (
                   <tr key={p.id} data-include={included ? "true" : "false"} data-method={methodOf(p)} className={cn("hover:bg-slate-50", !included && "opacity-60")}>
                     <td className="px-2 py-1 text-center">
                       <button
                         onClick={() => toggleInclude(p.id)}
                         title={included ? (isAr ? "مشمول — اضغط لاستثنائه من هذا الشهر" : "Included — click to exclude") : (isAr ? "مستثنى — اضغط لإعادة إشراكه" : "Excluded — click to include")}
                         className={cn("inline-flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all",
                           included ? "border-emerald-400 bg-emerald-50 text-emerald-600" : "border-rose-400 bg-rose-50 text-rose-500")}>
                         {included ? <Check size={14} /> : <X size={14} />}
                       </button>
                     </td>
                     <td className="px-3 py-1 font-medium sticky right-0 bg-white z-10 max-w-[180px] truncate">{employees.find((e) => e.id === p.employee_id)?.full_name || p.employee_name}</td>
                     <td className="px-2 py-1 tabular-nums text-[11px]">{p.national_id || (employees.find((e) => e.id === p.employee_id)?.national_id || "—")}</td>
                     <td className="px-2 py-1 tabular-nums">{formatCurrency(p.base_salary)}</td>
                     <td className="px-2 py-1"><EditableCell value={p.housing_allowance} onCommit={(v) => updateField(p.id, "housing_allowance", v)} /></td>
                     <td className="px-2 py-1"><EditableCell value={p.transport_allowance} onCommit={(v) => updateField(p.id, "transport_allowance", v)} /></td>
                     <td className="px-2 py-1 font-bold tabular-nums text-slate-800">{formatCurrency(p.gross_salary)}</td>
                     <td className="px-2 py-1"><EditableCell value={p.bonus} onCommit={(v) => updateField(p.id, "bonus", v)} /></td>
                     <td className="px-2 py-1"><EditableCell value={p.overtime_amount || 0} onCommit={(v) => updateField(p.id, "overtime_amount", v)} /></td>
                     <td className="px-2 py-1">
                       <div className="flex flex-col gap-0.5">
                         <EditableCell value={p.absent_days || 0} onCommit={(v) => overrideAbsentDays(p.id, v)} />
                         {(() => { const v = computeAbsentDeduction(p.gross_salary, p.absent_days, 0, orgWorkDaysInMonth(), orgWorkHoursPerDay()); return v ? <span className="text-[10px] text-rose-600 tabular-nums">−{formatCurrency(v)}</span> : null; })()}
                       </div>
                     </td>
                     <td className="px-2 py-1">
                       <div className="flex flex-col gap-0.5">
                         <EditableCell value={p.absent_hours || 0} onCommit={(v) => overrideAbsentHours(p.id, v)} />
                         {(() => { const v = computeAbsentDeduction(p.gross_salary, 0, p.absent_hours, orgWorkDaysInMonth(), orgWorkHoursPerDay()); return v ? <span className="text-[10px] text-rose-600 tabular-nums">−{formatCurrency(v)}</span> : null; })()}
                       </div>
                     </td>
                     <td className="px-2 py-1"><EditableCell value={p.deductions} onCommit={(v) => updateField(p.id, "deductions", v)} /></td>
                     <td className="px-2 py-1"><EditableCell value={p.loan_installment || 0} onCommit={(v) => updateField(p.id, "loan_installment", v)} /></td>
                     <td className="px-2 py-1 font-bold tabular-nums text-primary sticky left-0 bg-white z-10">{formatCurrency(p.net_salary)}</td>
                     <td className="px-2 py-1">
                       <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap", methodOf(p) === "mudad" ? "bg-[#0B2545]/10 text-[#0B2545]" : "bg-emerald-100 text-emerald-700")}>{methodOf(p) === "mudad" ? t.mudadBadge : t.cashBadge}</span>
                     </td>
                     <td className="px-2 py-1">
                       <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap", payrollStatusLabel(p.status).cls)}>{payrollStatusLabel(p.status).label}</span>
                     </td>
                   </tr>
                   );
                 })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EditableCell({ value, onCommit }) {
  const [v, setV] = useState(value || 0);
  useEffect(() => { setV(value || 0); }, [value]);
  return (
    <input type="number" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onCommit(v)}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      className="w-16 px-1.5 py-0.5 text-[11px] tabular-nums border border-transparent rounded-md hover:border-border focus:border-border focus:outline-none bg-transparent" />
  );
}