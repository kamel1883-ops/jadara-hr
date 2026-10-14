import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query } from '../db.js';
import { generateRef, signDocToken, verifyDocToken } from '../lib/security.js';
import { config } from '../config.js';
import { requireApiKey } from '../middleware/index.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/**
 * POST /api/vault/documents
 * رفع مستند حساس (مخالصة، عقد، تقرير) — يُخزّن محلياً ولا يُرسل إلى Base44
 * Headers: X-Vault-Key, X-Tenant-Id
 * Multipart: file + (emp_ref?, doc_type?)
 */
router.post('/', requireApiKey, upload.single('file'), async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!req.file) return res.status(400).json({ error: 'file_required' });
    const docRef = generateRef('doc');
    const dir = path.join(config.storageDir, tenantId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${docRef}.bin`);
    fs.writeFileSync(filePath, req.file.buffer);
    const sha = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    await query(
      `INSERT INTO vault_documents (doc_ref, tenant_id, emp_ref, doc_type, file_name, mime_type, file_path, sha256)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [docRef, tenantId, req.body.emp_ref || null, req.body.doc_type || 'other',
       req.file.originalname, req.file.mimetype, filePath, sha]
    );
    res.status(201).json({ doc_ref: docRef, sha256: sha });
  } catch (e) { next(e); }
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
    console.error('[vault:documents/link] select failed:', e.message);
    return res.status(500).json({ error: 'db_error', detail: String(e.message || '').slice(0, 120) });
  }
  if (!rows.length) return res.status(404).json({ error: 'not_found' });
  let token;
  try {
    token = signDocToken(req.params.docRef);
  } catch (e) {
    console.error('[vault:documents/link] sign failed:', e.message);
    return res.status(500).json({ error: 'token_error', detail: String(e.message || '').slice(0, 120) });
  }
  res.json({ token, expires_in: config.docTokenTtlSeconds });
}

/**
 * POST /api/vault/documents/:docRef/link
 * يُولّد رابط تنزيل مؤقت (JWT 5 دقائق) — Base44 يعرضه للمستخدم النهائي.
 * يقبل GET أيضاً احتياطاً (بعض الوسطاء يحوّلون POST بلا جسم).
 */
router.post('/:docRef/link', requireApiKey, issueDocLink);
router.get('/:docRef/link', requireApiKey, issueDocLink);

/**
 * GET /api/vault/documents/download/:token
 * تنزيل عام — لا يحتاج مفتاح API، الرمز هو credential مؤقت
 * يُسمح بالوصول فقط من داخل المملكة (يتحكم فيه reverse proxy)
 */
router.get('/download/:token', async (req, res, next) => {
  try {
    const payload = verifyDocToken(req.params.token);
    const { rows } = await query('SELECT * FROM vault_documents WHERE doc_ref=$1', [payload.doc_ref]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const doc = rows[0];
    if (!fs.existsSync(doc.file_path)) return res.status(410).json({ error: 'file_missing' });
    res.download(doc.file_path, doc.file_name || 'document');
  } catch (e) {
    res.status(403).json({ error: 'invalid_token' });
  }
});

export default router;