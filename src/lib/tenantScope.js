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
]);

// قراءة سجل عام بمعرّفه (صفحة الوظيفة المفتوحة للجميع) — مسموحة بلا جلسة منشأة
const PUBLIC_GET = new Set(["Job"]);

// نطاق يُشتق من السجل الأصل عند الإنشاء من صفحة عامة (متقدم على وظيفة، رد استبيان)
const PARENT_OF = {
  JobApplication: { parent: "Job", key: "job_id" },
  SurveyResponse: { parent: "Survey", key: "survey_id" },
};

let rawClient = null;
let ctxPromise = null;

// يُستدعى مرة واحدة عند تهيئة عميل البيانات
export function installTenantScope(client) {
  rawClient = client;
}

// تُصفَّر الذاكرة المؤقتة بعد إضافة/حذف موظفين حتى يُعاد حساب نطاق المنشأة
export function invalidateTenantScope() {
  ctxPromise = null;
}

async function tenantContext() {
  if (!ctxPromise) ctxPromise = loadTenantContext();
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
    const page = await rawClient.entities.Employee.filter(
      { unified_number: unified },
      { fields: ["id"], limit: 1000 }
    );
    const items = page?.items || (Array.isArray(page) ? page : []);
    return { unified, userId, employeeIds: items.map((e) => e.id).filter(Boolean) };
  } catch (_) {
    // عند تعذّر تحديد المنشأة لا تُعرض أي بيانات تشغيلية (الأمان أولاً)
    return { unified: "", userId: "", employeeIds: [] };
  }
}

const emptyPage = () => ({ items: [], next_cursor: null, has_more: false });

function employeeScope(keys, ctx) {
  if (!ctx.unified) return null;
  if (keys.length === 1) return { [keys[0]]: { $in: ctx.employeeIds } };
  return { $or: keys.map((k) => ({ [k]: { $in: ctx.employeeIds } })) };
}

const belongsToTenant = (rec, keys, ctx) =>
  !!rec && ctx.employeeIds.some((id) => keys.some((k) => String(rec[k] || "") === String(id)));

// كيان تشغيلي مرتبط بموظفين
function scopedEntity(keys, api) {
  const scope = async () => employeeScope(keys, await tenantContext());
  return {
    async filter(query = {}, a, b) {
      const s = await scope();
      const legacy = typeof a === "string";
      if (!s) return legacy ? [] : emptyPage();
      const merged = { ...query, ...s };
      if (legacy) return api.filter(merged, a, b);
      return a === undefined ? api.filter(merged) : api.filter(merged, a);
    },
    async list(a, b) {
      const s = await scope();
      const legacy = typeof a === "string";
      if (!s) return legacy ? [] : emptyPage();
      if (legacy) return api.filter(s, a, b);
      return a === undefined ? api.filter(s) : api.filter(s, { limit: 200, ...a });
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
      return belongsToTenant(rec, keys, ctx) ? rec : null;
    },
    create: (data) => api.create(data),
    bulkCreate: (rows) => api.bulkCreate(rows),
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
      const u = await unified();
      const legacy = typeof a === "string";
      if (!u) return legacy ? [] : emptyPage();
      const merged = { ...query, unified_number: u };
      if (legacy) return api.filter(merged, a, b);
      return a === undefined ? api.filter(merged) : api.filter(merged, a);
    },
    async list(a, b) {
      const u = await unified();
      const legacy = typeof a === "string";
      if (!u) return legacy ? [] : emptyPage();
      if (legacy) return api.filter({ unified_number: u }, a, b);
      return a === undefined ? api.filter({ unified_number: u }) : api.filter({ unified_number: u }, { limit: 200, ...a });
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
      return rec && String(rec.unified_number || "") === u ? rec : null;
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
      const u = await unified();
      const patch = { ...data };
      if (patch.unified_number !== undefined) patch.unified_number = u;
      return api.update(id, patch);
    },
    async bulkUpdate(rows = []) {
      const u = await unified();
      const out = await api.bulkUpdate(
        rows.map((r) => (r.unified_number !== undefined ? { ...r, unified_number: u } : r))
      );
      invalidateTenantScope();
      return out;
    },
    async updateMany(query, update) {
      const u = await unified();
      if (!u) return { updated: 0 };
      return api.updateMany({ ...query, unified_number: u }, update);
    },
    delete: (id) => api.delete(id),
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
      const s = await scope();
      const legacy = typeof a === "string";
      if (!s) return legacy ? [] : emptyPage();
      const merged = { ...query, ...s };
      if (legacy) return api.filter(merged, a, b);
      return a === undefined ? api.filter(merged) : api.filter(merged, a);
    },
    async list(a, b) {
      const s = await scope();
      const legacy = typeof a === "string";
      if (!s) return legacy ? [] : emptyPage();
      if (legacy) return api.filter(s, a, b);
      return a === undefined ? api.filter(s) : api.filter(s, { limit: 200, ...a });
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
      return rec && String(rec.unified_number || "") === s.unified_number ? rec : null;
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
      const s = await scope();
      const patch = { ...data };
      if (patch.unified_number !== undefined && s) patch.unified_number = s.unified_number;
      return api.update(id, patch);
    },
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
      return api.subscribe(async (event) => {
        const s = await scope();
        if (s && String(event?.data?.unified_number || "") === s.unified_number) cb(event);
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
  const mine = async (rec) => {
    if (!rec) return false;
    const ctx = await tenantContext();
    if (ctx.userId && String(rec.user_id || "") === ctx.userId) return true;
    if (ctx.unified && String(rec.unified_number || "") === ctx.unified) return true;
    return ctx.employeeIds.some((id) => String(rec.employee_id || "") === id);
  };
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
      if (legacy) return api.filter(merged, a, b);
      return a === undefined ? api.filter(merged) : api.filter(merged, a);
    },
    async list(a, b) {
      const s = await scope();
      const legacy = typeof a === "string";
      if (!s) return legacy ? [] : emptyPage();
      if (legacy) return api.filter(s, a, b);
      return a === undefined ? api.filter(s) : api.filter(s, { limit: 200, ...a });
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