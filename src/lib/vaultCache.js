/**
 * ذاكرة عرض الخزنة لصاحب الحساب.
 * تبقى في المتصفح ٢٤ ساعة من أول جلب ناجح، ثم تُعاد من الخزنة في اليوم التالي.
 * لا تُكتب إلى Base44. تُمسح عند تسجيل الخروج أو عند تغيّر الحساب.
 */
export const VAULT_CACHE_TTL = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "jadara_vault_day_v1";
// كان التبريد ١٥ دقيقة، فأي فشل واحد (مستند تالف أو ارتباط) يوقف جلب الخزنة
// للشاشة كلها ربع ساعة ويبدو كأن النظام لا يجلب المستندات. صار ٩٠ ثانية،
// ولمستند واحد فقط عبر refFails، فلا يعطّل رمز واحد بقية المستندات.
const FAIL_COOLDOWN = 90 * 1000;
const refFails = new Map();

let memory = null;
let userId = "";
let failUntil = 0;
const listeners = new Set();
const lives = [];

function storage() {
  try {
    if (typeof localStorage !== "undefined" && localStorage) return localStorage;
  } catch { /* بيئة بلا تخزين */ }
  return null;
}

function blank(uid) {
  return {
    userId: uid || "",
    epoch: Date.now(),
    employees: {},
    records: {},
    snapshotsAt: 0,
  };
}

function load() {
  if (memory) {
    if (Date.now() - memory.epoch >= VAULT_CACHE_TTL) {
      const uid = memory.userId || userId;
      memory = blank(uid);
      persist();
    }
    return memory;
  }
  const store = storage();
  if (store) {
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.epoch && Date.now() - parsed.epoch < VAULT_CACHE_TTL) {
          if (!userId || !parsed.userId || parsed.userId === userId) {
            memory = {
              userId: parsed.userId || userId || "",
              epoch: parsed.epoch,
              employees: parsed.employees && typeof parsed.employees === "object" ? parsed.employees : {},
              records: parsed.records && typeof parsed.records === "object" ? parsed.records : {},
              snapshotsAt: Number(parsed.snapshotsAt) || 0,
            };
            return memory;
          }
        }
      }
    } catch { /* تخزين تالف */ }
  }
  memory = blank(userId);
  return memory;
}

function persist() {
  const store = storage();
  if (!store || !memory) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch { /* المساحة ممتلئة — الذاكرة اللحظية تكفي لهذه الجلسة */ }
}

function nonempty(fields) {
  const out = {};
  if (!fields || typeof fields !== "object") return out;
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || String(v).trim() === "") continue;
    const text = String(v);
    if (text.length > 8000) continue;
    out[k] = v;
  }
  return out;
}

export function noteVaultUser(id) {
  const next = String(id || "");
  if (!next) return;
  if (userId && userId !== next) clearVaultCache();
  userId = next;
  const state = load();
  if (state.userId && state.userId !== next) {
    memory = blank(next);
    persist();
    return;
  }
  if (!state.userId) {
    state.userId = next;
    persist();
  }
}

export function clearVaultCache() {
  failUntil = 0;
  refFails.clear();
  memory = blank(userId);
  const store = storage();
  try { store?.removeItem(STORAGE_KEY); } catch { /* تجاهل */ }
  notifyVault();
}

export function subscribeVault(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyVault() {
  for (const fn of listeners) {
    try { fn(); } catch { /* مستمع واحد لا يوقف البقية */ }
  }
}

export function vaultCooling() {
  return Date.now() < failUntil;
}

export function noteVaultFailure() {
  failUntil = Date.now() + FAIL_COOLDOWN;
}

/** تسجيل فشل مستند واحد — يمنع تكرار محاولته فوراً دون تعطيل بقية المستندات */
export function noteDocFailure(ref) {
  const key = String(ref || "").trim();
  if (!key) return;
  refFails.set(key, Date.now() + FAIL_COOLDOWN);
}

/** هل هذا الرمز في فترة تبريد؟ (فشل حديثاً) */
export function docCooling(ref) {
  const key = String(ref || "").trim();
  const until = refFails.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    refFails.delete(key);
    return false;
  }
  return true;
}

export function trackRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  for (const row of list) {
    if (row && typeof row === "object") lives.push(new WeakRef(row));
  }
  if (lives.length <= 8000) return;
  const kept = [];
  for (const ref of lives) if (ref.deref()) kept.push(ref);
  lives.length = 0;
  for (const ref of kept.slice(-4000)) lives.push(ref);
}

function patchTracked(empRef, fields) {
  const extra = nonempty(fields);
  if (!empRef || !Object.keys(extra).length) return;
  for (const holder of lives) {
    const row = holder.deref();
    if (!row || String(row.emp_ref || "") !== String(empRef)) continue;
    for (const [k, v] of Object.entries(extra)) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") continue;
      row[k] = v;
    }
  }
}

export function readEmployeeCache(empRef) {
  if (!empRef) return null;
  const hit = load().employees[empRef];
  if (!hit || typeof hit !== "object") return null;
  return hit;
}

/**
 * يحفظ حقول العرض. fromVault=true يعني الخزنة أجابت، فلا نعيد طلب هذا الرمز قبل انتهاء اليوم.
 */
export function rememberEmployee(empRef, fields, fromVault, silent = false) {
  if (!empRef) return;
  const state = load();
  const prev = state.employees[empRef] || { fields: {}, vault: false };
  const merged = { ...nonempty(prev.fields), ...nonempty(fields) };
  state.employees[empRef] = { fields: merged, vault: fromVault ? true : !!prev.vault };
  persist();
  patchTracked(empRef, merged);
  if (!silent) notifyVault();
}

export function snapshotsFresh() {
  const at = Number(load().snapshotsAt) || 0;
  return at > 0 && Date.now() - at < VAULT_CACHE_TTL;
}

export function markSnapshotsDone() {
  const state = load();
  state.snapshotsAt = Date.now();
  persist();
}

function recordKey(moduleKey, ref) {
  return `${moduleKey}:${ref}`;
}

export function readRecordCache(moduleKey, ref) {
  if (!moduleKey || !ref) return undefined;
  const hit = load().records[recordKey(moduleKey, ref)];
  if (!hit) return undefined;
  return hit.data;
}

/**
 * يُسقط سجلاً من الذاكرة بعد تحديث جزئي.
 * السبب: تحديث الخزنة يدمج مع السجل الكامل على السيرفر، فلو خزّنّا الحمولة
 * الجزئية محلياً لعُرض السجل ناقصاً (تختفي مرفقاته وحقوله السابقة) حتى اليوم التالي.
 * الإسقاط يجعل الجلب القادم يأتي بالسجل المدمج الصحيح.
 */
export function forgetRecord(moduleKey, ref) {
  if (!moduleKey || !ref) return;
  const state = load();
  const key = recordKey(moduleKey, ref);
  if (state.records[key] === undefined) return;
  delete state.records[key];
  persist();
}

export function rememberRecord(moduleKey, ref, data, silent = false) {
  if (!moduleKey || !ref) return;
  const state = load();
  const clean = data && typeof data === "object" ? nonempty(data) : null;
  state.records[recordKey(moduleKey, ref)] = { data: clean };
  persist();
  if (!silent) notifyVault();
}
