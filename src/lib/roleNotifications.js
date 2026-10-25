import { base44 } from "@/api/base44Client";

// نطاق إشعارات الموافقات حسب الدور:
// - إشعار مرحلة المدير: يخص المدير المباشر فقط (بوابة الموظف) — لا يظهر في بوابة الشركات لغير صاحبه.
// - إشعار مرحلة الموارد البشرية: يظهر في بوابة الشركات لمسؤول الموارد/الأدمن.
// - إشعار مرحلة المالية: يخص المعتمد المالي فقط (بوابة الموظف) — لا يظهر لمسؤول الموارد البشرية.
// الإشعارات القديمة بلا حقل stage تُستدل مرحلتها من نصها.

export function approvalStageOf(n) {
  if (n?.stage) return n.stage;
  const b = `${n?.title || ""} ${n?.body || ""}`;
  if (b.includes("بانتظار المالية") || b.includes("awaiting_finance")) return "finance";
  if (b.includes("بانتظار الموارد") || b.includes("manager_approved")) return "hr";
  if (b.includes("بانتظار المدير") || b.includes("pending_manager")) return "manager";
  return "";
}

export async function loadMyRole() {
  try {
    const me = await base44.auth.me().catch(() => null);
    let employees = [];
    try { employees = await base44.entities.Employee.list("-created_date", 500); } catch {}
    const myEmp = (employees || []).find((e) => e.user_id && me && e.user_id === me.id) || null;
    const isAdmin = me?.role === "admin";
    return { me, myEmp, isAdmin, isHR: isAdmin || !!myEmp?.is_approver_hr };
  } catch {
    return { me: null, myEmp: null, isAdmin: false, isHR: false };
  }
}

// ما يجوز عرضه في بوابة الشركات (الجرس + صفحة الإشعارات):
// إشعاراتي الشخصية + إشعارات مرحلة الموارد (للموارد/الأدمن) + كل ما ليس موافقات.
export function visibleInCompanyPortal(n, role) {
  if (!n) return false;
  if (n.type !== "approval_pending") return true;
  const mine =
    (role?.myEmp && n.employee_id && n.employee_id === role.myEmp.id) ||
    (role?.me && n.user_id && n.user_id === role.me.id);
  if (mine) return true;
  if (approvalStageOf(n) === "hr" && (role?.isHR || role?.isAdmin)) return true;
  return false;
}
