import { findEmployeesByNationalId, preferPortalEmployee, tenantKeysForEmployee } from "./vaultIdentity.ts";
import { getEmployee } from "./vaultClient.ts";
import { nationalIdHash, idDigits } from "./identityHash.ts";

/**
 * إيجاد سجل الموظف من رقم هويته لبوابة الموظف.
 *
 * المسار السريع: بصمة الهوية المخزّنة (سجل واحد) — لا مسح ولا اعتماد على مسارات
 * بحث الخزنة، فلا يتأثر الدخول بتعطّل أي خدمة خارجية.
 * الاحتياط: المسح الكامل القديم، ثم تُحفظ البصمة تلقائياً للمرة القادمة.
 */
function asList(page: any): any[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

/** يربط بصمة الهوية بسجل الموظف (مرة واحدة — آمن للتكرار) */
export async function linkIdentity(base44: any, employeeId: string, hash: string, unifiedNumber = "") {
  const id = String(employeeId || "").trim();
  const h = String(hash || "").trim();
  if (!id || !h) return;
  try {
    const existing = asList(await base44.asServiceRole.entities.PortalIdentity.filter(
      { national_id_hash: h, employee_id: id }
    ));
    if (existing.length) return;
    await base44.asServiceRole.entities.PortalIdentity.create({
      national_id_hash: h,
      employee_id: id,
      unified_number: String(unifiedNumber || ""),
    });
  } catch { /* لا يمنع الدخول */ }
}

export async function resolvePortalEmployee(base44: any, nationalId: string) {
  const nid = String(nationalId || "").trim();
  if (!idDigits(nid)) return null;

  let hash = "";
  try { hash = await nationalIdHash(nid); } catch { hash = ""; }

  if (hash) {
    try {
      const links = asList(await base44.asServiceRole.entities.PortalIdentity.filter(
        { national_id_hash: hash }
      )).slice(0, 5);
      const ids = [...new Set(links.map((l: any) => String(l?.employee_id || "")).filter(Boolean))];
      const rows: any[] = [];
      for (const id of ids) {
        const emp = await base44.asServiceRole.entities.Employee.get(id).catch(() => null);
        if (emp) rows.push(emp);
      }
      const emp = preferPortalEmployee(rows);
      if (emp) return emp;
    } catch { /* يتابع بالمسح */ }
  }

  // احتياط محدود بمهلة: رقم غير مسجّل لا يُعلّق شاشة الدخول أكثر من ثوانٍ
  const scanned = await Promise.race([
    findEmployeesByNationalId(base44, nid).catch(() => []),
    new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 5000)),
  ]);
  const emp = preferPortalEmployee(scanned || []);
  if (emp && hash) await linkIdentity(base44, emp.id, hash, emp.unified_number);
  return emp;
}

/** مطابقة تاريخ الميلاد للتسجيل الأول — تُقرأ من الخزنة لسجل الموظف نفسه فقط */
export async function birthDateMatches(base44: any, emp: any, birthDate: string) {
  const want = String(birthDate || "").trim().slice(0, 10);
  if (!want) return false;
  if (!emp?.emp_ref) return String(emp?.birth_date || "").slice(0, 10) === want;
  let keys: string[] = [];
  try { keys = await tenantKeysForEmployee(base44, emp); } catch { keys = []; }
  for (const key of keys) {
    try {
      const row: any = await getEmployee(key, emp.emp_ref);
      const got = String(row?.birth_date || "").slice(0, 10);
      if (got) return got === want;
    } catch { /* مفتاح آخر */ }
  }
  return false;
}