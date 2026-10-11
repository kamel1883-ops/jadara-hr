/**
 * vaultSensitive — طبقة العرض الموحّدة للبيانات الحساسة.
 *
 * عند تفعيل الخزنة السعودية، تُخزّن الحقول الحساسة (هوية/جواز/بنك/مواليد/هاتف/عنوان/تأمين)
 * في الخزنة وتُستبدل في Base44 برمز معتم (emp_ref). هذا المساعد يجلب القيم الحساسة
 * من الخزنة عند العرض، مع وضع احتياطي: إن لم يوجد emp_ref (النمط القديم)، يعيد الحقول المحلية.
 */
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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
  try {
    const res = await base44.functions.invoke("vaultProxy", { action: "getEmployee", empRef: employee.emp_ref });
    const data = unwrapVaultPayload(res);
    return { ...employee, ...pickSensitive(data) };
  } catch (e) {
    // الخزنة غير مُهيّأة أو السجل غير موجود — أبقِ الحقول المحلية
    return employee;
  }
}

/**
 * يجلب البيانات الحساسة من الخزنة عبر رمز معتم (emp_ref) فقط —
 * للمستندات والسجلات اللقطية (Settlement/Payroll) التي تخزّن emp_ref دون بيانات حساسة.
 */
export async function fetchSensitiveByRef(empRef) {
  if (!empRef) return {};
  try {
    const res = await base44.functions.invoke("vaultProxy", { action: "getEmployee", empRef });
    return pickSensitive(unwrapVaultPayload(res));
  } catch (e) {
    return {};
  }
}

/**
 * يجلب البيانات الحساسة لمجموعة موظفين في نداء واحد (للقوائم).
 * يعيد خريطة emp_ref → قيم حساسة. يتجاهل من لا يملكون emp_ref.
 * النداء الواحد يمنع فتح دالة سحابية لكل موظف، وهو ما كان يؤخر القائمة ثم يُسقط الحقول.
 */
export async function enrichEmployeesBatch(employees) {
  const withRef = (employees || []).filter((e) => e && e.emp_ref);
  if (withRef.length === 0) return {};
  const empRefs = [...new Set(withRef.map((e) => e.emp_ref))];
  try {
    const res = await base44.functions.invoke("vaultProxy", { action: "getEmployees", empRefs });
    const payload = unwrapVaultPayload(res);
    const byRef = payload.byRef && typeof payload.byRef === "object" ? payload.byRef : {};
    const map = {};
    for (const ref of empRefs) map[ref] = pickSensitive(byRef[ref]);
    return map;
  } catch (e) {
    // الدفعة فشلت أو الدالة المنشورة لا تعرفها بعد: جلب فردي محدود، لا تُترك الشاشة فاضية.
    const map = {};
    const queue = withRef.slice();
    const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length) {
        const emp = queue.shift();
        const enriched = await enrichEmployee(emp);
        map[emp.emp_ref] = pickSensitive(enriched);
      }
    });
    await Promise.all(workers);
    return map;
  }
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