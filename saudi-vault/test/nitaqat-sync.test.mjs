/**
 * اختبار مزامنة كتالوج نطاقات قوى على الكود الفعلي (nitaqatSync.js).
 *
 * يثبت أن النظام **مواكب** لقرارات التوطين الرسمية:
 *  1) مزامنة جديدة تحفظ الكتالوج وتختمه بالـhash.
 *  2) إعادة المزامنة بنفس المحتوى لا تغيّر شيئاً (unchanged) — لا حفظ زائف.
 *  3) تغيّر نسب نشاط في المصدر (زيادة/نقصان) يُعتمد فوراً (changed) ويستبدل النسخة.
 *  4) فشل المصدر (حجب/مهلة/HTML بدل JSON) **لا يمسّ** آخر نسخة سليمة ويسجّل السبب.
 *  5) استجابة غير صالحة الشكل تُرفض ولا تدمر الكتالوج الحالي.
 *
 * التشغيل: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const stub = (f) => pathToFileURL(path.join(here, 'stubs', f)).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '../db.js') return { url: stub('db-nitaqat.mjs'), shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const syncPath = path.join(here, '..', 'src', 'lib', 'nitaqatSync.js');
const { syncNow, getCatalog, validateCatalog, normalizeCatalog } = await import(pathToFileURL(syncPath).href);

const SAMPLE = {
  groups: [{ id: '6201', ar: 'البرمجة الحاسوبية' }],
  activities: [
    { code: '620101', ar: 'برمجة الحاسوبية', group: '6201', m: [2.1, 3.4, 4.8, 6.2], c: [1, 2, 3, 4] },
    { code: '620102', ar: 'تطوير الأنظمة', group: '6201', m: [2.0, 3.3, 4.7, 6.1], c: [1, 2, 3, 4] },
  ],
};

function reset() {
  globalThis.__catRow = null;
  globalThis.__catCalls = [];
}

const okFetch = (json) => async () => json;

test('مزامنة جديدة تحفظ الكتالوج وتستعيده عبر getCatalog', async () => {
  reset();
  const r = await syncNow({ fetchImpl: okFetch(SAMPLE), urls: ['https://example.test/catalog'] });
  assert.equal(r.ok, true);
  assert.equal(r.changed, true);
  assert.ok(r.hash && r.hash.length === 64, 'hash sha256 محفوظ');
  const cat = await getCatalog();
  assert.ok(cat, 'الكتالوج مخزّن');
  assert.equal(cat.data.activities.length, 2);
  assert.equal(cat.source, 'https://example.test/catalog');
});

test('إعادة المزامنة بنفس المحتوى unchanged — لا حفظ زائف', async () => {
  reset();
  await syncNow({ fetchImpl: okFetch(SAMPLE), urls: ['u1'] });
  const callsAfterFirst = globalThis.__catCalls.filter((c) => /^INSERT/i.test(c.sql)).length;
  const r = await syncNow({ fetchImpl: okFetch(SAMPLE), urls: ['u1'] });
  assert.equal(r.ok, true);
  assert.equal(r.changed, false, 'نفس المحتوى → بدون تغيير');
  const callsAfterSecond = globalThis.__catCalls.filter((c) => /^INSERT/i.test(c.sql)).length;
  assert.equal(callsAfterFirst, callsAfterSecond, 'لا إعادة حفظ عند عدم التغيير');
});

test('تغيّر نسب نشاط في المصدر (قرار وزاري) يُعتمد فوراً', async () => {
  reset();
  await syncNow({ fetchImpl: okFetch(SAMPLE), urls: ['u1'] });
  const before = await getCatalog();
  // الوزارة ترفع النسب: نشاط واحد فقط يتغير (زيادة/نقصان)
  const UPDATED = JSON.parse(JSON.stringify(SAMPLE));
  UPDATED.activities[0].m = [2.5, 3.9, 5.3, 6.9]; // ارتفاع الحدود
  const r = await syncNow({ fetchImpl: okFetch(UPDATED), urls: ['u1'] });
  assert.equal(r.ok, true);
  assert.equal(r.changed, true, 'تغيّر المحتوى → اعتماد فوري');
  const after = await getCatalog();
  assert.notEqual(after.data.activities[0].m[0], before.data.activities[0].m[0]);
  assert.equal(after.data.activities[0].m[0], 2.5);
});

test('فشل المصدر لا يمسّ آخر نسخة سليمة ويسجّل السبب', async () => {
  reset();
  await syncNow({ fetchImpl: okFetch(SAMPLE), urls: ['u1'] });
  const r = await syncNow({
    fetchImpl: async () => { throw new Error('Request Rejected'); },
    urls: ['u1', 'u2'],
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'Request Rejected');
  const cat = await getCatalog();
  assert.ok(cat, 'آخر نسخة سليمة باقية');
  assert.equal(cat.data.activities.length, 2);
  assert.equal(cat.last_error, 'Request Rejected', 'سبب الفشل مسجّل للتشخيص');
});

test('استجابة غير صالحة الشكل تُرفض ولا تدمر الكتالوج', async () => {
  reset();
  await syncNow({ fetchImpl: okFetch(SAMPLE), urls: ['u1'] });
  const r = await syncNow({ fetchImpl: okFetch({ hello: 'world' }), urls: ['u1'] });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'invalid_catalog_shape');
  const cat = await getCatalog();
  assert.equal(cat.data.activities.length, 2, 'الكتالوج السابق سليم');
});

test('validateCatalog يقبل الشكل الصحيح ويرفض التالف', () => {
  assert.ok(validateCatalog(SAMPLE));
  assert.equal(validateCatalog(null), null);
  assert.equal(validateCatalog({}), null);
  assert.equal(validateCatalog({ activities: [] }), null);
  // أغلبية سجلات تالفة → رفض
  assert.equal(validateCatalog({ activities: [{ code: '1', ar: 'أ' }, null, undefined, 5] }), null);
});

test('normalizeCatalog يجد الكتالوج داخل حزم متداخلة', () => {
  assert.ok(normalizeCatalog({ data: SAMPLE }), 'داخل data');
  assert.ok(normalizeCatalog({ result: SAMPLE }), 'داخل result');
  assert.equal(normalizeCatalog({ data: { bad: true } }), null);
});
