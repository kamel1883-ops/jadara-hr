/**
 * vaultDocuments — خط المستندات الموحّد للخزنة السعودية.
 *
 * القاعدة: أي مستند يُولّده نظام جدارة (تقرير/مخالصة/كشف/فاتورة) أو أي مرفق
 * يُرفعه المستخدم (سيرة ذاتية/تقرير طبي/إثبات تحويل) يجب أن يُخزَّن على السيرفر
 * السعودي عبر vaultProxy، ولا يمرّ بخزنة Base44 الأمريكية. في Base44 يُحفظ
 * رمز المستند (doc_ref) فقط، ويُجلَب رابط تنزيل مؤقت عند العرض.
 *
 * السرّان (VAULT_API_KEY / VAULT_URL) يبقيان على السيرفر — لا يصلان للمتصفح.
 * عند عدم تهيئة الخزنة: تفشل المكالمات بهدوء وترجع null (وضع احتياطي آمن).
 */
import { base44 } from "@/api/base44Client";
import { portalSession } from "@/lib/portalSession";

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** يرفع Blob (PDF مُولّد) إلى الخزنة ويعيد رمز المستند doc_ref */
export async function archiveBlobToVault(blob, { fileName = "document.pdf", mimeType = "application/pdf", empRef = null, docType = "report" } = {}) {
  if (!blob) return null;
  try {
    const fileBase64 = await blobToBase64(blob);
    const res = await base44.functions.invoke("vaultProxy", {
      action: "storeDocument",
      fileBase64,
      fileName,
      mimeType,
      empRef,
      docType,
    });
    const data = res?.data?.data || res?.data || {};
    return data.doc_ref || data.docRef || null;
  } catch (e) {
    // الخزنة غير مُهيّأة — تجاهل بهدوء (يبقى التقرير متاحاً للطباعة المحلية)
    return null;
  }
}

/** يرفع ملف مرفق (File) إلى الخزنة ويعيد رمز المستند doc_ref.
 *  سير المرشحين (applicant_cv) تُرفع عبر دالة عامة منفصلة (لا تتطلب تسجيل دخول). */
export async function uploadFileToVault(file, { empRef = null, docType = "attachment" } = {}) {
  if (!file) return null;
  try {
    const fileBase64 = await blobToBase64(file);
    const isApplicantCv = docType === "applicant_cv";
    const fnName = isApplicantCv ? "publicApplicantCvUpload" : "vaultProxy";
    const payload = isApplicantCv
      ? { fileBase64, fileName: file.name || "cv", mimeType: file.type || "application/octet-stream" }
      : { action: "storeDocument", fileBase64, fileName: file.name || "attachment", mimeType: file.type || "application/octet-stream", empRef, docType };
    const res = await base44.functions.invoke(fnName, payload);
    const data = res?.data?.data || res?.data || {};
    // سير المرشحين: الدالة العامة تُرجع file_url مباشر من تخزين Base44
    if (isApplicantCv) return data.file_url || null;
    return data.doc_ref || data.docRef || null;
  } catch (e) {
    return null;
  }
}

/** يجلب رابط تنزيل مؤقت (JWT) من الخزنة لعرض المستند للمستخدم النهائي */
export async function getVaultDocLink(docRef) {
  if (!docRef) return null;
  try {
    const res = await base44.functions.invoke("vaultProxy", { action: "getDocumentLink", docRef });
    const data = res?.data?.data || res?.data || {};
    return data.download_url || null;
  } catch (e) {
    return null;
  }
}

/** يفتح مستنداً مؤرشفاً في الخزنة عبر رابطه المؤقت (للعرض/التنزيل) */
export async function openVaultDoc(docRef) {
  const url = await getVaultDocLink(docRef);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
  return !!url;
}

async function portalDocLink(docRef) {
  const session = portalSession.load();
  if (!session?.token || !session?.employee_id) return null;
  try {
    const res = await base44.functions.invoke("portalData", {
      token: session.token,
      employee_id: session.employee_id,
      action: "document_link",
      doc_ref: docRef,
    });
    const data = res?.data || {};
    return data.ok ? data.download_url || null : null;
  } catch {
    return null;
  }
}

/** يفتح رابط media القديم مباشرة، ورمز الخزنة عبر رابط مؤقت */
export async function openStoredDoc(value) {
  const v = String(value || "").trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) {
    window.open(v, "_blank", "noopener,noreferrer");
    return true;
  }
  const url = (await getVaultDocLink(v)) || (await portalDocLink(v));
  if (url) window.open(url, "_blank", "noopener,noreferrer");
  return !!url;
}