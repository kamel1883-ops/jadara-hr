// دوال احتساب الرواتب بحسب الحضور الفعلي — مشتركة بين بوابة الإدارة وبوابة الموظف
// (المُفوّض بصلاحية الرواتب) لتفادي الازدواجية وضمان اتساق الأرقام.

export const PAID_STATUSES = new Set(["present", "late", "leave", "holiday"]);

export const computeWorkDaysSet = (workDaysStr) =>
  new Set(String(workDaysStr || "0,1,2,3,4,6").split(",").map((d) => Number(d.trim())).filter((n) => !isNaN(n)));

export const computeWorkDaysInMonth = (year, month, workDaysSet) => {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (workDaysSet.has(new Date(year, month - 1, d).getDay())) count++;
  }
  return count;
};

// الأجر اليومي = إجمالي الراتب ÷ 30 يوماً (الأجر النظامي لليوم) — لا يُقسم على أيام عمل الشهر.
// الأجر بالساعة = الأجر اليومي ÷ ساعات العمل المعتمدة للموظف (دوام فرعه، وإلا دوام المنشأة) — وليست 8 ساعات ثابتة.
export const DAILY_DIVISOR = 30;
export const computeDailyWage = (gross) => Number(((Number(gross) || 0) / DAILY_DIVISOR).toFixed(2));
export const computeHourlyWage = (dailyWage, workHoursPerDay) => (workHoursPerDay > 0 ? dailyWage / workHoursPerDay : 0);

// قيمة خصم الغياب (أيام) ونقص الدوام/التأخير (ساعات) — تُخصم مباشرة من الراتب
export const computeAbsentDeduction = (gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay) => {
  const daily = computeDailyWage(gross);
  const hourly = computeHourlyWage(daily, workHoursPerDay);
  return Number(((absentDays || 0) * daily + (absentHours || 0) * hourly).toFixed(2));
};

// نقص دوام اليوم المؤهل للخصم: ما زاد على فترة السماح المعتمدة يُخصم، وما داخل السماح يُعفى.
export const computeDeductibleShortfall = (workHoursPerDay, actualHours, graceMinutes) => {
  const hpd = Number(workHoursPerDay) || 0;
  if (hpd <= 0) return 0;
  const gap = hpd - (Number(actualHours) || 0) - (Number(graceMinutes) || 0) / 60;
  return gap > 0 ? Number(gap.toFixed(2)) : 0;
};

// الصافي = الإجمالي − خصم الغياب + الحوافز + العمل الإضافي − الخصومات الأخرى − السلفة
export const computeNetFromAttendance = (gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay, bonus, overtime, deductions, loan) => {
  if (!workDaysInMonth) return 0;
  const absentDeduction = computeAbsentDeduction(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay);
  const net = (Number(gross) || 0) - absentDeduction + (bonus || 0) + (overtime || 0) - (deductions || 0) - (loan || 0);
  return Number(net.toFixed(2));
};

// يعيد بناء سجل رواتب واحد بعد تعديل حقل مالي وإعادة احتساب الإجمالي/خصم الغياب/الصافي
export const recomputeRow = (rec, workDaysInMonth, workHoursPerDay) => {
  const updated = { ...rec };
  updated.gross_salary =
    (Number(updated.base_salary) || 0) + (Number(updated.housing_allowance) || 0) +
    (Number(updated.transport_allowance) || 0) + (Number(updated.other_allowances) || 0);
  updated.absent_deduction = computeAbsentDeduction(
    updated.gross_salary, updated.absent_days, updated.absent_hours, workDaysInMonth, workHoursPerDay
  );
  updated.net_salary = computeNetFromAttendance(
    updated.gross_salary, updated.absent_days, updated.absent_hours, workDaysInMonth, workHoursPerDay,
    updated.bonus, updated.overtime_amount, updated.deductions, updated.loan_installment
  );
  return updated;
};