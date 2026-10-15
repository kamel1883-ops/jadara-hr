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
 *   health          — تشخيص: هل الأسرار مُضبطة وهل سيرفر الخزنة يستجيب (بلا كشف أي سر)
 *
 * ملاحظتان مهمّتان:
 *  ١) الكتابة تستخدم مفتاح المنشأة الثابت (الرقم الموحّد) لا حساب من رفع المستند،
 *     حتى يفتح أي عضو في نفس المنشأة مستنداتها.
 *  ٢) أي خطأ يُعاد برمز واضح (not_configured / unauthorized / not_found / timeout / unreachable)
 *     بدل رسالة عامة، فلا يعود «تعذر فتح المستند» بلا سبب.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  storeEmployee, storeEmployeesBulk, getEmployeesBatch, updateEmployeeInCompany, deleteEmployeeInCompany,
  storePayroll, getPayrollInCompany, storeDocument, getDocumentLinkInCompany, buildDownloadUrl,
  storeRecord, storeRecordsBulk, getRecord, getRecordsBatch, updateRecord, deleteRecord,
  vaultConfigured, vaultHealth,
} from "../../shared/vaultClient.ts";
import { tenantKeysForRead, resolveCompanyContext } from "../../shared/vaultIdentity.ts";
import { validVaultRef, employeeRefsInCompany } from "../../shared/vaultAuthorization.ts";
import { vaultErrorCode, vaultErrorStatus } from "../../shared/vaultErrors.ts";
import { saveLeaveDocument } from "../../shared/leaveDocuments.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    // Employee and delegated portal access uses its own signed, restricted portalData flow.
    if (user.role !== 'admin') return Response.json({ error: 'unauthorized' }, { status: 403 });

    const body = await req.json();
    if (!body || Array.isArray(body) || typeof body !== 'object') return Response.json({ error: 'invalid' }, { status: 400 });
    const { action, tenantId: _ignoredTenant, ...rest } = body;
    if (!action) return Response.json({ error: "action_required" }, { status: 400 });
    const modules = new Set(['complaints', 'warnings', 'licenses', 'platform-subs', 'org-structure', 'succession', 'training', 'performance', 'eos', 'equipment', 'expenses', 'business-trips', 'leaves', 'approvals', 'appointees', 'reports', 'gosi']);
    if (rest.module !== undefined && !modules.has(rest.module)) return Response.json({ error: 'invalid' }, { status: 400 });
    for (const key of ['empRef', 'payrollRef', 'docRef', 'ref']) {
      if (rest[key] != null && !validVaultRef(rest[key])) return Response.json({ error: 'invalid' }, { status: 400 });
    }
    for (const key of ['empRefs', 'refs']) {
      if (rest[key] !== undefined && (!Array.isArray(rest[key]) || rest[key].length > 500 || !rest[key].every(validVaultRef))) return Response.json({ error: 'invalid' }, { status: 400 });
    }
    if (rest.rows !== undefined && (!Array.isArray(rest.rows) || rest.rows.length > 500 || rest.rows.some(row => !row || typeof row !== 'object' || Array.isArray(row)))) return Response.json({ error: 'invalid' }, { status: 400 });
    if (rest.fileBase64 !== undefined && (typeof rest.fileBase64 !== 'string' || rest.fileBase64.length > 35000000)) return Response.json({ error: 'invalid' }, { status: 400 });
    const context = action === 'health' ? { unified: '', keys: [user.id] } : await resolveCompanyContext(base44, user);
    const empRefs = [...new Set([rest.empRef, ...(rest.empRefs || []), ...(rest.rows || []).map(row => row.emp_ref)].filter(Boolean))];
    if (!empRefs.every(validVaultRef) || !(await employeeRefsInCompany(base44, context, user, empRefs))) return Response.json({ error: 'unauthorized' }, { status: 403 });

    // مفتاح الكتابة: رقم المنشأة الموحّد إن وُجد (يقرأه كل أعضائها)، وإلا سجل المنشأة،
    // وإلا حساب المستخدم. يحل مشكلة المستندات المحفوظة تحت حساب الرافع فقط.
    const tenant = context.unified || user.id;

    let result;
    switch (action) {
      // تشخيص فوري لسبب عدم فتح المستندات — لا يُعيد أي سرّ، فقط الحالة والنطاق
      case "health": {
        const cfg = vaultConfigured();
        const probe = cfg.ok ? await vaultHealth(tenant) : { ok: false, status: 0, documents_ready: false, document_status: 0, document_error: "not_configured" };
        result = {
          configured: cfg.ok,
          has_url: cfg.url,
          has_key: cfg.key,
          host: cfg.host,
          reachable: probe.ok,
          vault_status: probe.status,
          documents_ready: probe.documents_ready,
          document_status: probe.document_status,
          document_error: probe.document_error,
        };
        break;
      }
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
          const map = await getEmployeesBatch(await tenantKeysForRead(base44, user, [rest.empRef]), [rest.empRef]);
          result = map[rest.empRef] || null;
        }
        break;
      case "getEmployees":
        if (!Array.isArray(rest.empRefs)) return Response.json({ error: "empRefs_required" }, { status: 400 });
        result = { byRef: await getEmployeesBatch(await tenantKeysForRead(base44, user, rest.empRefs), rest.empRefs) };
        break;
      case "updateEmployee":
        if (!rest.empRef) return Response.json({ error: "empRef_required" }, { status: 400 });
        result = await updateEmployeeInCompany(await tenantKeysForRead(base44, user, [rest.empRef]), rest.empRef, rest.sensitiveData || rest);
        break;
      case "deleteEmployee":
        if (!rest.empRef) return Response.json({ error: "empRef_required" }, { status: 400 });
        result = await deleteEmployeeInCompany(await tenantKeysForRead(base44, user, [rest.empRef]), rest.empRef);
        break;
      case "storePayroll":
        if (!rest.empRef) return Response.json({ error: "empRef_required" }, { status: 400 });
        result = await storePayroll(tenant, rest);
        break;
      case "getPayroll":
        if (!rest.payrollRef) return Response.json({ error: "payrollRef_required" }, { status: 400 });
        result = await getPayrollInCompany(await tenantKeysForRead(base44, user), rest.payrollRef);
        break;
      // أرشفة مستند الإجازة: مفتاح كتابة الخزنة كما في بقية العمليات (الرقم الموحّد ثم حساب المستخدم)،
      // مع تحقّق أن موظف المستند من منشأة المستخدم — فلا يُربَط مستند بطلب موظف منشأة أخرى.
      case "storeLeaveDocument":
        result = await saveLeaveDocument(base44, {
          writeKey: context.unified || user.id,
          verify: (employee) => employeeRefsInCompany(base44, context, user, [employee.emp_ref]),
        }, rest);
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
          const link = await getDocumentLinkInCompany(await tenantKeysForRead(base44, user), rest.docRef);
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
      case "getRecords":
        if (!rest.module || !Array.isArray(rest.refs)) return Response.json({ error: "module_and_refs_required" }, { status: 400 });
        result = { byRef: await getRecordsBatch(await tenantKeysForRead(base44, user), rest.module, rest.refs) };
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
  } catch (error: any) {
    // لا نُسجّل أي حمولة — رمز الخطأ فقط، مع تفصيل الخزنة الآمن إن وُجد
    const code = vaultErrorCode(error);
    const detail = String(error?.vaultDetail || "").slice(0, 80);
    console.error("[vaultProxy]", code, String(error?.message || "").slice(0, 120), detail || "");
    return Response.json({ error: code, detail: detail || undefined }, { status: vaultErrorStatus(code) });
  }
}