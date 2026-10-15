import { storeDocument } from './vaultClient.ts';
import { validVaultRef } from './vaultAuthorization.ts';

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

// The caller supplies a verified company, never a client-selected tenant or employee reference.
export async function saveLeaveDocument(base44, unified, body) {
  if (!unified) fail('unauthorized');
  if (typeof body.leaveId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(body.leaveId)) fail('invalid');
  const leave = await base44.asServiceRole.entities.LeaveRequest.get(body.leaveId);
  const employee = leave?.employee_id ? await base44.asServiceRole.entities.Employee.get(leave.employee_id) : null;
  if (!employee || String(employee.unified_number || '').trim() !== unified) fail('unauthorized');
  if (leave.unified_number && String(leave.unified_number).trim() !== unified) fail('unauthorized');
  if (!['hr_settled', 'hr_approved', 'awaiting_finance', 'completed', 'paid', 'approved'].includes(leave.status)) fail('invalid');
  const encoded = body.fileBase64;
  if (typeof encoded !== 'string' || !encoded.length || encoded.length > 35000000) fail('invalid');
  let bytes;
  try { bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0)); } catch { fail('invalid'); }
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') fail('invalid');
  const stored = await storeDocument(unified, bytes, `leave-settlement-${leave.id}.pdf`, 'application/pdf', employee.emp_ref || null, 'leave_settlement');
  const ref = stored?.doc_ref || stored?.docRef;
  if (!validVaultRef(ref)) fail('unknown');
  const patch = { settlement_pdf_url: ref };
  for (const key of ['balance_before', 'balance_after']) {
    if (typeof body[key] === 'number' && Number.isFinite(body[key]) && body[key] >= 0) patch[key] = body[key];
  }
  await base44.asServiceRole.entities.LeaveRequest.update(leave.id, patch);
  return { doc_ref: ref };
}

export async function companyOwnsLeaveDocument(base44, unified, ref) {
  const page = await base44.asServiceRole.entities.LeaveRequest.filter({ settlement_pdf_url: ref }, { limit: 1, fields: ['employee_id'] });
  const leave = (Array.isArray(page) ? page : page?.items || [])[0];
  if (!leave?.employee_id) return false;
  const employee = await base44.asServiceRole.entities.Employee.get(leave.employee_id);
  return !!unified && String(employee?.unified_number || '').trim() === unified;
}