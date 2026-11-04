/**
 * دوام الفروع — مصدر واحد لساعات العمل المعتمدة في الحضور والانصراف والرواتب.
 *
 * القاعدة: أي قيمة مضبوطة للفرع تُعتمد لموظفيه (بداية/نهاية الدوام، الساعات اليومية،
 * سماح التأخير)، وأي حقل يُترك فارغاً يعود تلقائياً لإعدادات المنشأة العامة.
 */
const textOf = (value) => String(value ?? "").trim();
const positiveOf = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const nonNegativeOf = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export function branchCustomEnabled(branch) {
  return !!(branch && branch.custom_hours);
}

/** يعيد جدول الفرع بعد دمج قيم المنشأة في الحقول الفارغة فقط. */
export function resolveBranchSchedule(org = {}, branch = {}) {
  const orgData = org || {};
  const branchData = branch || {};
  const useBranch = branchCustomEnabled(branchData);
  const branchStart = useBranch ? textOf(branchData.work_start_time) : "";
  const branchEnd = useBranch ? textOf(branchData.work_end_time) : "";
  const branchHours = useBranch ? positiveOf(branchData.work_hours_per_day) : null;
  const branchGrace = useBranch ? nonNegativeOf(branchData.late_grace_minutes) : null;
  const custom = useBranch && (branchStart !== "" || branchEnd !== "" || branchHours != null || branchGrace != null);
  return {
    custom,
    work_start_time: branchStart || textOf(orgData.work_start_time),
    work_end_time: branchEnd || textOf(orgData.work_end_time),
    work_hours_per_day: branchHours ?? positiveOf(orgData.work_hours_per_day) ?? 0,
    late_grace_minutes: branchGrace ?? nonNegativeOf(orgData.late_grace_minutes) ?? 0,
  };
}

export function hasBranchHours(branch) {
  return resolveBranchSchedule({}, branch).custom;
}

/** يعيد ساعات العمل المعتمدة لموظف في فرع معيّن (دوام الفرع إن وُجد، وإلا دوام المنشأة). */
export function resolveWorkHours(org, branch) {
  const schedule = resolveBranchSchedule(org, branch);
  return {
    custom: schedule.custom,
    branch_name: schedule.custom ? (branch?.name || "") : "",
    work_start_time: schedule.work_start_time,
    work_end_time: schedule.work_end_time,
    work_hours_per_day: schedule.work_hours_per_day,
    late_grace_minutes: schedule.late_grace_minutes,
  };
}

/** خريطة: معرّف الفرع → ساعات العمل المعتمدة فيه (لاحتسابها لكل موظف في الكشف). */
export function branchHoursMap(branches) {
  const map = {};
  for (const b of (branches || [])) map[b.id] = hasBranchHours(b);
  return map;
}

/** دوام موظف بحسب فرعه: { custom, work_hours_per_day, late_grace_minutes, ... }. */
export function hoursForEmployee(org, employee, branches) {
  const branch = employee?.branch_id ? (branches || []).find((b) => b.id === employee.branch_id) : null;
  return resolveWorkHours(org, branch);
}

/** وصف مختصر لدوام الفرع — يُستخدم في شارات العرض. */
export function branchHoursLabel(branch) {
  const schedule = resolveBranchSchedule({}, branch);
  if (!schedule.custom) return "";
  const parts = [];
  if (schedule.work_start_time && schedule.work_end_time) parts.push(`${schedule.work_start_time} – ${schedule.work_end_time}`);
  if (schedule.work_hours_per_day > 0) parts.push(`${schedule.work_hours_per_day}h`);
  if (schedule.late_grace_minutes > 0) parts.push(`+${schedule.late_grace_minutes}m`);
  return parts.join(" · ");
}