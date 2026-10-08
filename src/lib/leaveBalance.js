import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";

// الفرق بالأشهر الكاملة بين تاريخين (أو 0)
export function monthDiff(fromISO, toISO) {
  if (!fromISO) return 0;
  const a = new Date(fromISO);
  const b = new Date(toISO);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  // إذا لم يكمل شهر هذا الشهر نحسبه ناقصًا (التناسبي)
  // نعم: Kenya. القيمة الشهرية الكاملة فقط.
  return Math.max(0, months);
}

// عدد أيام الخدمة الفعلية من تاريخ المباشرة حتى تاريخ مرجعي
export function serviceDays(hireDate, asOf = new Date()) {
  if (!hireDate) return 0;
  const a = new Date(hireDate);
  const b = asOf instanceof Date ? asOf : new Date(asOf);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.max(0, Math.floor((b - a) / 86400000));
}

// الرصيد المستحق تناسبياً بالأيام الفعلية من تاريخ المباشرة (21 أو 30 يوماً عن كل 365 يوم خدمة)
export function computeEntitlement(hireDate, annualDays, asOf = new Date()) {
  const days = Number(annualDays) || 21;
  if (!hireDate) return 0;
  const sd = serviceDays(hireDate, asOf);
  if (sd <= 0) return 0;
  return Math.round((sd / 365) * days * 100) / 100;
}

// الرصيد المستحق (التراكمي) وفق سياسة جدارة المعتمدة:
// - أكمل 5 سنوات خدمة فأكثر → 30 يوماً/سنة إلزامياً (لا تملك الشركة خيار 21).
// - أقل من 5 سنوات → خيار الشركة لكل موظف: 21 أو 30 يوماً (annual_leave_entitlement).
//   تُحتسب بنفس المعدل المختار عن كامل مدة الخدمة تناسبياً من تاريخ المباشرة.
// annualDaysOverride (اختياري) = اختيار الشركة من ملف الموظف؛ إن غاب يُستخدم افتراض المنشأة.
export function computeLeaveEntitlement(hireDate, org, asOf = new Date(), annualDaysOverride) {
  if (!hireDate) return 0;
  const sd = serviceDays(hireDate, asOf);
  if (sd <= 0) return 0;
  let days;
  if (yearsOfService(hireDate, asOf) >= 5) {
    days = 30; // إلزامي بعد 5 سنوات
  } else {
    const choice = Number(annualDaysOverride);
    days = choice === 30 ? 30 : (choice === 21 ? 21 : (Number(org?.annual_leave_days) === 30 ? 30 : 21));
  }
  return Math.round((sd / 365) * days * 100) / 100;
}

export async function getOrgOnce() {
  try {
    const orgs = await listCurrentOrg();
    return orgs[0] || null;
  } catch {
    return null;
  }
}

export async function getAnnualLeaveDays() {
  const org = await getOrgOnce();
  const v = Number(org?.annual_leave_days);
  return v === 21 || v === 30 ? v : 21;
}

// سنوات الخدمة الكاملة من تاريخ المباشرة حتى تاريخ مرجعي (افتراضياً اليوم)
export function yearsOfService(hireDate, asOf = new Date()) {
  if (!hireDate) return 0;
  const a = new Date(hireDate);
  const b = asOf instanceof Date ? asOf : new Date(asOf);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  let years = b.getFullYear() - a.getFullYear();
  if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) years--;
  return Math.max(0, years);
}

// أيام الإجازة السنوية الفعلية للموظف وفق سياسة جدارة:
// - أكمل 5 سنوات → 30 إلزامياً (النظام يمنع 21).
// - أقل من 5 سنوات → خيار الشركة لكل موظف (21 أو 30) من ملف الموظف،
//   وإن لم يُحدّد يُستخدم افتراض المنشأة (annual_leave_days) ثم 21.
export function getEmployeeAnnualDays(employee, org) {
  if (yearsOfService(employee?.hire_date) >= 5) return 30;
  const choice = Number(employee?.annual_leave_entitlement);
  if (choice === 30) return 30;
  if (choice === 21) return 21;
  return Number(org?.annual_leave_days) === 30 ? 30 : 21;
}

// مجموع الأيام المستخدمة من طلبات الإجازة السنوية المعتمدة/المكتملة فقط —
// الإجازات المرضية وبدون راتب والاضطرارية والإذن لا تُخصم من رصيد الإجازات السنوية.
export function sumUsedDays(leaves) {
  if (!Array.isArray(leaves)) return 0;
  const consume = new Set(["completed", "paid", "approved", "hr_approved", "awaiting_finance", "manager_approved"]);
  return leaves
    .filter((l) => l.status !== "rejected" && consume.has(l.status) && l.leave_type === "annual")
    .reduce((s, l) => s + (Number(l.balance_deducted) || Number(l.days_count) || 0), 0);
}

// «الرصيد المستخدم الكلي» = الرصيد الافتتاحي (prior_used_leave — لقطة ثابتة لما قبل النظام)
// + مجموع الإجازات السنوية المعتمدة داخل النظام (sumUsedDays). عنصران منفصلان لا يتكرران.
// المعادلة المعتمدة: المتبقي = المستحق التراكمي − المستخدم الكلي.
export function usedLeaveTotal(employee, leaves) {
  const prior = Number(employee?.prior_used_leave) || 0;
  return Math.round((prior + sumUsedDays(leaves)) * 10) / 10;
}

// الرصيد المتبقي = المستحق التراكمي − المستخدم الكلي (قد يكون سالباً عند تقديم إجازة).
export function remainingLeave(employee, leaves, org, asOf) {
  const entitled = computeLeaveEntitlement(employee?.hire_date, org, asOf, employee?.annual_leave_entitlement);
  const used = usedLeaveTotal(employee, leaves);
  return Math.round((entitled - used) * 10) / 10;
}

// يُعيد الموظفين الذين انتهت إجازتهم السنوية الفعلية (سفر) إلى «على رأس العمل» تلقائياً
// عند تجاوز تاريخ نهاية الإجازة. يُستدعى عند تحميل قائمة الموظفين.
export async function revertExpiredLeaves(employees) {
  const onLeave = (employees || []).filter((e) => e && e.status === "on_leave" && e.id);
  if (onLeave.length === 0) return [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const reverted = [];
  for (const emp of onLeave) {
    const leaves = await base44.entities.LeaveRequest.filter({ employee_id: emp.id }, "-created_date", 50).catch(() => []);
    const travelLeave = (leaves || []).find(
      (l) => l.leave_type === "annual" && l.annual_leave_mode !== "encash_continue"
        && ["completed", "paid"].includes(l.status)
    );
    if (travelLeave && travelLeave.end_date && String(travelLeave.end_date) < todayStr) {
      await base44.entities.Employee.update(emp.id, { status: "active" }).catch(() => {});
      reverted.push(emp.id);
    }
  }
  return reverted;
}