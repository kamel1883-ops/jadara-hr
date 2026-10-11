/**
 * vaultProxy — البوابة الوحيدة بين واجهة Base44 والخزنة السعودية.
 *
 * تمنع تسريب أي قيمة حساسة إلى السجلات، وتوحّد كل عمليات الخزنة عبر وحدة vaultClient المشتركة.
 * كل عملية تُستدعى من الواجهة عبر base44.functions.invoke('vaultProxy', { action, ... }).
 *
 * الأدعمـة:
 *   storeEmployee   — تخزين بيانات موظف حساسة → { emp_ref }
 *   storeEmployeesBulk — تخزين جماعي (استيراد) → { refs }
 *   getEmployee     — استرجاع قيم حساسة مفكوكة (للعرض)
 *   updateEmployee  — تحديث قيم حساسة
 *   deleteEmployee  — حذف من الخزنة
 *   storePayroll    — تخزين قيم مالية → { payroll_ref }
 *   getPayroll      — استرجاع قيم مالية
 *   storeDocument   — رفع مستند → { doc_ref, sha256 }
 *   getDocumentLink — توليد رابط تنزيل مؤقت → { token, expires_in, download_url }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  storeEmployee, storeEmployeesBulk, getEmployeesBatch, updateEmployeeInCompany, deleteEmployee,
  storePayroll, getPayroll, storeDocument, getDocumentLink, buildDownloadUrl,
  storeRecord, storeRecordsBulk, getRecord, updateRecord, deleteRecord,
} from "../../shared/vaultClient.ts";

function asList(page: any): any[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

/**
 * مفاتيح الخزنة الخاصة بمنشأة المستخدم فقط.
 * السجلات القديمة حُفظت تحت user.id، وبعض الاستيراد تحت معرّف المنشأة.
 * القراءة تبحث في كل هذه المفاتيح حتى تظهر الهوية لمنشأة العميل نفسها
 * ولو دخل موظف آخر من نفس المنشأة.
 */
async function resolveCompanyTenantKeys(base44: any, user: any): Promise<string[]> {
  const keys: string[] = [];
  const push = (value: any) => {
    const v = String(value || "").trim();
    if (v && !keys.includes(v)) keys.push(v);
  };
  push(user?.id);
  try {
    const email = String(user?.email || "").trim().toLowerCase();
    const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({}));
    const norm = (x: any) => String(x || "").trim().toLowerCase();
    let t = tenants.find((x: any) => norm(x.contact_email) === email || norm(x.admin_email) === email);
    if (!t) t = tenants.find((x: any) => String(x.admin_user_id || "") === String(user?.id || ""));
    if (!t) {
      let emp: any = null;
      try {
        emp = asList(await base44.asServiceRole.entities.Employee.filter({ user_id: user.id }))[0] || null;
      } catch { /* لا سجل موظف */ }
      if (!emp && user?.email) {
        try {
          emp = asList(await base44.asServiceRole.entities.Employee.filter({ email: user.email }))[0] || null;
        } catch { /* لا سجل بالبريد */ }
      }
      const un = String(emp?.unified_number || "").trim();
      if (un) t = tenants.find((x: any) => String(x.unified_number || "").trim() === un);
    }
    if (t) {
      push(t.unified_number);
      push(t.admin_user_id);
      push(t.id);
    }
  } catch (e: any) {
    console.error("[vaultProxy] tenant resolve:", e?.message || e);
  }
  return keys;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, tenantId: _ignoredTenant, ...rest } = body;
    if (!action) return Response.json({ error: "action_required" }, { status: 400 });
    // مفتاح الكتابة الافتراضي يبقى حساب المستخدم الذي أنشأ السجل،
    // حتى تبقى السجلات الجديدة في نفس قسم الخزنة الذي تبحث فيه القراءة أولاً.
    const tenant = user.id;

    let result;
    switch (action) {
      case "storeEmployee":
        result = await storeEmployee(tenant, rest.sensitiveData || rest);
        break;
      case "storeEmployeesBulk":
        if (!Array.isArray(rest.rows)) return Response.json({ error: "rows_required" }, { status: 400 });
        result = await storeEmployeesBulk(tenant, rest.rows);
        break;
      case "getEmployee":
        if (!rest.empRef) return Response.json({ error: "empRef_required" }, { status: 400 });
        {
          const map = await getEmployeesBatch(await resolveCompanyTenantKeys(base44, user), [rest.empRef]);
          result = map[rest.empRef] || null;
        }
        break;
      case "getEmployees":
        if (!Array.isArray(rest.empRefs)) return Response.json({ error: "empRefs_required" }, { status: 400 });
        result = { byRef: await getEmployeesBatch(await resolveCompanyTenantKeys(base44, user), rest.empRefs) };
        break;
      case "updateEmployee":
        if (!rest.empRef) return Response.json({ error: "empRef_required" }, { status: 400 });
        result = await updateEmployeeInCompany(await resolveCompanyTenantKeys(base44, user), rest.empRef, rest.sensitiveData || rest);
        break;
      case "deleteEmployee":
        if (!rest.empRef) return Response.json({ error: "empRef_required" }, { status: 400 });
        result = await deleteEmployee(tenant, rest.empRef);
        break;
      case "storePayroll":
        if (!rest.empRef) return Response.json({ error: "empRef_required" }, { status: 400 });
        result = await storePayroll(tenant, rest);
        break;
      case "getPayroll":
        if (!rest.payrollRef) return Response.json({ error: "payrollRef_required" }, { status: 400 });
        result = await getPayroll(tenant, rest.payrollRef);
        break;
      case "storeDocument":
        if (!rest.fileBase64) return Response.json({ error: "fileBase64_required" }, { status: 400 });
        {
          const bytes = Uint8Array.from(atob(rest.fileBase64), (c) => c.charCodeAt(0));
          result = await storeDocument(
            tenant, bytes, rest.fileName || "document", rest.mimeType || "application/octet-stream",
            rest.empRef || null, rest.docType || "other"
          );
        }
        break;
      case "getDocumentLink":
        if (!rest.docRef) return Response.json({ error: "docRef_required" }, { status: 400 });
        {
          const link = await getDocumentLink(tenant, rest.docRef);
          result = { ...link, download_url: buildDownloadUrl(link.token) };
        }
        break;
      // الوحدات الحساسة الموسّعة — CRUD عام
      case "storeRecord":
        if (!rest.module) return Response.json({ error: "module_required" }, { status: 400 });
        result = await storeRecord(tenant, rest.module, rest.data || {}, rest.empRef || null);
        break;
      case "storeRecordsBulk":
        if (!rest.module || !Array.isArray(rest.rows)) return Response.json({ error: "module_and_rows_required" }, { status: 400 });
        result = await storeRecordsBulk(tenant, rest.module, rest.rows);
        break;
      case "getRecord":
        if (!rest.module || !rest.ref) return Response.json({ error: "module_and_ref_required" }, { status: 400 });
        result = await getRecord(tenant, rest.module, rest.ref);
        break;
      case "updateRecord":
        if (!rest.module || !rest.ref) return Response.json({ error: "module_and_ref_required" }, { status: 400 });
        result = await updateRecord(tenant, rest.module, rest.ref, rest.data || {}, rest.empRef ?? null);
        break;
      case "deleteRecord":
        if (!rest.module || !rest.ref) return Response.json({ error: "module_and_ref_required" }, { status: 400 });
        result = await deleteRecord(tenant, rest.module, rest.ref);
        break;
      default:
        return Response.json({ error: "unknown_action", action }, { status: 400 });
    }
    return Response.json({ ok: true, data: result });
  } catch (error) {
    // لا نُسجّل أي حمولة — فقط رسالة الخطأ العامة
    console.error("[vaultProxy] error:", error.message);
    return Response.json({ error: "vault_operation_failed" }, { status: 500 });
  }
}