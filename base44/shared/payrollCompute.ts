// دوال احتساب الرواتب بحسب الحضور الفعلي — مرآة خادمية لـ src/lib/payrollCompute.js
// (تُستخدم في إجراءات بوابة الموظف المُفوّضة بصلاحية الرواتب لتفادي قيود RLS).

export const PAID_STATUSES = new Set(["present", "late", "leave", "holiday"]);

export const computeWorkDaysSet = (workDaysStr: any) =>
  new Set(String(workDaysStr || "0,1,2,3,4,6").split(",").map((d) => Number(d.trim())).filter((n) => !isNaN(n)));

export const computeWorkDaysInMonth = (year: number, month: number, workDaysSet: Set<number>) => {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (workDaysSet.has(new Date(year, month - 1, d).getDay())) count++;
  }
  return count;
};

// الأجر اليومي = إجمالي الراتب ÷ 30 يوماً، والأجر بالساعة = اليومي ÷ ساعات العمل المعتمدة للموظف.
export const DAILY_DIVISOR = 30;
export const computeDailyWage = (gross: number, _workDaysInMonth?: number) => Number(((Number(gross) || 0) / DAILY_DIVISOR).toFixed(2));
export const computeHourlyWage = (dailyWage: number, workHoursPerDay: number) => (workHoursPerDay > 0 ? dailyWage / workHoursPerDay : 0);

export const computeAbsentDeduction = (gross: number, absentDays: number, absentHours: number, workDaysInMonth: number, workHoursPerDay: number) => {
  const daily = computeDailyWage(gross, workDaysInMonth);
  const hourly = computeHourlyWage(daily, workHoursPerDay);
  return Number(((absentDays || 0) * daily + (absentHours || 0) * hourly).toFixed(2));
};

// نقص دوام اليوم المؤهل للخصم: ما زاد على فترة السماح المعتمدة يُخصم، وما داخل السماح يُعفى.
export const computeDeductibleShortfall = (workHoursPerDay: number, actualHours: number, graceMinutes: number) => {
  const hpd = Number(workHoursPerDay) || 0;
  if (hpd <= 0) return 0;
  const gap = hpd - (Number(actualHours) || 0) - (Number(graceMinutes) || 0) / 60;
  return gap > 0 ? Number(gap.toFixed(2)) : 0;
};

/**
 * دوام الموظف المعتمد: فرعه إن كان الفرع له ساعات عمل خاصة، وإلا إعدادات المنشأة العامة.
 * مرآة لـ src/lib/branchHours.js لتُستخدم داخل الدوال الخادمية (بوابة الموظف المُفوّض).
 */
export const hasBranchHours = (branch: any) =>
  !!(branch && branch.custom_hours && String(branch.work_start_time || "").trim() && String(branch.work_end_time || "").trim());

export const resolveBranchHours = (org: any, employee: any, branches: any[] = []) => {
  const branch = employee?.branch_id ? (branches || []).find((b) => b.id === employee.branch_id) : null;
  const src = hasBranchHours(branch) ? branch : (org || {});
  return {
    custom: hasBranchHours(branch),
    work_hours_per_day: Number(src.work_hours_per_day) || 0,
    late_grace_minutes: Number(src.late_grace_minutes) || 0,
  };
};

export const computeNetFromAttendance = (gross: number, absentDays: number, absentHours: number, workDaysInMonth: number, workHoursPerDay: number, bonus: number, overtime: number, deductions: number, loan: number) => {
  if (!workDaysInMonth) return 0;
  const absentDeduction = computeAbsentDeduction(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay);
  const net = (Number(gross) || 0) - absentDeduction + (bonus || 0) + (overtime || 0) - (deductions || 0) - (loan || 0);
  return Number(net.toFixed(2));
};