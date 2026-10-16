import { Router } from 'express';
import { query } from '../db.js';
import { encrypt, decrypt, generateRef } from '../lib/security.js';

const router = Router();

// القيم المالية الحساسة — تُخزّن مشفّرة داخل المملكة، Base44 يرى رمزاً معتماً فقط
const FIELDS = [
  'base_salary', 'housing', 'transport', 'other',
  'gross', 'net', 'gosi_employee', 'gosi_employer',
];

/**
 * POST /api/vault/payroll
 * Headers: X-Vault-Key, X-Tenant-Id
 * Body: { emp_ref, period_key, base_salary, housing, ... }
 */
router.post('/', async (req, res, next) => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '').trim();
    if (!tenantId) return res.status(400).json({ error: 'tenant_required' });
    const { emp_ref, period_key } = req.body;
    if (!emp_ref) return res.status(400).json({ error: 'emp_ref_required' });
    const ref = generateRef('pay');
    const cols = ['payroll_ref', 'emp_ref', 'tenant_id', 'period_key'];
    const vals = [ref, emp_ref, tenantId, period_key || null];
    for (const f of FIELDS) {
      if (req.body[f] !== undefined) {
        cols.push(`${f}_enc`);
        vals.push(encrypt(String(req.body[f])));
      }
    }
    await query(
      `INSERT INTO vault_payroll (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')})`,
      vals
    );
    res.status(201).json({ payroll_ref: ref });
  } catch (e) { next(e); }
});

/**
 * GET /api/vault/payroll/:payrollRef
 */
router.get('/:payrollRef', async (req, res, next) => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '').trim();
    if (!tenantId) return res.status(400).json({ error: 'tenant_required' });
    const { rows } = await query(
      'SELECT * FROM vault_payroll WHERE payroll_ref=$1 AND tenant_id=$2',
      [req.params.payrollRef, tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const r = rows[0];
    const out = { payroll_ref: r.payroll_ref, emp_ref: r.emp_ref, period_key: r.period_key };
    for (const f of FIELDS) out[f] = decrypt(r[`${f}_enc`]);
    res.json(out);
  } catch (e) { next(e); }
});

export default router;