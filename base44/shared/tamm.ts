import { secrets } from "base44:runtime";

/**
 * عميل تكامل منصة «تم» (حلول رابط) — استعلامات فقط.
 *
 * الخدمات المستخدمة (Inquiry فقط، بلا أي خدمة تنفيذية):
 *  1) POST /api/v1/inquiry/vehicle-insurance        → انتهاء التأمين
 *  2) POST /api/v1/inquiry/mvpi/latest-inspection   → انتهاء الفحص الفوري
 *  3) POST /api/v1/plate-change-request/verify-vehicle → انتهاء رخصة السير (نستدعي الخطوة 1 فقط)
 *
 * الأسرار المطلوبة (تُدار في إعدادات الأسرار، ولا تُكتب في المصدر أبداً):
 *  TAMM_CLIENT_ID, TAMM_CLIENT_SECRET
 * اختيارية:
 *  TAMM_BASE_URL   (افتراضي https://www.rabet.sa)
 *  TAMM_TOKEN_URL  (افتراضي: مشتق من TAMM_IDP_BASE_URL + TAMM_REALM)
 *  TAMM_IDP_BASE_URL, TAMM_REALM, TAMM_SCOPE
 */

export const TAMM_PATHS = {
  insurance: "/api/v1/inquiry/vehicle-insurance",
  inspection: "/api/v1/inquiry/mvpi/latest-inspection",
  plateVerify: "/api/v1/plate-change-request/verify-vehicle",
};

function env(name: string, fallback = ""): string {
  try {
    const v = secrets.get(name);
    return v ? String(v).trim() : fallback;
  } catch {
    return fallback;
  }
}

export function tammConfig() {
  const baseUrl = env("TAMM_BASE_URL", "https://www.rabet.sa").replace(/\/+$/, "");
  const idp = env("TAMM_IDP_BASE_URL", "https://idp.apps.devocp4.elm.sa").replace(/\/+$/, "");
  const realm = env("TAMM_REALM", "Tamm-dev");
  const tokenUrl = env(
    "TAMM_TOKEN_URL",
    `${idp}/auth/realms/${realm}/protocol/openid-connect/token`
  );
  return {
    baseUrl,
    tokenUrl,
    clientId: env("TAMM_CLIENT_ID"),
    clientSecret: env("TAMM_CLIENT_SECRET"),
    scope: env("TAMM_SCOPE", ""),
  };
}

export function tammConfigured(): boolean {
  const c = tammConfig();
  return Boolean(c.clientId && c.clientSecret);
}

// تخزين مؤقت للرمز على مستوى النسخة (isolate) — الرمز صالح مدة كافية ولا نطلبه لكل مركبة.
let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getTammToken(force = false): Promise<string> {
  const c = tammConfig();
  if (!c.clientId || !c.clientSecret) {
    throw new Error("tamm_not_configured: TAMM_CLIENT_ID / TAMM_CLIENT_SECRET غير مضبوطة");
  }
  if (!force && cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", c.clientId);
  body.set("client_secret", c.clientSecret);
  if (c.scope) body.set("scope", c.scope);

  let res: Response;
  try {
    res = await fetch(c.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
    });
  } catch (e: any) {
    throw new Error(
      `tamm_token_unreachable: تعذّر الوصول لخادم المصادقة (${c.tokenUrl}) — ${e?.message || e}`
    );
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`tamm_token_failed: HTTP ${res.status} — ${text.slice(0, 300)}`);
  }
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("tamm_token_invalid: رد غير صالح من خادم المصادقة");
  }
  const token = json?.access_token;
  if (!token) throw new Error("tamm_token_missing: لم يُرجع الخادم access_token");
  const ttl = Number(json?.expires_in || 300);
  cachedToken = { value: String(token), expiresAt: Date.now() + Math.max(60, ttl) * 1000 };
  return cachedToken.value;
}

async function tammPost(path: string, payload: unknown): Promise<any> {
  const c = tammConfig();
  const token = await getTammToken();
  const url = c.baseUrl + path;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });
  } catch (e: any) {
    throw new Error(`tamm_unreachable: تعذّر الوصول إلى ${path} — ${e?.message || e}`);
  }
  const text = await res.text();
  if (res.status === 401) {
    // الرمز قد يكون منتهياً — نطلب رمزاً جديداً مرة واحدة
    cachedToken = null;
    const fresh = await getTammToken(true);
    const retry = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fresh}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });
    const t2 = await retry.text();
    if (!retry.ok) throw new Error(`tamm_error: HTTP ${retry.status} على ${path} — ${t2.slice(0, 300)}`);
    return safeJson(t2);
  }
  if (!res.ok) {
    throw new Error(`tamm_error: HTTP ${res.status} على ${path} — ${text.slice(0, 300)}`);
  }
  return safeJson(text);
}

function safeJson(text: string): any {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** يحوّل الأرقام الهندية/الفارسية إلى لاتينية */
export function normalizeDigits(s: string): string {
  const map: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  };
  return String(s || "").replace(/[٠-٩۰-۹]/g, (d) => map[d] ?? d);
}

/** يبني جسم الطلب لبيانات اللوحة من ملف المركبة */
export function buildPlateDto(vehicle: any) {
  const plate = normalizeDigits(
    String(vehicle?.plate_number || vehicle?.plate_number_en || "").trim()
  );
  const dto: Record<string, any> = {
    plateNumber: plate,
    plateLetters: String(vehicle?.plate_letters || "").trim(),
  };
  const ptype = String(vehicle?.plate_type || "").trim();
  if (ptype) dto.plateType = ptype;
  return dto;
}

/** يحول تاريخاً بأي صيغة شائعة إلى YYYY-MM-DD، أو null */
export function toISODate(raw: any): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    const d = new Date(raw > 1e12 ? raw : raw * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  let s = normalizeDigits(String(raw).trim());
  // ISO أو نص يحتوي تاريخاً
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  // DD/MM/YYYY أو DD-MM-YYYY
  const dmy = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${m}-${d}`;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/** يبحث في كائن متداخل عن أول تاريخ يطابق أي من المفاتيح المطلوبة */
export function findDateByKeys(node: any, keys: string[], depth = 0): string | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  const lower = (x: string) => x.toLowerCase().replace(/[_\s-]/g, "");
  const wanted = keys.map(lower);
  if (Array.isArray(node)) {
    let best: string | null = null;
    for (const item of node) {
      const found = findDateByKeys(item, keys, depth + 1);
      if (found && (!best || found > best)) best = found;
    }
    return best;
  }
  for (const [k, v] of Object.entries(node)) {
    if (wanted.includes(lower(k))) {
      const d = toISODate(v);
      if (d) return d;
    }
  }
  let best: string | null = null;
  for (const v of Object.values(node)) {
    if (v && typeof v === "object") {
      const found = findDateByKeys(v, keys, depth + 1);
      if (found && (!best || found > best)) best = found;
    }
  }
  return best;
}

/** استعلام التأمين — يأخذ أبعد تاريخ انتهاء بين الوثائق السارية */
export async function fetchInsuranceExpiry(vehicle: any): Promise<string | null> {
  const data = await tammPost(TAMM_PATHS.insurance, buildPlateDto(vehicle));
  return findDateByKeys(data, [
    "expiryDate", "policyExpiryDate", "endDate", "expiry", "toDate", "policyEndDate",
  ]);
}

/** استعلام الفحص الدوري — أحدث فحص */
export async function fetchInspectionExpiry(vehicle: any): Promise<string | null> {
  const data = await tammPost(TAMM_PATHS.inspection, buildPlateDto(vehicle));
  return findDateByKeys(data, [
    "expiryDate", "inspectionExpiry", "validTo", "endDate", "expiry", "inspectionDate",
  ]);
}

/** استعلام رخصة السير — الخطوة 1 فقط، لا نُقدّم أي طلب */
export async function fetchLicenseExpiry(vehicle: any): Promise<string | null> {
  const data = await tammPost(TAMM_PATHS.plateVerify, buildPlateDto(vehicle));
  return findDateByKeys(data, [
    "istemarahExpiry", "registrationExpiry", "registrationExpiryDate", "licenseExpiry",
    "expiryDate", "endDate",
  ]);
}

export type TammSyncResult = {
  license: string | null;
  insurance: string | null;
  inspection: string | null;
  errors: string[];
};

/** يستعلم الخدمات الثلاث ويجمع النتائج بلا توقف عند فشل إحداها */
export async function syncVehicleWithTamm(vehicle: any): Promise<TammSyncResult> {
  const errors: string[] = [];
  const [license, insurance, inspection] = await Promise.all([
    fetchLicenseExpiry(vehicle).catch((e) => {
      errors.push(`رخصة السير: ${e?.message || e}`);
      return null;
    }),
    fetchInsuranceExpiry(vehicle).catch((e) => {
      errors.push(`التأمين: ${e?.message || e}`);
      return null;
    }),
    fetchInspectionExpiry(vehicle).catch((e) => {
      errors.push(`الفحص الدوري: ${e?.message || e}`);
      return null;
    }),
  ]);
  return { license, insurance, inspection, errors };
}
