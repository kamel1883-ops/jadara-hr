import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyTurnstile, createRateLimiter } from "../../shared/turnstile.ts";
import { generateResetCode, RESET_CODE_TTL_MS } from "../../shared/ownerAuth.ts";
import { wrapEmailContent } from "../../shared/emailFooter.ts";
import { findEmployeesByNationalId, preferPortalEmployee } from "../../shared/vaultIdentity.ts";

// طلب استعادة كلمة مرور بوابة الموظف: يطابق الإقامة، يشترط أن يكون للموظف كلمة مرور
// مُنشأة مسبقاً (otherwise needs_registration)، ثم يُنشئ رمز 6 أرقام صالح 10 دقائق
// ويرسله إلى بريد الموظف المسجّل عبر SendEmail. (SendEmail يصل موثوقاً للمستخدمين
// المُسجّلين في التطبيق فقط؛ لغير المسجّلين قد يفشل — نُرجع email_failed ليُخبر المستخدم).
const rl = createRateLimiter(10 * 60 * 1000, 6);

export default async function (req) {
  try {
    const ip = rl.clientIp(req);
    if (rl.rateLimited(ip))
      return Response.json({ ok: false, error: "rate_limited", retry: true }, { status: 429 });

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const nid = String(body.national_id || "").trim();
    if (!nid)
      return Response.json({ ok: false, error: "missing" }, { status: 400 });

    const captchaToken = String(body.captcha_token || "");
    if (!captchaToken)
      return Response.json({ ok: false, error: "captcha_required" }, { status: 400 });
    if (!(await verifyTurnstile(captchaToken)))
      return Response.json({ ok: false, error: "captcha_failed" }, { status: 403 });

    const emp = preferPortalEmployee(await findEmployeesByNationalId(base44, nid));
    if (!emp) return Response.json({ ok: false, error: "not_found" });
    if ((emp.role_level || "") === "owner")
      return Response.json({ ok: false, error: "not_found" });
    if (!emp.portal_password_enabled || !emp.portal_password_hash)
      return Response.json({ ok: false, error: "needs_registration" });

    const email = String(emp.email || "").trim();
    if (!email) return Response.json({ ok: false, error: "no_email" });

    const code = generateResetCode();
    await base44.asServiceRole.entities.Employee.update(emp.id, {
      login_otp: code,
      login_otp_expires_at: Date.now() + RESET_CODE_TTL_MS,
      login_otp_attempts: 0,
    });

    let sent = false;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: "رمز استعادة كلمة مرور بوابة الموظف — جداره",
        ...wrapEmailContent(`رمز التحقق الخاص بك هو: ${code}\nالرمز صالح لمدة 10 دقائق.\nإن لم تطلب تغيير كلمة المرور فتجاهل هذه الرسالة.`),
      });
      sent = true;
    } catch {}

    if (!sent) return Response.json({ ok: false, error: "email_failed" }, { status: 502 });

    const [u, d] = email.split("@");
    const masked = (u ? u[0] : "*") + "***@" + (d || "");
    return Response.json({ ok: true, sent: true, email_hint: masked });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}