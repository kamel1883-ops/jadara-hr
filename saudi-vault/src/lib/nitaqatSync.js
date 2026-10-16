/**
 * nitaqatSync — مزامنة كتالوج نطاقات قوى (Nitaqat) مع المصدر الرسمي.
 *
 * القاعدة: نسب التوطين تصدرها وزارة الموارد البشرية وتُحدَّث على منصة قوى
 * (حاسبة نطاقات قوى: https://qiwa.sa/ar/tools-and-calculators/nitaqat-forecast-calculator).
 * لمواكبة أي قرار وزاري (زيادة أو نقصان) تلقائياً، يجلب هذا السيرفر المصدر
 * دورياً ويخزّن آخر نسخة صالحة. الفشل **لا يمسّ** آخر نسخة سليمة، ويُسجَّل
 * السبب في last_error للتشخيص.
 *
 * المصدر يُضبط عبر NITAQAT_SOURCE_URL (رابط JSON بنفس بنية nitaqat-activities.json،
 * أو صفحة HTML يُستخرج منها JSON المضمّن). الشكل المقبول يُتحقق منه قبل القبول:
 * { groups: [...], activities: [{ code, ar, group, m?, c? }, ...] }.
 */
import crypto from 'crypto';
import { query } from '../db.js';

const CATALOG_ID = 'main';
const DEFAULT_SOURCE = 'https://qiwa.sa/ar/tools-and-calculators/nitaqat-forecast-calculator';

/** مصادر الجلب — تُمرَّر عبر NITAQAT_SOURCE_URL (CSV) أو تبقى الافتراضية */
export function sourceUrls() {
  const env = String(process.env.NITAQAT_SOURCE_URL || '').trim();
  if (env) return env.split(',').map((s) => s.trim()).filter(Boolean);
  return [DEFAULT_SOURCE];
}

export function syncIntervalMs() {
  const hours = Number(process.env.NITAQAT_SYNC_HOURS || 24);
  return Math.max(1, hours) * 3600 * 1000;
}

/** تحقق من شكل الكتالوج قبل القبول — يرفض أي محتوى غير صالح */
export function validateCatalog(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const acts = raw.activities;
  if (!Array.isArray(acts) || acts.length === 0) return null;
  const groups = Array.isArray(raw.groups) ? raw.groups : [];
  let valid = 0;
  for (const row of acts) {
    if (row && typeof row === 'object' && row.code != null && row.code !== '' && row.ar) valid++;
  }
  // نقبل إن كان أغلب السجلات صالحة (نسبة 90%)، مع تجاهل السجلات التالفة
  if (valid === 0 || valid / acts.length < 0.9) return null;
  return {
    groups,
    activities: acts.filter((r) => r && typeof r === 'object' && r.code != null && r.ar),
  };
}

export function contentHash(catalog) {
  return crypto.createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
}

/** استخراج JSON من استجابة: JSON خام أو HTML يحوي JSON مضمّن */
function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { /* يُجرَّب HTML */ }
  }
  // JSON مضمّن في صفحة HTML (سكربتات/واجهات حديثة)
  const patterns = [
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
    /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m && m[1]) {
      try { return JSON.parse(m[1]); } catch { /* المعرّف التالي */ }
    }
  }
  return null;
}

/** جلب مصدر واحد مع مهلة ومتصفح-رؤوس (بعض الحواجز ترفض الرؤوس الافتراضية) */
async function fetchSource(url, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html;q=0.9, */*;q=0.8',
        'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    const text = await res.text();
    const json = extractJson(text);
    if (!json) throw new Error('no_json_in_response');
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/** من أعمدة الكتالوج الخام إلى الشكل المستخدم في الواجهة (نفس nitaqat-activities.json) */
export function normalizeCatalog(json) {
  // إن كان المصدر يعيد الشكل النهائي مباشرة (groups/activities) نستخدمه كما هو
  const direct = validateCatalog(json);
  if (direct) return direct;
  // أشكال متداخلة شائعة: { data: {...} } أو { result: {...} }
  for (const key of ['data', 'result', 'payload']) {
    if (json && typeof json === 'object') {
      const nested = validateCatalog(json[key]);
      if (nested) return nested;
    }
  }
  return null;
}

async function readStored() {
  const r = await query(
    'SELECT source_url, content_hash, data, fetched_at, last_error FROM vault_nitaqat_catalog WHERE id = $1',
    [CATALOG_ID]
  );
  return r.rows[0] || null;
}

/**
 * تنفيذ مزامنة واحدة عبر كل المصادر حتى ينجح أحدها.
 * يعيد { ok, changed, hash, source, error? }.
 */
export async function syncNow({ fetchImpl = fetchSource, urls = sourceUrls() } = {}) {
  let lastError = 'no_source';
  for (const url of urls) {
    try {
      const json = await fetchImpl(url);
      const catalog = normalizeCatalog(json);
      if (!catalog) { lastError = 'invalid_catalog_shape'; continue; }
      const hash = contentHash(catalog);
      const stored = await readStored();
      if (stored && stored.content_hash === hash && stored.data) {
        // لا تغيير — نُحدّث وقت الجلب فقط
        await query(
          'UPDATE vault_nitaqat_catalog SET fetched_at = now(), last_error = NULL, updated_at = now() WHERE id = $1',
          [CATALOG_ID]
        );
        return { ok: true, changed: false, hash, source: url };
      }
      await query(
        `INSERT INTO vault_nitaqat_catalog (id, source_url, content_hash, data, fetched_at, last_error, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, now(), NULL, now())
         ON CONFLICT (id) DO UPDATE SET
           source_url = EXCLUDED.source_url, content_hash = EXCLUDED.content_hash,
           data = EXCLUDED.data, fetched_at = now(), last_error = NULL, updated_at = now()`,
        [CATALOG_ID, url, hash, JSON.stringify(catalog)]
      );
      return { ok: true, changed: true, hash, source: url };
    } catch (e) {
      lastError = String(e?.message || e).slice(0, 200);
    }
  }
  // فشل كل المصادر — نُبقي آخر نسخة سليمة ونُسجّل السبب
  try {
    await query(
      'UPDATE vault_nitaqat_catalog SET last_error = $2, updated_at = now() WHERE id = $1',
      [CATALOG_ID, lastError]
    );
  } catch { /* خطأ تسجيل غير قاتل */ }
  return { ok: false, changed: false, error: lastError };
}

/** آخر نسخة مخزّنة (للعرض) — null إن لم تُزامَن بعد */
export async function getCatalog() {
  const row = await readStored();
  if (!row || !row.data) return null;
  return {
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    source: row.source_url || null,
    fetched_at: row.fetched_at || null,
    last_error: row.last_error || null,
  };
}

let timer = null;

/** جدولة مزامنة دورية (تُستدعى من server.js) */
export function startScheduler() {
  const run = () => syncNow().then((r) => {
    console.log(`[vault] nitaqat sync: ${r.ok ? (r.changed ? 'updated' : 'unchanged') : 'failed'}${r.error ? ` (${r.error})` : ''}`);
  }).catch((e) => console.error('[vault] nitaqat sync crashed:', e.message));
  run();
  timer = setInterval(run, syncIntervalMs());
  timer.unref?.();
  return () => clearInterval(timer);
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
