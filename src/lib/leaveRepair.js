import { base44 } from "@/api/base44Client";
import { entitledLeaveDays, usedLeaveTotal, sumUsedDays } from "@/lib/leaveBalance";
import { generateLeaveSettlement } from "@/lib/docGenerators";

// حالات الطلبات التي لها مخالصة تصفية (تُعاد توليدها لتستبدل المستند القديم)
const SETTLED = new Set(["completed", "paid", "hr_settled"]);

/**
 * إصلاح رصيد إجازات موظف واحد.
 * المصدر الوحيد للحقيقة: المستحق تناسبياً من تاريخ المباشرة حسب سياسة المنشأة (21/30)
 * − المستخدم (الرصيد الافتتاحي + إجازات سنوية معتمدة فقط — لا مرضية ولا بدون راتب ولا طارئة).
 * resetPrior: يصفّر الرصيد الافتتاحي (لأغلفة أُدخلتخطأً ولا تخص الموظف) — هذا الموظف وحده.
 * regenerateDocs: يُعيد توليد مخالصات الإجازات المصفاة فتستبدل المستندات القديمة على الطلبات.
 */
export async function repairEmployeeLeave(emp, org, { resetPrior = false, regenerateDocs = true, onProgress } = {}) {
  const leaves = await base44.entities.LeaveRequest.filter({ employee_id: emp.id }, "-created_date", 500).catch(() => []);
  const rows = Array.isArray(leaves) ? leaves : [];
  const prior = resetPrior ? 0 : Number(emp.prior_used_leave) || 0;
  const fixedEmp = { ...emp, prior_used_leave: prior };
  const entitled = entitledLeaveDays(fixedEmp, org);
  const used = usedLeaveTotal(fixedEmp, rows);
  const remaining = Math.round((entitled - used) * 10) / 10;
  await base44.entities.Employee.update(emp.id, {
    prior_used_leave: prior,
    leave_balance: remaining,
    ...(resetPrior ? { leave_used_manual: null } : {}),
  });
  let docs = 0;
  let kept = 0;
  if (regenerateDocs) {
    const done = rows.filter((l) => SETTLED.has(l.status) || l.settlement_pdf_url);
    for (const l of done) {
      // التحقق أولاً: مخالصة مطابقة للمعادلة الصحيحة تبقى كما هي؛ غير المطابقة تُعاد فتستبدل القديمة.
      const asOf = l.start_date ? new Date(l.start_date) : new Date();
      const ent = entitledLeaveDays(fixedEmp, org, asOf);
      const otherUsed = usedLeaveTotal(fixedEmp, rows.filter((x) => x.id !== l.id && x.employee_id === emp.id));
      const granted = Number(l.balance_deducted) || 0;
      const bBefore = Math.round((ent - otherUsed) * 10) / 10;
      const bAfter = Math.round((bBefore - granted) * 10) / 10;
      const match = !!l.settlement_pdf_url
        && Math.abs((Number(l.balance_before) || 0) - bBefore) <= 0.05
        && Math.abs((Number(l.balance_after) || 0) - bAfter) <= 0.05;
      if (match) { kept++; continue; }
      onProgress?.({ phase: "doc", leave: l });
      // فشل مستند واحد لا يوقف إصلاح بقية الموظفين
      try { await generateLeaveSettlement(l, fixedEmp, org, rows); docs++; } catch (e) { /* يُتخطى */ }
    }
  }
  return { entitled, used, remaining, docs, kept };
}

/**
 * إصلاح لجميع موظفي المنشأة (النشطين) بترتيب مع مؤشر تقدّم.
 * لا يُطبَّق على منتهين/مستقيلين لأن رصيدهم مُصفّى عند المخالصة.
 */
export async function repairOrgLeaves(employees, org, opts = {}) {
  const list = (employees || []).filter((e) => e && e.id && !["terminated", "resigned"].includes(e.status));
  const results = [];
  for (let i = 0; i < list.length; i++) {
    opts.onProgress?.({ index: i, total: list.length, employee: list[i], phase: "employee" });
    try {
      results.push({ employee: list[i], ...(await repairEmployeeLeave(list[i], org, opts)) });
    } catch (e) {
      results.push({ employee: list[i], error: String(e?.message || e) });
    }
  }
  return results;
}
