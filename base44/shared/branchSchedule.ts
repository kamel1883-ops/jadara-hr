// سياسة دوام الفروع: أي قيمة مضبوطة للفرع تُعتمد للفرع، وأي حقل فارغ يعود لدوام المنشأة.
// تُستخدم نفس القاعدة في إثبات الحضور والتأخير والرواتب حتى لا يختلف التفسير بينها.

const textOf = (value: any): string => String(value ?? "").trim();

const positiveOf = (value: any): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const nonNegativeOf = (value: any): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const branchCustomEnabled = (branch: any): boolean =>
  !!(branch && branch.custom_hours);

export interface BranchSchedule {
  custom: boolean;
  work_start_time: string;
  work_end_time: string;
  work_hours_per_day: number;
  late_grace_minutes: number;
}

export function resolveBranchSchedule(org: any = {}, branch: any = {}): BranchSchedule {
  const orgData = org || {};
  const branchData = branch || {};
  const useBranch = branchCustomEnabled(branchData);

  const branchStart = useBranch ? textOf(branchData.work_start_time) : "";
  const branchEnd = useBranch ? textOf(branchData.work_end_time) : "";
  const branchHours = useBranch ? positiveOf(branchData.work_hours_per_day) : null;
  const branchGrace = useBranch ? nonNegativeOf(branchData.late_grace_minutes) : null;

  const start = branchStart || textOf(orgData.work_start_time);
  const end = branchEnd || textOf(orgData.work_end_time);
  const hours = branchHours ?? positiveOf(orgData.work_hours_per_day) ?? 0;
  const grace = branchGrace ?? nonNegativeOf(orgData.late_grace_minutes) ?? 0;

  const custom =
    useBranch &&
    (branchStart !== "" ||
      branchEnd !== "" ||
      branchHours != null ||
      branchGrace != null);

  return {
    custom,
    work_start_time: start,
    work_end_time: end,
    work_hours_per_day: hours,
    late_grace_minutes: grace,
  };
}
