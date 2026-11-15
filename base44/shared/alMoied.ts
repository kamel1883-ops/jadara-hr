/**
 * بوابة ميزات شركة آل معيض — تُعرَّف بالرقم الموحّد لا باسم الشركة (الاسم قابل للتغيير)،
 * وتُمنح لموظف واحد بعينه برقم هويته داخل هذه المنشأة فقط.
 *
 * لماذا: هذه الميزات تفتح بيانات موظفين كاملة (حضور الجميع + سجل كل الطلبات)،
 * فلا يجوز أن يحصل عليها مدير شركة أخرى لمجرد أنه مدير — النطاق مقفول على
 * الرقم الموحّد 7001838478 وعلى الموظف 1055229643 حصراً.
 */

export const AL_MOIED_UNIFIED = "7001838478";
export const AL_MOIED_SUPERVISOR_NID = "1055229643";

export function isAlMoiedCompany(unified: any): boolean {
  return String(unified || "").trim() === AL_MOIED_UNIFIED;
}

/** هل هذا الموظف هو المسؤول المصرّح له بميزات آل معيض؟ */
export function isAlMoiedSupervisor(emp: any): boolean {
  if (!emp) return false;
  if (!isAlMoiedCompany(emp?.unified_number)) return false;
  return String(emp?.national_id || "").trim() === AL_MOIED_SUPERVISOR_NID;
}
