import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { verifyToken } from '../../shared/portalToken.ts';
import { companyVaultAccess, tenantKeysForRead, tenantKeysForEmployee } from '../../shared/vaultIdentity.ts';
import { validVaultRef } from '../../shared/vaultAuthorization.ts';
import { getDocumentLinkInCompany, buildDownloadUrl } from '../../shared/vaultClient.ts';

const asList = page => Array.isArray(page) ? page : (Array.isArray(page?.items) ? page.items : []);
const isUrl = value => /^https?:\/\//i.test(String(value || ''));

// التقرير الطبي يُحفظ في الخزنة عند إنشاء طلب الإجازة المرضية، ويُربط بالطلب بمرجع
// المستند (doc_ref). لذلك المصدر الموثوق لعرضه هو الطلب نفسه: لا يُعرض تقرير إلا
// إذا كان مربوطاً بطلب إجازة مرضية لهذا الموظف داخل منشأته — وهو نفس عزل بقية الطلبات.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const targetId = String(body.target_employee_id || '').trim();
    if (!targetId || !['list', 'open'].includes(body.action || 'list')) return Response.json({ error: 'invalid' }, { status: 400 });
    let actor = null, context = null, user = null, unified = '';
    if (body.portal_token && body.portal_employee_id) {
      const verified = await verifyToken(String(body.portal_token));
      if (!verified.ok || verified.employeeId !== String(body.portal_employee_id) || verified.employeeId === 'owner') return Response.json({ error: 'unauthorized' }, { status: 401 });
      actor = await base44.asServiceRole.entities.Employee.get(verified.employeeId).catch(e => e.status === 404 ? null : Promise.reject(e));
      unified = String(actor?.unified_number || '').trim();
    } else {
      user = await base44.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
      if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
      context = await companyVaultAccess(base44, user);
      if (!context.owner && !context.member) return Response.json({ error: 'forbidden' }, { status: 403 });
      unified = String(context.unified || '').trim();
    }
    if (!unified) return Response.json({ error: 'forbidden' }, { status: 403 });
    const target = await base44.asServiceRole.entities.Employee.get(targetId).catch(e => e.status === 404 ? null : Promise.reject(e));
    if (!target || String(target.unified_number || '').trim() !== unified) return Response.json({ error: 'not_found' }, { status: 404 });
    if (actor && actor.id !== target.id) {
      let permissions = [];
      try { permissions = JSON.parse(actor.permissions || '[]'); } catch { permissions = []; }
      const hr = actor.is_approver_hr || (Array.isArray(permissions) && permissions.some(p => ['hr', 'employees', 'leaves', 'approvals'].includes(p)));
      const manager = actor.is_approver_manager && target.manager_id === actor.id;
      if (!hr && !manager) return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    const keys = actor ? await tenantKeysForEmployee(base44, target) : await tenantKeysForRead(base44, user, target.emp_ref ? [target.emp_ref] : []);
    // الطلبات القديمة قد تكون بلا رقم موحّد؛ يُقبل الطلب بشرط أن الموظف نفسه من المنشأة.
    const scope = { employee_id: target.id, leave_type: 'sick', $or: [{ unified_number: unified }, { unified_number: '' }, { unified_number: null }] };
    const reference = String(body.doc_ref || '').trim();

    if (body.action === 'open') {
      if (!validVaultRef(reference) && !isUrl(reference)) return Response.json({ error: 'invalid' }, { status: 400 });
      const linked = await base44.asServiceRole.entities.LeaveRequest.filter({ ...scope, medical_report_url: reference }, { limit: 1, fields: ['id'] });
      if (!asList(linked).length) return Response.json({ error: 'not_found' }, { status: 404 });
      if (isUrl(reference)) return Response.json({ download_url: reference });
      try {
        const link = await getDocumentLinkInCompany(keys, reference);
        return Response.json({ download_url: buildDownloadUrl(link.token) });
      } catch (error) {
        const missing = String(error?.vaultDetail || error?.message || '').includes('file_missing');
        return Response.json({ error: missing ? 'file_missing' : 'not_found' }, { status: missing ? 410 : 404 });
      }
    }

    const page = await base44.asServiceRole.entities.LeaveRequest.filter(scope, {
      sort: '-created_date', limit: 50,
      ...(body.cursor?.leaves ? { cursor: body.cursor.leaves } : {}),
    });
    const reports = new Map();
    for (const leave of asList(page)) {
      const ref = String(leave.medical_report_url || '').trim();
      if (!validVaultRef(ref) && !isUrl(ref)) continue;
      if (reports.has(ref)) continue;
      reports.set(ref, {
        doc_ref: ref,
        leave_id: leave.id,
        start_date: leave.start_date,
        end_date: leave.end_date,
        uploaded_at: leave.created_date,
        available: true,
      });
    }
    const hasMore = !!page?.has_more;
    return Response.json({
      ok: true,
      employee: { id: target.id, full_name: target.full_name, unified_number: unified },
      items: [...reports.values()],
      has_more: hasMore,
      next_cursor: hasMore ? { leaves: page.next_cursor } : null,
    });
  } catch (error) {
    console.error('[companyMedicalReports]', error?.status || 'unavailable');
    return Response.json({ error: 'medical_archive_unavailable' }, { status: 502 });
  }
}