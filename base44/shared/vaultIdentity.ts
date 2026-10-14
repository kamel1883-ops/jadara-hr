/**
 * التعرّف على الموظف من رقم هويته المحفوظ في الخزنة السعودية.
 *
 * بعد عزل الهوية لا يبقى national_id في Base44، فيفشل دخول بوابة الموظف
 * والربط إن بقي البحث على الحقل المحلي. المقارنة تتم داخل المملكة،
 * ويُعاد سجل الموظف فقط — لا تُكتب الهوية ولا تاريخ الميلاد إلى Base44.
 */
import { findEmpRefsByNationalId, getEmployeesBatch } from "./vaultClient.ts";

const COMPANY_CACHE_TTL = 24 * 60 * 60 * 1000;
const companyCache = new Map<string, { at: number; keys: string[]; unified: string }>();

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
  const uid = String(user?.id || "");
  if (uid) {
    const hit = companyCache.get(uid);
    if (hit && Date.now() - hit.at < COMPANY_CACHE_TTL) {
      return { keys: [...hit.keys], unified: hit.unified };
    }
  }
  const keys: string[] = [];
  let unified = "";
  let failed = false;
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
    failed = true;
    console.error("[vault] tenant resolve:", e?.message || e);
  }
  if (uid && !failed) companyCache.set(uid, { at: Date.now(), keys: [...keys], unified });
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
    const have = new Set(rows.map((e) => String(e.emp_ref || "").trim()).filter(Boolean));
    const missing = [...want].filter((ref) => !have.has(ref)).slice(0, 80);
    if (missing.length) {
      try {
        addRows(await base44.asServiceRole.entities.Employee.filter({ emp_ref: { $in: missing } }));
      } catch { /* البحث بالرمز غير متاح */ }
    }
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

/**
 * مفتاح كتابة ثابت للمنشأة.
 * المشكلة السابقة: كانت المستندات تُحفظ تحت حساب من رفعها (user.id)، فإذا فتحها
 * موظف آخر أو مدير آخر في نفس المنشأة لم يجدها ⇒ not_found و«تعذر فتح المستند».
 * الترتيب: الرقم الموحّد (ثابت للمنشأة ويُقرأ من كل أعضائها)، ثم سجل المنشأة، ثم حساب المستخدم.
 */
export async function companyVaultKey(base44: any, user: any): Promise<string> {
  const uid = String(user?.id || "").trim();
  try {
    const { keys, unified } = await resolveCompanyContext(base44, user);
    if (unified) return unified;
    const nonUser = keys.find((k) => k && k !== uid);
    return nonUser || uid || "portal";
  } catch {
    return uid || "portal";
  }
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

function digitsOnly(value: any) {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(value || "")
    .replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)))
    .replace(/\D/g, "");
}

function sameId(row: any, nidDigits: string, birth: string) {
  const a = digitsOnly(row?.national_id);
  if (!a || a !== nidDigits) return false;
  if (birth && day(row?.birth_date) !== birth) return false;
  return true;
}

/** مفاتيح خزنة منشأة واحدة: من أنشأ موظفيها، ثم سجل تلك المنشأة فقط */
async function keysForCompany(base44: any, unified: string, creators: string[]) {
  const keys: string[] = [];
  for (const c of creators) pushKey(keys, c);
  if (!unified) return keys.slice(0, 24);
  pushKey(keys, unified);
  try {
    const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({ unified_number: unified }));
    for (const t of tenants) {
      pushKey(keys, t.id);
      pushKey(keys, t.admin_user_id);
      pushKey(keys, t.unified_number);
    }
  } catch { /* لا سجل منشأة */ }
  return keys.slice(0, 24);
}

function groupByCompany(vaulted: any[]) {
  const groups = new Map<string, { unified: string; rows: any[] }>();
  for (const e of vaulted) {
    const unified = String(e.unified_number || "").trim();
    const creator = String(e.created_by_id || "").trim();
    const key = unified || `creator:${creator || e.id}`;
    if (!groups.has(key)) groups.set(key, { unified, rows: [] });
    groups.get(key)!.rows.push(e);
  }
  return [...groups.values()];
}

/**
 * يعيد سجلات Employee المطابقة لرقم الهوية.
 * المسار المحلي أولاً (من لم تُعزل هويته بعد)، ثم الخزنة عبر emp_ref.
 */
export async function findEmployeesByNationalId(base44: any, nationalId: string, birthDate = "") {
  const nidRaw = String(nationalId || "").trim();
  const nidDigits = digitsOnly(nidRaw);
  const birth = day(birthDate);
  if (!nidDigits) return [];

  let local = asList(await base44.asServiceRole.entities.Employee.filter({ national_id: nidRaw }));
  if (!local.length && nidDigits !== nidRaw) {
    try {
      local = asList(await base44.asServiceRole.entities.Employee.filter({ national_id: nidDigits }));
    } catch { local = []; }
  }
  const localHit = local.filter((e) => digitsOnly(e.national_id) === nidDigits && (!birth || day(e.birth_date) === birth));
  if (localHit.length) return sortNewest(localHit);

  let employees: any[] = [];
  try {
    employees = asList(await base44.asServiceRole.entities.Employee.list("-created_date", 2000));
  } catch {
    employees = [];
  }
  const vaulted = employees.filter((e) => e?.emp_ref && !String(e.national_id || "").trim());
  if (!vaulted.length) return [];

  // البحث أولاً تحت حساب من أنشأ كل موظف. لا تُمرَّر مفاتيح كل المنشآت دفعة واحدة
  // حتى لا يسقط مفتاح المنشئ، ولا يُمسح خزنة عميل آخر عند كل محاولة دخول.
  const creators = [...new Set(vaulted.map((e) => String(e.created_by_id || "").trim()).filter(Boolean))];
  const matchedRefs = new Set<string>();
  let findMissing = false;
  for (let i = 0; i < creators.length && !findMissing; i += 64) {
    const found = await findEmpRefsByNationalId(creators.slice(i, i + 64), nidDigits, birth);
    if (found === null) {
      findMissing = true;
      break;
    }
    for (const ref of found) matchedRefs.add(String(ref));
  }
  if (!findMissing && matchedRefs.size) {
    return sortNewest(vaulted.filter((e) => matchedRefs.has(String(e.emp_ref))));
  }

  const groups = groupByCompany(vaulted);
  if (!findMissing) {
    for (const g of groups) {
      const extra = (await keysForCompany(base44, g.unified, [])).filter((k) => !creators.includes(k));
      if (!extra.length) continue;
      const found = await findEmpRefsByNationalId(extra, nidDigits, birth);
      if (found === null) {
        findMissing = true;
        break;
      }
      for (const ref of found) matchedRefs.add(String(ref));
    }
    if (!findMissing) return sortNewest(vaulted.filter((e) => matchedRefs.has(String(e.emp_ref))));
  }

  const hits: any[] = [];
  for (const g of groups) {
    const groupCreators = [...new Set(g.rows.map((e) => String(e.created_by_id || "").trim()).filter(Boolean))];
    const searchKeys = await keysForCompany(base44, g.unified, groupCreators);
    if (!searchKeys.length) continue;
    const refs = g.rows.map((e) => e.emp_ref);
    for (let i = 0; i < refs.length; i += 80) {
      const slice = refs.slice(i, i + 80);
      const map = await getEmployeesBatch(searchKeys, slice);
      for (const e of g.rows) {
        if (!slice.includes(e.emp_ref)) continue;
        const row = map?.[e.emp_ref];
        if (row && sameId(row, nidDigits, birth)) hits.push(e);
      }
    }
  }
  return sortNewest(hits);
}
