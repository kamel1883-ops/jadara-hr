/**
 * عميل الخزنة السعودية — طبقة وسطية موحدة بين Base44 والسيرفر السعودي.
 *
 * القاعدة الذهبية: لا تُمرّر أي قيمة حساسة خارج هذه الوحدة كنص واضح في السجلات.
 * كل المكالمات تستخدم مفتاح API مشترك + ترويسة المستأجر، عبر HTTPS فقط.
 *
 * السرّان المطلوبان في إعدادات التطبيق:
 *   VAULT_API_KEY — مفتاح مشترك (يطابق .env على السيرفر)
 *   VAULT_URL    — نطاق الخزنة السعودي (https://vault.jadara.sa) بدون شرطة مائلة
 */
import { secrets } from "base44:runtime";
import { codeFromStatus, type VaultErrorCode } from "./vaultErrors.ts";

/** خطأ خزنة يحمل رمزاً واضحاً (status + code) ليعرضه الوسيط والواجهة بسبب مفهوم */
function vaultFail(status: number | "timeout" | "unreachable", path: string): any {
  const err: any = new Error(`vault_error: ${status} ${path}`);
  err.vaultCode = (status === "timeout" || status === "unreachable" ? status : codeFromStatus(status)) as VaultErrorCode;
  err.status = typeof status === "number" ? status : 0;
  return err;
}

// الحقول الحساسة المُعزولة في الخزنة — مُعرّفات قوية وأرقام خاصة، لا تُخزّن في Base44
const SENSITIVE_FIELDS = [
  "national_id", "passport_number", "bank_account",
  "birth_date", "phone", "address", "emergency_contact",
  "health_insurance_number",
];

const PAYROLL_FIELDS = [
  "base_salary", "housing", "transport", "other",
  "gross", "net", "gosi_employee", "gosi_employer",
];

function getVaultConfig() {
  const apiKey = secrets.get("VAULT_API_KEY");
  const baseUrl = secrets.get("VAULT_URL");
  if (!apiKey || !baseUrl) {
    const err: any = new Error("vault_not_configured: VAULT_API_KEY و VAULT_URL غير مُضبطين في أسرار التطبيق");
    err.vaultCode = "not_configured";
    throw err;
  }
  return { apiKey, baseUrl: baseUrl.replace(/\/$/, "") };
}

/** هل أسرار الخزنة مُضبطة؟ (لا يكشف أي قيمة — النطاق فقط للتشخيص) */
export function vaultConfigured(): { ok: boolean; url: boolean; key: boolean; host: string } {
  const apiKey = String(secrets.get("VAULT_API_KEY") || "");
  const baseUrl = String(secrets.get("VAULT_URL") || "");
  let host = "";
  try { host = baseUrl ? new URL(baseUrl).host : ""; } catch { host = ""; }
  return { ok: !!(apiKey && baseUrl), url: !!baseUrl, key: !!apiKey, host };
}

/** فحص الاتصال وقراءة جدول المستندات. نجاح /health وحده لا يعني أن المستندات تعمل. */
export async function vaultHealth(tenantId) {
  const result = { ok: false, status: 0, documents_ready: false, document_status: 0, document_error: "" };
  let baseUrl = "";
  try { baseUrl = getVaultConfig().baseUrl; } catch { return result; }
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(8000) });
    result.ok = res.ok;
    result.status = res.status;
  } catch { return result; }
  if (!result.ok || !tenantId) return result;
  // مرجع غير موجود مقصود: 404 not_found يثبت أن استعلام المستندات نجح دون رفع أو تعديل بيانات.
  try {
    await getDocumentLink(tenantId, "doc_healthcheck_nonexistent");
    result.document_status = 200;
    result.documents_ready = true;
  } catch (error) {
    result.document_status = error?.status || 0;
    result.documents_ready = error?.vaultCode === "not_found" && error?.vaultDetail === "not_found";
    result.document_error = result.documents_ready ? "" : (error?.vaultCode || "unknown");
  }
  return result;
}

/** ترويسات موحدة لكل مكالمة — مفتاح API + المستأجر */
function headers(apiKey, tenantId, extra = {}) {
  return {
    "X-Vault-Key": apiKey,
    "X-Tenant-Id": tenantId,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** استدعاء موحّد مع معالجة أخطاء نظيفة لا تُسجّل الحمولة */
async function callVault(path, tenantId, options: { timeoutMs?: number; method?: string; body?: string; headers?: Record<string, string> } = {}) {
  const { apiKey, baseUrl } = getVaultConfig();
  const { timeoutMs = 20000, ...fetchOptions } = options;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      signal: ctrl.signal,
      headers: headers(apiKey, tenantId, fetchOptions.headers),
    });
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    if (!res.ok) {
      // نُرفق رمز الخطأ الذي أعاده سيرفر الخزنة (آمن — لا يحوي بيانات حساسة) للتشخيص،
      // بدل ابتلاعه وإظهار «تعذّر الوصول» بلا سبب. نُخزّنه على كائن الخطأ لا في الرسالة.
      const err = vaultFail(res.status, path);
      const detail = String(body?.code || body?.error || body?.raw || "").slice(0, 80);
      if (detail === "42703" || detail === "42P01" || detail === "schema_mismatch" || body?.error === "schema_mismatch") err.vaultCode = "schema_mismatch";
      if (detail && !err.vaultDetail) err.vaultDetail = detail;
      throw err;
    }
    return body;
  } catch (e: any) {
    if (e?.name === "AbortError") throw vaultFail("timeout", path);
    if (e?.vaultCode) throw e;
    // فشل شبكة/DNS/TLS — نُعيد رمزاً مفهومًا بدل رسالة اللغة الأصلية
    throw vaultFail("unreachable", path);
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// الموظفون — هوية/إقامة/جواز/بنك
// ============================================================

/** يخزّن القيم الحساسة في الخزنة ويعيد رمزاً معتماً (emp_ref) */
export async function storeEmployee(tenantId, sensitiveData) {
  const payload = {};
  for (const f of SENSITIVE_FIELDS) {
    if (sensitiveData[f] !== undefined && sensitiveData[f] !== null && sensitiveData[f] !== "") {
      payload[f] = String(sensitiveData[f]);
    }
  }
  return callVault("/api/vault/employees", tenantId, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** تخزين جماعي — يُعيد مصفوفة رموز معتمة بنفس ترتيب الإدخال */
export async function storeEmployeesBulk(tenantId, rows) {
  const payload = rows.map((r) => {
    const o = {};
    if (r.emp_ref) o.emp_ref = r.emp_ref;
    for (const f of SENSITIVE_FIELDS) {
      if (r[f] !== undefined && r[f] !== null && r[f] !== "") o[f] = String(r[f]);
    }
    return o;
  });
  return callVault("/api/vault/employees/bulk", tenantId, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** يسترجع القيم الحساسة المفكوكة — للعرض في الواجهة فقط، لا تُخزّن */
export async function getEmployee(tenantId, empRef) {
  return callVault(`/api/vault/employees/${encodeURIComponent(empRef)}`, tenantId, { method: "GET", timeoutMs: 8000 });
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * يجلب عدة موظفين دفعة واحدة.
 * يجرّب استعلام lookup الواحد أولاً، وإن لم يكن منشوراً على الخزنة بعد
 * يرجع لطلبات فردية محدودة التوازي حتى لا يختنق مجمع الاتصالات.
 * يبحث في كل مفاتيح المستأجر الخاصة بالمنشأة (حساب المستخدم، رقمها الموحّد، سجل المنشأة)
 * لأن السجلات القديمة حُفظت تحت أكثر من مفتاح.
 */
export async function getEmployeesBatch(tenantIds, empRefs) {
  const ids = [...new Set((tenantIds || []).map((t) => String(t || "").trim()).filter(Boolean))].slice(0, 24);
  const refs = [...new Set((empRefs || []).map((r) => String(r || "").trim()).filter(Boolean))].slice(0, 500);
  const found = {};
  if (!ids.length || !refs.length) return found;
  // الخزنة المنشورة حالياً تقبل 8 مفاتيح في الاستعلام الواحد.
  // نجزّئ المفاتيح حتى لا يُسقط مفتاح المنشئ الذي حُفظت تحته الهوية.
  let lookupAvailable = true;
  let pending = refs.slice();
  for (let i = 0; i < ids.length && pending.length && lookupAvailable; i += 8) {
    const chunk = ids.slice(i, i + 8);
    try {
      const body = await callVault("/api/vault/employees/lookup", chunk[0], {
        method: "POST",
        body: JSON.stringify({ refs: pending, tenant_ids: chunk }),
        timeoutMs: 8000,
      });
      const employees = body?.employees;
      if (employees && typeof employees === "object") {
        for (const [ref, row] of Object.entries(employees)) {
          if (row && typeof row === "object") found[ref] = row;
        }
        pending = pending.filter((r) => !found[r]);
        continue;
      }
      lookupAvailable = false;
    } catch {
      lookupAvailable = false;
    }
  }
  if (!lookupAvailable) {
    pending = refs.filter((r) => !found[r]);
    for (const tenant of ids) {
      if (!pending.length) break;
      const missed = [];
      await mapPool(pending, 8, async (ref) => {
        try {
          const row = await getEmployee(tenant, ref);
          if (row && typeof row === "object") found[ref] = row;
          else missed.push(ref);
        } catch {
          missed.push(ref);
        }
      });
      pending = missed;
    }
  }
  return found;
}

/**
 * يبحث داخل الخزنة عن رقم الهوية (وتاريخ الميلاد إن وُجد) ويعيد الرموز فقط.
 * المقارنة تتم في السيرفر السعودي. إن لم يُنشر المسار بعد تُعاد null ليكمل المستدعي بالجلب.
 */
export async function findEmpRefsByNationalId(tenantIds, nationalId, birthDate = "") {
  const ids = [...new Set((tenantIds || []).map((t) => String(t || "").trim()).filter(Boolean))].slice(0, 64);
  const nid = String(nationalId || "").trim();
  if (!nid) return [];
  try {
    const body = await callVault("/api/vault/employees/find", ids[0] || "portal", {
      method: "POST",
      body: JSON.stringify({ national_id: nid, birth_date: birthDate || "", tenant_ids: ids }),
      timeoutMs: 12000,
    });
    if (Array.isArray(body?.matches)) return body.matches.map((m) => m?.emp_ref).filter(Boolean);
  } catch {
    return null;
  }
  return null;
}

/** يحدّث السجل تحت المستأجر الذي يملكه فعلاً، لا تحت مفتاح الحساب الحالي فقط */
export async function updateEmployeeInCompany(tenantIds, empRef, sensitiveData) {
  const ids = [...new Set((tenantIds || []).map((t) => String(t || "").trim()).filter(Boolean))].slice(0, 24);
  let lastError = null;
  for (const tenant of ids) {
    try {
      return await updateEmployee(tenant, empRef, sensitiveData);
    } catch (e: any) {
      lastError = e;
      if (!String(e?.message || "").includes("404")) throw e;
    }
  }
  throw lastError || new Error("vault_error: 404");
}

/** يحدّث قيماً حساسة موجودة */
export async function updateEmployee(tenantId, empRef, sensitiveData) {
  const payload = {};
  for (const f of SENSITIVE_FIELDS) {
    if (sensitiveData[f] !== undefined && sensitiveData[f] !== null && sensitiveData[f] !== "") {
      payload[f] = String(sensitiveData[f]);
    }
  }
  return callVault(`/api/vault/employees/${empRef}`, tenantId, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** يحذف سجل الموظف الحساس من الخزنة */
export async function deleteEmployee(tenantId, empRef) {
  return callVault(`/api/vault/employees/${empRef}`, tenantId, { method: "DELETE" });
}

/** يحذف السجل تحت المستأجر الذي يملكه فعلاً (سجلات قديمة حُفظت تحت حساب آخر) */
export async function deleteEmployeeInCompany(tenantIds, empRef) {
  const ids = [...new Set((tenantIds || []).map((t) => String(t || "").trim()).filter(Boolean))].slice(0, 24);
  let lastError: any = null;
  for (const tenant of ids) {
    try {
      return await deleteEmployee(tenant, empRef);
    } catch (e: any) {
      lastError = e;
      if (!String(e?.message || "").includes("404")) throw e;
    }
  }
  throw lastError || vaultFail(404, "/employees");
}

// ============================================================
// الرواتب — قيم مالية حساسة
// ============================================================

export async function storePayroll(tenantId, data) {
  const payload = { emp_ref: data.empRef || data.emp_ref, period_key: data.period_key || null };
  for (const f of PAYROLL_FIELDS) {
    if (data[f] !== undefined && data[f] !== null && data[f] !== "") {
      payload[f] = String(data[f]);
    }
  }
  return callVault("/api/vault/payroll", tenantId, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPayroll(tenantId, payrollRef) {
  return callVault(`/api/vault/payroll/${payrollRef}`, tenantId, { method: "GET" });
}

/** يقرأ سجل الرواتب تحت مفتاح المنشأة الصحيح أيّا كان الحساب الذي كتبه */
export async function getPayrollInCompany(tenantIds, payrollRef) {
  const ids = [...new Set((tenantIds || []).map((t) => String(t || "").trim()).filter(Boolean))].slice(0, 24);
  let lastError: any = null;
  for (const tenant of ids) {
    try {
      return await getPayroll(tenant, payrollRef);
    } catch (e: any) {
      lastError = e;
      if (!String(e?.message || "").includes("404")) throw e;
    }
  }
  throw lastError || vaultFail(404, "/payroll");
}

// ============================================================
// الوحدات الحساسة الموسّعة — تخزين/قراءة/تحديث/حذف عام عبر /api/vault/modules
// كل سجل يُخزّن كـ JSON مشفّر في عمود data_enc
// ============================================================

/** يخزّن سجلاً كاملاً لوحدة حساسة → { <refKey> } */
export async function storeRecord(tenantId, module, data, empRef = null) {
  return callVault(`/api/vault/modules/${module}`, tenantId, {
    method: "POST",
    body: JSON.stringify({ data, emp_ref: empRef }),
  });
}

/** تخزين جماعي → { refs } */
export async function storeRecordsBulk(tenantId, module, rows) {
  return callVault(`/api/vault/modules/${module}/bulk`, tenantId, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

/** يسترجع سجلاً مفكوك التشفير — للعرض في الواجهة */
export async function getRecord(tenantId, module, ref) {
  return callVault(`/api/vault/modules/${module}/${ref}`, tenantId, { method: "GET" });
}

/**
 * كتالوج نطاقات قوى — بيانات مرجعية عامة تُحدَّث تلقائياً على السيرفر السعودي
 * من المصدر الوزاري، فلا يعتمد النظام على نسخة ثابتة عندنا.
 */
export async function getNitaqatCatalog() {
  return callVault("/api/vault/nitaqat", "public", { method: "GET", timeoutMs: 10000 });
}

/** مزامنة يدوية فورية من المصدر الرسمي (لزر «تحديث الآن») */
export async function syncNitaqatCatalog() {
  return callVault("/api/vault/nitaqat/sync", "public", { method: "POST", body: "{}", timeoutMs: 40000 });
}


/** عدة سجلات في رحلة دالة واحدة. الخزنة الحالية تُقرأ سجلاً سجلاً بتوازي محدود. */
export async function getRecordsBatch(tenantIds, module, refs) {
  const ids = [...new Set((tenantIds || []).map((t) => String(t || "").trim()).filter(Boolean))].slice(0, 24);
  const want = [...new Set((refs || []).map((r) => String(r || "").trim()).filter(Boolean))].slice(0, 200);
  const found: Record<string, any> = {};
  if (!module || !ids.length || !want.length) return found;
  let pending = want.slice();
  let down = false;
  for (const tenant of ids) {
    if (!pending.length || down) break;
    const missed = [];
    await mapPool(pending, 8, async (ref) => {
      try {
        const row = await getRecord(tenant, module, ref);
        if (row && typeof row === "object") found[ref] = row;
        else missed.push(ref);
      } catch (e: any) {
        if (String(e?.message || "").includes("404")) missed.push(ref);
        else down = true;
      }
    });
    pending = missed;
  }
  return found;
}

/** يحدّث سجلاً موجوداً */
export async function updateRecord(tenantId, module, ref, data, empRef = null) {
  return callVault(`/api/vault/modules/${module}/${ref}`, tenantId, {
    method: "PUT",
    body: JSON.stringify({ data, emp_ref: empRef }),
  });
}

/** يحذف سجلاً من وحدة حساسة */
export async function deleteRecord(tenantId, module, ref) {
  return callVault(`/api/vault/modules/${module}/${ref}`, tenantId, { method: "DELETE" });
}

// ============================================================
// المستندات — رفع/تنزيل
// ============================================================

/** يرفع مستنداً (ArrayBuffer) ويعيد doc_ref */
export async function storeDocument(tenantId, fileBuffer, fileName, mimeType, empRef = null, docType = "other") {
  const { apiKey, baseUrl } = getVaultConfig();
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer], { type: mimeType }), fileName);
  formData.append("doc_type", docType);
  if (empRef) formData.append("emp_ref", empRef);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/vault/documents`, {
      method: "POST",
      headers: { "X-Vault-Key": apiKey, "X-Tenant-Id": tenantId },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw vaultFail(error?.name === "TimeoutError" || error?.name === "AbortError" ? "timeout" : "unreachable", "/api/vault/documents");
  }
  const body = await res.json();
  if (!res.ok) {
    const error = vaultFail(res.status, "/api/vault/documents");
    const detail = String(body?.code || body?.error || "").slice(0, 80);
    if (["42703", "42P01", "schema_mismatch"].includes(detail) || body?.error === "schema_mismatch") error.vaultCode = "schema_mismatch";
    error.vaultDetail = detail;
    throw error;
  }
  return body;
}

/** يولّد رابط تنزيل مؤقت (JWT) — يُعرض للمستخدم النهائي.
 *  يُرسل جسم JSON فارغ لأن بعض خوادم الوسيط/body-parser تُسقط POST بلا جسم
 *  عندما يكون Content-Type: application/json (كان سبب خطأ 500 على مسار المستندات). */
export async function getDocumentLink(tenantId, docRef) {
  return callVault(`/api/vault/documents/${docRef}/link`, tenantId, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** يبحث عن المستند تحت مفاتيح منشأة الموظف، لا تحت حساب الفاتح فقط */
export async function getDocumentLinkInCompany(tenantIds, docRef) {
  const ids = [...new Set((tenantIds || []).map((t) => String(t || "").trim()).filter(Boolean))].slice(0, 24);
  const ref = String(docRef || "").trim();
  if (!ref) throw vaultFail(400, "/documents/link");
  if (!ids.length) throw vaultFail(404, "/documents/link");
  let lastError = null;
  for (const tenant of ids) {
    try {
      return await getDocumentLink(tenant, ref);
    } catch (e: any) {
      lastError = e;
      if (!String(e?.message || "").includes("404")) throw e;
    }
  }
  throw lastError || vaultFail(404, "/documents/link");
}

/** يبني رابط التنزيل العام النهائي (رابط مباشر يفتح في المتصفح) */
export function buildDownloadUrl(docToken) {
  const baseUrl = secrets.get("VAULT_URL");
  if (!baseUrl) {
    const err: any = new Error("vault_not_configured: VAULT_URL غير مُضبوط");
    err.vaultCode = "not_configured";
    throw err;
  }
  return `${baseUrl.replace(/\/$/, "")}/api/vault/documents/download/${docToken}`;
}