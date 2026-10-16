import app from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { startScheduler } from './lib/nitaqatSync.js';

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('[vault] database connection OK');
  } catch (e) {
    console.error('[vault] database connection FAILED:', e.message);
    process.exit(1);
  }
  app.listen(config.port, () => {
    console.log(`[vault] Saudi Data Vault listening on :${config.port}`);
    console.log('[vault] ⚠️  يجب إنهاء TLS عبر reverse proxy (Nginx/Caddy) — لا تكشف المنفذ مباشرة للإنترنت');
    // مزامنة دورية لكتالوج نطاقات قوى — يبقى آخر نسخة سليمة عند الفشل
    startScheduler();
  });
}

start();