import { config } from '../config.js';
import { timingSafeEqual } from 'node:crypto';

/**
 * مصادقة بمفتاح API مشترك — كل طلب من Base44 يجب أن يحمل X-Vault-Key
 */
export function requireApiKey(req, res, next) {
  const key = Buffer.from(String(req.headers['x-vault-key'] || ''));
  const expected = Buffer.from(config.apiKey);
  if (!key.length || key.length !== expected.length || !timingSafeEqual(key, expected)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

/**
 * يرفض أي طلب بيانات لم يُحدّد فيه الرقم الموحد للمنشأة (X-Tenant-Id).
 * يمنع وصولاً عرضياً لبيانات منشأة أخرى عند غياب الترويسة.
 * المسارات العامة (download/:token, /health) لا تمرّ من هنا.
 */
export function requireTenant(req, res, next) {
  const tenantId = String(req.headers['x-tenant-id'] || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(tenantId)) return res.status(400).json({ error: 'tenant_required' });
  next();
}

/**
 * تسجيل الطلب دون تسجيل الجسم — الجسم قد يحوي بيانات حساسة (هوية/راتب/مستند)
 */
export function safeRequestLog(req, res, next) {
  const route = req.path.startsWith('/api/vault/documents/download/') ? '/api/vault/documents/download/[redacted]' : req.path;
  console.log(`[${new Date().toISOString()}] ${req.method} ${route}`);
  next();
}

/**
 * معالج أخطاء — لا يكشف رسالة الخطأ الداخلية للخارج، يسجّلها محلياً فقط
 */
export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.route?.path || '[request]'} ${err.code || 'internal_error'}`);
  const mismatch = ['42703', '42P01'].includes(err.code);
  res.status(err.status || 500).json({ error: mismatch ? 'schema_mismatch' : 'internal_error', code: mismatch ? err.code : undefined });
}