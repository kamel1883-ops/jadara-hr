import { storeDocument } from './vaultClient.ts';

function fail(code) {
  const error = new Error(code);
  error.vaultCode = code;
  throw error;
}

export function canManageLeaveDocuments(employee) {
  let permissions = [];
  try { permissions = JSON.parse(employee?.permissions || '[]'); } catch { /* no delegation */ }
  return employee?.is_approver_hr === true || (Array.isArray(permissions) && permissions.some(p => ['leaves', 'approvals'].includes(p)));
}

/** يجلب طلب الإجازة وموظفه، ويتحقق أن المتحقق يقبله (تحقّق يمرّره المستدعي بسياق جلسته). */
async function loadVerifiedLeave(base44, verify, leaveId) {
  if (typeof leaveId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(leaveId)) fail('invalid');
  const leave = await base44.asServiceRole.entities.LeaveRequest.get(leaveId);
  if (!leave) fail('not_found');
  const employee = leave.employee_id ? await base44.asServiceRole.entities.Employee.get(leave.employee_id) : null;
  if (!employee || !(await verify(employee))) fail('unauthorized');
  return { leave, employee };
}

/**
 * أرشفة مستند الإجازة وربطه بالطلب في خطوة واحدة.
 * النجاح يعني: أعادت الخزنة مرجعاً، وحُفظ المرجع على الطلب — لا مجرد توليد PDF في المتصفح.
 * مفتاح الكتابة وتحقّق الصلاحية يمرّرهما المستدعي من سياق جلسته الموثوق.
 */
export async function saveLeaveDocument(base44, { writeKey, verify }, body) {
  if (!writeKey || typeof verify !== 'function') fail('unauthorized');
  const encoded = body?.fileBase64;
  if (typeof encoded !== 'string' || !encoded.length || encoded.length > 35000000) fail('invalid');
  let bytes;
  try { bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0)); } catch { fail('invalid'); }
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') fail('invalid');
  const { leave, employee } = await loadVerifiedLeave(base44, verify, body.leaveId);
  if (!['hr_settled', 'hr_approved', 'awaiting_finance', 'completed', 'paid', 'approved'].includes(leave.status)) fail('invalid');
  const stored = await storeDocument(writeKey, bytes, `leave-settlement-${leave.id}.pdf`, 'application/pdf', employee.emp_ref || null, 'leave_settlement');
  const ref = stored?.doc_ref || stored?.docRef;
  if (!ref) fail('unknown');
  const patch = { settlement_pdf_url: ref };
  for (const key of ['balance_before', 'balance_after']) {
    const value = Number(body?.[key]);
    if (Number.isFinite(value) && value >= 0) patch[key] = value;
  }
  await base44.asServiceRole.entities.LeaveRequest.update(leave.id, patch);
  return { doc_ref: ref };
}

/** هل المستند مرتبط بطلب إجازة موظف من نفس المنشأة؟ (لفتحه بجلسة مُفوّضة) */
export async function companyOwnsLeaveDocument(base44, employee, ref) {
  const unified = String(employee?.unified_number || '').trim();
  if (!unified || typeof ref !== 'string' || !ref) return false;
  const page = await base44.asServiceRole.entities.LeaveRequest.filter({ settlement_pdf_url: ref }, { limit: 1, fields: ['employee_id'] });
  const leave = (Array.isArray(page) ? page : page?.items || [])[0];
  if (!leave?.employee_id) return false;
  const owner = await base44.asServiceRole.entities.Employee.get(leave.employee_id);
  return String(owner?.unified_number || '').trim() === unified;
}