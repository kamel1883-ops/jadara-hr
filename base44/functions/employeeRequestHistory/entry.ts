import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { verifyToken } from "../../shared/portalToken.ts";
import { isAlMoiedSupervisor } from "../../shared/alMoied.ts";

// سجل طلبات الموظف الكامل — لعرضه عند مراجعة أي طلب (اسم الموظف قابل للضغط).
// يجمع: الإجازات، السلف، الانتدابات، نهاية الخدمة، الطلبات الإدارية (نماذج)، العهد.
//
// الأمان: لا يُعرض سجل أي موظف إلا لطالب يملك صلاحية مراجعة الطلبات،
// ولا يُعرض إلا لموظف **داخل نفس منشأة الطالب** (نفس الرقم الموحّد).

const REVIEW_PERMS = ["hr", "leaves", "attendance", "business-trips", "end-of-service", "approvals", "employees"];

function asList(page: any): any[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

function parsePerms(raw: any): string[] {
  try {
    const parsed = JSON.parse(String(raw || "[]"));
    return Array.isArray(parsed) ? parsed.map((x) => String(x || "")) : [];
  } catch {
    return [];
  }
}

/** شركة حساب التطبيق (المسار الإداري القديم): من سجل المنشأة أو عضوية أو سجل الموظف. */
async function companyOfAppUser(base44: any, user: any): Promise<string> {
  const uid = String(user?.id || "");
  const email = String(user?.email || "").trim().toLowerCase();
  try {
    const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({}, undefined, 2000));
    const mine = uid ? tenants.find((t: any) => String(t?.admin_user_id || "") === uid) : null;
    if (mine) return String(mine.unified_number || "").trim();
    if (email) {
      const hits = tenants.filter((t: any) => String(t?.contact_email || "").trim().toLowerCase() === email);
      if (hits.length === 1) return String(hits[0].unified_number || "").trim();
    }
    const members = uid ? asList(await base44.asServiceRole.entities.TenantMember.filter({ user_id: uid })) : [];
    const un = [...new Set(members.filter((m: any) => m?.active !== false).map((m: any) => String(m.unified_number || "").trim()).filter(Boolean))];
    if (un.length === 1) return un[0];
  } catch { /* تجاهل */ }
  return "";
}

async function rowsFor(base44: any, entity: string, employeeId: string, nationalId: string): Promise<any[]> {
  const out = new Map<string, any>();
  const push = (rows: any[]) => {
    for (const r of rows || []) {
      if (!r) continue;
      const key = String(r.id || "");
      if (key) out.set(key, r);
    }
  };
  try {
    push(asList(await base44.asServiceRole.entities[entity].filter({ employee_id: employeeId }, "-created_date", 300)));
  } catch { /* الكيان غير متاح */ }
  if (nationalId) {
    try {
      push(asList(await base44.asServiceRole.entities[entity].filter({ national_id: nationalId }, "-created_date", 300)));
    } catch { /* تجاهل */ }
  }
  return [...out.values()].filter((r) => {
    const eid = String(r?.employee_id || "");
    const nid = String(r?.national_id || "");
    return !eid || eid === employeeId || (nationalId && nid === nationalId);
  });
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = String(body?.portal_token || body?.token || "");
    const requesterId = String(body?.portal_employee_id || body?.employee_id || "");
    const targetId = String(body?.target_employee_id || "").trim();
    const targetNid = String(body?.target_national_id || "").trim();
    if (!targetId && !targetNid) return Response.json({ ok: false, error: "missing_target" }, { status: 400 });

    let myEmp: any = null;
    let myUn = "";
    let allowed = false;

    if (token && requesterId) {
      const session = await verifyToken(token);
      if (!session.ok || session.employeeId !== requesterId) {
        return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
      }
      myEmp = await base44.asServiceRole.entities.Employee.get(requesterId).catch(() => null);
      if (!myEmp) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      myUn = String(myEmp.unified_number || "").trim();
      const perms = parsePerms(myEmp.permissions);
      allowed = isAlMoiedSupervisor(myEmp)
        || !!myEmp.is_approver_hr || !!myEmp.is_approver_manager || !!myEmp.is_approver_finance
        || perms.some((p) => REVIEW_PERMS.includes(p));
    } else {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      if (String(user.role || "") !== "admin") return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      myUn = await companyOfAppUser(base44, user);
      allowed = true;
    }

    if (!allowed) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    if (!myUn) return Response.json({ ok: false, error: "no_company" }, { status: 400 });

    // الموظف المستهدف: يجب أن يكون داخل منشأة الطالب (وإلا فحص بيانات شركة أخرى).
    const allEmployees = asList(await base44.asServiceRole.entities.Employee.list("-created_date", 3000));
    const byId = new Map(allEmployees.map((e: any) => [String(e.id || ""), e]));
    let target: any = targetId ? byId.get(targetId) || null : null;
    if (!target && targetNid) target = allEmployees.find((e: any) => String(e.national_id || "").trim() === targetNid) || null;
    if (!target) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    // سجلات بوابة التفويض قد تخلو من رقم المنشأة — نستنبطه من موظف شقيق أنشأه نفس الحساب.
    const unifiedOf = (emp: any): string => {
      const un = String(emp?.unified_number || "").trim();
      if (un) return un;
      const creator = String(emp?.created_by_id || "");
      if (!creator) return "";
      const sibling = allEmployees.find((e: any) => String(e.created_by_id || "") === creator && String(e.unified_number || "").trim());
      return String(sibling?.unified_number || "").trim();
    };
    if (unifiedOf(target) !== myUn) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const tid = String(target.id);
    const nid = String(target.national_id || "").trim();
    const [leaves, loans, trips, eos, hrRequests, equipment] = await Promise.all([
      rowsFor(base44, "LeaveRequest", tid, nid),
      rowsFor(base44, "LoanRequest", tid, nid),
      rowsFor(base44, "BusinessTrip", tid, nid),
      rowsFor(base44, "Settlement", tid, nid),
      rowsFor(base44, "HrRequest", tid, nid),
      rowsFor(base44, "EquipmentRequest", tid, nid),
    ]);

    return Response.json({
      ok: true,
      employee: {
        id: tid,
        full_name: target.full_name || "",
        national_id: nid,
        employee_number: target.employee_number || "",
        department: target.department || "",
        position: target.position || "",
        hire_date: target.hire_date || "",
        status: target.status || "",
        unified_number: myUn,
      },
      requests: { leaves, loans, trips, eos, hrRequests, equipment },
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "server_error" }, { status: 500 });
  }
}
