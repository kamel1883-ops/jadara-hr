import { base44 } from '@/api/base44Client';
import { getPortalAuth } from '@/lib/portalEntityBridge';
import { portalSession } from '@/lib/portalSession';

export async function medicalReportRequest(employeeId, args = {}, session = null) {
  const current = session || (getPortalAuth() ? portalSession.load() : null);
  const payload = { target_employee_id: employeeId, ...args };
  if (current?.token && current?.employee_id) {
    payload.portal_token = current.token;
    payload.portal_employee_id = current.employee_id;
  }
  const response = await base44.functions.invoke('companyMedicalReports', payload);
  return response.data;
}

export function medicalReportError(error, isAr) {
  const code = error?.response?.data?.error || error?.error || error?.message;
  if (code === 'forbidden' || code === 'not_found') return isAr ? 'لا تملك صلاحية عرض هذا التقرير.' : 'This report is not available to this account.';
  if (code === 'file_missing') return isAr ? 'مرجع التقرير محفوظ لكن ملفه غير موجود في الأرشيف.' : 'The report reference exists but its file is missing.';
  return isAr ? 'تعذّر الوصول إلى أرشيف التقارير الطبية.' : 'Could not access the medical report archive.';
}