import { Router } from 'express';
import { query } from '../db.js';
import { encrypt, decrypt, generateRef } from './security.js';

/**
 * crudFactory — يُنشئ مسار CRUD موحّد لأي جدول بيانات حساس.
 * كل سجل يُخزّن كـ JSON مشفّر في عمود data_enc.
 * ref العمود يُحدّد من prefix (مثل complaint_ref).
 *
 * المسارات المُولّدة:
 *   POST   /            → إنشاء → { <refCol> }
 *   POST   /bulk         → تخزين جماعي
 *   GET    /:ref         → استرجاع (مفكوك التشفير)
 *   PUT    /:ref         → تحديث
 *   DELETE /:ref         → حذف
 */
export function createCrudRouter({ table, refCol, refPrefix }) {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = req.headers['x-tenant-id'];
      if (!tenantId) return res.status(400).json({ error: 'tenant_required' });
      const ref = generateRef(refPrefix);
      const empRef = req.body.emp_ref || null;
      const data = req.body.data || req.body;
      const encrypted = encrypt(JSON.stringify(data));
      await query(
        `INSERT INTO ${table} (${refCol}, tenant_id, emp_ref, data_enc) VALUES ($1,$2,$3,$4)`,
        [ref, tenantId, empRef, encrypted]
      );
      res.status(201).json({ [refCol]: ref });
    } catch (e) { next(e); }
  });

  router.post('/bulk', async (req, res, next) => {
    try {
      const tenantId = req.headers['x-tenant-id'];
      if (!tenantId) return res.status(400).json({ error: 'tenant_required' });
      const rows = Array.isArray(req.body) ? req.body : req.body.rows;
      if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows_required' });
      const refs = [];
      for (const row of rows) {
        const existingRef = row[refCol] || row.ref;
        const ref = existingRef || generateRef(refPrefix);
        const empRef = row.emp_ref || null;
        const data = row.data || row;
        const encrypted = encrypt(JSON.stringify(data));
        await query(
          `INSERT INTO ${table} (${refCol}, tenant_id, emp_ref, data_enc) VALUES ($1,$2,$3,$4)
           ON CONFLICT (${refCol}) DO UPDATE SET updated_at=now(), emp_ref=EXCLUDED.emp_ref, data_enc=EXCLUDED.data_enc`,
          [ref, tenantId, empRef, encrypted]
        );
        refs.push(ref);
      }
      res.status(201).json({ refs });
    } catch (e) { next(e); }
  });

  router.get('/:refId', async (req, res, next) => {
    try {
      const tenantId = req.headers['x-tenant-id'];
      const { rows } = await query(
        `SELECT * FROM ${table} WHERE ${refCol}=$1 AND tenant_id=$2`,
        [req.params.refId, tenantId]
      );
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      const r = rows[0];
      const data = r.data_enc ? JSON.parse(decrypt(r.data_enc) || '{}') : {};
      res.json({ [refCol]: r[refCol], emp_ref: r.emp_ref, ...data });
    } catch (e) { next(e); }
  });

  router.put('/:refId', async (req, res, next) => {
    try {
      const tenantId = req.headers['x-tenant-id'];
      const incoming = req.body.data || req.body;
      const { rows } = await query(
        `SELECT data_enc FROM ${table} WHERE ${refCol}=$1 AND tenant_id=$2`,
        [req.params.refId, tenantId]
      );
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      // التحديث **يدمج** مع السجل الحالي بدل استبداله كاملاً.
      // السبب: أكثر الاستدعاءات تحديث جزئي (ملاحظة إرجاع عهدة، حلّ شكوى، إضافة مرفق)،
      // وكان الاستبدال يمحو بقية الحقول الحسّاسة والمرفقات المخزّنة سابقاً.
      // للاستبدال الكامل المتعمّد: أرسل replace:true.
      const replace = req.body.replace === true || req.query.replace === 'true';
      let current = {};
      if (rows[0].data_enc) {
        try { current = JSON.parse(decrypt(rows[0].data_enc) || '{}') || {}; } catch { current = {}; }
      }
      const data = replace ? incoming : { ...current, ...incoming };
      const encrypted = encrypt(JSON.stringify(data));
      const empRef = req.body.emp_ref !== undefined ? req.body.emp_ref : null;
      const { rowCount } = await query(
        `UPDATE ${table} SET data_enc=$1, emp_ref=COALESCE($3,emp_ref), updated_at=now() WHERE ${refCol}=$2 AND tenant_id=$4`,
        [encrypted, req.params.refId, empRef, tenantId]
      );
      if (!rowCount) return res.status(404).json({ error: 'not_found' });
      res.json({ [refCol]: req.params.refId, merged: !replace });
    } catch (e) { next(e); }
  });

  router.delete('/:refId', async (req, res, next) => {
    try {
      const tenantId = req.headers['x-tenant-id'];
      const { rowCount } = await query(
        `DELETE FROM ${table} WHERE ${refCol}=$1 AND tenant_id=$2`,
        [req.params.refId, tenantId]
      );
      if (!rowCount) return res.status(404).json({ error: 'not_found' });
      res.json({ deleted: true });
    } catch (e) { next(e); }
  });

  return router;
}