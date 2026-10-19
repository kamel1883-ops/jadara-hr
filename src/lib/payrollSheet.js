/**
 * payrollSheet — بناء كشف رواتب الشهر من ملفات الموظفين الحيّة.
 *
 * القاعدة: كل موظف على رأس العمل يجب أن يظهر في كشف الشهر — سواء أُضيف يدوياً،
 * أو بالاستيراد من الإكسل، أو تعيينه من إدارة التوظيف. هذا المساعد يبني الصفوف
 * الناقصة (مسودة) ويحدّث صفوف المسودة بأرقام ملف الموظف وطريقة صرفه الحالية،
 * فتبقى الرواتب وملف مدد وكشف الكاش والتأمينات متطابقة مع قائمة الموظفين النشطين.
 *
 * ساعات العمل المعتمدة لكل موظف تُقرأ من دوام فرعه إن كان الفرع بساعات خاصة،
 * وإلا من إعدادات المنشأة العامة.
 */
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import { hoursForEmployee } from "@/lib/branchHours";
import {
  PAID_STATUSES, computeWorkDaysSet, computeWorkDaysInMonth, computeAbsentDeduction, computeNetFromAttendance,
} from "@/lib/payrollCompute";

/**
 * يبني (أو يستكمل) كشف شهر معيّن.
 * يعيد { created, updates, missing } — الصفوف الجديدة، وتحديثات صفوف المسودة، والموظفون الناقصون.
 * الصفوف المعتمدة/المصروفة لقطة تاريخية لا تُعاد كتابتها.
 * batch: رقم الدفعة التي تُنشأ لها الصفوف الجديدة (1 افتراضياً).
 */
export async function buildSheet({ month, year, org, activeEmps, payrolls, batch = 1 }) {
  const mm = String(month).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${mm}-${String(endDay).padStart(2, "0")}`;
  const [attRecords, branches] = await Promise.all([
    base44.entities.Attendance.filter({ date: { $gte: startDate, $lte: endDate } }, "-created_date", 2000),
    base44.entities.Branch.list("-created_date", 500).catch(() => []),
  ]);

  // أيام العمل الرسمية المعتمدة بالمنشأة (0=الأحد ... 6=السبت). الأيام خارجها = إجازة أسبوعية لا تُحسب.
  const orgFresh = org && org.work_days ? org : ((await listCurrentOrg())[0] || org || {});
  const workDaysSet = computeWorkDaysSet(orgFresh.work_days);
  const workDaysInMonth = computeWorkDaysInMonth(year, month, workDaysSet);
  const orgWorkHoursPerDay = Number(orgFresh.work_hours_per_day) || 0;

  // ساعات العمل اليومية المعتمدة لكل موظف: دوام فرعه إن كان له دوام خاص، وإلا دوام المنشأة.
  const hoursOf = (emp) => {
    const h = hoursForEmployee(orgFresh, emp, branches || []);
    return h.work_hours_per_day > 0 ? h.work_hours_per_day : orgWorkHoursPerDay;
  };

  // أيام الحضور المدفوعة لكل موظف: present/late/leave/holiday ضمن أيام العمل الرسمية فقط
  const paidDaysByEmp = {};
  // ساعات الحضور الفعلية لكل يوم (لحساب نقص الساعات بحسب دوام الموظف المعتمد)
  const workedHoursByEmp = {};
  for (const a of attRecords) {
    if (!a.employee_id) continue;
    if (!PAID_STATUSES.has(a.status)) continue;
    const dow = a.date ? new Date(a.date + "T00:00:00").getDay() : -1;
    if (dow >= 0 && !workDaysSet.has(dow)) continue;
    paidDaysByEmp[a.employee_id] = (paidDaysByEmp[a.employee_id] || 0) + 1;
    if (a.status === "present" || a.status === "late") {
      if (!workedHoursByEmp[a.employee_id]) workedHoursByEmp[a.employee_id] = [];
      workedHoursByEmp[a.employee_id].push(Number(a.work_hours) || 0);
    }
  }
  // نقص الساعات (التغيب الجزئي): مجموع الفرق الموجب بين ساعات دوام الموظف وساعات يومه الفعلي
  const shortfallFor = (emp) => {
    const hpd = hoursOf(emp);
    if (hpd <= 0) return 0;
    let total = 0;
    for (const wh of (workedHoursByEmp[emp.id] || [])) {
      const gap = Number((hpd - wh).toFixed(2));
      if (gap > 0) total += gap;
    }
    return Number(total.toFixed(2));
  };

  const draftsByEmp = {};
  const inSheet = new Set();
  for (const p of payrolls) {
    if (!p.employee_id) continue;
    inSheet.add(p.employee_id);
    if (p.status === "draft") draftsByEmp[p.employee_id] = p;
  }

  const created = [];
  const updates = [];
  const missing = [];
  for (const emp of (activeEmps || [])) {
    const base = Number(emp.base_salary) || 0;
    const housing = Number(emp.housing_allowance) || 0;
    const transport = Number(emp.transport_allowance) || 0;
    const other = Number(emp.other_allowances) || 0;
    const gross = base + housing + transport + other;
    const workHoursPerDay = hoursOf(emp);
    const paidDays = Math.min(paidDaysByEmp[emp.id] || 0, workDaysInMonth);
    const absentDays = Math.max(0, workDaysInMonth - paidDays);
    const absentHours = shortfallFor(emp);
    const absentDeduction = computeAbsentDeduction(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay);
    const method = emp.salary_payment_method || "mudad";

    // موظف على رأس العمل وغير موجود في الكشف → صف مسودة جديد
    if (!inSheet.has(emp.id)) {
      missing.push({ employee_id: emp.id, employee_name: emp.full_name || "", method });
      created.push({
        employee_id: emp.id, employee_name: emp.full_name || "",
        national_id: emp.emp_ref ? "" : (emp.national_id || ""), emp_ref: emp.emp_ref || "",
        month, year, batch, salary_payment_method: method,
        base_salary: base, housing_allowance: housing, transport_allowance: transport, other_allowances: other,
        gross_salary: gross, bonus: 0, deductions: 0, loan_installment: 0,
        overtime_hours: 0, overtime_amount: 0,
        absent_days: absentDays, absent_hours: absentHours, absent_deduction: absentDeduction,
        net_salary: computeNetFromAttendance(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay, 0, 0, 0, 0),
        status: "draft",
      });
      continue;
    }

    const p = draftsByEmp[emp.id];
    if (!p) continue; // معتمد/مصروف — لقطة لا تُعاد كتابتها
    const next = {
      employee_name: emp.full_name || p.employee_name || "",
      emp_ref: emp.emp_ref || p.emp_ref || "",
      national_id: emp.emp_ref ? "" : (emp.national_id || p.national_id || ""),
      salary_payment_method: emp.salary_payment_method || p.salary_payment_method || "mudad",
      base_salary: base, housing_allowance: housing, transport_allowance: transport, other_allowances: other,
      gross_salary: gross, absent_days: absentDays, absent_hours: absentHours, absent_deduction: absentDeduction,
      net_salary: computeNetFromAttendance(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay, p.bonus, p.overtime_amount, p.deductions, p.loan_installment),
    };
    const changed = Object.entries(next).some(([k, v]) =>
      typeof v === "number" ? Number(p[k] || 0) !== v : String(p[k] ?? "") !== String(v ?? "")
    );
    if (changed) updates.push({ id: p.id, ...next });
  }

  return { created, updates, missing };
}