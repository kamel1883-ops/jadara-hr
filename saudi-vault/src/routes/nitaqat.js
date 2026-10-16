import { Router } from 'express';
import { requireApiKey } from '../middleware/index.js';
import { getCatalog, syncNow } from '../lib/nitaqatSync.js';

const router = Router();

/**
 * GET /api/vault/nitaqat — آخر كتالوج نطاقات مخزّن (بيانات مرجعية عامة).
 * يُرجع النسخة المعتمدة + وقت الجلب + المصدر حتى تعرض الواجهة «آخر تحديث».
 * محمي بمفتاح API (لا يحمل بيانات حساسة، لكن لا داعي لفتحه للعموم).
 */
router.get('/', requireApiKey, async (req, res, next) => {
  try {
    const cat = await getCatalog();
    if (!cat) return res.status(404).json({ error: 'not_synced_yet' });
    res.json(cat);
  } catch (e) { next(e); }
});

/**
 * POST /api/vault/nitaqat/sync — مزامنة فورية من المصدر الرسمي (زر تحديث يدوي).
 */
router.post('/sync', requireApiKey, async (req, res, next) => {
  try {
    const result = await syncNow();
    res.json(result);
  } catch (e) { next(e); }
});

export default router;
