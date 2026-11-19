import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getEmployee } from "../../shared/vaultClient.ts";
import { nationalIdHash, idDigits } from "../../shared/identityHash.ts";

/**
 * تهيئة «بصمات الهوية» لبوابة الموظف مرة واحدة (قابلة للتشغيل أكثر من مرة).
 *
 * بعدها يصبح دخول الموظف بحثاً واحداً بسجل واحد بدل مسح كل الموظفين،
 * فلا يتأثر الدخول بالخزنة ولا بمهلات الشبكة. تُشغّل حتى تكمل (remaining = 0).
 */
const BATCH = 6;
const TIME_BUDGET_MS = 45000;

function asList(page: any): any[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "admin_required" }, { status: 403 });
    }

    const employees = asList(await base44.asServiceRole.entities.Employee.list("-created_date", 3000));
    const links = asList(await base44.asServiceRole.entities.PortalIdentity.list("-created_date", 5000));
    const done = new Set(links.map((l: any) => String(l?.employee_id || "")).filter(Boolean));

    // مفاتيح الخزنة لكل منشأة: الرقم الموحّد، ثم حسابات من أنشأ موظفيها، ثم سجل المنشأة
    const keysByCompany = new Map<string, string[]>();
    const addKey = (un: string, value: any) => {
      const s = String(value || "").trim();
      if (!s) return;
      const list = keysByCompany.get(un) || [];
      if (!list.includes(s)) list.push(s);
      keysByCompany.set(un, list);
    };
    for (const e of employees) {
      const un = String(e.unified_number || "").trim();
      if (!un) continue;
      addKey(un, un);
      addKey(un, e.created_by_id);
    }
    const unifieds = [...keysByCompany.keys()];
    for (const un of unifieds) {
      try {
        const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({ unified_number: un }));
        for (const t of tenants) { addKey(un, t.id); addKey(un, t.admin_user_id); }
      } catch { /* يُكتفى بالمفاتيح المتاحة */ }
    }
    const keysFor = (emp: any) => {
      const un = String(emp?.unified_number || "").trim();
      const keys = un ? (keysByCompany.get(un) || []) : [];
      const own = String(emp?.created_by_id || "").trim();
      return own && !keys.includes(own) ? [...keys, own] : [...keys];
    };

    const pending = employees.filter((e) => e?.id && !done.has(e.id));
    const started = Date.now();
    let processed = 0;
    let failed = 0;
    let index = 0;
    const debug: any[] = [];

    const worker = async () => {
      while (index < pending.length && Date.now() - started < TIME_BUDGET_MS) {
        const emp = pending[index++];
        let nid = String(emp.national_id || "").trim();
        const tried: string[] = [];
        if (!idDigits(nid) && emp.emp_ref) {
          const keys = keysFor(emp);
          for (const key of keys) {
            try {
              const row: any = await getEmployee(key, emp.emp_ref);
              const found = String(row?.national_id || "").trim();
              if (idDigits(found)) { nid = found; break; }
              tried.push(`${key === String(emp.unified_number || "") ? "unified" : "other"}:empty`);
            } catch (e: any) {
              tried.push(`${key === String(emp.unified_number || "") ? "unified" : "other"}:${e?.vaultCode || "err"}`);
            }
          }
        }
        if (!idDigits(nid)) {
          failed++;
          if (debug.length < 4) debug.push({ ref: String(emp.emp_ref || "").slice(-6), un: String(emp.unified_number || ""), tried });
          continue;
        }
        try {
          const hash = await nationalIdHash(nid);
          // القائمة محمّلة مسبقاً (done) فلا حاجة لاستعلام لكل موظف
          await base44.asServiceRole.entities.PortalIdentity.create({
            national_id_hash: hash,
            employee_id: emp.id,
            unified_number: String(emp.unified_number || ""),
          });
          processed++;
        } catch (e: any) {
          failed++;
          if (debug.length < 4) debug.push({ ref: String(emp.emp_ref || "").slice(-6), err: String(e?.message || "err").slice(0, 80) });
        }
      }
    };

    await Promise.all(Array.from({ length: BATCH }, worker));

    return Response.json({
      ok: true,
      total: employees.length,
      already_linked: done.size,
      processed,
      failed,
      remaining: Math.max(0, pending.length - processed - failed),
      debug,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}