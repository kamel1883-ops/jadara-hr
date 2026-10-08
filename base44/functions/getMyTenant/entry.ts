import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// إرجاع بيانات منشأة المستخدم الحالي (الكيان Tenant):
// 1) بمطابقة بريده مع بريد الاتصال أو بريد مسؤول المنشأة.
// 2) أو بمطابقة معرّف حسابه كمسؤول للمنشأة.
// 3) أو بصفته موظفاً مسجّلاً — تُحدَّد منشأته من الرقم الموحّد في سجل موظفه.
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

    let t = tenants.find((x: any) => norm(x.contact_email) === email || norm(x.admin_email) === email);
    if (!t) t = tenants.find((x: any) => String(x.admin_user_id || '') === String(user.id || ''));
    if (!t) {
      // موظف مسجّل أو مسؤول مُدعوّ: منشأته هي المنشأة المطابقة للرقم الموحّد في سجل موظفه
      let emp: any = null;
      try {
        const byUser = await base44.asServiceRole.entities.Employee.filter({ user_id: user.id });
        emp = (byUser || [])[0] || null;
      } catch {}
      if (!emp) {
        try {
          const byEmail = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
          emp = (byEmail || [])[0] || null;
        } catch {}
      }
      const un = String(emp?.unified_number || '').trim();
      if (un) t = tenants.find((x: any) => String(x.unified_number || '').trim() === un);
    }
    if (!t) return Response.json({ ok: true, found: false });

    return Response.json({
      ok: true,
      found: true,
      tenant: {
        name: t.name || '',
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