import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { hashPassword } from "../../shared/ownerAuth.ts";
import { companyOfAppUser } from "../../shared/appUserCompany.ts";

// إعادة تعيين كلمة مرور بوابة الموظف من قبل الإدارة (admin فقط):
// action=set   — يضبط كلمة مرور جديدة (6 أحرف فأكثر) ويفعّل البوابة.
// action=disable — يلغي كلمة المرور ويعطّل البوابة (يُلزم الموظف بإعادة التسجيل الأول).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const empId = String(body.employee_id || "").trim();
    const action = String(body.action || "set");
    if (!empId) return Response.json({ ok: false, error: "missing" }, { status: 400 });

    const emp = await base44.asServiceRole.entities.Employee.get(empId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!emp) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if ((emp.role_level || "") === "owner")
      return Response.json({ ok: false, error: "owner_not_allowed" }, { status: 403 });

    // عزل المنشآت: دور admin يخصّ مسؤولي المنشآت جميعاً، فلا يكفي وحده.
    // لا يعيد ضبط كلمة مرور موظف إلا مسؤول منشأة هذا الموظف نفسها (نفس الرقم الموحّد).
    const myCompany = await companyOfAppUser(base44, user);
    const empCompany = String(emp.unified_number || "").trim();
    if (!myCompany || !empCompany || empCompany !== myCompany)
      return Response.json({ ok: false, error: "out_of_scope" }, { status: 403 });

    if (action === "disable") {
      await base44.asServiceRole.entities.Employee.update(empId, {
        portal_password_hash: "",
        portal_password_salt: "",
        portal_password_enabled: false,
        login_otp: "",
        login_otp_expires_at: 0,
        login_otp_attempts: 0,
      });
      return Response.json({ ok: true, action: "disable" });
    }

    const newPass = String(body.new_password || "");
    if (newPass.length < 6)
      return Response.json({ ok: false, error: "weak_password" }, { status: 400 });

    const { hash, salt } = await hashPassword(newPass);
    await base44.asServiceRole.entities.Employee.update(empId, {
      portal_password_hash: hash,
      portal_password_salt: salt,
      portal_password_enabled: true,
      login_otp: "",
      login_otp_expires_at: 0,
      login_otp_attempts: 0,
    });
    return Response.json({ ok: true, action: "set" });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}