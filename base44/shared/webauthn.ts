// أدوات WebAuthn للدخول السريع في بوابة الموظف.
// يسمح للجهاز (آيفون/أندرويد) بتأكيد هوية صاحب الجهاز عبر البصمة أو الوجه أو رمز الشاشة،
// ثم نُصدر له جلسة بوابة كاملة — بدون كلمة مرور.
//
// ما نتحقق منه على الخادم (ولا يجوز التساهل فيه):
//  1) أن الـ challenge الذي وقعناه نحن هو نفسه في clientDataJSON (منع إعادة الاستخدام).
//  2) أن clientDataJSON.type = "webauthn.get" وأن origin مطابق لموقعنا.
//  3) أن rpIdHash = SHA-256(rpId) (منع استخدام مفتاح موقع آخر).
//  4) أن رايتَي UP (حضور المستخدم) و UV (تحقق المستخدم: بصمة/وجه/رمز) مرفوعتان.
//  5) أن التوقيع صحيح على المفتاح العمومي المحفوظ لهذا الجهاز.

const enc = new TextEncoder();

function portalSecret(): string {
  const secret = Deno.env.get("CRON_SECRET") || "";
  if (!secret) throw new Error("CRON_SECRET is not configured");
  return secret;
}

async function hmacB64url(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(portalSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return b64urlFromBytes(new Uint8Array(sig));
}

export function b64urlFromBytes(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlToBytes(str: string): Uint8Array {
  const s = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** يوقّع حِزمة تحدي (challenge) قصيرة العمر ويُعيدها كرمز واحد */
export async function signChallenge(payload: Record<string, unknown>, ttlMs = 5 * 60 * 1000): Promise<string> {
  const body = { ...payload, exp: Date.now() + ttlMs, n: crypto.randomUUID() };
  const raw = JSON.stringify(body);
  const data = b64urlFromBytes(enc.encode(raw));
  const sig = await hmacB64url(data);
  return `${data}.${sig}`;
}

export async function verifyChallenge(token: string): Promise<any | null> {
  try {
    const [data, sig] = String(token || "").split(".");
    if (!data || !sig) return null;
    const expected = await hmacB64url(data);
    if (expected !== sig) return null;
    const parsed = JSON.parse(new TextDecoder().decode(b64urlToBytes(data)));
    if (!parsed?.exp || Date.now() > Number(parsed.exp)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * نطاق الموقع (rpId) وأصله من الطلب نفسه — يُستخدم في التسجيل والتحقق وفي
 * تأكيد الحضور بالبصمة. rpId = اسم المضيف بلا منفذ، والأصل يُقبل فقط إن طابق المضيف.
 */
export function relyingParty(req: Request): { rpId: string; origin: string } {
  const hostHeader = String(req.headers.get("host") || "").trim();
  const hostname = hostHeader.split(":")[0] || "localhost";
  const originHeader = String(req.headers.get("origin") || "").trim();
  let origin = "";
  if (originHeader) {
    try {
      const u = new URL(originHeader);
      if (u.hostname === hostname) origin = `${u.protocol}//${u.host}`;
    } catch { /* تجاهل */ }
  }
  if (!origin) {
    const proto = hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https";
    origin = `${proto}://${hostHeader || hostname}`;
  }
  return { rpId: hostname, origin };
}

export function newChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64urlFromBytes(bytes);
}

// ── فك ترميز CBOR مبسّط (يكفي لمفاتيح COSE) ───────────────────────────
export function cborDecode(buf: Uint8Array): { value: any; offset: number } {
  let offset = 0;

  const readBytes = (n: number) => {
    const out = buf.slice(offset, offset + n);
    offset += n;
    return out;
  };

  function readLength(info: number): number {
    if (info < 24) return info;
    if (info === 24) return readBytes(1)[0];
    if (info === 25) {
      const b = readBytes(2);
      return (b[0] << 8) | b[1];
    }
    if (info === 26) {
      const b = readBytes(4);
      return ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3];
    }
    if (info === 27) {
      const b = readBytes(8);
      let v = 0;
      for (let i = 0; i < 8; i++) v = v * 256 + b[i];
      return v;
    }
    throw new Error("cbor_unsupported_length");
  }

  function readItem(): any {
    if (offset >= buf.length) throw new Error("cbor_eof");
    const initial = buf[offset++];
    const major = initial >> 5;
    const info = initial & 0x1f;

    if (major === 0) return readLength(info);
    if (major === 1) return -1 - readLength(info);
    if (major === 2) {
      const len = readLength(info);
      return readBytes(len);
    }
    if (major === 3) {
      const len = readLength(info);
      return new TextDecoder().decode(readBytes(len));
    }
    if (major === 4) {
      const len = readLength(info);
      const arr: any[] = [];
      for (let i = 0; i < len; i++) arr.push(readItem());
      return arr;
    }
    if (major === 5) {
      const len = readLength(info);
      const map: Record<string, any> = {};
      for (let i = 0; i < len; i++) {
        const k = readItem();
        map[String(k)] = readItem();
      }
      return map;
    }
    if (major === 6) {
      readLength(info); // tag — نتجاهله
      return readItem();
    }
    // major 7: قيم بسيطة
    if (info === 20) return false;
    if (info === 21) return true;
    if (info === 22) return null;
    return null;
  }

  const value = readItem();
  return { value, offset };
}

/** يحوّل مفتاح COSE (بايتات) إلى CryptoKey صالح للتحقق */
export async function coseToCryptoKey(cose: Uint8Array): Promise<CryptoKey> {
  const { value: key } = cborDecode(cose);
  if (!key || typeof key !== "object") throw new Error("cose_invalid");
  const kty = Number(key["1"]);

  if (kty === 2) {
    // EC2
    const crv = Number(key["-1"]);
    if (crv !== 1) throw new Error("cose_curve_unsupported");
    const x = b64urlFromBytes(key["-2"] as Uint8Array);
    const y = b64urlFromBytes(key["-3"] as Uint8Array);
    return crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", x, y, ext: true },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
  }

  if (kty === 3) {
    // RSA
    const n = b64urlFromBytes(key["-1"] as Uint8Array);
    const e = b64urlFromBytes(key["-2"] as Uint8Array);
    return crypto.subtle.importKey(
      "jwk",
      { kty: "RSA", n, e, ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }

  throw new Error("cose_key_unsupported");
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * تحويل توقيع ECDSA من صيغة ASN.1/DER (التي يرسلها الجهاز في WebAuthn)
 * إلى الصيغة الخام r||s التي يتطلبها crypto.subtle.verify.
 * بدون هذا التحويل يفشل التحقق دائماً على آيفون/أندرويد (Face ID / بصمة)
 * فيُرفض الدخول السريع بخطأ 401.
 */
function derSignatureToRaw(der: Uint8Array): Uint8Array | null {
  try {
    if (der.length < 8 || der[0] !== 0x30) return null;
    let offset = 2;
    if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f); // طول طويل الشكل
    const readInt = (): Uint8Array | null => {
      if (offset + 2 > der.length || der[offset] !== 0x02) return null;
      const len = der[offset + 1];
      const start = offset + 2;
      if (start + len > der.length) return null;
      offset = start + len;
      return der.slice(start, start + len);
    };
    const r = readInt();
    const s = readInt();
    if (!r || !s) return null;
    const out = new Uint8Array(64);
    const put = (v: Uint8Array, at: number): boolean => {
      let src = v;
      while (src.length > 32 && src[0] === 0) src = src.slice(1); // إزالة بايت الإشارة
      if (src.length > 32) return false;
      out.set(src, at + (32 - src.length));
      return true;
    };
    if (!put(r, 0) || !put(s, 32)) return null;
    return out;
  } catch {
    return null;
  }
}

async function verifySignature(
  key: CryptoKey,
  algorithm: any,
  signature: Uint8Array,
  data: Uint8Array
): Promise<boolean> {
  const candidates: Uint8Array[] = [signature];
  if (algorithm?.name === "ECDSA") {
    const raw = signature.length === 64 ? signature : derSignatureToRaw(signature);
    if (raw && !bytesEqual(raw, signature)) candidates.unshift(raw);
  }
  for (const sig of candidates) {
    try {
      if (await crypto.subtle.verify(algorithm, key, sig, data)) return true;
    } catch { /* جرّب الصيغة الأخرى */ }
  }
  return false;
}

/** يتحقق من clientDataJSON: النوع، التحدي، والأصل */
export function checkClientData(
  clientDataJSONB64: string,
  expectedType: "webauthn.create" | "webauthn.get",
  expectedChallenge: string,
  allowedOrigins: string[]
): { ok: boolean; reason?: string } {
  try {
    const json = JSON.parse(new TextDecoder().decode(b64urlToBytes(clientDataJSONB64)));
    if (json?.type !== expectedType) return { ok: false, reason: "client_data_type" };
    if (String(json?.challenge || "") !== String(expectedChallenge)) return { ok: false, reason: "challenge_mismatch" };
    const origin = String(json?.origin || "");
    if (allowedOrigins.length && !allowedOrigins.includes(origin)) return { ok: false, reason: "origin_mismatch" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "client_data_invalid" };
  }
}

export type ParsedAuthData = {
  rpIdHash: Uint8Array;
  flags: number;
  signCount: number;
  credentialId?: Uint8Array;
  publicKey?: Uint8Array;
};

/** يفكك authenticatorData ويستخرج (عند التسجيل) معرّف الاعتماد والمفتاح العمومي */
export function parseAuthenticatorData(authData: Uint8Array): ParsedAuthData {
  if (authData.length < 37) throw new Error("auth_data_short");
  const rpIdHash = authData.slice(0, 32);
  const flags = authData[32];
  const signCount =
    (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36];
  const out: ParsedAuthData = { rpIdHash, flags, signCount };

  let offset = 37;
  const AT = (flags & 0x40) !== 0; // attested credential data
  if (AT) {
    if (authData.length < offset + 18) throw new Error("auth_data_credential_short");
    offset += 16; // AAGUID
    const credIdLen = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;
    out.credentialId = authData.slice(offset, offset + credIdLen);
    offset += credIdLen;
    // المفتاح العمومي = ما تبقى (COSE)
    out.publicKey = authData.slice(offset);
  }
  return out;
}

/** يتحقق من توقيع تأكيد الدخول (assertion) */
export async function verifyAssertion(params: {
  publicKeyCborB64: string;
  credentialIdB64: string;
  clientDataJSONB64: string;
  authenticatorDataB64: string;
  signatureB64: string;
  expectedChallenge: string;
  rpId: string;
  allowedOrigins: string[];
}): Promise<{ ok: boolean; reason?: string }> {
  try {
    const client = checkClientData(
      params.clientDataJSONB64,
      "webauthn.get",
      params.expectedChallenge,
      params.allowedOrigins
    );
    if (!client.ok) return client;

    const authData = b64urlToBytes(params.authenticatorDataB64);
    const parsed = parseAuthenticatorData(authData);

    // rpIdHash: يمنع استخدام مفتاح صادر لموقع آخر
    const expectedRpIdHash = await sha256(enc.encode(params.rpId));
    if (!bytesEqual(parsed.rpIdHash, expectedRpIdHash)) return { ok: false, reason: "rp_id_mismatch" };

    const UP = (parsed.flags & 0x01) !== 0;
    const UV = (parsed.flags & 0x04) !== 0;
    if (!UP) return { ok: false, reason: "user_not_present" };
    // التحقق بخطوتين: نطلب تحقق المستخدم (بصمة/وجه/رمز شاشة) — لا نقبل مجرد حضور
    if (!UV) return { ok: false, reason: "user_verification_required" };

    const clientDataHash = await sha256(b64urlToBytes(params.clientDataJSONB64));
    const signedData = new Uint8Array(authData.length + clientDataHash.length);
    signedData.set(authData, 0);
    signedData.set(clientDataHash, authData.length);

    const key = await coseToCryptoKey(b64urlToBytes(params.publicKeyCborB64));
    const alg = key.algorithm as any;
    const verifyAlg: any = alg.name === "RSASSA-PKCS1-v1_5"
      ? { name: "RSASSA-PKCS1-v1_5" }
      : { name: "ECDSA", hash: "SHA-256" };

    // توقيع ECDSA يصل بصيغة DER من الجهاز، وcrypto يطلب r||s خاماً — نتقبل الصيغتين
    const ok = await verifySignature(key, verifyAlg, b64urlToBytes(params.signatureB64), signedData);
    return ok ? { ok: true } : { ok: false, reason: "signature_invalid" };
  } catch (e: any) {
    return { ok: false, reason: `verify_error:${e?.message || e}` };
  }
}
