/**
 * vaultDocuments — خط المستندات الموحّد للخزنة السعودية.
 *
 * القاعدة: أي مستند يُولّده نظام جدارة (تقرير/مخالصة/كشف/فاتورة) أو أي مرفق
 * يُرفعه المستخدم (سيرة ذاتية/تقرير طبي/إثبات تحويل) يجب أن يُخزَّن على السيرفر
 * السعودي عبر vaultProxy، ولا يمرّ بخزنة Base44 الأمريكية. في Base44 يُحفظ
 * رمز المستند (doc_ref) فقط، ويُجلَب رابط تنزيل مؤقت عند العرض.
 *
 * السرّان (VAULT_API_KEY / VAULT_URL) يبقيان على السيرفر — لا يصلان للمتصفح.
 * عند عدم تهيئة الخزنة: تفشل المكالمات بهدوء وترجع null (وضع احتياطي آمن)،
 * لكن **يُعاد سبب الفشل** (code) حتى يُعرض للمستخدم سبب واضح بدل «تعذر فتح المستند».
 */
import { base44 } from "@/api/base44Client";
import { portalSession } from "@/lib/portalSession";
import { docRefKind, vaultCodeFromResponse, vaultErrorText } from "@/lib/vaultErrors";

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** يستخرج رمز الخطأ من استثناء invoke (قد يكون الخطأ في الحمولة أو في الرسالة) */
function codeFromThrown(e) {
  const payload = e?.response?.data || e?.data || e?.body || null;
  if (payload && (payload.error || payload.code)) return vaultCodeFromResponse(payload);
  const msg = String(e?.message || "");
  if (msg.includes("not_configured")) return "not_configured";
  if (msg.includes("404")) return "not_found";
  if (msg.includes("timeout")) return "timeout";
  if (msg.includes("401") || msg.includes("403")) return "unauthorized";
  return "unknown";
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
    if (data.doc_ref || data.docRef) return data.doc_ref || data.docRef;
    console.warn("[vault] archive failed:", vaultCodeFromResponse(res?.data));
    return null;
  } catch (e) {
    // الخزنة غير مُهيّأة — نُبقي التقرير متاحاً للطباعة المحلية، ونُظهر السبب في السجل
    console.warn("[vault] archive unavailable:", codeFromThrown(e));
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
    if (data.doc_ref || data.docRef) return data.doc_ref || data.docRef;
    console.warn("[vault] upload failed:", vaultCodeFromResponse(res?.data));
    return null;
  } catch (e) {
    console.warn("[vault] upload unavailable:", codeFromThrown(e));
    return null;
  }
}

/** يجلب رابط تنزيل مؤقت (JWT) مع سبب الفشل — الاستخدام المفضّل في الواجهة */
export async function getVaultDocLinkResult(docRef) {
  const ref = String(docRef || "").trim();
  if (!ref) return { url: null, code: "not_found" };
  try {
    const res = await base44.functions.invoke("vaultProxy", { action: "getDocumentLink", docRef: ref });
    const body = res?.data || {};
    if (body.error) {
      const code = vaultCodeFromResponse(body);
      if (code === "unreachable" || code === "timeout" || code === "not_configured") {
        try {
          const pr = await portalDocLink(ref);
          if (pr.url) return pr;
          return { url: null, code: pr.code || code };
        } catch {
          return { url: null, code };
        }
      }
      return { url: null, code };
    }
    const data = body.data || {};
    const url = data.download_url || "";
    return url ? { url, code: "" } : { url: null, code: "not_found" };
  } catch (e) {
    const code = codeFromThrown(e);
    if (code === "unreachable" || code === "timeout" || code === "not_configured") {
      try {
        const pr = await portalDocLink(ref);
        if (pr.url) return pr;
        return { url: null, code: pr.code || code };
      } catch {
        return { url: null, code };
      }
    }
    return { url: null, code };
  }
}

/** يجلب رابط تنزيل مؤقت (JWT) من الخزنة لعرض المستند للمستخدم النهائي */
export async function getVaultDocLink(docRef) {
  const r = await getVaultDocLinkResult(docRef);
  return r.url;
}

/** يفتح مستنداً مؤرشفاً في الخزنة عبر رابطه المؤقت (للعرض/التنزيل) */
export async function openVaultDoc(docRef) {
  const r = await getVaultDocLinkResult(docRef);
  if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
  return { ok: !!r.url, code: r.code };
}

/** رابط المستند من بوابة الموظف (لا يحتاج جلسة Base44) */
async function portalDocLink(docRef) {
  const session = portalSession.load();
  if (!session?.token || !session?.employee_id) return { url: null, code: "not_found" };
  try {
    const res = await base44.functions.invoke("portalData", {
      token: session.token,
      employee_id: session.employee_id,
      action: "document_link",
      doc_ref: docRef,
    });
    const data = res?.data || {};
    if (!data.ok) return { url: null, code: vaultCodeFromResponse(data) };
    return { url: data.download_url || null, code: data.download_url ? "" : "not_found" };
  } catch (e) {
    return { url: null, code: codeFromThrown(e) };
  }
}

/** فحص تهيئة الخزنة ووصول السيرفر السعودي — للتشخيص عند فشل الفتح */
export async function vaultHealthCheck() {
  try {
    const res = await base44.functions.invoke("vaultProxy", { action: "health" });
    const body = res?.data || {};
    return body.data || null;
  } catch {
    return null;
  }
}

/** نص جاهز للعرض عند فشل الفتح: السبب، وإذا كان عطلاً عاماً يُضاف تشخيص مباشر */
export async function vaultFailureMessage(code, isAr = true) {
  let text = vaultErrorText(code, isAr);
  if (code === "not_configured" || code === "unauthorized" || code === "unreachable" || code === "timeout") {
    const h = await vaultHealthCheck();
    if (h) {
      const bits = [];
      bits.push(isAr ? `النطاق: ${h.host || "—"}` : `host: ${h.host || "—"}`);
      bits.push(isAr ? `الأسرار: ${h.configured ? "مُضبطة" : "ناقصة"}` : `secrets: ${h.configured ? "ok" : "missing"}`);
      bits.push(isAr ? `فحص /health: ${h.reachable ? "ناجح" : "فاشل"} (${h.vault_status})` : `/health: ${h.reachable ? "ok" : "failed"} (${h.vault_status})`);
      text += "\n" + (isAr ? "تشخيص: " : "Diagnostics: ") + bits.join(" · ");
    }
  }
  return text;
}

/**
 * فتح قيمة مخزّنة: رابط قديم (http) يُفتح مباشرة، ورمز الخزنة عبر رابط مؤقت.
 * — مسار بوابة الموظف يُجرَّب أولاً عند وجود جلسة بوابة (بلا رحلة فاشلة زائدة).
 * — يُعاد سبب الفشل (code) ليُعرض للمستخدم.
 */
export async function openStoredDoc(value) {
  const v = String(value || "").trim();
  if (!v) return { ok: false, code: "invalid" };
  if (docRefKind(v) === "url") {
    window.open(v, "_blank", "noopener,noreferrer");
    return { ok: true, code: "" };
  }
  const session = portalSession.load();
  const hasPortal = !!(session?.token && session?.employee_id);
  const attempts = hasPortal
    ? [() => portalDocLink(v), () => getVaultDocLinkResult(v)]
    : [() => getVaultDocLinkResult(v), () => portalDocLink(v)];
  let last = "unknown";
  for (const attempt of attempts) {
    const r = await attempt();
    if (r.url) {
      window.open(r.url, "_blank", "noopener,noreferrer");
      return { ok: true, code: "" };
    }
    last = r.code || last;
    // عطل تهيئة/اتصال: لا فائدة من المسار الآخر — نوقف فوراً بدل إطالة الانتظار
    if (last !== "not_found") break;
  }
  return { ok: false, code: last };
}
