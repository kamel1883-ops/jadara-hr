/**
 * بوابة ميزات شركة آل معيض — النسخة الأمامية.
 * المطابقة بالرقم الموحّد (لا بالاسم) + رقم هوية الموظف المصرّح له فقط،
 * ونفس الشرط مُطبَّق على الخادم — فالواجهة لا تمنح صلاحية بحد ذاتها.
 */
export const AL_MOIED_UNIFIED = "7001838478";
export const AL_MOIED_SUPERVISOR_NID = "1055229643";

export function isAlMoiedCompany(unified) {
  return String(unified || "").trim() === AL_MOIED_UNIFIED;
}

export function isAlMoiedSupervisor(employee) {
  if (!employee) return false;
  if (!isAlMoiedCompany(employee?.unified_number)) return false;
  return String(employee?.national_id || "").trim() === AL_MOIED_SUPERVISOR_NID;
}

/** يتحقق من الجلسة مع الاستعانة برقم المنشأة من سجل المنشأة عند نقصه في سجل الموظف */
export function isAlMoiedSupervisorSession(employee, org) {
  return isAlMoiedSupervisor({
    national_id: employee?.national_id,
    unified_number: employee?.unified_number || org?.unified_number,
  });
}
