import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { verifyToken } from '../../shared/portalToken.ts';
import { companyVaultAccess, tenantKeysForRead, tenantKeysForEmployee } from '../../shared/vaultIdentity.ts';
import { validVaultRef } from '../../shared/vaultAuthorization.ts';
import { medicalReportPage } from '../../shared/medicalReportsVault.ts';
import { getDocumentLink, getDocumentLinkInCompany, buildDownloadUrl } from '../../shared/vaultClient.ts';

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
    // Legacy storage accounts are locations, not proof of ownership. Lookup always also
    // requires this exact, unambiguous employee reference; nothing is assigned by creator/name/date.
    const tenants = await base44.asServiceRole.entities.Tenant.filter({ unified_number: unified }, { limit: 20, fields: ['admin_user_id'] });
    const archiveKeys = [...new Set([unified, target.created_by_id, ...tenants.items.map(row => row.admin_user_id), ...keys].filter(Boolean))].slice(0, 24);
    const scope = { employee_id: target.id, leave_type: 'sick', $or: [{ unified_number: unified }, { unified_number: '' }, { unified_number: null }] };
    const reference = String(body.doc_ref || '').trim();
    const ambiguous = target.emp_ref ? await base44.asServiceRole.entities.Employee.count({ emp_ref: target.emp_ref, id: { $ne: target.id } }) > 0 : false;
    if (body.action === 'open') {
      if (!validVaultRef(reference) && !/^https?:\/\//i.test(reference)) return Response.json({ error: 'invalid' }, { status: 400 });
      const linked = await base44.asServiceRole.entities.LeaveRequest.filter({ ...scope, medical_report_url: reference }, { limit: 1 });
      if (linked.items.length && /^https?:\/\//i.test(reference)) return Response.json({ download_url: reference });
      const archive = ambiguous ? { items: [] } : await medicalReportPage(archiveKeys, target.emp_ref, null, reference);
      const doc = archive.items.find(row => row.doc_ref === reference);
      if (doc) {
        if (!doc.available) return Response.json({ error: 'file_missing' }, { status: 410 });
        const link = await getDocumentLink(doc.tenant_id, reference);
        return Response.json({ download_url: buildDownloadUrl(link.token) });
      }
      if (linked.items.length) {
        const link = await getDocumentLinkInCompany(keys, reference);
        return Response.json({ download_url: buildDownloadUrl(link.token) });
      }
      return Response.json({ error: archive.unavailable || 'not_found' }, { status: archive.unavailable ? 503 : 404 });
    }
    const cursor = body.cursor || {};
    const [linked, archive] = await Promise.all([
      cursor.leaves_done ? { items: [], has_more: false } : base44.asServiceRole.entities.LeaveRequest.filter(scope, { sort: '-created_date', limit: 50, ...(cursor.leaves ? { cursor: cursor.leaves } : {}) }),
      ambiguous || cursor.vault_done ? { items: [], has_more: false, unavailable: ambiguous ? 'ambiguous_employee_reference' : undefined } : medicalReportPage(archiveKeys, target.emp_ref, cursor.vault || null).catch(() => ({ items: [], unavailable: 'archive_unavailable' })),
    ]);
    const reports = new Map();
    for (const leave of linked.items) {
      const ref = String(leave.medical_report_url || '').trim();
      if (validVaultRef(ref) || /^https?:\/\//i.test(ref)) reports.set(ref, { doc_ref: ref, leave_id: leave.id, start_date: leave.start_date, end_date: leave.end_date, uploaded_at: leave.created_date, available: true });
    }
    for (const doc of archive.items) reports.set(doc.doc_ref, { ...reports.get(doc.doc_ref), doc_ref: doc.doc_ref, file_name: doc.file_name, uploaded_at: doc.created_at, available: doc.available });
    const hasMore = !!(linked.has_more || archive.has_more);
    return Response.json({ ok: true, employee: { id: target.id, full_name: target.full_name, unified_number: unified }, items: [...reports.values()], warning: archive.unavailable || (!target.emp_ref ? 'missing_employee_reference' : ''), has_more: hasMore, next_cursor: hasMore ? { leaves: linked.next_cursor || null, vault: archive.next_cursor || null, leaves_done: !linked.has_more, vault_done: !archive.has_more } : null });
  } catch (error) {
    console.error('[companyMedicalReports]', error?.status || 'unavailable');
    return Response.json({ error: 'medical_archive_unavailable' }, { status: 502 });
  }
}