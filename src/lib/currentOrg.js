import { base44 } from "@/api/base44Client";

// القيم الافتراضية لإعدادات المنشأة — تُستخدم قبل أن يحفظ العميل إعداداته لأول مرة.
export const ORG_DEFAULTS = {
  name: "", industry: "", nitaqat_activity: "10", contact_name: "", contact_phone: "", unified_number: "", contact_email: "",
  vat_number: "", city: "", country: "المملكة العربية السعودية", logo_url: "",
  annual_leave_days: 21, ticket_policy: "yearly",
  eos_basis: "gross",
  gosi_saudi_employee_rate: 9.75, gosi_saudi_employer_rate: 9.75, gosi_expat_employer_rate: 2,
  work_week_hours: 48, work_week_days: 6, late_grace_minutes: 15,
  work_days: "0,1,2,3,4,6",
  work_start_time: "08:00", work_end_time: "17:00", work_hours_per_day: 9,
  absence_deduction_type: "monthly_divided",
  workplace_lat: "", workplace_lng: "", workplace_radius: 50,
};

let pending = null;

async function load() {
  try {
    const res = await base44.functions.invoke("getMyTenant", {});
    const tenant = res?.data?.tenant || null;
    const unified = String(tenant?.unified_number || "").trim();
    if (!unified) return { tenant, unified: "", org: null };
    // سجل إعدادات منشأة العميل نفسه فقط — يُربط بالرقم الموحّد لمنشأته
    const list = await base44.entities.Organization.filter({ unified_number: unified });
    return { tenant, unified, org: (list && list[0]) || null };
  } catch (_) {
    return { tenant: null, unified: "", org: null };
  }
}

// منشأة المستخدم الحالي: سجل المنشأة (Tenant) المطابق لبريده + سجل إعدادات منشأته إن وُجد.
export async function getCurrentOrgContext() {
  if (!pending) pending = load();
  return pending;
}

// سجل إعدادات المنشأة الحالية فقط، بمقاس مصفوفة لتوافق القراءات القديمة التي تتوقع [org].
// إن لم يُحفظ سجل للمنشأة، تُعاد قيم افتراضية باسم منشأة العميل فقط — دون أي بيانات منشأة أخرى.
export async function listCurrentOrg() {
  const { org, tenant, unified } = await getCurrentOrgContext();
  if (org) return [org];
  return [{ ...ORG_DEFAULTS, name: tenant?.name || "", unified_number: unified }];
}

export function invalidateCurrentOrg() { pending = null; }