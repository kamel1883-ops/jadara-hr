// بوابة الشركات: التحقق من تطابق البريد + الرقم الموحد مع سجل منشأة موجود.
// دالة عامة (قبل تسجيل الدخول) — محمية بـ Turnstile وتقييد المعدل لمنع استعراض البيانات.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyTurnstile, createRateLimiter } from "../../shared/turnstile.ts";

const rl = createRateLimiter();

export default async function (req) {
  try {
    const ip = rl.clientIp(req);
    if (rl.rateLimited(ip)) {
      return Response.json({ valid: false, retry: true }, { status: 429 });
    }

    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch {}

    // تحقق بشري إلزامي — يمنع الاستعراض الآلي لبريد المنشآت وأرقامها الموحدة.
    const turnstileOk = await verifyTurnstile(String(body.turnstileToken || ''));
    if (!turnstileOk) {
      return Response.json({ valid: false, captcha: false });
    }

    const email = String(body.email || '').trim().toLowerCase();
    const unified = String(body.unified_number || '').trim();

    if (!email || !unified || !/^7\d{9}$/.test(unified)) {
      return Response.json({ valid: false });
    }

    // الرقم الموحد هو المعرّف الأساسي للمنشأة — نفلتر به ثم نقارن البريد بشكل غير حساس للحالة.
    const tenants = await base44.asServiceRole.entities.Tenant.filter(
      { unified_number: unified },
      undefined,
      50
    );

    let t = (tenants || []).find(
      (tt) => String(tt.contact_email || '').trim().toLowerCase() === email
    );

    // مستخدم إضافي مفوّض من المنشأة نفسها (TenantMember): يُقبل بنفس الرقم الموحّد
    // طالما عضويته نشطة — معزول تماماً عن أي منشأة أخرى.
    if (!t) {
      let members: any[] = [];
      try {
        members = await base44.asServiceRole.entities.TenantMember.filter(
          { unified_number: unified }, undefined, 20
        );
      } catch { members = []; }
      const m = (members || []).find(
        (mm: any) => String(mm.email || '').trim().toLowerCase() === email && mm.active !== false
      );
      if (!m) return Response.json({ valid: false });
      t = (tenants || [])[0] || null;
      if (!t) return Response.json({ valid: false });
    }
    if (!["trial", "active"].includes(t.status)) {
      return Response.json({ valid: false, suspended: true });
    }

    // تجربة منتهية: بعد انقضاء 30 يوماً، يُمنع الدخول تلقائياً حتى يتدخل المالك
    // يدوياً (بتمديد فترة التجربة أو تفعيل الاشتراك السنوي) من بوابة المالك.
    if (t.status === "trial" && t.trial_end) {
      const end = new Date(t.trial_end);
      if (!isNaN(end.getTime()) && end.getTime() < Date.now()) {
        return Response.json({ valid: false, trial_ended: true });
      }
    }

    // الاشتراك السنوي يبقى مفتوحاً طوال السنة — لا توقف تلقائي.
    return Response.json({ valid: true });
  } catch {
    return Response.json({ valid: false });
  }
}