import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * تشفير AES-256-GCM لقيمة واحدة — يُخزّن الناتج كنص base64 مركّب: iv:tag:cipher
 * التشفير هنا طبقة ثانية فوق TLS — يحمي البيانات الحساسة وهي ساكنة في قاعدة البيانات.
 */
export function encrypt(plain) {
  if (plain === null || plain === undefined || plain === '') return null;
  const key = Buffer.from(config.encryptionKey, 'hex'); // 32 bytes
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decrypt(payload) {
  if (!payload) return null;
  try {
    const [ivB64, tagB64, encB64] = payload.split(':');
    const key = Buffer.from(config.encryptionKey, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null; // لا نكشف تفاصيل فشل فك التشفير للخارج
  }
}

/**
 * توليد رمز مرجعي معتم (opaque ref) — هو ما يُخزّن في Base44 بدلاً من القيمة الحساسة.
 */
export function generateRef(prefix = 'ref') {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * توقيع JWT قصير العمر لرابط تنزيل مستند — يُستخدم بدلاً من كشف مفتاح API في المتصفح.
 */
export function signDocToken(docRef, tenantId) {
  return jwt.sign({ doc_ref: docRef, tenant_id: tenantId || '', scope: 'doc' }, config.jwtSecret, { algorithm: 'HS256', expiresIn: config.docTokenTtlSeconds });
}

export function verifyDocToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  if (payload.scope !== 'doc' || !payload.doc_ref || !payload.tenant_id) throw new Error('invalid_token');
  return payload;
}