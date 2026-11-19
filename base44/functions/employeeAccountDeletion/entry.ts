import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { companyOfAppUser } from "../../shared/appUserCompany.ts";

const todayISO = () => new Date().toISOString().slice(0, 10);

// طلبات حذف حساب الموظف — قرار المنشأة (الموارد البشرية) لا الموظف نفسه.
// list    — طلبات منشأة المستخدم الحالي.
// approve — إغلاق الحساب نهائياً: إلغاء كلمة المرور والرموز وربط حساب التطبيق.
// reject  — رفض الطلب، ويبقى حساب الموظف يعمل كما هو (حالة الضغط بالخطأ).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

    // عزل المنشآت: دور admin يخصّ مسؤولي المنشآت جميعاً، فلا يكفي وحده.
    const myCompany = await companyOfAppUser(base44, user);
    if (!myCompany) return Response.json({ ok: false, error: "out_of_scope" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    if (action === "list") {
      const rows = (await base44.asServiceRole.entities.AccountDeletionRequest.filter(
        { unified_number: myCompany }, "-created_date", 50
      )) || [];
      // حالة الموظف تُعرض للموارد البشرية للتحقق من انتهاء العلاقة التعاقدية قبل الموافقة.
      const pending = rows.filter((r: any) => r.status === "pending");
      const emps = await Promise.all(pending.map((r: any) =>
        base44.asServiceRole.entities.Employee.get(r.employee_id)
          .catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)))
      ));
      const statusById: Record<string, any> = {};
      pending.forEach((r: any, i: number) => {
        const e = emps[i];
        statusById[r.id] = e ? { status: e.status || "", termination_date: e.termination_date || "" } : null;
      });
      return Response.json({
        ok: true,
        requests: rows.map((r: any) => ({ ...r, employee: statusById[r.id] || null })),
      });
    }

    if (action !== "approve" && action !== "reject")
      return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });

    const id = String(body.request_id || "").trim();
    if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });

    const request = await base44.asServiceRole.entities.AccountDeletionRequest.get(id)
      .catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)));
    if (!request) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if (String(request.unified_number || "").trim() !== myCompany)
      return Response.json({ ok: false, error: "out_of_scope" }, { status: 403 });
    if (request.status !== "pending")
      return Response.json({ ok: false, error: "already_processed" }, { status: 400 });

    const empId = String(request.employee_id || "");
    const emp = await base44.asServiceRole.entities.Employee.get(empId)
      .catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)));
    if (!emp) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if (String(emp.unified_number || "").trim() !== myCompany)
      return Response.json({ ok: false, error: "out_of_scope" }, { status: 403 });

    const processed_by = String(user.full_name || user.email || "");
    const note = String(body.note || "").slice(0, 1000);

    if (action === "reject") {
      await base44.asServiceRole.entities.AccountDeletionRequest.update(id, {
        status: "rejected", company_note: note, processed_by, processed_date: todayISO(),
      });
      try {
        await base44.asServiceRole.entities.Notification.create({
          title: "رفض طلب حذف الحساب",
          body: "رفضت منشأتك طلب حذف حسابك، وحسابك في بوابة الموظف يعمل كما هو." + (note ? ` ملاحظة: ${note}` : ""),
          type: "account_deletion",
          employee_id: empId,
          unified_number: myCompany,
          is_read: false,
        });
      } catch { /* الإشعار لا يمنع القرار */ }
      return Response.json({ ok: true, status: "rejected" });
    }

    // الموافقة: إغلاق الحساب نهائياً — لا كلمة مرور ولا رمز استعادة ولا ربط بحساب التطبيق.
    await base44.asServiceRole.entities.Employee.update(empId, {
      portal_password_hash: "",
      portal_password_salt: "",
      portal_password_enabled: false,
      login_otp: "",
      login_otp_expires_at: 0,
      login_otp_attempts: 0,
      user_id: "",
    });
    await base44.asServiceRole.entities.AccountDeletionRequest.update(id, {
      status: "done", company_note: note, processed_by, processed_date: todayISO(),
    });
    return Response.json({ ok: true, status: "done" });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}