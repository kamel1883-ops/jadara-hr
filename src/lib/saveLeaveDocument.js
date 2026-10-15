import { base44 } from '@/api/base44Client';
import { getPortalAuth } from '@/lib/portalEntityBridge';
import { portalSession } from '@/lib/portalSession';

export function leaveDocumentErrorText(error, isAr = true) {
  const code = error?.code || error?.response?.data?.error || '';
  if (code === 'unauthorized' || code === 'forbidden' || code === 'invalid_session') return isAr
    ? 'تعذر حفظ مستند الإجازة بصلاحيات الجلسة الحالية. لم يُحفظ مستند جديد.'
    : 'This session cannot save the leave document. No new document was saved.';
  if (code === 'timeout' || code === 'unreachable') return isAr
    ? 'تعذر حفظ مستند الإجازة بسبب الاتصال بالخزنة. لم يُحفظ مستند جديد.'
    : 'The vault could not be reached. No new leave document was saved.';
  return isAr ? 'تعذر توليد مستند الإجازة أو ربطه بالطلب. لم تكتمل العملية.' : 'The leave document could not be generated and saved to the request.';
}

export default async function saveLeaveDocument(blob, leaveId, balances) {
  if (!blob?.size) throw new Error('empty_leave_document');
  const fileBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const payload = { leaveId, fileBase64, ...balances };
  const delegated = !!getPortalAuth();
  const session = delegated ? portalSession.load() : null;
  if (delegated && !session) throw Object.assign(new Error('invalid_session'), { code: 'invalid_session' });
  let response;
  try {
    response = await base44.functions.invoke(delegated ? 'portalData' : 'vaultProxy', delegated
      ? { ...payload, action: 'store_leave_document', token: session.token, employee_id: session.employee_id }
      : { ...payload, action: 'storeLeaveDocument' });
  } catch (error) {
    error.code = error?.response?.data?.error || 'unknown';
    throw error;
  }
  const body = response?.data;
  const ref = body?.data?.doc_ref;
  if (!body?.ok || !ref) throw Object.assign(new Error(body?.error || 'leave_document_not_saved'), { code: body?.error || 'unknown' });
  return ref;
}