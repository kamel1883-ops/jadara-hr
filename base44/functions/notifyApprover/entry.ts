import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { notifyApproverForStatus } from "../../shared/approverNotify.ts";

// يُستدعى من لوحة الإدارة بعد إنشاء طلب (إجازة/سلفة/انتداب) لإرسال تنبيه بريدي
// للمدير المباشر. مسار بوابة الموظف يُعالَج داخل portalData مباشرة (نفس الوحدة المشتركة).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const res = await notifyApproverForStatus(base44, {
      type: String(body.type || ""),
      employeeId: String(body.employeeId || ""),
      employeeName: String(body.employeeName || ""),
      status: String(body.status || ""),
      employeeNationalId: String(body.employeeNationalId || ""),
      employeeNumber: String(body.employeeNumber || ""),
      position: String(body.position || ""),
      details: String(body.details || ""),
    });
    return Response.json({ ok: true, ...res });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}