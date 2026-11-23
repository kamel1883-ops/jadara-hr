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

const pad2 = (n: any) => String(n).padStart(2, "0");

/**
 * كل الصيغ الممكنة لتاريخ واحد بصيغة ISO.
 * يتحمّل ما خزّنته الاستيرادات السابقة (d/m/y أو m/d/y أو أرقام عربية أو شهر مقلوب)،
 * فلا يُرفض تاريخ صحيح لأن ترتيب كتابته مختلف.
 */
function dateCandidates(value: any): string[] {
  const raw = String(value ?? "").trim().slice(0, 10);
  if (!raw) return [];
  const s = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const y = iso[1];
    const mo = Number(iso[2]);
    const d = Number(iso[3]);
    const list: string[] = [];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) list.push(`${y}-${pad2(mo)}-${pad2(d)}`);
    // سجلات قديمة حُفظت مقلوبة (شهر 13+) تُقرأ صحيحة هنا
    if (mo >= 1 && mo <= 31 && d >= 1 && d <= 12) {
      const alt = `${y}-${pad2(d)}-${pad2(mo)}`;
      if (!list.includes(alt)) list.push(alt);
    }
    return list;
  }
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return [];
  let y = Number(m[3]);
  if (y < 100) y = y > 40 ? 1900 + y : 2000 + y;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const list: string[] = [];
  if (a >= 1 && a <= 31 && b >= 1 && b <= 12) list.push(`${y}-${pad2(b)}-${pad2(a)}`);
  if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
    const alt = `${y}-${pad2(a)}-${pad2(b)}`;
    if (!list.includes(alt)) list.push(alt);
  }
  return list;
}

/** هل التاريخان نفس اليوم بأي ترتيب كتابة؟ */
function dateMatches(stored: any, wanted: any) {
  const want = dateCandidates(wanted);
  if (!want.length) return false;
  return dateCandidates(stored).some((c) => want.includes(c));
}

/**
 * مطابقة تاريخ الميلاد للتسجيل الأول — تُقرأ من الخزنة لسجل الموظف نفسه فقط.
 * تُرجع سبب الفشل صراحةً: سجل بلا تاريخ ميلاد ≠ تاريخ غير مطابق،
 * فلا يُقال للموظف «التاريخ خطأ» وهو أصلاً غير مسجّل.
 */
export async function birthDateCheck(base44: any, emp: any, birthDate: string): Promise<{ ok: boolean; reason: "ok" | "missing_on_file" | "mismatch" }> {
  if (!dateCandidates(birthDate).length) return { ok: false, reason: "mismatch" };
  // تاريخ الميلاد في سجل الموظف نفسه أولاً (يظهر في ملفه داخل النظام)
  const own = String(emp?.birth_date || "").trim();
  if (own && dateMatches(own, birthDate)) return { ok: true, reason: "ok" };
  if (!emp?.emp_ref) {
    if (!own) return { ok: false, reason: "missing_on_file" };
    return { ok: false, reason: "mismatch" };
  }
  let keys: string[] = [];
  try { keys = await tenantKeysForEmployee(base44, emp); } catch { keys = []; }
  // مفتاح المنشأة الأساسي (رقمها الموحّد) بديل مضمون إن تعذّر بناء مفاتيح أخرى
  const unified = String(emp?.unified_number || "").trim();
  if (unified && !keys.includes(unified)) keys = [unified, ...keys];
  if (!keys.length) return { ok: false, reason: "missing_on_file" };
  let sawValue = false;
  for (const key of keys) {
    try {
      const row: any = await getEmployee(key, emp.emp_ref);
      const stored = String(row?.birth_date || "").trim();
      if (!stored) continue;
      sawValue = true;
      if (dateMatches(stored, birthDate)) return { ok: true, reason: "ok" };
    } catch { /* مفتاح آخر */ }
  }
  return { ok: false, reason: sawValue ? "mismatch" : "missing_on_file" };
}

export async function birthDateMatches(base44: any, emp: any, birthDate: string) {
  return (await birthDateCheck(base44, emp, birthDate)).ok;
}