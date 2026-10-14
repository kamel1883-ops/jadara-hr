import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query } from '../db.js';
import { generateRef, signDocToken, verifyDocToken } from '../lib/security.js';
import { config } from '../config.js';
import { requireApiKey, requireTenant } from '../middleware/index.js';
import { encryptDocument, decryptDocument } from '../lib/documentCrypto.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/**
 * POST /api/vault/documents
 * رفع مستند حساس (مخالصة، عقد، تقرير) — يُخزّن محلياً ولا يُرسل إلى Base44
 * Headers: X-Vault-Key, X-Tenant-Id
 * Multipart: file + (emp_ref?, doc_type?)
 */
router.post('/', requireApiKey, requireTenant, upload.single('file'), async (req, res, next) => {
  let writtenPath = null;
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '').trim();
    if (!tenantId) return res.status(400).json({ error: 'tenant_required' });
    if (!req.file) return res.status(400).json({ error: 'file_required' });
    const docRef = generateRef('doc');
    const dir = path.join(config.storageDir, tenantId);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const filePath = path.join(dir, `${docRef}.bin`);
    fs.writeFileSync(filePath, encryptDocument(req.file.buffer), { mode: 0o600, flag: 'wx' });
    writtenPath = filePath;
    const sha = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    await query(
      `INSERT INTO vault_documents (doc_ref, tenant_id, emp_ref, doc_type, file_name, mime_type, file_path, sha256)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [docRef, tenantId, req.body.emp_ref || null, req.body.doc_type || 'other',
       req.file.originalname, req.file.mimetype, filePath, sha]
    );
    res.status(201).json({ doc_ref: docRef, sha256: sha });
  } catch (e) {
    if (writtenPath) fs.rmSync(writtenPath, { force: true });
    next(e);
  }
});

async function issueDocLink(req, res) {
  const tenantId = String(req.headers['x-tenant-id'] || '').trim();
  if (!tenantId) return res.status(400).json({ error: 'tenant_required' });
  let rows;
  try {
    rows = (await query(
      'SELECT doc_ref FROM vault_documents WHERE doc_ref=$1 AND tenant_id=$2',
      [req.params.docRef, tenantId]
    )).rows;
  } catch (e) {
    console.error('[vault:documents/link] select failed:', e.code || 'internal_error');
    const mismatch = ['42703', '42P01'].includes(e.code);
    return res.status(500).json({ error: mismatch ? 'schema_mismatch' : 'db_error', code: mismatch ? e.code : undefined });
  }
  if (!rows.length) return res.status(404).json({ error: 'not_found' });
  let token;
  try {
    token = signDocToken(req.params.docRef, tenantId);
  } catch (e) {
    console.error('[vault:documents/link] sign failed');
    return res.status(500).json({ error: 'token_error' });
  }
  res.json({ token, expires_in: config.docTokenTtlSeconds });
}

/**
 * POST /api/vault/documents/:docRef/link
 * يُولّد رابط تنزيل مؤقت (JWT 5 دقائق) — Base44 يعرضه للمستخدم النهائي.
 * يقبل GET أيضاً احتياطاً (بعض الوسطاء يحوّلون POST بلا جسم).
 */
router.post('/:docRef/link', requireApiKey, requireTenant, issueDocLink);
router.get('/:docRef/link', requireApiKey, requireTenant, issueDocLink);

/**
 * GET /api/vault/documents/download/:token
 * تنزيل عام — لا يحتاج مفتاح API، الرمز هو credential مؤقت
 * يُسمح بالوصول فقط من داخل المملكة (يتحكم فيه reverse proxy)
 */
router.get('/download/:token', async (req, res, next) => {
  try {
    const payload = verifyDocToken(req.params.token);
    const docTenant = String(payload.tenant_id || '').trim();
    if (!docTenant) return res.status(403).json({ error: 'invalid_token' });
    const { rows } = await query('SELECT * FROM vault_documents WHERE doc_ref=$1 AND tenant_id=$2', [payload.doc_ref, docTenant]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const doc = rows[0];
    if (!doc.file_path || !fs.existsSync(doc.file_path)) return res.status(410).json({ error: 'file_missing' });
    const root = fs.realpathSync(config.storageDir);
    const file = fs.realpathSync(doc.file_path);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return res.status(403).json({ error: 'invalid_file' });
    const bytes = decryptDocument(fs.readFileSync(file));
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.attachment(doc.file_name || 'document');
    res.type('application/octet-stream').send(bytes);
  } catch (e) {
    res.status(403).json({ error: 'invalid_token' });
  }
});

export default router;