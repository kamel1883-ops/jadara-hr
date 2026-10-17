import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ============================================================================
// إصلاح أساس احتساب الإجازات لكل الموظفين في كل المنشآت (قابل للتشغيل أكثر من مرة)
// ----------------------------------------------------------------------------
// القاعدة المعتمدة:
//   • الإجمالي المستحق يُولَّد دائماً من تاريخ المباشرة (21 أو 30 يوماً في السنة،
//     و30 إلزامياً بعد 5 سنوات خدمة) — لا رصيد افتتاحي على جانب الاستحقاق.
//   • الرصيد الافتتاحي الوحيد هو «إجمالي الرصيد المستخدم» لمن رُفع ملفه عبر إكسل
//     (opening_balance_source = "excel") ولا يُعدَّل عليه.
//   • المستخدم الكلي = الرصيد المستخدم الافتتاحي + أي إجازة سنوية جديدة داخل النظام.
//   • المتبقي = المستحق المحسوب − المستخدم الكلي.
// ما تفعله الدالة:
//   1) تُلغي أي «إجمالي مستحق» مخزَّن يدوياً (leave_entitled_manual) ليعود الحساب
//      من تاريخ المباشرة في كل الملفات القديمة.
//   2) تُصفِّر أي رصيد افتتاحي أُضيف بالخطأ لموظف لم يُرفع ملفه عبر إكسل
//      (المضاف يدوياً أو عن طريق إدارة التوظيف).
//   3) تُحدِّث القيمة المخزَّنة (leave_balance) = المستحق المحسوب − المستخدم الكلي.
// ============================================================================

function yearsOfService(hireDate, asOf) {
  if (!hireDate) return 0;
  const a = new Date(hireDate);
  if (isNaN(a.getTime())) return 0;
  let y = asOf.getFullYear() - a.getFullYear();
  if (asOf.getMonth() < a.getMonth() || (asOf.getMonth() === a.getMonth() && asOf.getDate() < a.getDate())) y--;
  return Math.max(0, y);
}

// مطابق لـ computeLeaveEntitlement في النظام (src/lib/leaveBalance.js)
function computeEntitlement(hireDate, annualDays, asOf) {
  if (!hireDate) return 0;
  const a = new Date(hireDate);
  if (isNaN(a.getTime())) return 0;
  const sd = Math.floor((asOf.getTime() - a.getTime()) / 86400000);
  if (sd <= 0) return 0;
  const days = yearsOfService(hireDate, asOf) >= 5 ? 30 : (Number(annualDays) === 30 ? 30 : 21);
  return Math.round((sd / 365) * days * 100) / 100;
}

// مطابق لـ sumUsedDays في النظام: الإجازات السنوية (والبراءة الشاملة) المعتمدة فقط
const CONSUME = new Set(['completed', 'paid', 'approved', 'hr_approved', 'awaiting_finance', 'manager_approved']);

function usedFromLeaves(leaves) {
  if (!Array.isArray(leaves)) return 0;
  return leaves.reduce((s, l) => {
    if (!l || l.status === 'rejected' || !CONSUME.has(l.status)) return s;
    if (l.leave_type !== 'annual' && !l.is_full_clearance) return s;
    return s + (Number(l.balance_deducted) || Number(l.days_count) || 0);
  }, 0);
}

// قراءة سجلات الكيان (خدمة النظام — تجاوز نطاق المنشأة الواحدة).
// يدعم الشكلين: مصفوفة مباشرة أو صفحة { items, next_cursor, has_more }.
async function loadAll(entityName, base44) {
  const res = await base44.asServiceRole.entities[entityName].filter({}, '-created_date', 5000);
  const rows = Array.isArray(res) ? res : (res?.items || []);
  return { rows, paged: !Array.isArray(res) };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const asOf = new Date();

    const [empRes, leaveRes, orgRes] = await Promise.all([
      loadAll('Employee', base44),
      loadAll('LeaveRequest', base44),
      loadAll('Organization', base44),
    ]);
    const employees = empRes.rows;
    const leaves = leaveRes.rows;
    const orgs = orgRes.rows;

    const orgDays = new Map();
    for (const o of orgs) {
      if (o.unified_number) orgDays.set(String(o.unified_number), Number(o.annual_leave_days) === 30 ? 30 : 21);
    }

    const leavesByEmp = new Map();
    for (const l of leaves) {
      if (!l?.employee_id) continue;
      const k = String(l.employee_id);
      if (!leavesByEmp.has(k)) leavesByEmp.set(k, []);
      leavesByEmp.get(k).push(l);
    }

    const updates = [];
    let clearedManual = 0;
    let zeroedOpening = 0;

    for (const e of employees) {
      const fromExcel = String(e.opening_balance_source || '') === 'excel';
      const storedPrior = Number(e.prior_used_leave) || 0;
      // الرصيد الافتتاحي يخص ملفات الإكسل فقط — أي قيمة على موظف مُضاف يدوياً/توظيفاً تُصفَّر
      const prior = fromExcel ? storedPrior : 0;
      if (!fromExcel && storedPrior > 0) zeroedOpening++;
      if (e.leave_entitled_manual != null) clearedManual++;

      const annualDays = Number(e.annual_leave_entitlement) || orgDays.get(String(e.unified_number)) || 21;
      const entitled = computeEntitlement(e.hire_date, annualDays, asOf);

      const manualUsed = e.leave_used_manual != null && Number.isFinite(Number(e.leave_used_manual))
        ? Math.round(Number(e.leave_used_manual) * 10) / 10
        : null;
      const used = manualUsed != null
        ? manualUsed
        : Math.round((prior + usedFromLeaves(leavesByEmp.get(String(e.id)))) * 10) / 10;
      const balance = Math.round((entitled - used) * 10) / 10;

      const unchanged = (Number(e.leave_balance) || 0) === balance
        && e.leave_entitled_manual == null
        && storedPrior === prior;
      if (unchanged) continue;

      updates.push({ id: e.id, leave_entitled_manual: null, prior_used_leave: prior, leave_balance: balance });
    }

    let saved = 0;
    if (!dryRun) {
      for (let i = 0; i < updates.length; i += 500) {
        const chunk = updates.slice(i, i + 500);
        await base44.asServiceRole.entities.Employee.bulkUpdate(chunk);
        saved += chunk.length;
      }
    }

    return Response.json({
      paged_api: empRes.paged,
      scanned: employees.length,
      leaves_scanned: leaves.length,
      organizations_scanned: orgs.length,
      to_update: updates.length,
      saved,
      cleared_manual_entitlement: clearedManual,
      zeroed_legacy_opening: zeroedOpening,
      dryRun,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}