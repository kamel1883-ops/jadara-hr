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
import { Wallet, FileCheck, Clock, TrendingUp, Sparkles, CheckCircle2, Shield, Fingerprint, FileDown, RotateCcw, Check, X, Send, Banknote, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, payrollStatusLabel, todayISO } from "@/lib/hr";
import { useI18n } from "@/lib/i18n";
import { printReport } from "@/lib/reportPrint";
import { downloadMudadExcel } from "@/lib/mudadExcel";
import { downloadCashPayrollExcel } from "@/lib/cashPayrollExcel";
import PayrollPrintSheet from "@/components/reports/PayrollPrintSheet";
import { enrichEmployeesBatch } from "@/lib/vaultSensitive";
import { hoursForEmployee } from "@/lib/branchHours";
import { groupByBatch, openBatchNumber, nextBatchNumber, batchTitle, batchOf } from "@/lib/payrollBatch";
import PayrollBatchesStrip from "@/components/payroll/PayrollBatchesStrip";
import PayslipDialog from "@/components/payroll/PayslipDialog";

// === مساعدات احتساب الرواتب — مشتركة مع بوابة الموظف (المُفوّض بصلاحية الرواتب) ===
import {
  computeWorkDaysSet, computeWorkDaysInMonth, computeAbsentDeduction, computeNetFromAttendance,
} from "@/lib/payrollCompute";
// === بناء كشف الشهر من ملفات الموظفين الحيّة (التوليد اليدوي + الاستكمال التلقائي) ===
import { buildSheet } from "@/lib/payrollSheet";

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
    lockedAll: (n) => `معتمد لجميع الموظفين (${n}) — الكشف مقفل للعرض والطباعة فقط`,
    lockedHint: "لإدخال رواتب شهر جديد انتقل إلى شهر رواتب آخر",
    lockedShort: "مقفل — عرض وطباعة فقط",
    lockedWarn: "رواتب هذا الشهر تم توليدها واعتمادها بالفعل — لا يمكن إعادة التوليد أو التعديل. انتقل إلى شهر رواتب آخر.",
    batchNew: "تسيير دفعة جديدة للمستثنين",
    batchNewHint: (n) => `${n} موظف لم تُعتمد أو تُصرف رواتبهم هذا الشهر — يمكنك تسيير دفعة جديدة لهم بنفس مميزات المسير المعتاد (طباعة، ملف مدد، كشف كاش، إرسال إلى مدد).`,
    batchNewWarn: "رواتب هذا الشهر معتمدة ومكمّلة — استخدم «تسيير دفعة جديدة للمستثنين» لإصدار مسير آخر لمن لم تُصرف رواتبهم فقط.",
    noPending: "جميع رواتب هذا الشهر معتمدة ومصروفة — لا يوجد موظفون مستثنون لتسيير دفعة جديدة.",
    batchNewDone: (n, b) => `تم إنشاء الدفعة ${b} لـ ${n} موظف مستثنى — راجع الكشف ثم اضغط «اعتماد كشف الشهر».`,
    batchesTitle: "مسيرات الشهر (الدفعات)",
    thBatch: "الدفعة",
    slips: "كشوف رواتب الموظفين (بيسليب)",
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
    lockedAll: (n) => `Approved for all employees (${n}) — the sheet is locked for view and print only`,
    lockedHint: "To enter a new payroll month, move to another salary month",
    lockedShort: "Locked — view & print only",
    lockedWarn: "This month's payroll has already been generated and approved — it cannot be regenerated or edited. Move to another salary month.",
    batchNew: "Run a new batch for excluded employees",
    batchNewHint: (n) => `${n} employee(s) have no approved or paid salary this month — run a new batch for them with the full regular features (printing, Mudad file, cash sheet, send to Mudad).`,
    batchNewWarn: "This month's payroll is complete — use “Run a new batch for excluded employees” to issue another run only for those not yet paid.",
    noPending: "All salaries for this month are approved and paid — no excluded employees to run a new batch for.",
    batchNewDone: (n, b) => `Batch ${b} created for ${n} excluded employee(s) — review the sheet then approve it.`,
    batchesTitle: "Month payroll runs (batches)",
    thBatch: "Batch",
    slips: "Employee salary slips",
  };

  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [org, setOrg] = useState(null);
  const [branches, setBranches] = useState([]);
  const [slipOpen, setSlipOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [batching, setBatching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sheetRef = React.useRef(null);
  const syncingRef = React.useRef(false);

  // إغناء بيانات الموظفين بالحقول الحساسة من الخزنة السعودية (وضع احتياطي للنمط القديم)
  const enrichEmps = async (emps) => {
    const map = await enrichEmployeesBatch(emps);
    return emps.map((e) => (e.emp_ref ? { ...e, ...map[e.emp_ref] } : e));
  };
  const load = async () => {
    setLoading(true);
    try {
      const [data, emps, orgs, brs] = await Promise.all([
        base44.entities.Payroll.filter({ month, year }, "-created_date", 500),
        base44.entities.Employee.filter({ status: "active" }, "-created_date", 500),
        listCurrentOrg(),
        base44.entities.Branch.list("-created_date", 500).catch(() => []),
      ]);
      const list = Array.isArray(data) ? data : [];
      const active = Array.isArray(emps) ? emps : [];
      setPayrolls(list);
      setEmployees(active);
      setOrg(orgs?.[0] || null);
      setBranches(Array.isArray(brs) ? brs : []);
      // استكمال تلقائي للكشف: أي موظف على رأس العمل (يدوي/إكسل/توظيف) غير موجود يُضاف،
      // وتُحدَّث صفوف المسودة بأرقام ملفه وطريقة صرفه الحالية — بلا خطوة يدوية.
      // شهر اعتُمد كشفه = مقفل: لا يُضاف إليه موظفون جدد ولا تُعاد كتابة صفوفه المعتمدة
      const lockedMonth = list.length > 0 && !list.some((p) => p.include_in_payroll !== false && p.status === "draft");
      if (list.length > 0 && !syncingRef.current && !lockedMonth) {
        const inSheet = new Set(list.map((p) => p.employee_id));
        const needsSync = active.some((e) => !inSheet.has(e.id)) || list.some((p) => p.status === "draft");
        if (needsSync) {
          syncingRef.current = true;
          try {
            const { created, updates } = await buildSheet({ month, year, org: orgs?.[0] || null, activeEmps: active, payrolls: list, batch: openBatchNumber(list) || nextBatchNumber(list) });
            if (created.length > 0 || updates.length > 0) {
              if (created.length > 0) await base44.entities.Payroll.bulkCreate(created);
              if (updates.length > 0) await base44.entities.Payroll.bulkUpdate(updates);
              const fresh = await base44.entities.Payroll.filter({ month, year }, "-created_date", 500);
              if (Array.isArray(fresh) && fresh.length > 0) setPayrolls(fresh);
            }
          } finally { syncingRef.current = false; }
        }
      }
    } catch {
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [month, year]);

  const generate = async () => {
    // الشهر المكتمل: الدفعة التالية تُنشأ من زر «تسيير دفعة جديدة للمستثنين»
    if (monthClosed) return alert(t.batchNewWarn);
    setGenerating(true);
    // جلب الموظفين الفعليين النشطين لحظة التوليد (يستبني من ترك العمل تلقائياً، ويضم المنضمين الجدد)
    const activeEmps = await base44.entities.Employee.filter({ status: "active" }, "-created_date", 500);
    setEmployees(await enrichEmps(activeEmps));
    // البناء موحّد: نفس منطق الاستكمال التلقائي — كل موظف على رأس العمل يدخل الكشف،
    // وتُحدَّث المسودات بأرقام ملفه وطريقة صرفه الحالية (مدد/كاش).
    const { created, updates } = await buildSheet({ month, year, org, activeEmps, payrolls, batch: openBatch || nextBatchNumber(payrolls) });
    if (created.length > 0) await base44.entities.Payroll.bulkCreate(created);
    if (updates.length > 0) await base44.entities.Payroll.bulkUpdate(updates);
    setGenerating(false);
    load();
  };

  // إعادة مزامنة القيم المالية لكل سجلات الكشف من ملفات الموظفين الحالية (مع إعادة احتساب الصافي بحسب الحضور)
  const syncFromEmployees = async () => {
    // الشهر المكتمل: لا تُعاد كتابة قيمه المالية
    if (monthClosed) return alert(t.batchNewWarn);
    setGenerating(true);
    try {
      const activeEmps = await base44.entities.Employee.filter({ status: "active" }, "-created_date", 500);
      setEmployees(await enrichEmps(activeEmps));
      const empById = {};
      for (const e of activeEmps) empById[e.id] = e;
      const workDaysInMonth = computeWorkDaysInMonth(year, month, computeWorkDaysSet(org?.work_days));
      const updates = [];
      for (const p of payrolls) {
        const emp = empById[p.employee_id];
        if (!emp) continue;
        if (p.status !== "draft") continue; // المعتمد/المصروف لقطة محفوظة لا تُعدّل
        const workHoursPerDay = hoursPerDayOf(p.employee_id);
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
  // ساعات العمل اليومية المعتمدة للموظف: دوام فرعه إن كان الفرع له دوام خاص، وإلا دوام المنشأة
  const hoursPerDayOf = (empId) => {
    const h = hoursForEmployee(org, employees.find((e) => e.id === empId), branches);
    return h.work_hours_per_day > 0 ? h.work_hours_per_day : orgWorkHoursPerDay();
  };

  const updateField = async (id, field, value) => {
    const rec = payrolls.find((p) => p.id === id);
    const updated = { ...rec, [field]: Number(value) || 0 };
    updated.gross_salary = (updated.base_salary || 0) + (updated.housing_allowance || 0) + (updated.transport_allowance || 0) + (updated.other_allowances || 0);
    const wdh = orgWorkDaysInMonth();
    updated.absent_deduction = computeAbsentDeduction(updated.gross_salary, updated.absent_days, updated.absent_hours, wdh, hoursPerDayOf(id));
    updated.net_salary = computeNetFromAttendance(updated.gross_salary, updated.absent_days, updated.absent_hours, wdh, hoursPerDayOf(id), updated.bonus, updated.overtime_amount, updated.deductions, updated.loan_installment);
    await base44.entities.Payroll.update(id, updated);
    setPayrolls((p) => p.map((x) => (x.id === id ? updated : x)));
  };

  const overrideAbsentDays = async (id, days) => {
    const rec = payrolls.find((p) => p.id === id);
    const abs = Math.max(0, Number(days) || 0);
    const wdh = orgWorkDaysInMonth();
    const gross = Number(rec.gross_salary) || (Number(rec.base_salary) || 0);
    const updated = { ...rec, absent_days: abs };
    updated.absent_deduction = computeAbsentDeduction(gross, abs, rec.absent_hours, wdh, hoursPerDayOf(id));
    updated.net_salary = computeNetFromAttendance(gross, abs, rec.absent_hours, wdh, hoursPerDayOf(id), rec.bonus, rec.overtime_amount, rec.deductions, rec.loan_installment);
    await base44.entities.Payroll.update(id, updated);
    setPayrolls((p) => p.map((x) => (x.id === id ? updated : x)));
  };

  const overrideAbsentHours = async (id, hours) => {
    const rec = payrolls.find((p) => p.id === id);
    const hrs = Math.max(0, Number(hours) || 0);
    const wdh = orgWorkDaysInMonth();
    const gross = Number(rec.gross_salary) || (Number(rec.base_salary) || 0);
    const updated = { ...rec, absent_hours: hrs };
    updated.absent_deduction = computeAbsentDeduction(gross, rec.absent_days, hrs, wdh, hoursPerDayOf(id));
    updated.net_salary = computeNetFromAttendance(gross, rec.absent_days, hrs, wdh, hoursPerDayOf(id), rec.bonus, rec.overtime_amount, rec.deductions, rec.loan_installment);
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

  // اعتماد مسير الدفعة المفتوحة فقط — لا يضم موظفي أي دفعة أو مسير سابق
  const approveAll = async () => {
    const scope = openBatch === null ? [] : payrolls.filter((p) => batchOf(p) === openBatch);
    const drafts = scope.filter((p) => p.status === "draft" && p.include_in_payroll !== false);
    if (drafts.length === 0) return;
    setBatching(true);
    // مسير هذه الدفعة سبق اعتماده أو صرفه: تُسيَّر الصفوف المتبقية كمسير (دفعة) جديد مستقل،
    // ولا تُدمج فيه بأي حال — تبقى سجلات المسير السابق كما هي بعدد موظفيها وإجماليها.
    const alreadySettled = scope.some((p) => p.status !== "draft");
    const targetBatch = alreadySettled ? nextBatchNumber(payrolls) : openBatch;
    await base44.entities.Payroll.bulkUpdate(drafts.map((p) => ({
      id: p.id, batch: targetBatch, status: "approved", prepared_by_name: "مسؤول الموارد البشرية", prepared_by_id: "",
    })));
    setBatching(false);
    if (alreadySettled) {
      alert(isAr
        ? `تم اعتماد ${drafts.length} موظف في مسير مستقل — ${batchTitle(targetBatch, true)}.\nلم يُضافوا إلى المسير السابق، وبقي كل مسير بعدد موظفيه وإجماليه كما تم تسييره.`
        : `${drafts.length} employees approved as a separate payroll run.`);
    }
    load();
  };
  // صرف (تحويل) مسير دفعة بعينها — كل دفعة تُصرف وتُقفل على حِدة بملفاتها
  const payBatch = async (batchNo) => {
    const target = payrolls.filter((p) => batchOf(p) === batchNo && p.include_in_payroll !== false && p.status === "approved");
    if (target.length === 0) return;
    setBatching(true);
    await base44.entities.Payroll.bulkUpdate(target.map((p) => ({ id: p.id, status: "paid", paid_date: todayISO() })));
    setBatching(false); load();
  };
  // إعادة فتح مسير هذه الدفعة للتعديل وإعادة الاعتماد (من مصروف ← معتمد)
  const reopenBatch = async (batchNo) => {
    const target = payrolls.filter((p) => batchOf(p) === batchNo && p.status === "paid");
    if (target.length === 0) return;
    setBatching(true);
    await base44.entities.Payroll.bulkUpdate(target.map((p) => ({ id: p.id, status: "approved", paid_date: null })));
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
      const batchNo = Number(opts.batch) || null;
      const scoped = payrolls.filter((p) => p.include_in_payroll !== false && methodOf(p) === method && (!batchNo || batchOf(p) === batchNo));
      if (scoped.length === 0) return;
      const scopeTotal = scoped.reduce((s, p) => s + (Number(p.net_salary) || 0), 0);
      const monthName = t.months[month - 1];
      const methodLabel = method === "cash"
        ? (isAr ? "رواتب الكاش" : "Cash payroll")
        : (isAr ? "رواتب مدد" : "Mudad payroll");
      const titlePrefix = opts.draft
        ? (isAr ? `مسودة ${methodLabel}` : `Draft ${methodLabel}`)
        : (isAr ? `${methodLabel} معتمدة` : `Approved ${methodLabel}`);
      // تمييز الدفعة في العنوان والمستند عند تسيير الشهر على أكثر من دفعة
      const batchSuffix = batchNo && batches.length > 1
        ? (isAr ? ` — ${batchTitle(batchNo, isAr)}` : ` — ${batchTitle(batchNo, isAr)}`)
        : "";
      const hoursById = {};
      for (const row of scoped) hoursById[row.employee_id] = hoursPerDayOf(row.employee_id);
      flushSync(() => {
        root.render(
          <PayrollPrintSheet
            payrolls={scoped}
            employees={employees}
            workDaysInMonth={orgWorkDaysInMonth()}
            workHoursPerDay={orgWorkHoursPerDay()}
            hoursPerDayById={hoursById}
            isAr={isAr}
          />
        );
      });
      const tableNode = container.firstChild;
      if (!tableNode) return;
      await printReport(tableNode, {
        org,
        title: `${titlePrefix}${batchSuffix} — ${monthName} ${year}`,
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
  // طريقة الصرف: للمسودة يُعتمد ملف الموظف الحي أولاً (يعكس أي تغيير في الإعداد)؛
  // أما الصف المعتمد/المصروف فلقطته المحفوظة في الكشف هي المعتمدة (لا تتغير بعد الاعتماد).
  const methodOf = (p) => (p.status !== "draft" && p.salary_payment_method)
    ? p.salary_payment_method
    : (empMap[p.employee_id]?.salary_payment_method || p.salary_payment_method || "mudad");
  const mudadPayrolls = includedPayrolls.filter((p) => methodOf(p) === "mudad");
  const cashPayrolls = includedPayrolls.filter((p) => methodOf(p) === "cash");
  const totalMudad = mudadPayrolls.reduce((s, p) => s + (Number(p.net_salary) || 0), 0);
  const totalCash = cashPayrolls.reduce((s, p) => s + (Number(p.net_salary) || 0), 0);
  const anyApprovedMudad = mudadPayrolls.some((p) => p.status === "approved");
  const anyApprovedCash = cashPayrolls.some((p) => p.status === "approved");
  // === الدفعات: كل دفعة (مسير) مستقلة — المعتمد/المصروف لا يُعدّل ويُعرض للاطلاع والطباعة فقط ===
  const batches = groupByBatch(payrolls, methodOf);
  const openBatch = openBatchNumber(payrolls);
  const closedBatches = batches.filter((b) => b.batch !== openBatch);
  const isRowLocked = (p) => p.status !== "draft";
  const monthClosed = payrolls.length > 0 && openBatch === null;
  const openRows = openBatch === null ? [] : payrolls.filter((p) => batchOf(p) === openBatch && p.include_in_payroll !== false);
  const openMudad = openRows.filter((p) => methodOf(p) === "mudad");
  const openCash = openRows.filter((p) => methodOf(p) === "cash");
  // الموظفون على رأس العمل الذين لم تُعتمد/تُصرف رواتبهم هذا الشهر → مرشحو الدفعة الجديدة
  const unpaidActive = employees.filter((e) => !payrolls.some((p) => p.employee_id === e.id && p.status !== "draft"));

  // تحويل المسير إلى مدد: يولّد ملف مسير الرواتب (xlsx) المطابق لنموذج مدد ويفتح بوابة الرفع
  const sendToMudad = async (batchNo) => {
    if (!anyApprovedMudad) {
      alert(isAr
        ? "اعتمد رواتب مدد أولاً قبل التحويل إلى مدد."
        : "Approve Mudad salaries before sending to Mudad.");
      return;
    }
    setBatching(true);
    try {
      const mudadOnly = payrolls.filter((p) => p.include_in_payroll !== false && methodOf(p) === "mudad" && (!batchNo || batchOf(p) === batchNo));
      const n = await downloadMudadExcel({ payrolls: mudadOnly, employees, org, month, year, batch: batchNo || null });
      if (n === 0) { alert(t.mudadEmpty); return; }
      window.open("https://mudad.com.sa/home/payroll/regular/bulk", "_blank", "noopener,noreferrer");
      alert(isAr
        ? `تم توليد ملف مسير الرواتب لمدد (${n} موظف)${batchNo && batches.length > 1 ? ` — ${batchTitle(batchNo, isAr)}` : ""} بصيغة xlsx محمية.\n\nالخطوات:\n1) سجّل الدخول في بوابة «مدد» التي فُتحت في تبويب جديد.\n2) من قائمة «إدارة الرواتب ← الرواتب الشهرية» اضغط «رفع ملف الرواتب» واسحب الملف.\n3) اضغط «رفع» ثم اعتمد المسير — ثم يحوّل البنك المرتبط الرواتب إلى حسابات الموظفين.`
        : `Mudad payroll file generated (${n} employees) as a protected xlsx.\n\nSteps:\n1) Sign in to the Mudad portal opened in the new tab.\n2) From "Payroll Management ► Monthly Salaries" choose "Upload Payroll File" and drop the file.\n3) Click "Upload" then approve the payroll — your linked bank will transfer salaries to employees.`);
    } catch (e) {
      alert(isAr ? "تعذّر توليد ملف مدد." : "Failed to generate the Mudad file.");
    } finally {
      setBatching(false);
    }
  };

  // تصدير كشف رواتب الكاش (xlsx) — يُطبع كمسودة حتى قبل الاعتماد، ويشمل كل رواتب الكاش المشمولة
  const exportCashPayroll = async (batchNo) => {
    setBatching(true);
    try {
      const cashOnly = payrolls.filter((p) => p.include_in_payroll !== false && methodOf(p) === "cash" && (!batchNo || batchOf(p) === batchNo));
      const n = await downloadCashPayrollExcel({ payrolls: cashOnly, employees, month, year, monthName: t.months[month - 1], batch: batchNo || null });
      if (n === 0) { alert(t.cashEmpty); return; }
      alert(isAr ? `تم توليد كشف رواتب الكاش (${n} موظف)${batchNo && batches.length > 1 ? ` — ${batchTitle(batchNo, isAr)}` : ""}.` : `Cash payroll sheet generated (${n} employees).`);
    } catch (e) {
      alert(isAr ? "تعذّر توليد كشف الكاش." : "Failed to generate the cash sheet.");
    } finally {
      setBatching(false);
    }
  };

  // === تسيير دفعة جديدة لنفس الشهر: للموظفين المستثنين فقط، بنفس مميزات المسير المعتاد ===
  const startNewBatch = async () => {
    if (unpaidActive.length === 0) return alert(t.noPending);
    setBatching(true);
    try {
      const next = nextBatchNumber(payrolls);
      const activeEmps = await base44.entities.Employee.filter({ status: "active" }, "-created_date", 500);
      // الصفوف المستثناة (مسودة) تنتقل إلى الدفعة الجديدة كمشمولة بالصرف لتُصرف في مسير مستقل
      const draftRows = payrolls.filter((p) => p.status === "draft");
      if (draftRows.length > 0) {
        await base44.entities.Payroll.bulkUpdate(draftRows.map((p) => ({ id: p.id, batch: next, include_in_payroll: true })));
      }
      // بناء/تحديث صفوف الدفعة الجديدة من ملفات الموظفين — بما فيهم من لا يوجد له صف في الشهر بعد
      const sheetRows = payrolls.map((p) => (p.status === "draft" ? { ...p, batch: next, include_in_payroll: true } : p));
      const { created, updates } = await buildSheet({ month, year, org, activeEmps, payrolls: sheetRows, batch: next });
      if (created.length > 0) await base44.entities.Payroll.bulkCreate(created);
      if (updates.length > 0) await base44.entities.Payroll.bulkUpdate(updates);
      alert(t.batchNewDone(created.length + draftRows.length, next));
      await load();
    } finally { setBatching(false); }
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setSlipOpen(true)}>
              <FileDown size={16} /> {t.slips}
            </Button>
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
            {monthClosed && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Lock size={12} /> {t.lockedShort}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {openBatch !== null ? (
              <>
                {openMudad.length > 0 && (<Button onClick={() => exportPdf({ draft: true, method: "mudad", batch: openBatch })} disabled={exporting} variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"><FileDown size={16} /> {exporting ? t.exporting : t.printMudadDraft}</Button>)}
                {openCash.length > 0 && (<Button onClick={() => exportPdf({ draft: true, method: "cash", batch: openBatch })} disabled={exporting} variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"><FileDown size={16} /> {exporting ? t.exporting : t.printCashDraft}</Button>)}
                <Button onClick={approveAll} disabled={batching} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><FileCheck size={16} /> {batching ? t.exporting : t.approve}</Button>
              </>
            ) : unpaidActive.length > 0 ? (
              <Button onClick={startNewBatch} disabled={batching} className="gap-2"><Sparkles size={16} /> {t.batchNew}</Button>
            ) : (
              <span className="text-xs text-muted-foreground">{t.noPending}</span>
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

      {closedBatches.length > 0 && !loading && (
        <PayrollBatchesStrip
          batches={closedBatches}
          isAr={isAr}
          months={t.months}
          month={month}
          year={year}
          busy={batching || exporting}
          onPrintMudad={(b) => exportPdf({ method: "mudad", batch: b })}
          onPrintCash={(b) => exportPdf({ method: "cash", batch: b })}
          onSendMudad={(b) => sendToMudad(b)}
          onCashExcel={(b) => exportCashPayroll(b)}
          onPay={(b) => payBatch(b)}
          onReopen={(b) => reopenBatch(b)}
        />
      )}

      {monthClosed && !loading && unpaidActive.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 mb-5 flex flex-wrap items-center gap-3 text-xs font-semibold">
          <Lock size={15} />
          <span>{t.lockedAll(includedCount)}</span>
          <span className="font-normal text-amber-700/80">{t.batchNewHint(unpaidActive.length)}</span>
          <Button onClick={startNewBatch} disabled={batching} size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <Sparkles size={14} /> {t.batchNew}
          </Button>
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
                  <th className="text-right px-2 py-1.5 font-medium">{t.thBatch}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payrolls.map((p) => {
                   const included = p.include_in_payroll !== false;
                   return (
                   <tr key={p.id} data-include={included ? "true" : "false"} data-method={methodOf(p)} className={cn("hover:bg-slate-50", !included && "opacity-60")}>
                     <td className="px-2 py-1 text-center">
                       {isRowLocked(p) ? (
                         <span
                           title={included ? (isAr ? "مشمول بالصرف" : "Included in pay") : (isAr ? "مستثنى من صرف هذا الشهر" : "Excluded from this month")}
                           className={cn("inline-flex items-center justify-center w-6 h-6 rounded-lg border-2",
                             included ? "border-emerald-300 bg-emerald-50 text-emerald-600" : "border-rose-300 bg-rose-50 text-rose-500")}>
                           {included ? <Check size={14} /> : <X size={14} />}
                         </span>
                       ) : (
                         <button
                           onClick={() => toggleInclude(p.id)}
                           title={included ? (isAr ? "مشمول — اضغط لاستثنائه من هذا الشهر" : "Included — click to exclude") : (isAr ? "مستثنى — اضغط لإعادة إشراكه" : "Excluded — click to include")}
                           className={cn("inline-flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all",
                             included ? "border-emerald-400 bg-emerald-50 text-emerald-600" : "border-rose-400 bg-rose-50 text-rose-500")}>
                           {included ? <Check size={14} /> : <X size={14} />}
                         </button>
                       )}
                     </td>
                     <td className="px-3 py-1 font-medium sticky right-0 bg-white z-10 max-w-[180px] truncate">{employees.find((e) => e.id === p.employee_id)?.full_name || p.employee_name}</td>
                     <td className="px-2 py-1 tabular-nums text-[11px]">{p.national_id || (employees.find((e) => e.id === p.employee_id)?.national_id || "—")}</td>
                     <td className="px-2 py-1 tabular-nums">{formatCurrency(p.base_salary)}</td>
                     <td className="px-2 py-1"><EditableCell readOnly={isRowLocked(p)} value={p.housing_allowance} onCommit={(v) => updateField(p.id, "housing_allowance", v)} /></td>
                     <td className="px-2 py-1"><EditableCell readOnly={isRowLocked(p)} value={p.transport_allowance} onCommit={(v) => updateField(p.id, "transport_allowance", v)} /></td>
                     <td className="px-2 py-1 font-bold tabular-nums text-slate-800">{formatCurrency(p.gross_salary)}</td>
                     <td className="px-2 py-1"><EditableCell readOnly={isRowLocked(p)} value={p.bonus} onCommit={(v) => updateField(p.id, "bonus", v)} /></td>
                     <td className="px-2 py-1"><EditableCell readOnly={isRowLocked(p)} value={p.overtime_amount || 0} onCommit={(v) => updateField(p.id, "overtime_amount", v)} /></td>
                     <td className="px-2 py-1">
                       <div className="flex flex-col gap-0.5">
                         <EditableCell readOnly={isRowLocked(p)} value={p.absent_days || 0} onCommit={(v) => overrideAbsentDays(p.id, v)} />
                         {(() => { const v = computeAbsentDeduction(p.gross_salary, p.absent_days, 0, orgWorkDaysInMonth(), hoursPerDayOf(p.employee_id)); return v ? <span className="text-[10px] text-rose-600 tabular-nums">−{formatCurrency(v)}</span> : null; })()}
                       </div>
                     </td>
                     <td className="px-2 py-1">
                       <div className="flex flex-col gap-0.5">
                         <EditableCell readOnly={isRowLocked(p)} value={p.absent_hours || 0} onCommit={(v) => overrideAbsentHours(p.id, v)} />
                         {(() => { const v = computeAbsentDeduction(p.gross_salary, 0, p.absent_hours, orgWorkDaysInMonth(), hoursPerDayOf(p.employee_id)); return v ? <span className="text-[10px] text-rose-600 tabular-nums">−{formatCurrency(v)}</span> : null; })()}
                       </div>
                     </td>
                     <td className="px-2 py-1"><EditableCell readOnly={isRowLocked(p)} value={p.deductions} onCommit={(v) => updateField(p.id, "deductions", v)} /></td>
                     <td className="px-2 py-1"><EditableCell readOnly={isRowLocked(p)} value={p.loan_installment || 0} onCommit={(v) => updateField(p.id, "loan_installment", v)} /></td>
                     <td className="px-2 py-1 font-bold tabular-nums text-primary sticky left-0 bg-white z-10">{formatCurrency(p.net_salary)}</td>
                     <td className="px-2 py-1">
                       <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap", methodOf(p) === "mudad" ? "bg-[#0B2545]/10 text-[#0B2545]" : "bg-emerald-100 text-emerald-700")}>{methodOf(p) === "mudad" ? t.mudadBadge : t.cashBadge}</span>
                     </td>
                     <td className="px-2 py-1">
                       <span className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap bg-slate-100 text-slate-700">{batchTitle(batchOf(p), isAr)}</span>
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

      <PayslipDialog open={slipOpen} onClose={() => setSlipOpen(false)} org={org} month={month} year={year} />
    </div>
  );
}

function EditableCell({ value, onCommit, readOnly }) {
  const [v, setV] = useState(value || 0);
  useEffect(() => { setV(value || 0); }, [value]);
  // خانة مقفلة (كشف شهر معتمد): تُعرض القيمة نصاً ثابتاً بلا أي إمكانية تعديل
  if (readOnly) return <span className="inline-block px-1.5 py-0.5 text-[11px] tabular-nums font-medium text-slate-700">{Number(value || 0).toLocaleString("en-US")}</span>;
  return (
    <input type="number" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onCommit(v)}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      className="w-16 px-1.5 py-0.5 text-[11px] tabular-nums border border-transparent rounded-md hover:border-border focus:border-border focus:outline-none bg-transparent" />
  );
}