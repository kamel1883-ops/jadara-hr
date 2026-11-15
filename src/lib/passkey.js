// أدوات العميل للدخول السريع في بوابة الموظف (WebAuthn).
// يعمل في متصفح الجوال (Safari/Chrome) وفي التطبيق المثبَّت (PWA):
// يطلب من النظام البصمة (Face ID / Touch ID) أو بصمة الأصبع في أندرويد،
// وإن لم تتوفر، يعرض رمز شاشة الجهاز (نمط/PIN) — وهذا ما يوفره النظام نفسه
// عند طلب userVerification = "required".

const LS_KEY = "jadara_passkey_hint";

export function passkeySupported() {
  try {
    return Boolean(window.PublicKeyCredential && navigator.credentials?.create);
  } catch {
    return false;
  }
}

/** هل الجهاز فيه بصمة/وجه/رمز شاشة مقيّد بالمنصة؟ */
export async function platformAuthenticatorAvailable() {
  try {
    if (!window.PublicKeyCredential) return false;
    const fn = window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
    if (typeof fn !== "function") return false;
    return await fn.call(window.PublicKeyCredential);
  } catch {
    return false;
  }
}

export function toBytes(b64url) {
  const s = String(b64url || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function fromBytes(bytes) {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** تلميح محلي يُخبر شاشة الدخول بوجود دخول سريع مفعّل على هذا الجهاز */
export const passkeyHint = {
  save(nationalId, credentialId) {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ nationalId, credentialId })); } catch {}
  },
  load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const v = JSON.parse(raw);
      if (!v?.nationalId || !v?.credentialId) return null;
      return v;
    } catch { return null; }
  },
  clear() {
    try { localStorage.removeItem(LS_KEY); } catch {}
  },
};

/** تسجيل الجهاز — بعد دخول ناجح بكلمة المرور */
export async function registerPasskey({ base44, portalToken, nationalId }) {
  const start = await base44.functions.invoke("portalPasskey", {
    action: "register_options",
    portal_token: portalToken,
  });
  const data = start?.data || start;
  if (!data?.ok) throw new Error(data?.error || "register_options_failed");

  const o = data.options;
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: toBytes(o.challenge),
      rp: o.rp,
      user: { id: toBytes(o.user.id), name: o.user.name, displayName: o.user.displayName },
      pubKeyCredParams: o.pubKeyCredParams,
      timeout: o.timeout,
      attestation: o.attestation,
      authenticatorSelection: o.authenticatorSelection,
      excludeCredentials: (o.excludeCredentials || []).map((c) => ({ type: "public-key", id: toBytes(c.id) })),
    },
  });

  const r = cred.response;
  const done = await base44.functions.invoke("portalPasskey", {
    action: "register_verify",
    portal_token: portalToken,
    challenge_token: data.challenge_token,
    client_data_json: fromBytes(new Uint8Array(r.clientDataJSON)),
    attestation_object: fromBytes(new Uint8Array(r.attestationObject)),
  });

  const out = done?.data || done;
  if (out?.ok && nationalId) passkeyHint.save(nationalId, out.credential_id);
  return out;
}

/** الدخول السريع — بصمة/وجه/رمز الجهاز ثم إصدار جلسة بوابة */
export async function loginWithPasskey({ base44, nationalId, credentialId }) {
  const start = await base44.functions.invoke("portalPasskey", {
    action: "login_options",
    national_id: nationalId,
    credential_id: credentialId,
  });
  const data = start?.data || start;
  if (!data?.ok) throw new Error(data?.error || "login_options_failed");

  const o = data.options;
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: toBytes(o.challenge),
      timeout: o.timeout,
      userVerification: o.userVerification || "required",
      rpId: data.rp_id,
      allowCredentials: (data.allow_credentials || []).map((c) => ({
        type: "public-key",
        id: toBytes(c.id),
      })),
    },
  });

  const r = assertion.response;
  const done = await base44.functions.invoke("portalPasskey", {
    action: "login_verify",
    national_id: nationalId,
    challenge_token: data.challenge_token,
    client_data_json: fromBytes(new Uint8Array(r.clientDataJSON)),
    authenticator_data: fromBytes(new Uint8Array(r.authenticatorData)),
    signature: fromBytes(new Uint8Array(r.signature)),
  });

  const out = done?.data || done;
  if (!out?.ok) throw new Error(out?.message || out?.error || "login_failed");
  return out;
}
