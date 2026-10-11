/**
 * التعرّف على الموظف من رقم هويته المحفوظ في الخزنة السعودية.
 *
 * بعد عزل الهوية لا يبقى national_id في Base44، فيفشل دخول بوابة الموظف
 * والربط إن بقي البحث على الحقل المحلي. المقارنة تتم داخل المملكة،
 * ويُعاد سجل الموظف فقط — لا تُكتب الهوية ولا تاريخ الميلاد إلى Base44.
 */
import { findEmpRefsByNationalId, getEmployeesBatch } from "./vaultClient.ts";

function asList(page: any): any[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

function pushKey(keys: string[], value: any) {
  const v = String(value || "").trim();
  if (v && !keys.includes(v)) keys.push(v);
}

function day(value: any) {
  return String(value || "").trim().slice(0, 10);
}

/** مفاتيح الخزنة الخاصة بمنشأة المستخدم: حسابه، ثم سجل المنشأة */
export async function resolveCompanyContext(base44: any, user: any): Promise<{ keys: string[]; unified: string }> {
  const keys: string[] = [];
  let unified = "";
  pushKey(keys, user?.id);
  try {
    const email = String(user?.email || "").trim().toLowerCase();
    const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({}));
    const norm = (x: any) => String(x || "").trim().toLowerCase();
    let t = tenants.find((x: any) => norm(x.contact_email) === email || norm(x.admin_email) === email);
    if (!t) t = tenants.find((x: any) => String(x.admin_user_id || "") === String(user?.id || ""));
    if (!t && user?.id) {
      let emp: any = null;
      try {
        emp = asList(await base44.asServiceRole.entities.Employee.filter({ user_id: user.id }))[0] || null;
      } catch { /* لا سجل موظف */ }
      if (!emp && user?.email) {
        try {
          emp = asList(await base44.asServiceRole.entities.Employee.filter({ email: user.email }))[0] || null;
        } catch { /* لا سجل بالبريد */ }
      }
      const un = String(emp?.unified_number || "").trim();
      if (un) t = tenants.find((x: any) => String(x.unified_number || "").trim() === un);
      if (!t && un) unified = un;
    }
    if (t) {
      unified = String(t.unified_number || "").trim();
      pushKey(keys, t.unified_number);
      pushKey(keys, t.admin_user_id);
      pushKey(keys, t.id);
    } else if (unified) {
      pushKey(keys, unified);
    }
  } catch (e: any) {
    console.error("[vault] tenant resolve:", e?.message || e);
  }
  return { keys, unified };
}

/**
 * مفاتيح القراءة لطلب عرض. يُضاف حساب من أنشأ موظفي هذه المنشأة
 * لأن الخزنة حُفظت تحت ذلك الحساب، لا تحت حساب من يفتح الشاشة لاحقاً.
 * موظف منشأة أخرى لا يُضاف مفتاحه.
 */
export async function tenantKeysForRead(base44: any, user: any, empRefs: string[] = []): Promise<string[]> {
  const { keys, unified } = await resolveCompanyContext(base44, user);
  const want = new Set((empRefs || []).map((r) => String(r || "").trim()).filter(Boolean));
  try {
    const rows: any[] = [];
    const seen = new Set<string>();
    const addRows = (list: any) => {
      for (const e of asList(list)) {
        if (!e?.id || seen.has(e.id)) continue;
        seen.add(e.id);
        rows.push(e);
      }
    };
    if (unified) addRows(await base44.asServiceRole.entities.Employee.filter({ unified_number: unified }));
    if (user?.id) addRows(await base44.asServiceRole.entities.Employee.filter({ created_by_id: user.id }));
    for (const e of rows) {
      const un = String(e.unified_number || "").trim();
      if (unified && un && un !== unified) continue;
      if (want.size && !want.has(String(e.emp_ref || ""))) continue;
      pushKey(keys, e.created_by_id);
    }
  } catch (e: any) {
    console.error("[vault] tenant creators:", e?.message || e);
  }
  return keys.slice(0, 24);
}

/** مفاتيح خزنة موظف البوابة: منشئ سجله ومنشأة رقمه الموحّد */
export async function tenantKeysForEmployee(base44: any, emp: any): Promise<string[]> {
  const keys: string[] = [];
  pushKey(keys, emp?.created_by_id);
  const un = String(emp?.unified_number || "").trim();
  if (un) {
    pushKey(keys, un);
    try {
      const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({ unified_number: un }));
      for (const t of tenants) {
        pushKey(keys, t.id);
        pushKey(keys, t.admin_user_id);
        pushKey(keys, t.unified_number);
      }
      const coworkers = asList(await base44.asServiceRole.entities.Employee.filter({ unified_number: un }));
      for (const e of coworkers) pushKey(keys, e.created_by_id);
    } catch (e: any) {
      console.error("[vault] employee tenants:", e?.message || e);
    }
  }
  return keys.slice(0, 24);
}

function sortNewest(list: any[]) {
  return [...list].sort((a, b) => String(b?.created_date || "").localeCompare(String(a?.created_date || "")));
}

/** عند تكرار الهوية نُفضّل الحساب النشط الذي فعّل بوابة الموظف */
export function preferPortalEmployee(all: any[]) {
  const list = all || [];
  return list.find((e) => (e.status === "active" || e.status === "on_leave") && e.portal_password_enabled)
    || list.find((e) => e.status === "active" || e.status === "on_leave")
    || list[0]
    || null;
}

async function companyVaultKeys(base44: any): Promise<string[]> {
  const keys: string[] = [];
  try {
    const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({}));
    for (const t of tenants) {
      pushKey(keys, t.id);
      pushKey(keys, t.admin_user_id);
      pushKey(keys, t.unified_number);
    }
  } catch { /* لا سجلات منشآت */ }
  return keys;
}

function sameId(row: any, nid: string, birth: string) {
  if (String(row?.national_id || "").trim() !== nid) return false;
  if (birth && day(row?.birth_date) !== birth) return false;
  return true;
}

/**
 * يعيد سجلات Employee المطابقة لرقم الهوية.
 * المسار المحلي أولاً (من لم تُعزل هويته بعد)، ثم الخزنة عبر emp_ref.
 */
export async function findEmployeesByNationalId(base44: any, nationalId: string, birthDate = "") {
  const nid = String(nationalId || "").trim();
  const birth = day(birthDate);
  if (!nid) return [];

  const local = asList(await base44.asServiceRole.entities.Employee.filter({ national_id: nid }));
  const localHit = birth ? local.filter((e) => day(e.birth_date) === birth) : local;
  if (localHit.length) return sortNewest(localHit);

  let employees: any[] = [];
  try {
    employees = asList(await base44.asServiceRole.entities.Employee.list("-created_date", 2000));
  } catch {
    employees = [];
  }
  const vaulted = employees.filter((e) => e?.emp_ref && !String(e.national_id || "").trim());
  if (!vaulted.length) return [];

  const creators = [...new Set(vaulted.map((e) => String(e.created_by_id || "").trim()).filter(Boolean))];
  const tenantIds = await companyVaultKeys(base44);
  const allKeys = [...creators, ...tenantIds];
  const matchedRefs = new Set<string>();
  let findMissing = false;
  for (let i = 0; i < Math.max(allKeys.length, 1) && !findMissing; i += 64) {
    const chunk = allKeys.slice(i, i + 64);
    const found = await findEmpRefsByNationalId(chunk, nid, birth);
    if (found === null) {
      findMissing = true;
      break;
    }
    for (const ref of found) matchedRefs.add(String(ref));
  }
  if (!findMissing) return sortNewest(vaulted.filter((e) => matchedRefs.has(String(e.emp_ref))));

  const groups = new Map<string, any[]>();
  for (const e of vaulted) {
    const creator = String(e.created_by_id || "").trim() || tenantIds[0] || "";
    if (!creator) continue;
    if (!groups.has(creator)) groups.set(creator, []);
    groups.get(creator).push(e);
  }
  const hits: any[] = [];
  for (const [creator, group] of groups) {
    const searchKeys = [creator, ...tenantIds].filter(Boolean);
    const refs = group.map((e) => e.emp_ref);
    for (let i = 0; i < refs.length; i += 80) {
      const map = await getEmployeesBatch(searchKeys, refs.slice(i, i + 80));
      for (const e of group) {
        const row = map?.[e.emp_ref];
        if (row && sameId(row, nid, birth)) hits.push(e);
      }
    }
  }
  return sortNewest(hits);
}
