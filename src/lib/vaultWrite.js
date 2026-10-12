/**
 * vaultWrite — طبقة الكتابة الموحّدة للخزنة السعودية.
 *
 * عند حفظ أي نموذج يحوي بيانات حساسة، تُرسل القيم للخزنة عبر vaultProxy
 * ويُعاد رمز معتم (emp_ref). في Base44 يُحفظ الرمز فقط وتُفرّغ الحقول الحساسة.
 *
 * وضع احتياطي: إن فشلت الخزنة أو لم تُهيّأ، يُحفظ السجل محلياً (النمط القديم)
 * وتُعاد null ليبقى النظام يعمل دون انكسار.
 */
import { base44 } from "@/api/base44Client";
import { rememberEmployee } from "@/lib/vaultCache";

export const SENSITIVE_WRITE_KEYS = [
  "national_id", "passport_number", "bank_account",
  "birth_date", "phone", "address", "emergency_contact",
  "health_insurance_number",
];

function pickSensitive(formData) {
  const out = {};
  for (const k of SENSITIVE_WRITE_KEYS) {
    const v = formData[k];
    if (v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
}

/**
 * يخزّن أو يحدّث القيم الحساسة في الخزنة ويعيد emp_ref.
 * - إن وُجد existingEmpRef → تحديث (updateEmployee)
 * - وإلا → إنشاء جديد (storeEmployee)
 * يعيد null عند فشل الخزنة (وضع احتياطي).
 */
export async function writeEmployeeToVault(existingEmpRef, formData) {
  const sensitiveData = pickSensitive(formData);
  if (Object.keys(sensitiveData).length === 0) return existingEmpRef || null;
  try {
    if (existingEmpRef) {
      await base44.functions.invoke("vaultProxy", {
        action: "updateEmployee", empRef: existingEmpRef, sensitiveData,
      });
      rememberEmployee(existingEmpRef, sensitiveData, true);
      return existingEmpRef;
    }
    const res = await base44.functions.invoke("vaultProxy", {
      action: "storeEmployee", sensitiveData,
    });
    const data = res?.data?.data || res?.data || {};
    const ref = data.emp_ref || data.empRef || null;
    if (ref) rememberEmployee(ref, sensitiveData, true);
    return ref;
  } catch (e) {
    // الخزنة غير مُهيّأة — وضع احتياطي (النمط القديم)
    console.log("[vaultWrite] vault unavailable, legacy mode");
    return null;
  }
}

/**
 * يبني payload نهائي لـ Base44: يضيف emp_ref ويفرّغ الحقول الحساسة.
 * إن لم يوجد emp_ref (وضع احتياطي)، يبقى payload كما هو.
 */
export function applyEmpRef(payload, empRef) {
  if (!empRef) return payload;
  const cleared = { ...payload, emp_ref: empRef };
  for (const k of SENSITIVE_WRITE_KEYS) cleared[k] = "";
  return cleared;
}

/**
 * يتحقق إن كانت الخزنة مُهيّأة بفعالية (عبر وجود emp_ref على الأقل).
 * للعرض فقط — لا يكتب شيئاً.
 */
export function isVaultActive(empRef) {
  return !!empRef;
}