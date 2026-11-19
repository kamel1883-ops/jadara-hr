import { secrets } from "base44:runtime";

// تحقق خادمي صارم من رمز Cloudflare Turnstile — يستخدم المفتاح السري الحقيقي في TURNSTILE_SECRET_KEY فقط (fail-closed).
// النطاق مُدرج في إعدادات الودجة بلوحة Cloudflare، والمفتاح السري مضبوط في Secrets.
// لا يوجد أي رمز تخطٍّ ثابت: أي قيمة يرسلها العميل تُتحقق فعلياً لدى Cloudflare.
export async function verifyTurnstile(token: string): Promise<boolean> {
  const t = String(token || "").trim();
  if (!t || t.length > 4096) return false;
  const secret = String(secrets.get("TURNSTILE_SECRET_KEY") || "");
  if (!secret) return false;
  try {
    const vr = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: t }),
      signal: AbortSignal.timeout(8000),
    });
    const vdata: any = await vr.json();
    if (Boolean(vdata && vdata.success)) return true;
    return false;
  } catch (_e) {
    return false;
  }
}

// تقييد المعدّل داخل النسخة النشطة (in-memory) — بسيط وبأفضل جهد.
export interface RateLimiter {
  clientIp(req: any): string;
  rateLimited(ip: string): boolean;
}

function headerValue(req: any, name: string): string {
  const h = req?.headers || {};
  if (h.get) {
    const v = h.get(name);
    if (v) return String(v);
  }
  const direct = h[name];
  return direct ? String(direct) : "";
}

export function createRateLimiter(windowMs = 10 * 60 * 1000, maxPerIp = 5): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    clientIp(req): string {
      // عنوان الاتصال الحقيقي: يضبطه حافّة المنصّة ولا يستطيع العميل تزويره.
      // لا نأخذ أول قيمة من x-forwarded-for لأن العميل يكتبها بنفسه (تزوير ⇒ تجاوز الحدّ)،
      // بل آخر قيمة (يضيفها الوسيط) ثم x-real-ip، وإلا نُجمّع الجميع في دلو واحد (الأكثر تحفّظاً).
      const cf = headerValue(req, "cf-connecting-ip").split(",")[0].trim();
      if (cf) return cf;
      const xff = headerValue(req, "x-forwarded-for")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (xff.length) return xff[xff.length - 1];
      const real = headerValue(req, "x-real-ip").trim();
      if (real) return real;
      return "unknown";
    },
    rateLimited(ip: string): boolean {
      const now = Date.now();
      const arr = (hits.get(ip) || []).filter((x) => now - x < windowMs);
      if (arr.length >= maxPerIp) { hits.set(ip, arr); return true; }
      arr.push(now); hits.set(ip, arr); return false;
    },
  };
}