import { storeRecord, updateRecordInCompany } from "./vaultClient.ts";

/**
 * أرشفة طلبات الموظف الإدارية (HrRequest) في الخزنة السعودية — نفس آلية بقية الطلبات.
 * الحقول الحساسة (وصف الطلب، السبب، ملاحظة الموارد البشرية) تُحفظ في الخزنة،
 * ويبقى في Base44 ما يلزم للفلترة والعرض (النوع، الحالة، التواريخ، الرقم الموحّد).
 *
 * المفتاح: الرقم الموحّد للمنشأة — فيقرأه ويكتبه كل أعضاء المنشأة (مدير أو مستخدم فرعي).
 */
const MODULE = "hr-requests";

export function hrRequestVaultData(rec: any) {
  return {
    request_type: rec?.request_type || "",
    request_title: rec?.request_title || "",
    description: rec?.description || "",
    reason: rec?.reason || "",
    request_date: rec?.request_date || "",
    employee_name: rec?.employee_name || "",
    employee_number: rec?.employee_number || "",
    status: rec?.status || "",
    hr_status: rec?.hr_status || "",
    hr_name: rec?.hr_name || "",
    hr_date: rec?.hr_date || "",
    hr_note: rec?.hr_note || "",
  };
}

/** يكتب/يحدّث سجل الطلب في الخزنة ويُعيد رمزه (أو الرمز السابق عند الفشل) */
export async function writeHrRequestToVault(base44: any, rec: any): Promise<string | null> {
  const unified = String(rec?.unified_number || "").trim();
  if (!unified || !rec?.id) return rec?.vault_ref || null;
  const data = hrRequestVaultData(rec);
  try {
    if (rec.vault_ref) {
      await updateRecordInCompany([unified], MODULE, rec.vault_ref, data, null);
      return rec.vault_ref;
    }
    const out: any = await storeRecord(unified, MODULE, data, null);
    const ref = out?.ref || out?.[`${MODULE}Ref`] || out?.hrRequestsRef || null;
    if (ref) {
      try { await base44.asServiceRole.entities.HrRequest.update(rec.id, { vault_ref: ref }); } catch { /* الرمز يُحفظ في الرد */ }
    }
    return ref;
  } catch {
    return rec?.vault_ref || null;
  }
}
