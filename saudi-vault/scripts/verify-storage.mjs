/**
 * فحص سلامة مخزن المستندات في الخزنة.
 *
 * السبب: سجل المستند يبقى في قاعدة البيانات حتى لو فُقد ملفه من القرص
 * (إعادة نشر الحاوية بلا حجم دائم، أو نسخ احتياطي ناقص)، فيُفتح المستند
 * فيظهر خطأ 410 file_missing بلا سبب واضح. هذا الفحص يكشف ذلك مبكراً.
 *
 * الاستخدام:
 *   npm run verify            # يعرض السجلات التي فُقد ملفها والملفات اليتيمة
 *   npm run verify -- --quiet # يعرض الملخص فقط (مناسب للمهام المجدولة)
 *
 * رمز الخروج: 0 سليم، 1 توجد مشكلة (يمكن ربطه بتنبيه).
 */
import fs from 'fs';
import path from 'path';
import { query, pool } from '../src/db.js';
import { config } from '../src/config.js';

const quiet = process.argv.includes('--quiet');

function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

async function main() {
  const storageDir = path.resolve(config.storageDir);
  const { rows } = await query('SELECT doc_ref, tenant_id, file_name, file_path FROM vault_documents');

  const missing = [];
  const known = new Set();
  for (const r of rows) {
    const file = r.file_path || path.join(storageDir, String(r.tenant_id || ''), `${r.doc_ref}.bin`);
    known.add(path.resolve(file));
    let size = -1;
    try { size = fs.statSync(file).size; } catch { size = -1; }
    if (size <= 0) missing.push({ doc_ref: r.doc_ref, tenant_id: r.tenant_id, file_name: r.file_name, path: file });
  }

  const orphans = walk(storageDir).filter((f) => !known.has(path.resolve(f)));

  console.log('=== فحص مخزن مستندات الخزنة ===');
  console.log('مجلد التخزين:', storageDir);
  console.log('سجلات في قاعدة البيانات:', rows.length);
  console.log('ملفات موجودة وسليمة:', rows.length - missing.length);
  console.log('سجلات فُقد ملفها (ستظهر للمستخدم كخطأ 410):', missing.length);
  console.log('ملفات يتيمة بلا سجل:', orphans.length);

  if (!quiet && missing.length) {
    console.log('\n— سجلات فُقد ملفها:');
    for (const m of missing.slice(0, 50)) console.log(`  ${m.doc_ref} | ${m.tenant_id} | ${m.file_name || ''} | ${m.path}`);
    if (missing.length > 50) console.log(`  … و${missing.length - 50} غيرها`);
  }
  if (!quiet && orphans.length) {
    console.log('\n— ملفات يتيمة (تحقق قبل حذفها):');
    for (const f of orphans.slice(0, 20)) console.log('  ' + f);
    if (orphans.length > 20) console.log(`  … و${orphans.length - 20} غيرها`);
  }
  if (missing.length) {
    console.log('\nالإجراء: استعد الملفات من النسخة الاحتياطية، أو احذف السجل إن كان المستند منتهياً.');
    console.log('تأكد أن مجلد ./storage مربوط بحجم دائم (docker-compose: volumes: ./storage:/app/storage).');
  }

  await pool.end();
  process.exit(missing.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error('[vault] verify failed:', e?.message || e);
  try { await pool.end(); } catch { /* تجاهل */ }
  process.exit(1);
});
