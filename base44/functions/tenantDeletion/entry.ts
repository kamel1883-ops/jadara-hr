import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { verifyToken } from "../../shared/portalToken.ts";
import { tenantKeysForEmployee } from "../../shared/vaultIdentity.ts";
import { deleteEmployeeInCompany } from "../../shared/vaultClient.ts";

// طلب حذف حساب المنشأة (نهائي) — من حساب الشركة فقط، وباعتماد المالك حصراً.
//   status          — حساب الشركة: يعرض حالة طلبه الحالي (لا يُحذف شيء قبل اعتماد المالك).
//   request         — حساب الشركة: ينشئ طلباً بحالة pending (لا يحذف أي بيانات).
//   owner_list      — جلسة المالك: كل الطلبات.
//   owner_approve   — جلسة المالك: تنفيذ الحذف النهائي (المنشأة + الموظفون + كل البيانات).
//   owner_reject    — جلسة المالك: رفض الطلب مع ملاحظة (تبقى المنشأة وبياناتها).
// الحذف الفردي للموظف غير متاح إطلاقاً — الحذف على مستوى المنشأة فقط.

// كيانات مرتبطة بالمنشأة عبر الرقم الموحّد
const BY_UNIFIED = [
  "AdminDecision", "AttendanceSheet", "Branch", "CustomerSurvey", "CustomerSurveyResponse",
  "Employee", "HrBudget", "Investigation", "Job", "JobApplication", "License", "Notification",
  "OrgUnit", "Organization", "PlatformSubscription", "Survey", "Tenant", "TenantMember",
  "TrialEvaluation", "Vehicle", "WorkforcePlan",
];

// كيانات مرتبطة بالموظف عبر معرّفه (بلا رقم موحّد في مخططها)
const BY_EMPLOYEE = [
  "Attendance", "BusinessTrip", "Complaint", "Equipment", "EquipmentRequest", "ExitInterview",
  "Expense", "GosiRecord", "Incentive", "LeaveRequest", "LoanRequest", "Payroll", "Performance",
  "Settlement", "SuccessionPlan", "TrainingPlan", "VehicleDelegation", "Warning",
];

const asList = (page: any): any[] =>
  Array.isArray(page) ? page : (Array.isArray(page?.items) ? page.items : []);

const todayISO = () => new Date().toISOString().slice(0, 10);

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // سلطة المالك من جلسة المالك الموقّعة فقط (employee_id = "owner")
    const ownerOk = async () => {
      const token = String(body.token || "");
      const employeeId = String(body.employee_id || "");
      if (!token || employeeId !== "owner") return false;
      const session = await verifyToken(token);
      return !!session.ok && session.employeeId === "owner";
    };

    // منشأة المستخدم الحالي (حساب الشركة أو مستخدم مفوّض) — بنفس ترتيب getMyTenant
    const resolveTenant = async () => {
      let user: any = null;
      try { user = await base44.auth.me(); } catch { return { user: null, tenant: null }; }
      const uid = String(user?.id || "");
      const email = String(user?.email || "").trim().toLowerCase();
      const norm = (x: any) => String(x || "").trim().toLowerCase();
      const tenants = asList(await S.Tenant.list("-created_date", 500));
      let t: any = tenants.find((x) => uid && String(x.admin_user_id || "") === uid);
      if (!t && email) {
        const hits = tenants.filter((x) => norm(x.contact_email) === email || norm(x.admin_email) === email);
        if (hits.length === 1) t = hits[0];
      }
      if (!t) {
        try {
          let mine = asList(await S.TenantMember.filter({ user_id: uid })).filter((m) => m && m.active !== false);
          if (!mine.length && email) {
            mine = asList(await S.TenantMember.filter({ email })).filter((m) => m && m.active !== false);
          }
          const uns = [...new Set(mine.map((m) => String(m?.unified_number || "").trim()).filter(Boolean))];
          if (uns.length === 1) t = tenants.find((x) => String(x.unified_number || "").trim() === uns[0]);
        } catch {}
      }
      return { user, tenant: t || null };
    };

    // حساب المالك نفسه (منشأة المنصة) لا يطلب حذف منشأته من هنا إطلاقاً
    const ownerEmail = String(Deno.env.get("OWNER_EMAIL") || "").trim().toLowerCase();
    const normEmail = (x: any) => String(x || "").trim().toLowerCase();
    const isPlatformAccount = (user: any, tenant: any) => {
      if (!ownerEmail) return false;
      return normEmail(user?.email) === ownerEmail
        || normEmail(tenant?.admin_email) === ownerEmail
        || normEmail(tenant?.contact_email) === ownerEmail;
    };

    // ——— حساب الشركة: حالة الطلب ———
    if (action === "status") {
      const { user, tenant } = await resolveTenant();
      if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      const un = String(tenant?.unified_number || "").trim();
      if (!tenant || !un) return Response.json({ ok: true, tenant: null, request: null });
      const rows = asList(await S.TenantDeletionRequest.filter({ unified_number: un }, "-created_date", 50));
      const request = rows.find((r) => r.status === "pending") || rows[0] || null;
      return Response.json({
        ok: true,
        tenant: { name: tenant.name || "", unified_number: un, status: tenant.status || "" },
        blocked: isPlatformAccount(user, tenant),
        request,
      });
    }

    // ——— حساب الشركة: إنشاء طلب (لا يحذف شيئاً) ———
    if (action === "request") {
      const { user, tenant } = await resolveTenant();
      if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      if (!tenant) return Response.json({ ok: false, error: "no_tenant" }, { status: 400 });
      const un = String(tenant.unified_number || "").trim();
      if (!un) return Response.json({ ok: false, error: "no_tenant" }, { status: 400 });
      if (isPlatformAccount(user, tenant)) return Response.json({ ok: false, error: "not_allowed" }, { status: 403 });
      const pending = asList(await S.TenantDeletionRequest.filter({ unified_number: un, status: "pending" }, "-created_date", 1));
      if (pending.length) return Response.json({ ok: true, already: true, request: pending[0] });
      const employees = asList(await S.Employee.filter({ unified_number: un }, "-created_date", 2000))
        .filter((e) => e.status !== "terminated" && e.status !== "resigned");
      const created = await S.TenantDeletionRequest.create({
        tenant_id: tenant.id,
        unified_number: un,
        company_name: tenant.name || "",
        contact_email: tenant.contact_email || "",
        contact_phone: tenant.contact_phone || "",
        requested_by_user_id: String(user.id || ""),
        requested_by_name: tenant.contact_name || user.full_name || "",
        requested_by_email: String(user.email || "").toLowerCase(),
        employees_count: employees.length,
        reason: String(body.reason || "").slice(0, 1000),
        status: "pending",
        requested_date: todayISO(),
      });
      return Response.json({ ok: true, request: created });
    }

    // ——— بوابة المالك: قائمة الطلبات ———
    if (action === "owner_list") {
      if (!(await ownerOk())) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const requests = asList(await S.TenantDeletionRequest.list("-created_date", 200));
      return Response.json({ ok: true, requests });
    }

    // ——— بوابة المالك: رفض الطلب ———
    if (action === "owner_reject") {
      if (!(await ownerOk())) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.request_id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const row = await S.TenantDeletionRequest.get(id).catch(() => null);
      if (!row) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      if (row.status !== "pending") return Response.json({ ok: false, error: "not_pending" }, { status: 400 });
      const updated = await S.TenantDeletionRequest.update(id, {
        status: "rejected",
        reviewed_by: "owner",
        reviewed_date: todayISO(),
        review_note: String(body.note || "").slice(0, 1000),
      });
      return Response.json({ ok: true, request: updated });
    }

    // ——— بوابة المالك: اعتماد الطلب وتنفيذ الحذف النهائي ———
    if (action === "owner_approve") {
      if (!(await ownerOk())) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.request_id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const row = await S.TenantDeletionRequest.get(id).catch(() => null);
      if (!row) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      if (row.status !== "pending") return Response.json({ ok: false, error: "not_pending" }, { status: 400 });
      const un = String(row.unified_number || "").trim();
      if (!un) return Response.json({ ok: false, error: "no_unified" }, { status: 400 });

      const employees = asList(await S.Employee.filter({ unified_number: un }, "-created_date", 2000));
      const empIds = employees.map((e) => e.id).filter(Boolean);
      const summary: any = { employees: employees.length };

      // 1) خزنة البيانات الحساسة: حذف سجل كل موظف (أفضل جهد — لا يوقف الحذف إن تعذّر)
      for (const emp of employees.slice(0, 200)) {
        const ref = String(emp.emp_ref || "");
        if (!ref) continue;
        try {
          const keys = await tenantKeysForEmployee(base44, emp);
          await deleteEmployeeInCompany(keys, ref);
        } catch {}
      }

      const del = async (name: string, query: any) => {
        try {
          const res = await S[name].deleteMany(query);
          return Number((res as any)?.deleted ?? (res as any)?.count ?? 0) || 0;
        } catch { return 0; }
      };

      // 2) سجلات الموظفين (حضور، إجازات، سلف، إنذارات، رواتب …)
      for (const name of BY_EMPLOYEE) {
        let removed = 0;
        if (empIds.length) removed = await del(name, { employee_id: { $in: empIds } });
        if (!removed && empIds.length) {
          for (const empId of empIds.slice(0, 300)) removed += await del(name, { employee_id: empId });
        }
        summary[name] = removed;
      }

      // 3) سجلات المنشأة (موظفون، فروع، تراخيص، عقود، إشعارات …)
      for (const name of BY_UNIFIED) {
        summary[name] = await del(name, { unified_number: un });
      }
      summary.Subscription = await del("Subscription", { tenant_id: row.tenant_id });

      // 4) سجل المنشأة نفسه
      if (row.tenant_id) await S.Tenant.delete(row.tenant_id).catch(() => {});

      // 5) إغلاق الطلب كمعتمد
      const updated = await S.TenantDeletionRequest.update(id, {
        status: "approved",
        reviewed_by: "owner",
        reviewed_date: todayISO(),
        review_note: String(body.note || "").slice(0, 1000),
        deleted_at: new Date().toISOString(),
        deleted_summary: JSON.stringify(summary),
      });
      return Response.json({ ok: true, request: updated, summary });
    }

    return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "error" }, { status: 500 });
  }
}