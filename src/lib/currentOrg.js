import { base44 } from "@/api/base44Client";
import { pickByUnified } from "@/lib/companyGuard";

// القيم الافتراضية لإعدادات المنشأة — تُستخدم قبل أن يحفظ العميل إعداداته لأول مرة.
export const ORG_DEFAULTS = {
  name: "", industry: "", nitaqat_activity: "10", contact_name: "", contact_phone: "", unified_number: "", contact_email: "",
  vat_number: "", city: "", country: "المملكة العربية السعودية", logo_url: "",
  annual_leave_days: 21, ticket_policy: "yearly",
  eos_basis: "gross",
  gosi_saudi_employee_rate: 9.75, gosi_saudi_employer_rate: 11.75,
  gosi_new_saudi_employee_rate: 10.75, gosi_new_saudi_employer_rate: 12.75, gosi_expat_employer_rate: 2,
  work_week_hours: 48, work_week_days: 6, late_grace_minutes: 15,
  work_days: "0,1,2,3,4,6",
  work_start_time: "08:00", work_end_time: "17:00", work_hours_per_day: 9,
  absence_deduction_type: "monthly_divided",
  workplace_lat: "", workplace_lng: "", workplace_radius: 50,
};

let pending = null;
let pendingUser = null;

async function currentUserId() {
  try {
    const me = await base44.auth.me();
    return String(me?.id || "");
  } catch (_) {
    return "";
  }
}

async function load() {
  try {
    const res = await base44.functions.invoke("getMyTenant", {});
    const tenant = res?.data?.tenant || null;
    const unified = String(tenant?.unified_number || "").trim();
    if (!unified) return { tenant, unified: "", org: null };
    // لا يُؤخذ أول سجل في المنصة. يُقبل فقط السجل الذي رقمه الموحّد هو رقم هذه المنشأة.
    const list = await base44.entities.Organization.filter({ unified_number: unified });
    const org = pickByUnified(list, unified);
    if (org && String(org.unified_number || "").trim() !== unified) return { tenant, unified, org: null };
    return { tenant, unified, org };
  } catch (_) {
    return { tenant: null, unified: "", org: null };
  }
}

// منشأة المستخدم الحالي: سجل المنشأة (Tenant) المطابق لحسابه + إعداداتها إن وُجدت.
// الذاكرة مرتبطة بحساب الدخول، فانتقال العميل إلى حساب آخر لا يُبقي اسم أو شعار الشركة السابقة.
export async function getCurrentOrgContext() {
  const userId = await currentUserId();
  if (!pending || pendingUser !== userId) {
    pendingUser = userId;
    pending = load();
  }
  return pending;
}

// سجل إعدادات المنشأة الحالية فقط، بمقاس مصفوفة لتوافق القراءات القديمة التي تتوقع [org].
// إن لم يُحفظ سجل للمنشأة، يُعرض اسمها وشعارها من سجل تسجيلها — دون أي بيانات منشأة أخرى.
export async function listCurrentOrg() {
  const { org, tenant, unified } = await getCurrentOrgContext();
  if (org && String(org.unified_number || "").trim() === unified) return [org];
  return [{
    ...ORG_DEFAULTS,
    name: tenant?.name || "",
    logo_url: tenant?.logo_url || "",
    unified_number: unified,
  }];
}

export function invalidateCurrentOrg() {
  pending = null;
  pendingUser = null;
}