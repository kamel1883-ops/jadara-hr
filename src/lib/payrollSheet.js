/**
 * payrollSheet — بناء كشف رواتب الشهر من ملفات الموظفين الحيّة.
 *
 * القاعدة: كل موظف على رأس العمل يجب أن يظهر في كشف الشهر — سواء أُضيف يدوياً،
 * أو بالاستيراد من الإكسل، أو تعيينه من إدارة التوظيف. هذا المساعد يبني الصفوف
 * الناقصة (مسودة) ويحدّث صفوف المسودة بأرقام ملف الموظف وطريقة صرفه الحالية،
 * فتبقى الرواتب وملف مدد وكشف الكاش والتأمينات متطابقة مع قائمة الموظفين النشطين.
 */
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import {
  PAID_STATUSES, computeWorkDaysSet, computeWorkDaysInMonth, computeAbsentDeduction, computeNetFromAttendance,
} from "@/lib/payrollCompute";

/**
 * يبني (أو يستكمل) كشف شهر معيّن.
 * يعيد { created, updates, missing } — الصفوف الجديدة، وتحديثات صفوف المسودة، والموظفون الناقصون.
 * الصفوف المعتمدة/المصروفة لقطة تاريخية لا تُعاد كتابتها.
 */
export async function buildSheet({ month, year, org, activeEmps, payrolls }) {
  const mm = String(month).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${mm}-${String(endDay).padStart(2, "0")}`;
  const attRecords = await base44.entities.Attendance.filter({ date: { $gte: startDate, $lte: endDate } }, "-created_date", 2000);

  // أيام العمل الرسمية المعتمدة بالمنشأة (0=الأحد ... 6=السبت). الأيام خارجها = إجازة أسبوعية لا تُحسب.
  const orgFresh = org && org.work_days ? org : ((await listCurrentOrg())[0] || org || {});
  const workDaysSet = computeWorkDaysSet(orgFresh.work_days);
  const workDaysInMonth = computeWorkDaysInMonth(year, month, workDaysSet);
  const workHoursPerDay = Number(orgFresh.work_hours_per_day) || 0;

  // أيام الحضور المدفوعة لكل موظف: present/late/leave/holiday ضمن أيام العمل الرسمية فقط
  const paidDaysByEmp = {};
  // ساعات النقص (التغيب الجزئي): الفرق بين ساعات اليوم المطلوبة وساعات العمل الفعلية
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
    const paidDays = Math.min(paidDaysByEmp[emp.id] || 0, workDaysInMonth);
    const absentDays = Math.max(0, workDaysInMonth - paidDays);
    const absentHours = shortfallByEmp[emp.id] || 0;
    const absentDeduction = computeAbsentDeduction(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay);
    const method = emp.salary_payment_method || "mudad";

    // موظف على رأس العمل وغير موجود في الكشف → صف مسودة جديد
    if (!inSheet.has(emp.id)) {
      missing.push({ employee_id: emp.id, employee_name: emp.full_name || "", method });
      created.push({
        employee_id: emp.id, employee_name: emp.full_name || "",
        national_id: emp.emp_ref ? "" : (emp.national_id || ""), emp_ref: emp.emp_ref || "",
        month, year, salary_payment_method: method,
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