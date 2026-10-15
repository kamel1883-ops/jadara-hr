// Read-only verification, removed after the document-query checks complete.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { companyOwnsLeaveDocument } from '../../shared/leaveDocuments.ts';
import { resolveCompanyContext } from '../../shared/vaultIdentity.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });
    const leave = await base44.asServiceRole.entities.LeaveRequest.get('6a957639fd61ab170805a498');
    const employee = await base44.asServiceRole.entities.Employee.get(leave.employee_id);
    const page = await base44.asServiceRole.entities.LeaveRequest.filter({ id: leave.id, settlement_pdf_url: leave.settlement_pdf_url }, { limit: 1, fields: ['employee_id'] });
    const company = await resolveCompanyContext(base44, user);
    const sameCompany = await companyOwnsLeaveDocument(base44, employee, leave.settlement_pdf_url);
    const otherCompany = await companyOwnsLeaveDocument(base44, { unified_number: '__not_this_company__' }, leave.settlement_pdf_url);
    return Response.json({ ok: true, query_found: page.items?.length === 1, same_company_allowed: sameCompany, other_company_denied: !otherCompany, session_company_resolved: !!company.unified });
  } catch (error) {
    return Response.json({ ok: false, error: error.vaultCode || 'verification_failed' }, { status: 500 });
  }
}