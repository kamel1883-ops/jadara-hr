/**
 * vaultGeneric — طبقة الكتابة/القراءة العامة لكل الأقسام الحساسة في الخزنة السعودية.
 *
 * نمط العمل: عند حفظ نموذج قسم حساس، تُرسل كل بيانات السجل للخزنة عبر vaultProxy،
 * يُعاد رمز معتم (ref)، Base44 يحفظ الـ ref + البيانات الوصفية للفلترة فقط.
 *
 * وضع احتياطي: لو فشلت الخزنة أو لم تُهيّأ، يُحفظ السجل محلياً في Base44 ولا ينكسر النظام.
 */
import { base44 } from "@/api/base44Client";
import { noteVaultFailure, readRecordCache, rememberRecord, vaultCooling } from "@/lib/vaultCache";

// الأقسام الحساسة المدعومة في الخزنة الموسّعة
export const VAULT_MODULES = {
  complaints: "complaints",
  warnings: "warnings",
  licenses: "licenses",
  platformSubs: "platform-subs",
  orgStructure: "org-structure",
  succession: "succession",
  training: "training",
  performance: "performance",
  eos: "eos",
  equipment: "equipment",
  expenses: "expenses",
  businessTrips: "business-trips",
  leaves: "leaves",
  approvals: "approvals",
  appointees: "appointees",
  reports: "reports",
  gosi: "gosi",
};

/**
 * يخزّن أو يحدّث سجلاً حساساً في الخزنة ويعيد ref المعتم.
 * - إن وُجد existingRef → تحديث
 * - وإلا → إنشاء جديد
 * يعيد null عند فشل الخزنة (وضع احتياطي).
 */
export async function writeRecordToVault(moduleKey, existingRef, record) {
  if (!record || typeof record !== "object") return existingRef || null;
  try {
    const action = existingRef ? "updateRecord" : "storeRecord";
    const payload = { action, module: moduleKey, data: record, empRef: record.emp_ref || null };
    if (existingRef) payload.ref = existingRef;
    const res = await base44.functions.invoke("vaultProxy", payload);
    const data = res?.data?.data || res?.data || {};
    const refKey = `${moduleKey}Ref`;
    const ref = data[refKey] || data.ref || data.emp_ref || existingRef || null;
    if (ref) rememberRecord(moduleKey, ref, record);
    return ref;
  } catch (e) {
    console.log(`[vaultGeneric] ${moduleKey}: vault unavailable, legacy mode`);
    return null;
  }
}

/**
 * يسترجع سجلاً حساساً مفكوك التشفير من الخزنة (للعرض في الواجهة).
 * يعيد null عند فشل الخزنة.
 */
export async function readRecordFromVault(moduleKey, ref) {
  if (!ref) return null;
  const cached = readRecordCache(moduleKey, ref);
  if (cached !== undefined) return cached;
  if (vaultCooling()) return null;
  try {
    const res = await base44.functions.invoke("vaultProxy", {
      action: "getRecord", module: moduleKey, ref,
    });
    const data = res?.data?.data || res?.data || null;
    if (data && typeof data === "object") rememberRecord(moduleKey, ref, data, true);
    return data;
  } catch (e) {
    console.log(`[vaultGeneric] ${moduleKey}: read failed, legacy mode`);
    return null;
  }
}

/**
 * يخزّن مستنداً (ArrayBuffer/Base64) في الخزنة ويعيد رابط تنزيل مؤقت.
 * يعيد null عند فشل الخزنة.
 */
export async function writeDocumentToVault(fileBase64, fileName, mimeType, empRef, docType) {
  try {
    const res = await base44.functions.invoke("vaultProxy", {
      action: "storeDocument", fileBase64, fileName, mimeType, empRef, docType,
    });
    const data = res?.data?.data || res?.data || {};
    return { docRef: data.doc_ref, downloadUrl: data.download_url } ;
  } catch (e) {
    console.log("[vaultGeneric] document: vault unavailable");
    return null;
  }
}

/**
 * يبني payload نهائي لـ Base44: يضيف الـ ref المعتم ويُبقي البيانات الوصفية للفلترة.
 * الحقول الحساسة تبقى في الخزنة فقط، لكن البيانات الوصفية (حالة/تاريخ/نوع) تبقى في Base44.
 */
export function applyVaultRef(payload, moduleKey, ref, sensitiveKeys) {
  if (!ref) return payload;
  const cleared = { ...payload, [`${moduleKey}Ref`]: ref };
  for (const k of sensitiveKeys) {
    if (cleared[k] !== undefined) cleared[k] = "";
  }
  return cleared;
}

export function isVaultRecordActive(ref) {
  return !!ref;
}

/**
 * يُغني قائمة سجلات Base44 بالحقول الحساسة من الخزنة للعرض في الواجهة.
 * - records: قائمة سجلات Base44
 * - moduleKey: وحدة الخزنة (VAULT_MODULES.*)
 * - refField: اسم حقل الـ ref في السجل (مثل leave_ref)
 * - sensitiveKeys: الحقول الحساسة المطلوب جلبها من الخزنة ودمجها
 * يعيد القائمة مدموجة؛ السجلات بلا ref أو الفاشلة تبقى كما هي (وضع احتياطي).
 */
function mergeRecordFields(row, data, sensitiveKeys) {
  if (!row || !data) return;
  for (const k of sensitiveKeys) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== "") row[k] = data[k];
  }
}

function applyCachedRecords(records, moduleKey, refField, sensitiveKeys) {
  for (const row of records || []) {
    const ref = row?.[refField];
    if (!ref) continue;
    const cached = readRecordCache(moduleKey, ref);
    if (cached && typeof cached === "object") mergeRecordFields(row, cached, sensitiveKeys);
  }
}

const recordFlights = new Map();

async function fetchRecordBatch(moduleKey, refs) {
  try {
    const res = await base44.functions.invoke("vaultProxy", {
      action: "getRecords", module: moduleKey, refs,
    });
    const data = res?.data?.data || res?.data || {};
    if (data?.byRef && typeof data.byRef === "object") {
      for (const ref of refs) {
        if (!Object.prototype.hasOwnProperty.call(data.byRef, ref)) data.byRef[ref] = null;
      }
      return data.byRef;
    }
  } catch { /* الدفعة غير منشورة بعد، أو الخزنة لم تجب */ }
  const byRef = {};
  const queue = refs.slice();
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const ref = queue.shift();
      const v = await readRecordFromVault(moduleKey, ref);
      if (v && typeof v === "object") byRef[ref] = v;
    }
  });
  await Promise.all(workers);
  if (!Object.keys(byRef).length) noteVaultFailure();
  return byRef;
}

/**
 * يملأ النصوص من ذاكرة اليوم فوراً، ويجلب الناقص بطلب واحد في الخلفية.
 * يعيد نفس المصفوفة بعد اكتمال الجلب حتى تحدّث الشاشة عرضها.
 */
export function warmRecords(records, moduleKey, refField, sensitiveKeys) {
  const list = records || [];
  applyCachedRecords(list, moduleKey, refField, sensitiveKeys);
  const missing = [...new Set(list.map((r) => r?.[refField]).filter((ref) => ref && readRecordCache(moduleKey, ref) === undefined))];
  if (!missing.length || vaultCooling()) return Promise.resolve(list);
  const key = `${moduleKey}:${missing.slice().sort().join(",")}`;
  let job = recordFlights.get(key);
  if (!job) {
    job = fetchRecordBatch(moduleKey, missing).then((byRef) => {
      for (const ref of missing) {
        if (Object.prototype.hasOwnProperty.call(byRef, ref)) {
          rememberRecord(moduleKey, ref, byRef[ref] && typeof byRef[ref] === "object" ? byRef[ref] : null, true);
        }
      }
      applyCachedRecords(list, moduleKey, refField, sensitiveKeys);
      return list;
    }).finally(() => recordFlights.delete(key));
    recordFlights.set(key, job);
  }
  return job.then(() => list);
}

export async function enrichRecordsWithVault(records, moduleKey, refField, sensitiveKeys) {
  if (!records || !records.length) return records;
  const withRef = records.filter((r) => r[refField]);
  if (!withRef.length) return records;
  await warmRecords(records, moduleKey, refField, sensitiveKeys);
  return records.map((r) => ({ ...r }));
}