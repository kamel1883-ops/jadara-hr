/**
 * ترجمة رموز خطأ الخزنة إلى رسائل واضحة للمستخدم + أدوات تحليل حقول المستندات.
 *
 * السبب: كانت الواجهة تبتلع كل خطأ وتُظهر «تعذر فتح المستند من الخزنة» بلا سبب،
 * فلا يُعرف إن كانت الخزنة غير مُهيّأة أو المفتاح خاطئاً أو المستند محفوظاً تحت
 * منشأة أخرى أو أن الاتصال بالسيرفر السعودي متعذّر. هنا يظهر السبب الحقيقي.
 */
export const VAULT_ERROR_CODES = [
  "not_configured", "unauthorized", "not_found", "schema_mismatch", "timeout", "unreachable", "invalid", "unknown",
];

const TEXT = {
  ar: {
    not_configured: "الخزنة السعودية غير مُهيّأة: يجب ضبط VAULT_URL و VAULT_API_KEY في أسرار التطبيق.",
    unauthorized: "مفتاح الخزنة غير صحيح: تأكد أن VAULT_API_KEY في أسرار التطبيق يطابق المفتاح على السيرفر السعودي.",
    not_found: "المستند غير موجود في قسم هذه المنشأة بالخزنة (قد يكون محفوظاً تحت منشأة أخرى أو حُذف ملفه).",
    schema_mismatch: "الخزنة متصلة، لكن بنية قاعدة بياناتها لا تطابق إصدار الخدمة. يلزم تطبيق تحديث الخزنة على السيرفر السعودي؛ إعادة نشر الواجهة وحدها لا تكفي.",
    timeout: "انتهت مهلة الاتصال بالخزنة — تحقق من سرعة الاتصال بالسيرفر السعودي.",
    unreachable: "تعذّر الوصول إلى سيرفر الخزنة — تحقق من النطاق و TLS وأن المنفذ مفتوح.",
    invalid: "طلب غير صالح للخزنة — راجع رقم المستند.",
    unknown: "تعذّر فتح المستند من الخزنة.",
  },
  en: {
    not_configured: "Saudi vault is not configured: set VAULT_URL and VAULT_API_KEY in the app secrets.",
    unauthorized: "Vault key rejected: make sure VAULT_API_KEY matches the key on the Saudi server.",
    not_found: "Document not found for this company in the vault (it may belong to another company, or its file was removed).",
    schema_mismatch: "The vault is connected, but its database schema does not match the service version. Apply the vault update on the Saudi server; republishing the frontend is not enough.",
    timeout: "Vault request timed out — check connectivity to the Saudi server.",
    unreachable: "Vault server unreachable — check the domain, TLS and the open port.",
    invalid: "Invalid vault request — check the document reference.",
    unknown: "Could not open the document from the vault.",
  },
};

/** رسالة المستخدم النهائي حسب رمز الخطأ */
export function vaultErrorText(code, isAr = true) {
  const table = TEXT[isAr ? "ar" : "en"];
  return table[code] || table.unknown;
}

/** هل الرمز يعني مشكلة تهيئة/اتصال (يحتاج تدخّل المسؤول) لا مشكلة في المستند؟ */
export function vaultErrorIsSetup(code) {
  return ["not_configured", "unauthorized", "unreachable", "timeout", "schema_mismatch"].includes(code);
}

/** يستخرج رمز الخطأ من ردّ الوسيط: { error: "not_found" } أو رسالة نصية */
export function vaultCodeFromResponse(data) {
  if (!data) return "not_found";
  const raw = data.error || data.code || "";
  const code = String(raw || "").trim();
  if (VAULT_ERROR_CODES.includes(code)) return code;
  return code ? "unknown" : "not_found";
}

/**
 * يحوّل قيمة حقل مستند (رابط قديم، رمز خزنة، مصفوفة، أو JSON مخزّن) إلى قائمة رموز.
 * تُستخدم لعرض كل مرفقات السجل بلا فقد أي منها.
 */
export function normalizeDocRefs(value, limit = 30) {
  const out = [];
  const push = (v) => {
    const s = String(v == null ? "" : v).trim();
    if (!s || s === "null" || s === "undefined") return;
    if (!out.includes(s)) out.push(s);
  };
  const walk = (v) => {
    if (v == null) return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === "object") {
      for (const key of ["ref", "doc_ref", "docRef", "url", "download_url", "value"]) {
        if (v[key] !== undefined) { walk(v[key]); return; }
      }
      return;
    }
    const s = String(v).trim();
    if (!s) return;
    if (s.startsWith("[") || s.startsWith("{")) {
      try { walk(JSON.parse(s)); return; } catch { /* نص عادي */ }
    }
    // قائمة مفصولة بفواصل أو مسافات (حقول نصية قديمة)
    if (s.includes(",") && !/^https?:/i.test(s)) { s.split(",").forEach(push); return; }
    push(s);
  };
  walk(value);
  return out.slice(0, limit);
}

/** هل القيمة رابط خارجي مباشر أم رمز خزنة */
export function docRefKind(value) {
  const s = String(value == null ? "" : value).trim();
  if (!s) return "empty";
  return /^https?:\/\//i.test(s) ? "url" : "ref";
}