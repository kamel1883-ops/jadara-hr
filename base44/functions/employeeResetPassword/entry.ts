import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { hashPassword } from "../../shared/ownerAuth.ts";
import { verifyTurnstile, createRateLimiter } from "../../shared/turnstile.ts";
import { findEmployeesByNationalId, preferPortalEmployee } from "../../shared/vaultIdentity.ts";

// إعادة تعيين كلمة مرور بوابة الموظف: يتحقق من رمز الاستعادة (غير منتهٍ) مع تقييد المعدّل
// وقفل بعد عدد محاولات فاشل، ثم يخزّن تجزئة كلمة المرور الجديدة ويمسح الرمز والمحاولات.
const MAX_ATTEMPTS = 5;
const rl = createRateLimiter(10 * 60 * 1000, 8);

export default async function (req) {
  try {
    const ip = rl.clientIp(req);
    if (rl.rateLimited(ip)) return Response.json({ ok: false, retry: true }, { status: 429 });

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const nid = String(body.national_id || "").trim();
    const code = String(body.otp_code || "").trim();
    const newPass = String(body.new_password || "");
    if (!nid || !code || !newPass)
      return Response.json({ ok: false, error: "missing" }, { status: 400 });
    if (newPass.length < 6)
      return Response.json({ ok: false, error: "weak_password" }, { status: 400 });

    const captchaToken = String(body.captcha_token || "");
    if (!(await verifyTurnstile(captchaToken)))
      return Response.json({ ok: false, error: "captcha_failed" }, { status: 403 });

    const emp = preferPortalEmployee(await findEmployeesByNationalId(base44, nid));
    if (!emp) return Response.json({ ok: false, error: "invalid_code" }, { status: 400 });
    if ((emp.role_level || "") === "owner")
      return Response.json({ ok: false, error: "invalid_code" }, { status: 400 });
    if (!emp.portal_password_enabled || !emp.portal_password_hash)
      return Response.json({ ok: false, error: "needs_registration" });

    const attempts = Number(emp.login_otp_attempts) || 0;
    if (attempts >= MAX_ATTEMPTS) {
      if (emp.login_otp)
        await base44.asServiceRole.entities.Employee.update(emp.id, { login_otp: "", login_otp_expires_at: 0 });
      return Response.json({ ok: false, error: "locked" }, { status: 429 });
    }

    if (!emp.login_otp || emp.login_otp !== code) {
      await base44.asServiceRole.entities.Employee.update(emp.id, { login_otp_attempts: attempts + 1 });
      return Response.json({ ok: false, error: "invalid_code" }, { status: 400 });
    }

    if (!emp.login_otp_expires_at || Date.now() > emp.login_otp_expires_at) {
      await base44.asServiceRole.entities.Employee.update(emp.id, {
        login_otp: "", login_otp_expires_at: 0, login_otp_attempts: 0,
      });
      return Response.json({ ok: false, error: "expired_code" }, { status: 400 });
    }

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