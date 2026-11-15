import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { signToken, verifyToken } from "../../shared/portalToken.ts";
import { findEmployeesByNationalId, preferPortalEmployee } from "../../shared/vaultIdentity.ts";
import { organizationForEmployee } from "../../shared/companyScope.ts";
import { createRateLimiter } from "../../shared/turnstile.ts";
import {
  newChallenge,
  signChallenge,
  verifyChallenge,
  verifyAssertion,
  parseAuthenticatorData,
  checkClientData,
  b64urlFromBytes,
  b64urlToBytes,
  cborDecode,
} from "../../shared/webauthn.ts";

/**
 * الدخول السريع لبوابة الموظف (بصمة / وجه / رمز شاشة الجهاز) عبر WebAuthn.
 *
 * التدفق:
 *  1) بعد دخول ناجح بكلمة المرور → action=register_options ثم register_verify
 *     (يُخزَّن المفتاح العمومي على سجل الموظف).
 *  2) في المرات القادمة → action=login_options (بمعرّف الجهاز المحفوظ على المتصفح)
 *     ثم login_verify → يُصدر رمز جلسة بوابة كامل بدون كلمة مرور.
 *
 * الأمان: نطلب userVerification=required (بصمة/وجه/رمز الجهاز)، ونطلب حضور المستخدم،
 * ونتحقق من التحدي الموقّع ومن rpId ومن توقيع الجهاز على الخادم.
 */

const APPROVER_TTL_MS = 8 * 3600 * 1000;
const EMPLOYEE_TTL_MS = 30 * 24 * 3600 * 1000;
const rl = createRateLimiter(10 * 60 * 1000, 40);

function hostFromRequest(req: Request): { rpId: string; origin: string } {
  const hostHeader = String(req.headers.get("host") || "").trim();
  const hostname = hostHeader.split(":")[0] || "localhost";
  const originHeader = String(req.headers.get("origin") || "").trim();
  let origin = "";
  if (originHeader) {
    try {
      const u = new URL(originHeader);
      // نقبل الأصل المرسل فقط إذا كان لنفس المضيف (منع تزوير الأصل)
      if (u.hostname === hostname) origin = `${u.protocol}//${u.host}`;
    } catch { /* ignore */ }
  }
  if (!origin) {
    const proto = hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https";
    origin = `${proto}://${hostHeader || hostname}`;
  }
  // rpId = اسم النطاق بدون منفذ (localhost مسموح في التطوير)
  return { rpId: hostname, origin };
}

async function issueSession(base44: any, emp: any) {
  const isApprover = !!(emp.is_approver_manager || emp.is_approver_finance || emp.is_approver_hr);
  const ttl = isApprover ? APPROVER_TTL_MS : EMPLOYEE_TTL_MS;
  const token = await signToken(emp.id, ttl);
  let org: any = null;
  try { org = await organizationForEmployee(base44, emp); } catch { org = null; }
  return {
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
    org: org
      ? { name: org.name, logo_url: org.logo_url, unified_number: org.unified_number || emp.unified_number || "" }
      : null,
    has_passkey: true,
  };
}

export default async function (req: Request) {
  try {
    const ip = rl.clientIp(req);
    if (rl.rateLimited(ip))
      return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const { rpId, origin } = hostFromRequest(req);
    const allowedOrigins = [origin, origin.replace("http://", "https://")];

    // ── 1) خيارات التسجيل (بعد دخول ناجح بكلمة المرور) ────────────────
    if (action === "register_options") {
      const session = await verifyToken(String(body.portal_token || ""));
      if (!session.ok) return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
      const emp = await base44.asServiceRole.entities.Employee.get(session.employeeId);
      if (!emp) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

      const challenge = newChallenge();
      const challengeToken = await signChallenge({
        kind: "reg",
        employeeId: emp.id,
        challenge,
        rpId,
        origin,
      });

      return Response.json({
        ok: true,
        challenge_token: challengeToken,
        rp_id: rpId,
        options: {
          challenge,
          rp: { id: rpId, name: "Jadara HR" },
          user: {
            id: b64urlFromBytes(new TextEncoder().encode(emp.id)),
            name: String(emp.national_id || emp.employee_number || emp.id),
            displayName: String(emp.full_name || "Employee"),
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          timeout: 120000,
          attestation: "none",
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
            requireResidentKey: false,
          },
          excludeCredentials: emp.passkey_credential_id
            ? [{ type: "public-key", id: emp.passkey_credential_id }]
            : [],
        },
      });
    }

    // ── 2) تحقق التسجيل ──────────────────────────────────────────────
    if (action === "register_verify") {
      const session = await verifyToken(String(body.portal_token || ""));
      if (!session.ok) return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
      const emp = await base44.asServiceRole.entities.Employee.get(session.employeeId);
      if (!emp) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

      const ticket = await verifyChallenge(String(body.challenge_token || ""));
      if (!ticket || ticket.kind !== "reg" || ticket.employeeId !== emp.id)
        return Response.json({ ok: false, error: "challenge_invalid" }, { status: 400 });

      const client = checkClientData(
        String(body.client_data_json || ""),
        "webauthn.create",
        String(ticket.challenge || ""),
        [...new Set([
          String(ticket.origin || ""),
          origin,
          String(ticket.origin || origin).replace("http://", "https://"),
          origin.replace("http://", "https://"),
        ].filter(Boolean))]
      );
      if (!client.ok) return Response.json({ ok: false, error: client.reason }, { status: 400 });

      // الشهادة تصل كـ attestationObject (CBOR) — نستخرج منه authData
      let authData: Uint8Array;
      try {
        const att = cborDecode(b64urlToBytes(String(body.attestation_object || ""))).value;
        authData = att?.authData;
        if (!(authData instanceof Uint8Array)) throw new Error("no_auth_data");
      } catch {
        return Response.json({ ok: false, error: "attestation_invalid" }, { status: 400 });
      }
      const parsed = parseAuthenticatorData(authData);
      if (!parsed.credentialId || !parsed.publicKey)
        return Response.json({ ok: false, error: "attestation_invalid" }, { status: 400 });

      const UV = (parsed.flags & 0x04) !== 0;
      if (!UV)
        return Response.json(
          { ok: false, error: "user_verification_required", message: "يلزم تأكيد البصمة أو الوجه أو رمز الجهاز." },
          { status: 400 }
        );

      await base44.asServiceRole.entities.Employee.update(emp.id, {
        passkey_credential_id: b64urlFromBytes(parsed.credentialId),
        passkey_public_key: b64urlFromBytes(parsed.publicKey),
        passkey_rp_id: rpId,
        passkey_created_at: new Date().toISOString(),
        passkey_last_used_at: new Date().toISOString(),
        passkey_enabled: true,
      });

      return Response.json({ ok: true, credential_id: b64urlFromBytes(parsed.credentialId), rp_id: rpId });
    }

    // ── 3) خيارات الدخول السريع ──────────────────────────────────────
    if (action === "login_options") {
      const nid = String(body.national_id || "").trim();
      const credentialId = String(body.credential_id || "").trim();
      if (!nid || !credentialId)
        return Response.json({ ok: false, error: "missing" }, { status: 400 });

      const all = await findEmployeesByNationalId(base44, nid);
      const emp = preferPortalEmployee(all);
      if (!emp || !emp.passkey_enabled || !emp.passkey_public_key)
        return Response.json({ ok: false, error: "no_passkey" }, { status: 404 });
      if (emp.status && emp.status !== "active" && emp.status !== "on_leave")
        return Response.json({ ok: false, error: "inactive" }, { status: 403 });
      if (String(emp.passkey_credential_id || "") !== credentialId)
        return Response.json({ ok: false, error: "credential_mismatch" }, { status: 403 });

      const challenge = newChallenge();
      const challengeToken = await signChallenge({
        kind: "login",
        employeeId: emp.id,
        challenge,
        rpId,
        origin,
        credentialId,
      });

      return Response.json({
        ok: true,
        challenge_token: challengeToken,
        rp_id: rpId,
        options: { challenge, timeout: 120000, userVerification: "required" },
        allow_credentials: [{ type: "public-key", id: credentialId }],
      });
    }

    // ── 4) تحقق الدخول السريع وإصدار الجلسة ──────────────────────────
    if (action === "login_verify") {
      const nid = String(body.national_id || "").trim();
      const ticket = await verifyChallenge(String(body.challenge_token || ""));
      if (!ticket || ticket.kind !== "login")
        return Response.json({ ok: false, error: "challenge_invalid" }, { status: 400 });

      const emp = await base44.asServiceRole.entities.Employee.get(String(ticket.employeeId));
      if (!emp || !emp.passkey_public_key)
        return Response.json({ ok: false, error: "no_passkey" }, { status: 404 });
      if (emp.status && emp.status !== "active" && emp.status !== "on_leave")
        return Response.json({ ok: false, error: "inactive" }, { status: 403 });
      if (nid && String(emp.national_id || "") !== nid)
        return Response.json({ ok: false, error: "credential_mismatch" }, { status: 403 });

      // نقبل أصل الطلب الحالي وأصل لحظة إصدار التحدي (ومعه نسخة https لوسطاء الـ proxy)
      const claimOrigins = [String(ticket.origin || ""), origin].filter(Boolean);
      const allowedOrigins = [...new Set([
        ...claimOrigins,
        ...claimOrigins.map((o) => (o.startsWith("http://") ? o.replace("http://", "https://") : o)),
      ])];

      const result = await verifyAssertion({
        publicKeyCborB64: String(emp.passkey_public_key),
        credentialIdB64: String(ticket.credentialId || ""),
        clientDataJSONB64: String(body.client_data_json || ""),
        authenticatorDataB64: String(body.authenticator_data || ""),
        signatureB64: String(body.signature || ""),
        expectedChallenge: String(ticket.challenge || ""),
        rpId: String(ticket.rpId || rpId),
        allowedOrigins,
      });

      if (!result.ok) {
        return Response.json(
          {
            ok: false,
            error: result.reason || "verify_failed",
            message:
              result.reason === "user_verification_required"
                ? "لم يتم تأكيد البصمة أو الوجه أو رمز الجهاز."
                : result.reason === "signature_invalid"
                  ? "تعذّر التحقق من توقيع الجهاز. أعِد تفعيل الدخول السريع من داخل البوابة، أو ادخل بكلمة المرور."
                  : "تعذّر التحقق من الجهاز. استخدم الدخول بكلمة المرور.",
          },
          { status: 401 }
        );
      }

      await base44.asServiceRole.entities.Employee.update(emp.id, {
        passkey_last_used_at: new Date().toISOString(),
      }).catch(() => {});

      return Response.json(await issueSession(base44, emp));
    }

    // ── 5) تعطيل الدخول السريع ───────────────────────────────────────
    if (action === "disable") {
      const session = await verifyToken(String(body.portal_token || ""));
      if (!session.ok) return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
      await base44.asServiceRole.entities.Employee.update(session.employeeId, {
        passkey_enabled: false,
        passkey_credential_id: "",
        passkey_public_key: "",
      });
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
