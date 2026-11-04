import { resolveBranchSchedule } from "./branchSchedule.ts";

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

// سياسة الدوام الصافي (تُطبق على كل المنشآت والفروع):
// - ساعات العمل المضبوطة في الإعدادات تشمل فترة الراحة إن وُجدت.
// - إن تجاوزت 8 ساعات فالزيادة راحة غير مدفوعة، والمطلوب 8 ساعات صافية (مثال: 9 = 8 عمل + 1 راحة).
// - إن كانت 8 ساعات أو أقل فلا راحة، والمطلوب هو نفس العدد.
// - التأخير يُحتسب عند الانصراف فقط: الصافي أقل من المطلوب → متأخر + خصم. الزيادة لا تُحسب إضافياً.
export const REQUIRED_NET_CAP = 8;
export const requiredNetHours = (workHoursPerDay: any) => {
  const hpd = Number(workHoursPerDay) || 0;
  if (hpd <= 0) return 0;
  return hpd > REQUIRED_NET_CAP ? REQUIRED_NET_CAP : hpd;
};

// الأجر اليومي = إجمالي الراتب ÷ 30 يوماً، والأجر بالساعة = اليومي ÷ صافي ساعات العمل المطلوبة (8 كحد أقصى).
export const DAILY_DIVISOR = 30;
export const computeDailyWage = (gross: number, _workDaysInMonth?: number) => Number(((Number(gross) || 0) / DAILY_DIVISOR).toFixed(2));
export const computeHourlyWage = (dailyWage: number, workHoursPerDay: number) => {
  const req = requiredNetHours(workHoursPerDay);
  return req > 0 ? dailyWage / req : 0;
};

export const computeAbsentDeduction = (gross: number, absentDays: number, absentHours: number, workDaysInMonth: number, workHoursPerDay: number) => {
  const daily = computeDailyWage(gross, workDaysInMonth);
  const hourly = computeHourlyWage(daily, workHoursPerDay);
  return Number(((absentDays || 0) * daily + (absentHours || 0) * hourly).toFixed(2));
};

// نقص دوام اليوم المؤهل للخصم: الفرق بين الصافي المطلوب (8 كحد أقصى) والصافي الفعلي،
// وما زاد على فترة السماح المعتمدة يُخصم، وما داخل السماح يُعفى.
export const computeDeductibleShortfall = (workHoursPerDay: number, actualHours: number, graceMinutes: number) => {
  const req = requiredNetHours(workHoursPerDay);
  if (req <= 0) return 0;
  const gap = req - (Number(actualHours) || 0) - (Number(graceMinutes) || 0) / 60;
  return gap > 0 ? Number(gap.toFixed(2)) : 0;
};

/**
 * دوام الموظف المعتمد: أي قيمة مضبوطة لفرعه تُعتمد، وأي حقل فارغ يعود لإعدادات المنشأة.
 * مرآة لـ src/lib/branchHours.js لتُستخدم داخل الدوال الخادمية (بوابة الموظف المُفوّض).
 */
export const hasBranchHours = (branch: any) => resolveBranchSchedule({}, branch).custom;

export const resolveBranchHours = (org: any, employee: any, branches: any[] = []) => {
  const branch = employee?.branch_id ? (branches || []).find((b) => b.id === employee.branch_id) : null;
  const schedule = resolveBranchSchedule(org, branch);
  return {
    custom: schedule.custom,
    branch_name: schedule.custom ? String((branch as any)?.name || "") : "",
    work_start_time: schedule.work_start_time,
    work_end_time: schedule.work_end_time,
    work_hours_per_day: schedule.work_hours_per_day,
    late_grace_minutes: schedule.late_grace_minutes,
  };
};

export const computeNetFromAttendance = (gross: number, absentDays: number, absentHours: number, workDaysInMonth: number, workHoursPerDay: number, bonus: number, overtime: number, deductions: number, loan: number) => {
  if (!workDaysInMonth) return 0;
  const absentDeduction = computeAbsentDeduction(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay);
  const net = (Number(gross) || 0) - absentDeduction + (bonus || 0) + (overtime || 0) - (deductions || 0) - (loan || 0);
  return Number(net.toFixed(2));
};