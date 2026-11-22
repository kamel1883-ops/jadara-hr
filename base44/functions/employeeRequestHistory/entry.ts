import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { verifyToken } from "../../shared/portalToken.ts";
import { isAlMoiedSupervisor } from "../../shared/alMoied.ts";
import { companyVaultAccess } from "../../shared/vaultIdentity.ts";

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



async function rowsFor(base44: any, entity: string, employeeId: string, nationalId: string, unified: string): Promise<any[]> {
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
    // سجل مرتبط بموظف آخر لا يُعرض — حتى لو تطابقت الهوية (انتقال الموظف بين منشأتين)
    const recordUn = String(r?.unified_number || '').trim();
    if (recordUn && recordUn !== unified) return false;
    if (eid) return eid === employeeId;
    const nid = String(r?.national_id || "");
    return recordUn === unified && !!nationalId && nid === nationalId;
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
      const context = await companyVaultAccess(base44, user);
      myUn = String(context.unified || '').trim();
      allowed = context.owner || context.member;
    }

    if (!allowed) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    if (!myUn) return Response.json({ ok: false, error: "no_company" }, { status: 400 });

    // الموظف المستهدف: يجب أن يكون داخل منشأة الطالب (وإلا فحص بيانات شركة أخرى).
    const allEmployees = asList(await base44.asServiceRole.entities.Employee.filter({ unified_number: myUn, ...(targetId ? { id: targetId } : { national_id: targetNid }) }, { limit: 2 }));
    const byId = new Map(allEmployees.map((e: any) => [String(e.id || ""), e]));
    let target: any = targetId ? byId.get(targetId) || null : null;
    if (!target && targetNid) target = allEmployees.find((e: any) => String(e.national_id || "").trim() === targetNid) || null;
    if (!target) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    // الانتماء من الرقم الموحّد على سجل الموظف نفسه فقط — لا يُستنتج من «من أنشأ السجل»،
    // لأن سجلات كثيرة أُنشئت بحساب الخدمة نفسه لكل المنشآت فكان ذلك يفتح سجل شركة أخرى.
    const unifiedOf = (emp: any): string => String(emp?.unified_number || "").trim();
    if (unifiedOf(target) !== myUn) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const tid = String(target.id);
    const nid = String(target.national_id || "").trim();
    const [leaves, loans, trips, eos, hrRequests, equipment] = await Promise.all([
      rowsFor(base44, "LeaveRequest", tid, nid, myUn),
      rowsFor(base44, "LoanRequest", tid, nid, myUn),
      rowsFor(base44, "BusinessTrip", tid, nid, myUn),
      rowsFor(base44, "Settlement", tid, nid, myUn),
      rowsFor(base44, "HrRequest", tid, nid, myUn),
      rowsFor(base44, "EquipmentRequest", tid, nid, myUn),
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