/**
 * vaultSensitive — طبقة العرض الموحّدة للبيانات الحساسة.
 *
 * عند تفعيل الخزنة السعودية، تُخزّن الحقول الحساسة (هوية/جواز/بنك/مواليد/هاتف/عنوان/تأمين)
 * في الخزنة وتُستبدل في Base44 برمز معتم (emp_ref). هذا المساعد يجلب القيم الحساسة
 * من الخزنة عند العرض، مع وضع احتياطي: إن لم يوجد emp_ref (النمط القديم)، يعيد الحقول المحلية.
 */
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  noteVaultFailure, readEmployeeCache, rememberEmployee, trackRows, vaultCooling,
  snapshotsFresh, markSnapshotsDone, notifyVault,
} from "@/lib/vaultCache";

export const SENSITIVE_FIELDS = [
  "national_id", "birth_date", "phone", "address", "emergency_contact",
  "passport_number", "passport_expiry", "bank_account", "health_insurance_number",
];

function pickSensitive(obj) {
  const out = {};
  for (const f of SENSITIVE_FIELDS) {
    if (obj && obj[f] !== undefined && obj[f] !== null && obj[f] !== "") out[f] = obj[f];
  }
  return out;
}

/**
 * يفك تغليف Axios وvaultProxy حتى يصل لكائن القيم أو { byRef }.
 * يتوقف عند أول مستوى يحمل حقلاً حساساً حتى لا يبتلع كائناً متداخلاً بالخطأ.
 */
export function unwrapVaultPayload(res) {
  let cur = res;
  for (let i = 0; i < 3; i++) {
    if (!cur || typeof cur !== "object") return {};
    if (cur.byRef || cur.national_id || cur.birth_date || cur.emp_ref || cur.phone || cur.passport_number) return cur;
    if (cur.data && typeof cur.data === "object") { cur = cur.data; continue; }
    return cur;
  }
  return cur && typeof cur === "object" ? cur : {};
}

/**
 * يجلب البيانات الحساسة من الخزنة عبر emp_ref ويدمجها في كائن الموظف.
 * إن لم يوجد emp_ref أو فشلت الخزنة، يعيد الموظف كما هو (النمط القديم).
 * لا تُكتب القيم الراجعة إلى Base44 — تبقى في ذاكرة الشاشة للعرض فقط.
 */
export async function enrichEmployee(employee) {
  if (!employee || !employee.emp_ref) return employee;
  const hit = readEmployeeCache(employee.emp_ref);
  if (hit?.vault) return { ...employee, ...hit.fields };
  const map = await enrichEmployeesBatch([employee]);
  return { ...employee, ...(map[employee.emp_ref] || {}) };
}

/**
 * يجلب البيانات الحساسة من الخزنة عبر رمز معتم (emp_ref) فقط —
 * للمستندات والسجلات اللقطية (Settlement/Payroll) التي تخزّن emp_ref دون بيانات حساسة.
 */
export async function fetchSensitiveByRef(empRef) {
  if (!empRef) return {};
  const hit = readEmployeeCache(empRef);
  if (hit?.vault) return { ...hit.fields };
  const map = await enrichEmployeesBatch([{ emp_ref: empRef }]);
  return map[empRef] || {};
}

/**
 * يجلب البيانات الحساسة لمجموعة موظفين في نداء واحد (للقوائم).
 * يعيد خريطة emp_ref → قيم حساسة. يتجاهل من لا يملكون emp_ref.
 * النداء الواحد يمنع فتح دالة سحابية لكل موظف، وهو ما كان يؤخر القائمة ثم يُسقط الحقول.
 */
function applyCachedFields(row) {
  const hit = row?.emp_ref ? readEmployeeCache(row.emp_ref) : null;
  if (!hit?.fields) return;
  for (const [k, v] of Object.entries(hit.fields)) {
    if (v === undefined || v === null || String(v).trim() === "") continue;
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") continue;
    row[k] = v;
  }
}

/** يملأ الصفوف من ذاكرة اليوم فوراً، ويطلب الناقص من الخزنة في الخلفية دون حجب الشاشة. */
export function warmEmployeeRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  trackRows(list);
  for (const row of list) applyCachedFields(row);
  const pending = warmMissing(list).then(() => finishEmployeeWarm(list));
  pending.catch(() => {});
  return pending;
}

let flight = Promise.resolve();
const flightRefs = new Set();

function warmMissing(rows) {
  const refs = [...new Set(rows.map((r) => r?.emp_ref).filter(Boolean))];
  if (vaultCooling()) return flight;
  const need = refs.filter((ref) => {
    const hit = readEmployeeCache(ref);
    if (hit?.vault) return false;
    if (flightRefs.has(ref)) return false;
    return true;
  });
  if (!need.length) return flight;
  for (const ref of need) flightRefs.add(ref);
  const job = fetchEmployeeRefs(need).finally(() => {
    for (const ref of need) flightRefs.delete(ref);
  });
  const current = flight.then(() => job, () => job);
  flight = current;
  current.finally(() => {
    if (flight === current) flight = Promise.resolve();
  });
  return current;
}

async function fetchEmployeeRefs(refs) {
  try {
    const res = await base44.functions.invoke("vaultProxy", { action: "getEmployees", empRefs: refs });
    const payload = unwrapVaultPayload(res);
    const byRef = payload.byRef && typeof payload.byRef === "object" ? payload.byRef : null;
    if (!byRef) throw new Error("no_byRef");
    let stored = 0;
    for (const ref of refs) {
      const row = byRef[ref];
      if (!row || typeof row !== "object") continue;
      rememberEmployee(ref, pickSensitive(row), true, true);
      stored++;
    }
    if (!stored) noteVaultFailure();
  } catch {
    noteVaultFailure();
    await fetchEmployeesOneByOne(refs);
  }
}

async function fetchEmployeesOneByOne(refs) {
  const queue = refs.slice();
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const ref = queue.shift();
      try {
        const res = await base44.functions.invoke("vaultProxy", { action: "getEmployee", empRef: ref });
        const fields = pickSensitive(unwrapVaultPayload(res));
        rememberEmployee(ref, fields, true, true);
      } catch { /* يبقى العرض على الذاكرة أو الحقول المحلية */ }
    }
  });
  await Promise.all(workers);
}

async function finishEmployeeWarm(rows) {
  for (const row of rows) applyCachedFields(row);
  const missingId = rows.filter((e) => e?.full_name && e?.id && !String(e.national_id || "").trim());
  if (missingId.length && !snapshotsFresh()) {
    try {
      const { loadNationalIdSnapshots } = await import("./tenantScope");
      const snaps = await loadNationalIdSnapshots();
      markSnapshotsDone();
      for (const row of missingId) {
        const nid = snaps.get(row.id);
        if (!nid) continue;
        row.national_id = nid;
        if (row.emp_ref) rememberEmployee(row.emp_ref, { national_id: nid }, false, true);
      }
    } catch { /* القوائم القديمة غير متاحة */ }
  }
  notifyVault();
}

export async function enrichEmployeesBatch(employees) {
  const withRef = (employees || []).filter((e) => e && e.emp_ref);
  if (withRef.length === 0) return {};
  await warmEmployeeRows(withRef);
  const map = {};
  for (const emp of withRef) {
    const hit = readEmployeeCache(emp.emp_ref);
    map[emp.emp_ref] = hit?.fields ? { ...hit.fields } : {};
  }
  return map;
}

/** يدمج خريطة الخزنة في قائمة العرض دون المساس بالسجل الأصلي في Base44 */
export function applySensitiveMap(employees, map) {
  if (!map) return employees || [];
  return (employees || []).map((e) => {
    const extra = e?.emp_ref ? map[e.emp_ref] : null;
    if (!extra || !Object.keys(extra).length) return e;
    return { ...e, ...extra };
  });
}

/**
 * يملأ الحقول الحساسة الفارغة من الخزنة لأي صف يحمل emp_ref:
 * موظف، راتب، تأمينات، حضور، مخالصة، إنذار. لا يكتب شيئاً إلى Base44،
 * ولا يستبدل قيمة موجودة أصلاً في الصف.
 */
export async function mergeVaultRows(rows) {
  if (!Array.isArray(rows) || !rows.some((r) => r?.emp_ref)) return rows || [];
  const map = await enrichEmployeesBatch(rows);
  return (rows || []).map((row) => {
    const extra = row?.emp_ref ? map[row.emp_ref] : null;
    if (!extra) return row;
    const patch = {};
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || String(v).trim() === "") continue;
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") continue;
      patch[k] = v;
    }
    return Object.keys(patch).length ? { ...row, ...patch } : row;
  });
}

/**
 * Hook: يعيد نسخة الموظف مُغناة بالبيانات الحساسة من الخزنة عند توفر emp_ref.
 */
export function useEnrichedEmployee(employee) {
  const [enriched, setEnriched] = useState(employee);
  useEffect(() => {
    let active = true;
    setEnriched(employee);
    if (!employee || !employee.emp_ref) return;
    enrichEmployee(employee).then((e) => { if (active) setEnriched(e); });
    return () => { active = false; };
  }, [employee?.id, employee?.emp_ref]);
  return enriched || employee;
}