import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { signToken } from "../../shared/portalToken.ts";
import { verifyTurnstile, createRateLimiter } from "../../shared/turnstile.ts";
import { verifyPassword } from "../../shared/ownerAuth.ts";
import { findEmployeesByNationalId, preferPortalEmployee } from "../../shared/vaultIdentity.ts";
import { organizationForEmployee } from "../../shared/companyScope.ts";

// بوابة الموظف الذاتية — دخول برقم الإقامة + كلمة المرور + كابتشا.
// تاريخ الميلاد لم يعد يُستخدم للدخول بل للتسجيل الأول لمرة واحدة (registerEmployeePortal).
// عند المطابقة يُوقّع رمز جلسة (HMAC) يُستخدم للوصول لـ portalData.

const rl = createRateLimiter(10 * 60 * 1000, 12);
const APPROVER_TTL_MS = 8 * 3600 * 1000;
const EMPLOYEE_TTL_MS = 30 * 24 * 3600 * 1000;

export default async function (req) {
  try {
    const ip = rl.clientIp(req);
    if (rl.rateLimited(ip))
      return Response.json({ ok: false, error: "rate_limited", retry: true }, { status: 429 });

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const nid = String(body.national_id || "").trim();
    const password = String(body.password || "");
    if (!nid || !password)
      return Response.json({ ok: false, error: "missing" }, { status: 400 });

    const captchaToken = String(body.captcha_token || "");
    if (!captchaToken)
      return Response.json({ ok: false, error: "captcha_required" }, { status: 400 });
    if (!(await verifyTurnstile(captchaToken)))
      return Response.json({ ok: false, error: "captcha_failed" }, { status: 403 });

    const all = await findEmployeesByNationalId(base44, nid);
    const emp = preferPortalEmployee(all);
    if (!emp) return Response.json({ ok: false, error: "invalid_credentials" });
    if (emp.status && emp.status !== "active" && emp.status !== "on_leave")
      return Response.json({ ok: false, error: "inactive" });

    // منع دخول سجل مُعَدّ كـ "owner" عبر بوابة الموظف — المالك يدخل بوابة المالك فقط
    if ((emp.role_level || "") === "owner")
      return Response.json({ ok: false, error: "owner_use_owner_portal" }, { status: 403 });

    if (!emp.portal_password_enabled || !emp.portal_password_hash || !emp.portal_password_salt)
      return Response.json({ ok: false, error: "needs_registration" });

    const ok = await verifyPassword(password, emp.portal_password_salt, emp.portal_password_hash);
    if (!ok) return Response.json({ ok: false, error: "invalid_credentials" });

    const isApprover = !!(emp.is_approver_manager || emp.is_approver_finance || emp.is_approver_hr);
    const ttl = isApprover ? APPROVER_TTL_MS : EMPLOYEE_TTL_MS;
    const token = await signToken(emp.id, ttl);

    let org = null;
    try { org = await organizationForEmployee(base44, emp); } catch { org = null; }

    return Response.json({
      ok: true,
      token,
      expires_at: Date.now() + ttl,
      employee: {
        id: emp.id,
        full_name: emp.full_name,
        employee_number: emp.employee_number,
        position: emp.position,
        department: emp.department,
        unified_number: emp.unified_number || "",
        role_level: emp.role_level || "employee",
        is_approver_manager: !!emp.is_approver_manager,
        is_approver_finance: !!emp.is_approver_finance,
        is_approver_hr: !!emp.is_approver_hr,
      },
      org: org ? { name: org.name, logo_url: org.logo_url, unified_number: org.unified_number || emp.unified_number || "" } : null,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}