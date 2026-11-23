import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyTurnstile, createRateLimiter } from "../../shared/turnstile.ts";
import { hashPassword } from "../../shared/ownerAuth.ts";
import { resolvePortalEmployee, birthDateCheck } from "../../shared/portalIdentity.ts";
import { findEmployeesByNationalId } from "../../shared/vaultIdentity.ts";

// التسجيل الأول (مرة واحدة) لبوابة الموظف الذاتية:
// يتحقق برقم الإقامة + تاريخ الميلاد من سجل الموارد البشرية (تحقق لمرة واحدة)،
// ثم يخزّن تجزئة كلمة مرور يختارها الموظف ويفعّل الحساب.
// إن كان الموظف قد أنشأ كلمة مرور مسبقاً يُرفض للمحافظة على الأمان (already_registered).
const rl = createRateLimiter(10 * 60 * 1000, 60);

export default async function (req) {
  try {
    const ip = rl.clientIp(req);
    if (rl.rateLimited(ip))
      return Response.json({ ok: false, error: "rate_limited", retry: true }, { status: 429 });

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const nid = String(body.national_id || "").trim();
    const birthDate = String(body.birth_date || "").trim();
    const newPass = String(body.new_password || "");
    if (!nid || !birthDate || !newPass)
      return Response.json({ ok: false, error: "missing" }, { status: 400 });
    if (newPass.length < 6)
      return Response.json({ ok: false, error: "weak_password" }, { status: 400 });

    // التحقق البشري اختياري (لا يمنع التسجيل عند تعذّر تحميل ودجة Cloudflare).
    // الحماية الفعلية: حدّ المحاولات + مطابقة تاريخ الميلاد من الخزنة.
    const captchaToken = String(body.captcha_token || "");
    if (captchaToken && !(await verifyTurnstile(captchaToken)))
      return Response.json({ ok: false, error: "captcha_failed" }, { status: 403 });

    const emp = await resolvePortalEmployee(base44, nid);
    if (!emp) return Response.json({ ok: false, error: "not_matched" });
    // تاريخ الميلاد يُطابق من الخزنة لسجل الموظف نفسه — لا يُقبل رقم الهوية وحده
    let birth = await birthDateCheck(base44, emp, birthDate);
    if (!birth.ok) {
      // المطابقة الموثوقة: بحث الخزنة برقم الهوية وتاريخ الميلاد معاً — نفس مصدر
      // التاريخ الذي تعرضه شاشة الموظف، فلا يُرفض تاريخ موجود في النظام.
      const matched = await Promise.race([
        findEmployeesByNationalId(base44, nid, birthDate).catch(() => [] as any[]),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 7000)),
      ]);
      if ((matched || []).length) birth = { ok: true, reason: "ok" };
    }
    if (!birth.ok) return Response.json({ ok: false, error: "not_matched" });
    if (emp.status && emp.status !== "active" && emp.status !== "on_leave")
      return Response.json({ ok: false, error: "inactive" });
    if ((emp.role_level || "") === "owner")
      return Response.json({ ok: false, error: "owner_use_owner_portal" }, { status: 403 });

    if (emp.portal_password_enabled && emp.portal_password_hash)
      return Response.json({ ok: false, error: "already_registered" });

    const { hash, salt } = await hashPassword(newPass);
    await base44.asServiceRole.entities.Employee.update(emp.id, {
      portal_password_hash: hash,
      portal_password_salt: salt,
      portal_password_enabled: true,
      login_otp: "",
      login_otp_expires_at: 0,
      login_otp_attempts: 0,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}