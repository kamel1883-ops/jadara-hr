/**
 * التعرّف على الموظف من رقم هويته المحفوظ في الخزنة السعودية.
 *
 * بعد عزل الهوية لا يبقى national_id في Base44، فيفشل دخول بوابة الموظف
 * والربط إن بقي البحث على الحقل المحلي. المقارنة تتم داخل المملكة،
 * ويُعاد سجل الموظف فقط — لا تُكتب الهوية ولا تاريخ الميلاد إلى Base44.
 */
import { findEmpRefsByNationalId, getEmployeesBatch } from "./vaultClient.ts";

import { companyLegacyKeys } from './vaultCompanyKeys.ts';

function scopeDenied() {
  const error = new Error('vault_scope_denied');
  error.vaultCode = 'unauthorized';
  throw error;
}

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
export async function resolveCompanyContext(base44, user) {
  const uid = String(user?.id || '').trim();
  if (!uid) scopeDenied();
  const tenants = base44.asServiceRole.entities.Tenant;
  const owned = asList(await tenants.filter({ admin_user_id: uid }, { limit: 2 }));
  if (owned.length > 1) scopeDenied();
  let tenant = owned[0];
  const email = String(user.email || '').trim().toLowerCase();
  if (!tenant && email) {
    const matches = asList(await tenants.filter({ $or: [{ contact_email: email }, { admin_email: email }] }, { limit: 2 }));
    if (matches.length > 1) scopeDenied();
    const candidate = matches[0];
    if (candidate && candidate.admin_user_id && candidate.admin_user_id !== uid) scopeDenied();
    tenant = candidate;
  }
  let unified = String(tenant?.unified_number || '').trim();
  if (!tenant) {
    const employees = base44.asServiceRole.entities.Employee;
    const query = { unified_number: { $nin: ['', null] } };
    let distinct = asList(await employees.filter({ ...query, user_id: uid }, { distinct: 'unified_number', limit: 2 }));
    if (!distinct.length && email) distinct = asList(await employees.filter({ ...query, email }, { distinct: 'unified_number', limit: 2 }));
    if (distinct.length > 1) scopeDenied();
    unified = String(distinct[0] || '').trim();
    if (unified) {
      const matches = asList(await tenants.filter({ unified_number: unified }, { limit: 2 }));
      if (matches.length > 1) scopeDenied();
      tenant = matches[0];
    }
  }
  if (!unified) return { keys: [uid], unified: '' };
  const legacy = await companyLegacyKeys(base44, unified, [uid, tenant?.admin_user_id]);
  const keys = [...new Set([unified, tenant?.id, ...legacy].filter(Boolean))];
  return { keys, unified };
}

/**
 * مفاتيح القراءة لطلب عرض. يُضاف حساب من أنشأ موظفي هذه المنشأة
 * لأن الخزنة حُفظت تحت ذلك الحساب، لا تحت حساب من يفتح الشاشة لاحقاً.
 * موظف منشأة أخرى لا يُضاف مفتاحه.
 */
export async function tenantKeysForRead(base44, user, empRefs = []) {
  const { keys, unified } = await resolveCompanyContext(base44, user);
  if (!unified) return keys;
  const query = { unified_number: unified };
  if (empRefs.length) query.emp_ref = { $in: empRefs };
  const creators = asList(await base44.asServiceRole.entities.Employee.filter(query, {
    distinct: 'created_by_id', limit: 24,
  }));
  if (creators.length >= 24) scopeDenied();
  const legacy = await companyLegacyKeys(base44, unified, creators);
  return [...new Set([...keys, ...legacy])].slice(0, 24);
}

/**
 * مفتاح كتابة ثابت للمنشأة.
 * المشكلة السابقة: كانت المستندات تُحفظ تحت حساب من رفعها (user.id)، فإذا فتحها
 * موظف آخر أو مدير آخر في نفس المنشأة لم يجدها ⇒ not_found و«تعذر فتح المستند».
 * الترتيب: الرقم الموحّد (ثابت للمنشأة ويُقرأ من كل أعضائها)، ثم سجل المنشأة، ثم حساب المستخدم.
 */
export async function companyVaultKey(base44, user) {
  const { unified, keys } = await resolveCompanyContext(base44, user);
  if (unified) return unified;
  if (keys.length === 1 && keys[0] === user?.id) return keys[0];
  scopeDenied();
}

/** مفاتيح خزنة موظف البوابة: منشئ سجله ومنشأة رقمه الموحّد */
export async function tenantKeysForEmployee(base44, emp) {
  const unified = String(emp?.unified_number || '').trim();
  if (!unified) scopeDenied();
  const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({ unified_number: unified }, { limit: 2 }));
  if (tenants.length > 1) scopeDenied();
  const tenant = tenants[0];
  const creators = asList(await base44.asServiceRole.entities.Employee.filter({ unified_number: unified }, {
    distinct: 'created_by_id', limit: 24,
  }));
  if (creators.length >= 24) scopeDenied();
  const legacy = await companyLegacyKeys(base44, unified, [emp.created_by_id, tenant?.admin_user_id, ...creators]);
  return [...new Set([unified, tenant?.id, ...legacy].filter(Boolean))].slice(0, 24);
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