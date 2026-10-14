/**
 * تصنيف أخطاء الخزنة السعودية إلى رموز واضحة.
 *
 * السبب: كانت كل الأخطاء تُعاد كـ vault_operation_failed وتُبتلع في الواجهة،
 * فتظهر «تعذر فتح المستند» بلا سبب — لا يُعرف أهو عدم تهيئة، أم مفتاح خاطئ،
 * أم مستند محفوظ تحت منشأة أخرى، أم انتهاء مهلة. هنا نُعيد رمزاً مفهوماً.
 *
 * لا يُكشف أي سر ولا أي قيمة حساسة في الرسائل (المسار فقط).
 */
export type VaultErrorCode =
  | "not_configured"
  | "unauthorized"
  | "not_found"
  | "timeout"
  | "unreachable"
  | "invalid"
  | "unknown";

/** يقرأ الرمز الذي ضبطه vaultClient على كائن الخطأ، وإلا يصنّفه من الرسالة */
export function vaultErrorCode(error: any): VaultErrorCode {
  const explicit = String(error?.vaultCode || "");
  if (explicit) return explicit as VaultErrorCode;
  const msg = String(error?.message || error || "");
  if (msg.includes("vault_not_configured")) return "not_configured";
  if (msg.includes("vault_error: 400")) return "invalid";
  if (msg.includes("vault_error: 401") || msg.includes("vault_error: 403")) return "unauthorized";
  if (msg.includes("vault_error: 404") || msg.includes("vault_error: 410")) return "not_found";
  if (msg.includes("timeout")) return "timeout";
  if (msg.includes("vault_error:")) return "unreachable";
  return "unknown";
}

/** رمز HTTP المناسب لردّ الوسيط — يوضح للواجهة طبيعة العطل */
export function vaultErrorStatus(code: VaultErrorCode): number {
  switch (code) {
    case "not_configured": return 503;
    case "unauthorized": return 502;
    case "not_found": return 404;
    case "timeout": return 504;
    case "invalid": return 400;
    default: return 502;
  }
}

/** يحوّل رمز الخطأ إلى رمز خطأ في HTTP من ردّ الخزنة نفسه */
export function codeFromStatus(status: number): VaultErrorCode {
  if (status === 400) return "invalid";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404 || status === 410) return "not_found";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500 || status === 0) return "unreachable";
  return "unknown";
}
