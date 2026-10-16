import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, withTransaction } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'sql/schema.sql'), 'utf8');
  await withTransaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('jadara-vault-schema'))");
    await client.query(sql);
    await client.query('SELECT doc_ref, tenant_id, emp_ref, doc_type, file_name, mime_type, file_path, sha256, created_at FROM vault_documents LIMIT 0');
  });
  console.log('[vault] migration complete, document schema verified');
  await pool.end();
  process.exit(0);
}

migrate().catch((e) => {
  console.error('[vault] migration failed:', e.message);
  process.exit(1);
});