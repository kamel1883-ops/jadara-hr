import { Router } from 'express';
import { query } from '../db.js';
import { encrypt, decrypt, generateRef } from '../lib/security.js';

const router = Router();

// الحقول الحساسة التي تُخزّن مشفّرة — لا تُرسل أبداً إلى Base44
const SENSITIVE_FIELDS = [
  'full_name', 'national_id', 'passport_number', 'bank_account',
  'birth_date', 'phone', 'address', 'emergency_contact', 'health_insurance_number',
];

/**
 * POST /api/vault/employees
 * يخزّن بيانات الموظف الحساسة ويعيد emp_ref (رمز معتم)
 * Headers: X-Vault-Key, X-Tenant-Id
 */
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ error: 'tenant_required' });
    const empRef = generateRef('emp');
    const cols = ['emp_ref', 'tenant_id'];
    const vals = [empRef, tenantId];
    for (const f of SENSITIVE_FIELDS) {
      if (req.body[f] !== undefined) {
        cols.push(`${f}_enc`);
        vals.push(encrypt(String(req.body[f])));
      }
    }
    await query(
      `INSERT INTO vault_employees (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')})`,
      vals
    );
    res.status(201).json({ emp_ref: empRef });
  } catch (e) { next(e); }
});

/**
 * POST /api/vault/employees/bulk
 * تخزين جماعي (يستخدم عند استيراد ملف موظفين)
 */
router.post('/bulk', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ error: 'tenant_required' });
    const rows = Array.isArray(req.body) ? req.body : req.body.rows;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows_required' });
    const refs = [];
    for (const row of rows) {
      const empRef = row.emp_ref || generateRef('emp');
      const cols = ['emp_ref', 'tenant_id'];
      const vals = [empRef, tenantId];
      for (const f of SENSITIVE_FIELDS) {
        if (row[f] !== undefined) {
          cols.push(`${f}_enc`);
          vals.push(encrypt(String(row[f])));
        }
      }
      await query(
        `INSERT INTO vault_employees (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')})
         ON CONFLICT (emp_ref) DO UPDATE SET updated_at=now(), ${cols.slice(2).map(c => `${c}=EXCLUDED.${c}`).join(',')}`,
        vals
      );
      refs.push(empRef);
    }
    res.status(201).json({ refs });
  } catch (e) { next(e); }
});

/**
 * POST /api/vault/employees/lookup
 * جلب دفعة واحدة بعدة رموز ومستأجرين — استعلام واحد بدل طلب لكل موظف.
 * يُستخدم للعرض فقط. المستأجرون المسموحون يحددهم vaultProxy لحساب المستخدم.
 */
router.post('/lookup', async (req, res, next) => {
  try {
    const refs = Array.isArray(req.body?.refs)
      ? [...new Set(req.body.refs.map((r) => String(r || '').trim()).filter(Boolean))].slice(0, 500)
      : [];
    const tenantIds = Array.isArray(req.body?.tenant_ids)
      ? [...new Set(req.body.tenant_ids.map((r) => String(r || '').trim()).filter(Boolean))].slice(0, 24)
      : [];
    const headerTenant = String(req.headers['x-tenant-id'] || '').trim();
    if (headerTenant && !tenantIds.includes(headerTenant)) tenantIds.push(headerTenant);
    if (!refs.length || !tenantIds.length) return res.status(400).json({ error: 'refs_required' });
    const { rows } = await query(
      'SELECT * FROM vault_employees WHERE emp_ref = ANY($1::text[]) AND tenant_id = ANY($2::text[])',
      [refs, tenantIds]
    );
    const employees = {};
    for (const r of rows) {
      const out = { emp_ref: r.emp_ref };
      for (const f of SENSITIVE_FIELDS) {
        const enc = r[`${f}_enc`];
        if (enc !== null && enc !== undefined) {
          const plain = decrypt(enc);
          if (plain !== null && plain !== '') out[f] = plain;
        }
      }
      employees[r.emp_ref] = out;
    }
    res.json({ employees });
  } catch (e) { next(e); }
});

/**
 * POST /api/vault/employees/find
 * يطابق رقم الهوية (وتاريخ الميلاد اختيارياً) داخل المملكة ويعيد emp_ref فقط.
 */
router.post('/find', async (req, res, next) => {
  try {
    const nationalId = String(req.body?.national_id || '').trim();
    const birth = String(req.body?.birth_date || '').trim().slice(0, 10);
    const want = nationalId.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
    if (!want) return res.status(400).json({ error: 'national_id_required' });
    const tenantIds = Array.isArray(req.body?.tenant_ids)
      ? [...new Set(req.body.tenant_ids.map((r) => String(r || '').trim()).filter(Boolean))].slice(0, 64)
      : [];
    const { rows } = tenantIds.length
      ? await query('SELECT emp_ref, national_id_enc, birth_date_enc FROM vault_employees WHERE tenant_id = ANY($1::text[])', [tenantIds])
      : await query('SELECT emp_ref, national_id_enc, birth_date_enc FROM vault_employees');
    const matches = [];
    for (const r of rows) {
      const id = String(decrypt(r.national_id_enc) || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
      if (id !== want) continue;
      if (birth) {
        const b = String(decrypt(r.birth_date_enc) || '').slice(0, 10);
        if (b !== birth) continue;
      }
      matches.push({ emp_ref: r.emp_ref });
    }
    res.json({ matches });
  } catch (e) { next(e); }
});

/**
 * GET /api/vault/employees/:empRef
 * يعيد القيم الحساسة مفكوك التشفير — للعرض في الواجهة فقط، لا تُخزّن في Base44
 */
router.get('/:empRef', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { rows } = await query(
      'SELECT * FROM vault_employees WHERE emp_ref=$1 AND tenant_id=$2',
      [req.params.empRef, tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const r = rows[0];
    const out = { emp_ref: r.emp_ref };
    for (const f of SENSITIVE_FIELDS) {
      const enc = r[`${f}_enc`];
      if (enc !== null && enc !== undefined) out[f] = decrypt(enc);
    }
    res.json(out);
  } catch (e) { next(e); }
});

/**
 * PUT /api/vault/employees/:empRef
 */
router.put('/:empRef', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const f of SENSITIVE_FIELDS) {
      if (req.body[f] !== undefined) {
        sets.push(`${f}_enc=$${i++}`);
        vals.push(encrypt(String(req.body[f])));
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    sets.push(`updated_at=now()`);
    vals.push(req.params.empRef, tenantId);
    const { rowCount } = await query(
      `UPDATE vault_employees SET ${sets.join(',')} WHERE emp_ref=$${i++} AND tenant_id=$${i}`,
      vals
    );
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ emp_ref: req.params.empRef });
  } catch (e) { next(e); }
});

/**
 * DELETE /api/vault/employees/:empRef
 */
router.delete('/:empRef', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { rowCount } = await query(
      'DELETE FROM vault_employees WHERE emp_ref=$1 AND tenant_id=$2',
      [req.params.empRef, tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

export default router;