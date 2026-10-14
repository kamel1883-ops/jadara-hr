/**
 * اختبار سلوك PUT في الخزنة السعودية على الكود الفعلي (saudi-vault/src/lib/crudFactory.js).
 *
 * يثبت أن التحديث الجزئي **يدمج** مع السجل الحالي ولا يمحو بقية الحقول الحسّاسة
 * (والمرفقات) — وهو الخلل الذي كان يُفقد ملاحظات الموارد البشرية والخصومات
 * عند الخطوة المالية في نهاية الخدمة، ويُفقد مرفقات الإنذارات والشكاوى والعهد.
 *
 * التشغيل: npm test (أو: node --test test/)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const stub = (f) => pathToFileURL(path.join(here, 'stubs', f)).href;

// استبدال التبعيات بأبدال: قاعدة البيانات، التشفير، express — بلا لمس كود الإنتاج
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '../db.js') return { url: stub('db.mjs'), shortCircuit: true };
    if (specifier === './security.js') return { url: stub('security.mjs'), shortCircuit: true };
    if (specifier === 'express') return { url: stub('express.mjs'), shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const crudPath = path.join(here, '..', 'src', 'lib', 'crudFactory.js');
const { createCrudRouter } = await import(pathToFileURL(crudPath).href);
const { encrypt, decrypt } = await import(stub('security.mjs'));

const TENANT = 'tenant_1';
const REF = 'warn_abc';

function freshRouter(row = null) {
  globalThis.__vaultRows = row ? [row] : [];
  globalThis.__vaultCalls = [];
  return createCrudRouter({ table: 'vault_warnings', refCol: 'warning_ref', refPrefix: 'warn' });
}

function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(body) { res.body = body; return res; },
  };
  return res;
}

async function put(router, body) {
  const handler = router.routes['PUT /:refId'];
  assert.ok(handler, 'مسار PUT مسجّل');
  const req = { headers: { 'x-tenant-id': TENANT }, params: { refId: REF }, body, query: {} };
  const res = makeRes();
  let failure = null;
  await handler(req, res, (e) => { failure = e; });
  if (failure) throw failure;
  return res;
}

function storedData() {
  const row = globalThis.__vaultRows[0];
  return row ? JSON.parse(decrypt(row.data_enc)) : null;
}

test('التحديث الجزئي يدمج ولا يمحو الحقول السابقة', async () => {
  const router = freshRouter({
    ref: REF,
    tenant: TENANT,
    emp_ref: 'emp_1',
    data_enc: encrypt(JSON.stringify({
      warning_level: 'first',
      description: 'نص الإنذار الكامل',
      investigation_summary: 'ملخص التحقيق',
      documents: ['doc_aaa', 'doc_bbb'],
    })),
  });

  const res = await put(router, { data: { notes: 'ملاحظة لاحقة' }, emp_ref: null });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.merged, true, 'يُعلن الدمج في الرد');

  const data = storedData();
  assert.equal(data.notes, 'ملاحظة لاحقة', 'الحقل الجديد حُفظ');
  assert.equal(data.description, 'نص الإنذار الكامل', 'النص السابق لم يُمحَ');
  assert.equal(data.investigation_summary, 'ملخص التحقيق', 'ملخص التحقيق لم يُمحَ');
  assert.deepEqual(data.documents, ['doc_aaa', 'doc_bbb'], 'المرفقات السابقة لم تُمحَ');
  assert.equal(data.warning_level, 'first', 'البيانات الوصفية السابقة لم تُمحَ');
  assert.equal(globalThis.__vaultRows[0].emp_ref, 'emp_1', 'emp_ref محفوظ عبر COALESCE');
});

test('تسلسل خطوات نهاية الخدمة: خطوة المالية لا تمحو خطوة الموارد البشرية', async () => {
  // يُحاكي writeRecordToVault(eos, ref, {..hr..}) ثم {..finance..} كما في EndOfService.jsx
  const router = freshRouter({
    ref: REF, tenant: TENANT, emp_ref: null,
    data_enc: encrypt(JSON.stringify({ eos_amount: 5000, tickets: 2 })),
  });
  await put(router, { data: { hr_note: 'اعتماد الموارد', deduction_amount: 300, deduction_note: 'تلف عهدة', total_settlement: 4700 } });
  await put(router, { data: { finance_note: 'تم التحويل', finance_proof_url: 'doc_pay', finance_paid_date: '2026-10-14' } });

  const data = storedData();
  assert.equal(data.finance_note, 'تم التحويل');
  assert.equal(data.hr_note, 'اعتماد الموارد', 'ملاحظة الموارد البشرية باقية بعد الخطوة المالية');
  assert.equal(data.deduction_amount, 300, 'الخصم باقٍ');
  assert.equal(data.deduction_note, 'تلف عهدة', 'سبب الخصم باقٍ');
  assert.equal(data.total_settlement, 4700, 'إجمالي المخالصة باقٍ');
  assert.equal(data.eos_amount, 5000, 'البيانات الأصلية باقية');
});

test('إضافة مرفق لسجل قائم لا تُفقد المرفقات السابقة عند إرسال المصفوفة الجديدة', async () => {
  const router = freshRouter({
    ref: REF, tenant: TENANT, emp_ref: null,
    data_enc: encrypt(JSON.stringify({ documents: ['doc_1'] })),
  });
  await put(router, { data: { documents: ['doc_1', 'doc_2'] } });
  assert.deepEqual(storedData().documents, ['doc_1', 'doc_2']);
  // والحذف المتعمّد يعمل: المصفوفة الفارغة تُحفظ كما هي
  await put(router, { data: { documents: [] } });
  assert.deepEqual(storedData().documents, []);
});

test('replace:true يستبدل السجل كاملاً عمداً', async () => {
  const router = freshRouter({
    ref: REF, tenant: TENANT, emp_ref: null,
    data_enc: encrypt(JSON.stringify({ old_field: 'قديم' })),
  });
  const res = await put(router, { data: { fresh: 'جديد' }, replace: true });
  assert.equal(res.body.merged, false);
  const data = storedData();
  assert.equal(data.fresh, 'جديد');
  assert.equal(data.old_field, undefined, 'الاستبدال المتعمد يمحو الحقول القديمة');
});

test('ref غير موجود يعيد 404 ولا يكسر الطلب', async () => {
  const router = freshRouter(null);
  const res = await put(router, { data: { notes: 'x' } });
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'not_found');
});

test('سجل تالف (فك تشفير فاشل) لا يُسقط التحديث', async () => {
  const router = freshRouter({ ref: REF, tenant: TENANT, emp_ref: null, data_enc: 'garbage-not-encrypted' });
  const res = await put(router, { data: { notes: 'بعد التالف' } });
  assert.equal(res.statusCode, 200);
  assert.equal(storedData().notes, 'بعد التالف');
});
