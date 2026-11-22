import { storeDocument } from './vaultClient.ts';
import { validVaultRef } from './vaultAuthorization.ts';
import { notifyApproverForStatus } from './approverNotify.ts';

export async function createPortalLeave(base44, employee, payload, resolveManager) {
  const unified = String(employee?.unified_number || '').trim();
  if (employee?.id === 'owner' || !unified) return Response.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const keys = ['leave_type', 'start_date', 'end_date', 'days_count', 'reason', 'medical_report_url', 'is_full_clearance', 'description', 'permission_minutes'];
  const data = Object.fromEntries(keys.filter(key => payload[key] !== undefined).map(key => [key, payload[key]]));
  data.medical_report_url = '';
  if (data.leave_type === 'sick') {
    const file = String(payload.medical_file_base64 || '');
    if (!file) return Response.json({ ok: false, error: 'التقرير الطبي مطلوب؛ افتح نموذج الطلب المحدّث وأرفق الملف.' }, { status: 400 });
    if (file.length > 35000000) return Response.json({ ok: false, error: 'التقرير الطبي أكبر من الحجم المسموح.' }, { status: 400 });
    const mime = String(payload.medical_mime_type || 'application/pdf');
    if (mime !== 'application/pdf' && !mime.startsWith('image/')) return Response.json({ ok: false, error: 'أرفق صورة أو ملف PDF.' }, { status: 400 });
    let bytes;
    try { bytes = Uint8Array.from(atob(file), c => c.charCodeAt(0)); }
    catch { return Response.json({ ok: false, error: 'ملف التقرير غير صالح.' }, { status: 400 }); }
    if (!bytes.length) return Response.json({ ok: false, error: 'ملف التقرير فارغ.' }, { status: 400 });
    // File and leave use the employee and establishment from the verified session, not caller input.
    const stored = await storeDocument(unified, bytes, String(payload.medical_file_name || 'medical_report.pdf').slice(0, 120), mime, employee.emp_ref || null, 'medical_report');
    data.medical_report_url = String(stored?.doc_ref || '');
    if (!validVaultRef(data.medical_report_url)) return Response.json({ ok: false, error: 'تعذّر حفظ التقرير الطبي؛ لم يُنشأ الطلب.' }, { status: 502 });
  }
  const manager = await resolveManager();
  const created = await base44.asServiceRole.entities.LeaveRequest.create({
    ...data, employee_id: employee.id, unified_number: unified,
    employee_user_id: employee.user_id || null,
    employee_name: String(employee.full_name || '').trim() || `${employee.employee_number} - ${employee.position}`,
    status: 'pending_manager', manager_status: 'pending', hr_status: 'pending', finance_status: 'pending', ...manager,
  });
  try {
    await notifyApproverForStatus(base44, {
      type: 'leave', employeeId: employee.id, employeeName: employee.full_name || created.employee_name,
      status: 'pending_manager', employeeNationalId: employee.national_id || '', employeeNumber: employee.employee_number || '', position: employee.position || '',
      details: `إجازة ${data.leave_type || ''} من ${data.start_date || ''} إلى ${data.end_date || ''} (${data.days_count || 0} يوم)`,
    });
  } catch { /* A notification failure must not duplicate a saved medical request. */ }
  return Response.json({ ok: true, leave: created });
}