import { secrets } from "base44:runtime";

/**
 * عميل تكامل منصة «تم» (حلول رابط) — استعلامات فقط، مطابق لمواصفات OpenAPI الرسمية:
 *
 *  POST /api/v1/inquiry/vehicle-insurance
 *      Body: { searchType:"PLATE", plate: PlateDto }
 *      Resp: { list:[{ policyEndDate, ... }] }               → انتهاء التأمين
 *
 *  POST /api/v1/inquiry/mvpi/latest-inspection
 *      Body: { searchType:"PLATE", plate: PlateDto }
 *      Resp: { mvpiStatus, mvpiExpiryDate }                  → انتهاء الفحص الدوري
 *
 *  POST /api/v1/plate-change-request/verify-vehicle
 *      Body: PlateDto مباشرة (الخطوة 1 فقط — لا نُقدّم أي طلب)
 *      Resp: { vehicle:{ istemarahExpiryDate } }             → انتهاء رخصة السير
 *
 * PlateDto كما تعرّفه المنصة (كل الحقول مطلوبة):
 *   { text1, text2, text3, number, type:{ code, nameAr, nameEn } }
 *
 * الأسرار: TAMM_CLIENT_ID, TAMM_CLIENT_SECRET  (إلزامية)
 * اختيارية: TAMM_BASE_URL, TAMM_TOKEN_URL, TAMM_IDP_BASE_URL, TAMM_REALM,
 *           TAMM_SCOPE, TAMM_USER_ID (ترويسة X-User-Id), TAMM_PLATE_TYPE_CODE
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
    userId: env("TAMM_USER_ID", ""),
  };
}

export function tammConfigured(): boolean {
  const c = tammConfig();
  return Boolean(c.clientId && c.clientSecret);
}

// تخزين مؤقت للرمز على مستوى النسخة (isolate)
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
      signal: AbortSignal.timeout(20000),
    });
  } catch (e: any) {
    throw new Error(
      `tamm_token_unreachable: تعذّر الوصول لخادم مصادقة «تم» (${c.tokenUrl}) — ${e?.message || e}`
    );
  }

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 400) {
      throw new Error(`tamm_credentials_rejected: رفض خادم «تم» بيانات الاعتماد — ${text.slice(0, 200)}`);
    }
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
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (c.userId) headers["X-User-Id"] = c.userId;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload ?? {}),
      signal: AbortSignal.timeout(20000),
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
      headers: { ...headers, Authorization: `Bearer ${fresh}` },
      body: JSON.stringify(payload ?? {}),
      signal: AbortSignal.timeout(20000),
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

/** تحويل تاريخ هجري (تقويم حسابي) إلى ميلادي YYYY-MM-DD */
function hijriToGregorian(y: number, m: number, d: number): string {
  const jd =
    Math.floor((11 * y + 3) / 30) + 354 * y + 30 * m - Math.floor((m - 1) / 2) + d + 1948440 - 385;
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l -= Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** يحول تاريخاً بأي صيغة شائعة إلى YYYY-MM-DD، أو null */
export function toISODate(raw: any): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    const d = new Date(raw > 1e12 ? raw : raw * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (typeof raw !== "string") return null;
  const s = normalizeDigits(raw.trim());
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const dmy = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/** تاريخ «تم» قد يأتي نصاً ميلادياً أو كائن تاريخ هجري */
export function parseTammDate(raw: any): string | null {
  const direct = toISODate(raw);
  if (direct) return direct;
  if (raw && typeof raw === "object") {
    const y = Number(raw.year ?? raw.hijriYear ?? raw.yearOfEra);
    const m = Number(raw.month ?? raw.monthValue ?? raw.hijriMonth);
    const d = Number(raw.day ?? raw.dayOfMonth ?? raw.dayOfMonthValue ?? raw.hijriDay);
    if (y > 1300 && y < 1600 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return hijriToGregorian(y, m, d);
    }
  }
  return null;
}

const PLATE_TYPE_FALLBACK = { code: 1, nameAr: "خاص", nameEn: "private" };

/**
 * يبني PlateDto بالشكل الذي تتطلبه «تم» — ويوقف الاستعلام برسالة واضحة
 * إذا كانت بيانات اللوحة ناقصة (رقم + ثلاثة حروف + نوع اللوحة).
 */
export function buildPlateDto(vehicle: any) {
  const plateRaw = normalizeDigits(
    String(vehicle?.plate_number || vehicle?.plate_number_en || "").trim()
  );
  const numMatch = plateRaw.match(/\d{1,5}/);
  const number = numMatch ? Number(numMatch[0]) : null;

  const letters = String(vehicle?.plate_letters || "")
    .trim()
    .split(/[\s,،]+/)
    .filter(Boolean);

  const missing: string[] = [];
  if (!number) missing.push("رقم اللوحة");
  if (letters.length < 3) missing.push("حروف اللوحة الثلاثة (مثال: أ ب ج)");
  if (missing.length > 0) {
    throw new Error(`بيانات اللوحة ناقصة: ${missing.join(" و ")} — أكملها في بيانات المركبة أولاً.`);
  }

  const customName = String(vehicle?.plate_type || "").trim();
  const typeCode = Number(env("TAMM_PLATE_TYPE_CODE", "1")) || 1;

  return {
    text1: letters[0],
    text2: letters[1],
    text3: letters[2],
    number,
    type: customName
      ? { code: typeCode, nameAr: customName, nameEn: PLATE_TYPE_FALLBACK.nameEn }
      : { ...PLATE_TYPE_FALLBACK },
  };
}

/** استعلام التأمين — أبعد تاريخ انتهاء بين الوثائق المسجلة */
export async function fetchInsuranceExpiry(vehicle: any): Promise<string | null> {
  const plate = buildPlateDto(vehicle);
  const data = await tammPost(TAMM_PATHS.insurance, { searchType: "PLATE", plate });
  const list: any[] = Array.isArray(data?.list) ? data.list : [];
  let best: string | null = null;
  for (const policy of list) {
    const d = toISODate(policy?.policyEndDate);
    if (d && (!best || d > best)) best = d;
  }
  return best;
}

/** استعلام الفحص الدوري (MVPI) — تاريخ انتهاء شهادة الفحص */
export async function fetchInspectionExpiry(vehicle: any): Promise<string | null> {
  const plate = buildPlateDto(vehicle);
  const data = await tammPost(TAMM_PATHS.inspection, { searchType: "PLATE", plate });
  return parseTammDate(data?.mvpiExpiryDate);
}

/** استعلام رخصة السير — الخطوة 1 فقط (تحقق من المركبة)، لا نُقدّم أي طلب تغيير */
export async function fetchLicenseExpiry(vehicle: any): Promise<string | null> {
  const plate = buildPlateDto(vehicle);
  const data = await tammPost(TAMM_PATHS.plateVerify, plate);
  return parseTammDate(data?.vehicle?.istemarahExpiryDate);
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