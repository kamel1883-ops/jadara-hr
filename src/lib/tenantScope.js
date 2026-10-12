// ===================== عزل بيانات المنشآت =====================
// كل قراءة أو كتابة على البيانات التشغيلية تُقيَّد بمنشأة المستخدم الحالي، ويُحدَّد ذلك
// بالرقم الموحّد لمنشأته: يُقرأ سجل منشأته (Tenant) المطابق لحسابه، ثم يُحصر النطاق على
// موظفي تلك المنشأة فقط — فلا تظهر بيانات أي منشأة أخرى في أي شاشة أو مستند أو حاسبة.
//
// الجذر: سجل الموظف يحمل الرقم الموحّد لمنشأته. وكل السجلات التشغيلية (رواتب، بصمات،
// إجازات، انتدابات، سلف، عهد، إنذارات، مخالصات، شكاوى، أداء، تدريب، إشعارات، تكليف
// المركبات) مرتبطة بموظف — فتُقيَّد تلقائياً بموظفي منشأة المستخدم.
//
// ملاحظة: هذه الطبقة تعمل على عميل البيانات في الواجهة (base44Client) فتسري على كل
// الصفحات والمكوّنات دون استثناء، ولو نُسي شرط العزل في شاشة جديدة فلن تتسرّب بيانات.

// الكيانات المرتبطة بموظف — الحقول التي تُحدّد انتماء السجل لمنشأة ما
const EMPLOYEE_KEYED = {
  Attendance: ["employee_id"],
  BusinessTrip: ["employee_id"],
  Complaint: ["employee_id"],
  Equipment: ["employee_id"],
  EquipmentRequest: ["employee_id"],
  ExitInterview: ["employee_id"],
  GosiRecord: ["employee_id"],
  Incentive: ["employee_id"],
  LeaveRequest: ["employee_id"],
  LoanRequest: ["employee_id"],
  Payroll: ["employee_id"],
  Performance: ["employee_id"],
  Settlement: ["employee_id"],
  SuccessionPlan: ["current_holder_id", "successor_id"],
  TrainingPlan: ["employee_id"],
  VehicleDelegation: ["employee_id"],
  Warning: ["employee_id"],
};

// الكيانات العامة للمنشأة (ملفاتها ومستنداتها: فروع، هيكل تنظيمي، مركبات، تراخيص،
// وظائف، متقدمون، استبيانات، خطط القوى العاملة، قرارات إدارية) — تُقيَّد بالرقم الموحّد.
const COMPANY_SCOPED = new Set([
  "Branch", "OrgUnit", "Vehicle", "License", "Job", "JobApplication",
  "Survey", "SurveyResponse", "WorkforcePlan", "AdminDecision", "TrialEvaluation",
  "CustomerSurvey", "CustomerSurveyResponse", "PlatformSubscription", "Organization",
]);

// قراءة سجل عام بمعرّفه (صفحة الوظيفة المفتوحة للجميع) — مسموحة بلا جلسة منشأة
const PUBLIC_GET = new Set(["Job"]);

// نطاق يُشتق من السجل الأصل عند الإنشاء من صفحة عامة (متقدم على وظيفة، رد استبيان)
const PARENT_OF = {
  JobApplication: { parent: "Job", key: "job_id" },
  SurveyResponse: { parent: "Survey", key: "survey_id" },
};

import { mergeCompanyRows, onlyMatching, recordBelongsToCompany, visibleByUnified } from "./companyGuard";

let rawClient = null;
let ctxPromise = null;
let ctxUserKey = null;

// يُستدعى مرة واحدة عند تهيئة عميل البيانات
export function installTenantScope(client) {
  rawClient = client;
}

// تُصفَّر الذاكرة المؤقتة بعد إضافة/حذف موظفين حتى يُعاد حساب نطاق المنشأة
export function invalidateTenantScope() {
  ctxPromise = null;
  ctxUserKey = null;
}

async function currentUserId() {
  try {
    const me = await rawClient.auth.me();
    return String(me?.id || "");
  } catch (_) {
    return "";
  }
}

async function tenantContext() {
  const userId = await currentUserId();
  if (!ctxPromise || ctxUserKey !== userId) {
    ctxUserKey = userId;
    ctxPromise = loadTenantContext();
  }
  return ctxPromise;
}

async function loadTenantContext() {
  try {
    // حساب المستخدم الحالي — لإشعاراته الخاصة (معتمد البوابة مثلاً)
    let userId = "";
    try {
      const me = await rawClient.auth.me();
      userId = String(me?.id || "");
    } catch (_) {}

    const res = await rawClient.functions.invoke("getMyTenant", {});
    const unified = String(res?.data?.tenant?.unified_number || "").trim();
    if (!unified) return { unified: "", userId, employeeIds: [] };
    const ctx = { unified, userId };
    // السجل الكامل لازم: طلب حقل id وحده يُسقط الرقم الموحّد، فيُرفض كل موظف وتختفي إجازاته ورواتبه.
    let people = [];
    try {
      people = await readScopedRows(rawClient.entities.Employee, ctx, {}, "-created_date", 5000);
    } catch { people = []; }
    // أي منشأة: الموظف الذي أنشأه حسابها بلا رقم موحّد يُربط برقمه حتى لا يختفي لاحقاً.
    const orphans = people.filter((e) => e?.id && !String(e.unified_number || "").trim());
    if (orphans.length) {
      rawClient.entities.Employee.bulkUpdate(orphans.map((e) => ({ id: e.id, unified_number: unified }))).catch(() => {});
    }
    return {
      unified,
      userId,
      employeeIds: people.map((e) => e.id).filter(Boolean),
    };
  } catch (_) {
    // عند تعذّر تحديد المنشأة لا تُعرض أي بيانات تشغيلية (الأمان أولاً)
    return { unified: "", userId: "", employeeIds: [] };
  }
}

const emptyPage = () => ({ items: [], next_cursor: null, has_more: false });

function asRows(page) {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

let idSnap = null;
let idSnapAt = 0;

/** هوية قديمة ما زالت محفوظة على راتب أو تأمينات أو حضور، للعرض فقط إذا الخزنة لم تُرجعها */
export async function loadNationalIdSnapshots() {
  if (idSnap && Date.now() - idSnapAt < 30000) return idSnap;
  const map = new Map();
  const take = (page) => {
    for (const r of asRows(page)) {
      const id = String(r?.employee_id || "").trim();
      const nid = String(r?.national_id || "").trim();
      if (id && nid && !map.has(id)) map.set(id, nid);
    }
  };
  const sources = ["Payroll", "GosiRecord", "Attendance", "Settlement", "Warning"];
  for (const name of sources) {
    try {
      const api = rawClient?.entities?.[name];
      if (api?.list) take(await api.list("-created_date", 500));
    } catch { /* السجل غير متاح */ }
  }
  idSnap = map;
  idSnapAt = Date.now();
  return map;
}

async function overlayVault(result) {
  const rows = asRows(result);
  if (!rows.some((r) => r?.emp_ref)) return result;
  try {
    const { warmEmployeeRows } = await import("./vaultSensitive");
    // الذاكرة تُطبَّق فوراً، وطلب الخزنة يكمل بعد ظهور القائمة.
    warmEmployeeRows(rows);
  } catch { /* تبقى حقول Base44 */ }
  return result;
}

function employeeScope(keys, ctx) {
  if (!ctx?.unified) return null;
  const byCompany = { unified_number: ctx.unified };
  if (!ctx.employeeIds?.length) return byCompany;
  const byEmployee = keys.length === 1
    ? { [keys[0]]: { $in: ctx.employeeIds } }
    : { $or: keys.map((k) => ({ [k]: { $in: ctx.employeeIds } })) };
  return { $or: [byEmployee, byCompany] };
}

// صفوف المنشأة: الرقم الموحّد، ومعها السجل القديم الذي أنشأه هذا الحساب قبل حفظ الرقم.
async function readScopedRows(api, ctx, query = {}, sort = "-created_date", limit = 1000) {
  if (!ctx?.unified || !api?.filter) return [];
  const lim = Math.min(typeof limit === "number" && limit > 0 ? limit : 1000, 5000);
  const srt = typeof sort === "string" && sort ? sort : "-created_date";
  const primary = asRows(await api.filter({ ...query, unified_number: ctx.unified }, srt, lim));
  let legacy = [];
  if (ctx.userId) {
    try {
      const mine = asRows(await api.filter({ ...query, created_by_id: ctx.userId }, srt, lim));
      legacy = mine.filter((rec) => !String(rec?.unified_number || "").trim());
    } catch { /* يبقى ما طابَق الرقم الموحّد */ }
  }
  return mergeCompanyRows(primary, legacy, ctx);
}

const belongsToTenant = (rec, keys, ctx) => recordBelongsToCompany(rec, ctx, keys);

// قراءتان منفصلتان ثم دمج: بمعرّف الموظف، وبرقم المنشأة. أي شركة، وأي رقم موحّد.
async function readKeyedRows(api, keys, ctx, query = {}, sort, limit) {
  if (!ctx?.unified || !api?.filter) return [];
  const lim = Math.min(typeof limit === "number" && limit > 0 ? limit : 1000, 5000);
  const srt = typeof sort === "string" && sort ? sort : "-created_date";
  const chunks = [];
  if (ctx.employeeIds?.length) {
    const byEmployee = keys.length === 1
      ? { [keys[0]]: { $in: ctx.employeeIds } }
      : { $or: keys.map((k) => ({ [k]: { $in: ctx.employeeIds } })) };
    try { chunks.push(...asRows(await api.filter({ ...query, ...byEmployee }, srt, lim))); } catch { /* تبقى قراءة الرقم الموحّد */ }
  }
  try { chunks.push(...asRows(await api.filter({ ...query, unified_number: ctx.unified }, srt, lim))); } catch { /* تبقى قراءة الموظفين */ }
  const seen = new Set();
  const out = [];
  for (const rec of chunks) {
    const id = String(rec?.id || "");
    if (!id || seen.has(id)) continue;
    if (!belongsToTenant(rec, keys, ctx)) continue;
    seen.add(id);
    out.push(rec);
  }
  return out;
}

async function stampCompany(data) {
  const ctx = await tenantContext();
  if (!ctx.unified) return data || {};
  return { ...(data || {}), unified_number: ctx.unified };
}

// كيان تشغيلي مرتبط بموظفين
function scopedEntity(keys, api) {
  const scope = async () => employeeScope(keys, await tenantContext());
  return {
    async filter(query = {}, a, b) {
      const ctx = await tenantContext();
      const legacy = typeof a === "string";
      if (!ctx.unified) return legacy ? [] : emptyPage();
      const rows = await readKeyedRows(api, keys, ctx, query, legacy ? a : "-created_date", legacy ? b : a?.limit);
      return overlayVault(rows);
    },
    async list(a, b) {
      const ctx = await tenantContext();
      const legacy = typeof a === "string";
      if (!ctx.unified) return legacy ? [] : emptyPage();
      const rows = await readKeyedRows(api, keys, ctx, {}, legacy ? a : "-created_date", legacy ? b : a?.limit);
      return overlayVault(rows);
    },
    async count(query = {}) {
      const s = await scope();
      return s ? api.count({ ...query, ...s }) : 0;
    },
    async aggregate(params = {}) {
      const s = await scope();
      if (!s) return { rows: [], truncated: false };
      return api.aggregate({ ...params, query: { ...(params.query || {}), ...s } });
    },
    async get(id) {
      const ctx = await tenantContext();
      if (!ctx.unified) return null;
      const rec = await api.get(id).catch(() => null);
      if (!belongsToTenant(rec, keys, ctx)) return null;
      const [one] = asRows(await overlayVault([rec]));
      return one || rec;
    },
    async create(data) { return api.create(await stampCompany(data)); },
    async bulkCreate(rows = []) {
      const stamped = [];
      for (const row of rows) stamped.push(await stampCompany(row));
      return api.bulkCreate(stamped);
    },
    async update(id, data) {
      const ctx = await tenantContext();
      const rec = await api.get(id).catch(() => null);
      if (!belongsToTenant(rec, keys, ctx)) throw new Error("forbidden");
      return api.update(id, await stampCompany(data));
    },
    async bulkUpdate(rows = []) {
      const ctx = await tenantContext();
      const safe = [];
      for (const row of rows) {
        if (!row?.id) continue;
        const rec = await api.get(row.id).catch(() => null);
        if (belongsToTenant(rec, keys, ctx)) safe.push(await stampCompany(row));
      }
      return safe.length ? api.bulkUpdate(safe) : [];
    },
    async updateMany(query, update) {
      const s = await scope();
      if (!s) return { updated: 0 };
      return api.updateMany({ ...query, ...s }, update);
    },
    async delete(id) {
      const ctx = await tenantContext();
      const rec = await api.get(id).catch(() => null);
      if (!belongsToTenant(rec, keys, ctx)) throw new Error("forbidden");
      return api.delete(id);
    },
    async deleteMany(query = {}) {
      const s = await scope();
      if (!s) return { deleted: 0 };
      return api.deleteMany({ ...query, ...s });
    },
    // البث المباشر: تُمرَّر الأحداث الخاصة بمنشأة العميل فقط
    subscribe(cb) {
      return api.subscribe(async (event) => {
        const ctx = await tenantContext();
        if (ctx.unified && belongsToTenant(event?.data, keys, ctx)) cb(event);
      });
    },
  };
}

// سجل الموظفين: هو جذر العزل — يُقرأ بالرقم الموحّد، ويُوسَم به كل موظف جديد
function scopedEmployee(api) {
  const unified = async () => (await tenantContext()).unified;
  const needTenant = async () => {
    const u = await unified();
    if (!u) throw new Error("لا يمكن حفظ البيانات قبل ربط الحساب بمنشأة");
    return u;
  };
  return {
    async filter(query = {}, a, b) {
      const ctx = await tenantContext();
      const legacy = typeof a === "string";
      if (!ctx.unified) return legacy ? [] : emptyPage();
      const rows = await readScopedRows(api, ctx, query, legacy ? a : "-created_date", legacy ? b : a?.limit);
      return overlayVault(rows);
    },
    async list(a, b) {
      const ctx = await tenantContext();
      const legacy = typeof a === "string";
      if (!ctx.unified) return legacy ? [] : emptyPage();
      const rows = await readScopedRows(api, ctx, {}, legacy ? a : "-created_date", legacy ? b : a?.limit);
      return overlayVault(rows);
    },
    async count(query = {}) {
      const u = await unified();
      return u ? api.count({ ...query, unified_number: u }) : 0;
    },
    async aggregate(params = {}) {
      const u = await unified();
      if (!u) return { rows: [], truncated: false };
      return api.aggregate({ ...params, query: { ...(params.query || {}), unified_number: u } });
    },
    async get(id) {
      const u = await unified();
      if (!u) return null;
      const rec = await api.get(id).catch(() => null);
      const ctx = await tenantContext();
      if (!visibleByUnified(rec, ctx)) return null;
      const [one] = asRows(await overlayVault([rec]));
      return one || rec;
    },
    async create(data = {}) {
      const u = await needTenant();
      const rec = await api.create({ ...data, unified_number: u });
      invalidateTenantScope();
      return rec;
    },
    async bulkCreate(rows = []) {
      const u = await needTenant();
      const created = await api.bulkCreate(rows.map((r) => ({ ...r, unified_number: u })));
      invalidateTenantScope();
      return created;
    },
    async update(id, data = {}) {
      const ctx = await tenantContext();
      const rec = await api.get(id).catch(() => null);
      if (!visibleByUnified(rec, ctx)) throw new Error("forbidden");
      const patch = { ...data, unified_number: ctx.unified };
      return api.update(id, patch);
    },
    async bulkUpdate(rows = []) {
      const ctx = await tenantContext();
      const safe = [];
      for (const row of rows) {
        if (!row?.id) continue;
        const rec = await api.get(row.id).catch(() => null);
        if (visibleByUnified(rec, ctx)) safe.push({ ...row, unified_number: ctx.unified });
      }
      if (!safe.length) return [];
      const out = await api.bulkUpdate(safe);
      invalidateTenantScope();
      return out;
    },
    async updateMany(query, update) {
      const u = await unified();
      if (!u) return { updated: 0 };
      return api.updateMany({ ...query, unified_number: u }, update);
    },
    async delete(id) {
      const ctx = await tenantContext();
      const rec = await api.get(id).catch(() => null);
      if (!visibleByUnified(rec, ctx)) throw new Error("forbidden");
      const out = await api.delete(id);
      invalidateTenantScope();
      return out;
    },
    async deleteMany(query = {}) {
      const u = await unified();
      if (!u) return { deleted: 0 };
      const out = await api.deleteMany({ ...query, unified_number: u });
      invalidateTenantScope();
      return out;
    },
    subscribe(cb) {
      return api.subscribe(async (event) => {
        const u = await unified();
        if (u && String(event?.data?.unified_number || "") === u) cb(event);
      });
    },
  };
}

// كيان عام للمنشأة: قراءة بالرقم الموحّد، ووسم تلقائي بالسجل الجديد
function companyScopedEntity(name, api) {
  const scope = async () => {
    const ctx = await tenantContext();
    return ctx.unified ? { unified_number: ctx.unified } : null;
  };
  const stamp = async (data = {}) => {
    const ctx = await tenantContext();
    if (ctx.unified) return { ...data, unified_number: ctx.unified };
    const p = PARENT_OF[name];
    if (p && data[p.key]) {
      const parent = await rawClient.entities[p.parent].get(data[p.key]).catch(() => null);
      const un = String(parent?.unified_number || "").trim();
      if (un) return { ...data, unified_number: un };
    }
    return data;
  };
  return {
    async filter(query = {}, a, b) {
      const ctx = await tenantContext();
      const legacy = typeof a === "string";
      if (!ctx.unified) return legacy ? [] : emptyPage();
      return readScopedRows(api, ctx, query, legacy ? a : "-created_date", legacy ? b : a?.limit);
    },
    async list(a, b) {
      const ctx = await tenantContext();
      const legacy = typeof a === "string";
      if (!ctx.unified) return legacy ? [] : emptyPage();
      return readScopedRows(api, ctx, {}, legacy ? a : "-created_date", legacy ? b : a?.limit);
    },
    async count(query = {}) {
      const s = await scope();
      return s ? api.count({ ...query, ...s }) : 0;
    },
    async aggregate(params = {}) {
      const s = await scope();
      if (!s) return { rows: [], truncated: false };
      return api.aggregate({ ...params, query: { ...(params.query || {}), ...s } });
    },
    async get(id) {
      const s = await scope();
      if (!s) return PUBLIC_GET.has(name) ? api.get(id).catch(() => null) : null;
      const rec = await api.get(id).catch(() => null);
      const ctx = await tenantContext();
      return visibleByUnified(rec, ctx) ? rec : null;
    },
    async create(data) {
      return api.create(await stamp(data));
    },
    async bulkCreate(rows = []) {
      const out = [];
      for (const r of rows) out.push(await stamp(r));
      return api.bulkCreate(out);
    },
    async update(id, data = {}) {
      const ctx = await tenantContext();
      const rec = await api.get(id).catch(() => null);
      if (!visibleByUnified(rec, ctx)) throw new Error("forbidden");
      return api.update(id, { ...data, unified_number: ctx.unified });
    },
    async bulkUpdate(rows = []) {
      const ctx = await tenantContext();
      const safe = [];
      for (const row of rows) {
        if (!row?.id) continue;
        const rec = await api.get(row.id).catch(() => null);
        if (visibleByUnified(rec, ctx)) safe.push({ ...row, unified_number: ctx.unified });
      }
      return safe.length ? api.bulkUpdate(safe) : [];
    },
    async updateMany(query, update) {
      const s = await scope();
      if (!s) return { updated: 0 };
      return api.updateMany({ ...query, ...s }, update);
    },
    async delete(id) {
      const ctx = await tenantContext();
      const rec = await api.get(id).catch(() => null);
      if (!visibleByUnified(rec, ctx)) throw new Error("forbidden");
      return api.delete(id);
    },
    async deleteMany(query = {}) {
      const s = await scope();
      if (!s) return { deleted: 0 };
      return api.deleteMany({ ...query, ...s });
    },
    subscribe(cb) {
      return api.subscribe(async (event) => {
        const ctx = await tenantContext();
        if (visibleByUnified(event?.data, ctx)) cb(event);
      });
    },
  };
}

// الإشعارات: إشعارات المستخدم نفسه + إشعارات موظفي منشأته + إشعارات منشأته — ولا شيء غيرها
function scopedNotification(api) {
  const scope = async () => {
    const ctx = await tenantContext();
    const parts = [];
    if (ctx.unified) parts.push({ unified_number: ctx.unified });
    if (ctx.userId) parts.push({ user_id: ctx.userId });
    if (ctx.employeeIds.length) parts.push({ employee_id: { $in: ctx.employeeIds } });
    if (!parts.length) return null;
    return parts.length === 1 ? parts[0] : { $or: parts };
  };
  const mineSync = (rec, ctx) => {
    if (!rec || !ctx) return false;
    if (ctx.userId && String(rec.user_id || "") === ctx.userId) return true;
    if (ctx.unified && String(rec.unified_number || "") === ctx.unified) return true;
    return ctx.employeeIds.some((id) => String(rec.employee_id || "") === String(id));
  };
  const mine = async (rec) => mineSync(rec, await tenantContext());
  const stamp = async (data = {}) => {
    const ctx = await tenantContext();
    return ctx.unified ? { ...data, unified_number: ctx.unified } : data;
  };
  return {
    async filter(query = {}, a, b) {
      const s = await scope();
      const legacy = typeof a === "string";
      if (!s) return legacy ? [] : emptyPage();
      const merged = { ...query, ...s };
      const ctx = await tenantContext();
      const result = legacy ? await api.filter(merged, a, b) : (a === undefined ? await api.filter(merged) : await api.filter(merged, a));
      return onlyMatching(result, (rec) => mineSync(rec, ctx));
    },
    async list(a, b) {
      const s = await scope();
      const legacy = typeof a === "string";
      if (!s) return legacy ? [] : emptyPage();
      const ctx = await tenantContext();
      const result = legacy ? await api.filter(s, a, b) : (a === undefined ? await api.filter(s) : await api.filter(s, { limit: 200, ...a }));
      return onlyMatching(result, (rec) => mineSync(rec, ctx));
    },
    async count(query = {}) {
      const s = await scope();
      return s ? api.count({ ...query, ...s }) : 0;
    },
    async aggregate(params = {}) {
      const s = await scope();
      if (!s) return { rows: [], truncated: false };
      return api.aggregate({ ...params, query: { ...(params.query || {}), ...s } });
    },
    async get(id) {
      const rec = await api.get(id).catch(() => null);
      return (await mine(rec)) ? rec : null;
    },
    async create(data) {
      return api.create(await stamp(data));
    },
    async bulkCreate(rows = []) {
      const out = [];
      for (const r of rows) out.push(await stamp(r));
      return api.bulkCreate(out);
    },
    update: (id, data) => api.update(id, data),
    bulkUpdate: (rows) => api.bulkUpdate(rows),
    async updateMany(query, update) {
      const s = await scope();
      if (!s) return { updated: 0 };
      return api.updateMany({ ...query, ...s }, update);
    },
    delete: (id) => api.delete(id),
    async deleteMany(query = {}) {
      const s = await scope();
      if (!s) return { deleted: 0 };
      return api.deleteMany({ ...query, ...s });
    },
    subscribe(cb) {
      return api.subscribe(async (event) => { if (await mine(event?.data)) cb(event); });
    },
  };
}

// تُغلَّف كل نداءات الكيانات في الواجهة عبر هذه الطبقة
export function scopedEntities(entities) {
  if (!entities) return entities;
  return new Proxy(entities, {
    get(target, prop) {
      const api = target[prop];
      if (prop === "Employee") return scopedEmployee(api);
      if (prop === "Notification" && api) return scopedNotification(api);
      if (typeof prop === "string" && COMPANY_SCOPED.has(prop) && api) return companyScopedEntity(prop, api);
      const keys = typeof prop === "string" ? EMPLOYEE_KEYED[prop] : null;
      if (!keys || !api) return api;
      return scopedEntity(keys, api);
    },
  });
}