import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// إرجاع بيانات منشأة المستخدم الحالي (الكيان Tenant):
// 1) بمطابقة معرّف حسابه كمسؤول للمنشأة.
// 2) أو بريده إذا طابق منشأة واحدة فقط.
// 3) أو بصفته موظفاً، إذا كان رقمه الموحّد واحداً لا يطابق أكثر من منشأة.
// تُستخدم هذه الدالة في كل منصة جداره لتحديد منشأة العميل الحالية (نطاق العزل).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (e) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = String(user.email || '').trim().toLowerCase();
    if (!email) return Response.json({ error: 'no email' }, { status: 400 });

    const tenants = (await base44.asServiceRole.entities.Tenant.filter({})) || [];
    const norm = (x: any) => String(x || '').trim().toLowerCase();

    const uid = String(user.id || '');
    // الحساب المرتبط بالمنشأة أولاً. البريد يُستخدم فقط إذا طابق منشأة واحدة، حتى لا تُفتح شركة أخرى.
    let t = tenants.find((x: any) => uid && String(x.admin_user_id || '') === uid);
    if (!t) {
      const emailHits = tenants.filter((x: any) => norm(x.contact_email) === email || norm(x.admin_email) === email);
      if (emailHits.length === 1) t = emailHits[0];
    }
    if (!t) {
      // موظف مسجّل: منشأته من رقمه الموحّد، بشرط ألا تتعدد المنشآت على نفس الحساب.
      const asList = (page: any) => Array.isArray(page) ? page : (Array.isArray(page?.items) ? page.items : []);
      let emps: any[] = [];
      try { emps = asList(await base44.asServiceRole.entities.Employee.filter({ user_id: user.id })); } catch {}
      if (!emps.length) {
        try { emps = asList(await base44.asServiceRole.entities.Employee.filter({ email: user.email })); } catch {}
      }
      const uns = [...new Set(emps.map((e) => String(e?.unified_number || '').trim()).filter(Boolean))];
      if (uns.length === 1) t = tenants.find((x: any) => String(x.unified_number || '').trim() === uns[0]);
    }
    if (!t) return Response.json({ ok: true, found: false });

    return Response.json({
      ok: true,
      found: true,
      tenant: {
        name: t.name || '',
        logo_url: t.logo_url || '',
        industry: t.industry || '',
        city: t.city || '',
        contact_name: t.contact_name || '',
        contact_phone: t.contact_phone || '',
        unified_number: t.unified_number || '',
        contact_email: t.contact_email || '',
        vat_number: t.vat_number || '',
        country: t.country || '',
        status: t.status || '',
        employee_count: t.employee_count || 0,
        pricing_tier: t.pricing_tier || '',
        quoted_amount: t.quoted_amount || 0,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}