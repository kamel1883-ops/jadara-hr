/**
 * دوام الفروع — مصدر واحد لساعات العمل المعتمدة في الحضور والانصراف والرواتب.
 *
 * القاعدة: الفرع الذي فعّل مسؤول الموارد البشرية خيار «ساعات عمل خاصة به» يعتمد دوامه
 * هو (بداية/نهاية الدوام، الساعات اليومية، سماح التأخير) في بصمة موظفيه وفي احتساب
 * التأخير والغياب في مسير الرواتب، أما الفروع الأخرى فتعتمد إعدادات المنشأة العامة.
 */

export function hasBranchHours(branch) {
  return !!(branch && branch.custom_hours
    && String(branch.work_start_time || "").trim()
    && String(branch.work_end_time || "").trim());
}

/** يعيد ساعات العمل المعتمدة لموظف في فرع معيّن (دوام الفرع إن وُجد، وإلا دوام المنشأة). */
export function resolveWorkHours(org, branch) {
  const useBranch = hasBranchHours(branch);
  const src = useBranch ? branch : (org || {});
  return {
    custom: useBranch,
    branch_name: useBranch ? (branch.name || "") : "",
    work_start_time: String(src.work_start_time || "").trim(),
    work_end_time: String(src.work_end_time || "").trim(),
    work_hours_per_day: Number(src.work_hours_per_day) || 0,
    late_grace_minutes: Number(src.late_grace_minutes) || 0,
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
  if (!hasBranchHours(branch)) return "";
  return `${branch.work_start_time} – ${branch.work_end_time}`;
}