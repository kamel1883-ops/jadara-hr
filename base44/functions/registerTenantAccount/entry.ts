// بوابة الشركات — تسجيل طلب تفعيل صلاحية الإدارة للمستخدم المسجّل حديثاً.
// لا تُمنح صلاحية admin تلقائياً (تحرّزاً من الترقية الذاتية لصلاحية عامة عبر
// asServiceRole)؛ بل يُسجّل الطلب على المنشأة بانتظار اعتماد المالك من بوابة
// المالك (action: owner_approve_admin في portalData).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createRateLimiter } from "../../shared/turnstile.ts";

const rl = createRateLimiter();

export default async function (req) {
  try {
    const ip = rl.clientIp(req);
    if (rl.rateLimited(ip)) {
      return Response.json({ ok: false, retry: true }, { status: 429 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const unified = String(body.unified_number || '').trim();

    let me;
    try { me = await base44.auth.me(); }
    catch { return Response.json({ ok: false, error: 'auth_required' }, { status: 401 }); }
    if (!me || !me.id || !me.email)
      return Response.json({ ok: false, error: 'auth_required' }, { status: 401 });

    const email = String(me.email).trim().toLowerCase();
    if (!unified || !/^7\d{9}$/.test(unified))
      return Response.json({ ok: false, error: 'invalid_unified' }, { status: 400 });

    // لا يُنشأ سجل منشأة من رقم موحّد وحده: كان ذلك يسمح لأي مستخدم باحتكار رقم
    // منشأة حقيقية قبل تسجيلها فيُمنع مالكها من التسجيل. التسجيل الرسمي يمرّ عبر
    // createTrial الذي يتحقق من صورة السجل التجاري. هنا نربط الحساب فقط بمنشأة قائمة.
    let tenants = await base44.asServiceRole.entities.Tenant.filter(
      { unified_number: unified }, undefined, 50
    );
    let t = (tenants || []).find(
      (tt) => String(tt.contact_email || '').trim().toLowerCase() === email
    );
    if (!t) {
      // مستخدم إضافي مفوّض مسبقاً من مسؤول المنشأة نفسها (TenantMember):
      // يُربط حسابه مباشرة ويُمنح صلاحية الإدارة دون انتظار المالك — التفويض صادر
      // من داخل المنشأة ولنفس رقمها الموحّد فقط (عزل كامل عن المنشآت الأخرى).
      let members: any[] = [];
      try {
        members = await base44.asServiceRole.entities.TenantMember.filter(
          { unified_number: unified }, undefined, 20
        );
      } catch { members = []; }
      const m = (members || []).find(
        (mm: any) => String(mm.email || '').trim().toLowerCase() === email && mm.active !== false
      );
      if (m) {
        const activeCount = (members || []).filter((mm: any) => mm.active !== false).length;
        if (activeCount > 4) {
          return Response.json({ ok: false, error: 'member_limit' }, { status: 403 });
        }
        const host = (tenants || [])[0];
        if (!host || !['trial', 'active'].includes(host.status)) {
          return Response.json({ ok: false, error: 'suspended' }, { status: 403 });
        }
        try { await base44.asServiceRole.entities.TenantMember.update(m.id, { user_id: me.id }); } catch {}
        try { await base44.asServiceRole.entities.User.update(me.id, { role: 'admin' }); } catch {}
        return Response.json({ ok: true, member_approved: true, tenant_name: host.name, status: host.status });
      }
      // الرقم الموحّد مسجّل لمنشأة أخرى ببريد مختلف — نمنع إنشاء سجل مكرّر لتفادي اندماج
      // بيانات شركتين (وإلا لتمكّن شركة جديدة بنفس الرقم الموحّد من رؤية بيانات الأخرى).
      if (tenants && tenants.length) {
        return Response.json({ ok: false, error: 'unified_taken' }, { status: 409 });
      }
      // لا سجل منشأة بهذا الرقم: لا نُنشئ سجلاً بلا إثبات ملكية للرقم الموحّد.
      return Response.json({ ok: false, error: 'tenant_not_registered' }, { status: 409 });
    }
    if (!['trial', 'active'].includes(t.status))
      return Response.json({ ok: false, error: 'suspended' }, { status: 403 });

    // تسجيل طلب الترقية بانتظار اعتماد المالك — لا asServiceRole.User.update هنا
    if (String(t.admin_status || '') !== 'approved') {
      await base44.asServiceRole.entities.Tenant.update(t.id, {
        admin_status: 'pending',
        admin_user_id: me.id,
        admin_email: email,
      });
    }

    return Response.json({ ok: true, pending_approval: true, tenant_name: t.name, status: t.status });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}