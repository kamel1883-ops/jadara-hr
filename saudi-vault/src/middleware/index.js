import { config } from '../config.js';

/**
 * مصادقة بمفتاح API مشترك — كل طلب من Base44 يجب أن يحمل X-Vault-Key
 */
export function requireApiKey(req, res, next) {
  const key = req.headers['x-vault-key'];
  if (!key || key !== config.apiKey) {
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
  if (!tenantId) return res.status(400).json({ error: 'tenant_required' });
  next();
}

/**
 * تسجيل الطلب دون تسجيل الجسم — الجسم قد يحوي بيانات حساسة (هوية/راتب/مستند)
 */
export function safeRequestLog(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
}

/**
 * معالج أخطاء — لا يكشف رسالة الخطأ الداخلية للخارج، يسجّلها محلياً فقط
 */
export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.url} → ${err.message}`);
  res.status(err.status || 500).json({ error: err.code || 'internal_error' });
}