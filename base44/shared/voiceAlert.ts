function escapeXml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLatinDigits(value: any): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const eastern = "۰۱۲۳۴۵۶۷۸۹";
  return String(value || "")
    .replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(eastern.indexOf(d)));
}

/**
 * تحويل رقم الجوال إلى صيغة E.164 دون الاعتماد على البريد.
 * يقبل الصيغ السعودية الشائعة: 05xxxxxxxx و5xxxxxxxx و9665xxxxxxxx.
 */
export function normalizePhoneNumber(raw: any): string {
  let value = toLatinDigits(raw).replace(/[^\d+]/g, "");
  if (!value) return "";
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (value.startsWith("+")) {
    const digits = value.slice(1).replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "";
  }
  const digits = value.replace(/\D/g, "");
  if (/^966\d{9}$/.test(digits)) return `+${digits}`;
  if (/^05\d{8}$/.test(digits)) return `+966${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) return `+966${digits}`;
  return "";
}

export function buildPresenceVoiceTwiml(input: { deadlineClock: string; companyName?: string }): string {
  const company = String(input?.companyName || "").trim();
  const deadline = String(input?.deadlineClock || "").trim() || "نهاية المهلة";
  const intro = company ? `تنبيه عاجل من ${company}.` : "تنبيه عاجل.";
  const first = `${intro} إثبات الحضور مطلوب الآن. افتح بوابة الموظف واضغط أنا موجود الآن قبل الساعة ${deadline}. عدم التأكيد يظهر في تقرير المتابعة فقط ولا يخصم من الراتب.`;
  const second = `تنبيه مكرر: افتح بوابة الموظف الآن وأكد حضورك قبل الساعة ${deadline}.`;
  return (
    `<Response>` +
    `<Say language="ar-AE" voice="Polly.Hala-Neural">${escapeXml(first)}</Say>` +
    `<Pause length="1"/>` +
    `<Say language="ar-AE" voice="Polly.Hala-Neural">${escapeXml(second)}</Say>` +
    `</Response>`
  );
}

export interface TwilioVoiceCallInput {
  accountSid: string;
  authToken?: string;
  apiKeySid?: string;
  apiKeySecret?: string;
  callerId: string;
  to: string;
  twiml: string;
  timeoutMs?: number;
}

export async function placeTwilioVoiceCall(input: TwilioVoiceCallInput): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const accountSid = String(input?.accountSid || "").trim();
  const callerId = String(input?.callerId || "").trim();
  const to = String(input?.to || "").trim();
  const twiml = String(input?.twiml || "").trim();
  const apiKeySid = String(input?.apiKeySid || "").trim();
  const apiKeySecret = String(input?.apiKeySecret || "").trim();
  const authToken = String(input?.authToken || "").trim();
  if (!accountSid || !callerId || !to || !twiml) return { ok: false, error: "voice_config_missing" };
  const username = apiKeySid && apiKeySecret ? apiKeySid : accountSid;
  const password = apiKeySid && apiKeySecret ? apiKeySecret : authToken;
  if (!username || !password) return { ok: false, error: "voice_config_missing" };

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: callerId, Twiml: twiml }).toString(),
      signal: AbortSignal.timeout(Number(input?.timeoutMs) > 0 ? Number(input.timeoutMs) : 20000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.sid) return { ok: true, sid: String(data.sid) };
    const code = String(data?.code || "").trim();
    return { ok: false, error: code ? `twilio_http_${res.status}_${code}` : `twilio_http_${res.status}` };
  } catch {
    return { ok: false, error: "twilio_request_failed" };
  }
}
