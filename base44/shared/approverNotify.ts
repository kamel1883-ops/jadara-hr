import { wrapEmailContent } from "./emailFooter.ts";

// منطق موحّد لإرسال تنبيه بريدي + إشعار داخلي للمعتمد المختص (المدير المباشر /
// الموارد البشرية / المالية) عند تقديم طلب أو انتقاله لمرحلة موافقة جديدة.
// يُستخدم من:
//   - portalData (تقديم الطلب من بوابة الموظف)
//   - approvalAction (الانتقال بين المراحل بعد كل موافقة)
//   - notifyApprover (تقديم الطلب من لوحة الإدارة)

const TYPE_LABEL: Record<string, string> = { leave: "إجازة", loan: "سلفة", trip: "انتداب", settlement: "مخالصة نهاية خدمة" };

export async function notifyApproverForStatus(
  base44: any,
  params: {
    type: string; employeeId: string; employeeName?: string; status: string;
    // هوية صاحب الطلب — تُمرَّر من المتصل عند توفرها، ويُكملها سجل الموظف كاحتياط.
    // (national_id قد يكون مُعمّى في الخزنة فيبقى فارغاً — يُعرض «—» بدل كتم الإشعار)
    employeeNationalId?: string; employeeNumber?: string; position?: string; details?: string;
  }
): Promise<{ ok: boolean; skipped?: boolean; reason?: string; sentTo?: string }> {
  const { type, employeeId, employeeName, status } = params;
  if (!employeeId || !status) return { ok: true, skipped: true, reason: "missing-data" };

  const employees: any[] = await base44.asServiceRole.entities.Employee.list("-created_date", 5000);
  const requester = (employees || []).find((e) => e.id === employeeId);
  // عزل المنشآت: لا يُختار معتمد إلا من نفس منشأة صاحب الطلب (عبر الرقم الموحّد)،
  // ولا يوجد أي رجوع لمعتمد عام في منشأة أخرى — فلا يصل تنبيه شركة إلى شركة ثانية.
  const requesterUn = String(requester?.unified_number || "").trim();
  const sameTenant = (e: any) => !!requesterUn && String(e?.unified_number || "").trim() === requesterUn;

  // الرجوع الوحيد المسموح عند غياب المعتمد المختص: مدير المنشأة نفسها (سجل المنشأة).
  const tenantAdmin = async () => {
    if (!requesterUn) return null;
    const page = await base44.asServiceRole.entities.Tenant.filter({ unified_number: requesterUn });
    const t = (Array.isArray(page) ? page : page?.items || [])[0];
    const email = String(t?.admin_email || t?.contact_email || "").trim();
    if (!t || !email) return null;
    return {
      id: "", email, unified_number: requesterUn,
      full_name: t?.contact_name || t?.name || "",
      user_id: String(t?.admin_user_id || ""),
    };
  };

  // تحديد المعتمد المختص بناءً على المرحلة الحالية للطلب — من نفس المنشأة فقط
  let approver: any = null;
  let stageLabel = "";
  if (["pending_manager", "pending"].includes(status)) {
    const manager = (employees || []).find((e) => e.id === requester?.manager_id) || null;
    approver = manager && sameTenant(manager) ? manager : await tenantAdmin();
    stageLabel = "المدير المباشر";
  } else if (status === "manager_approved") {
    approver = (employees || []).find((e) => e.is_approver_hr && sameTenant(e)) || await tenantAdmin();
    stageLabel = "الموارد البشرية";
  } else if (["hr_approved", "hr_settled", "awaiting_finance"].includes(status)) {
    approver = (employees || []).find((e) => e.is_approver_finance && sameTenant(e)) || await tenantAdmin();
    stageLabel = "المالية";
  }

  if (!approver || !approver.email) return { ok: true, skipped: true, reason: "no-approver-email" };

  const label = TYPE_LABEL[type] || "طلب";
  // employeeName قد يصل بصيغة «رقم - مهنة» من مسار البوابة — الاسم الحقيقي من السجل أولاً.
  const empName = requester?.full_name || employeeName || "—";
  const empNumber = params.employeeNumber || requester?.employee_number || "—";
  const empNid = params.employeeNationalId || requester?.national_id || "—";
  const empPos = params.position || requester?.position || "—";
  const subject = `لديك طلب ${label} بانتظار الموافقة — منصة جداره`;
  const bodyText =
    `السلام عليكم ${approver.full_name || ""}،\n\n` +
    `لديك طلب ${label} بانتظار ${stageLabel} على بوابة الموظف في منصة جداره.\n\n` +
    `الموظف: ${empName}\n` +
    `الرقم الوظيفي: ${empNumber}\n` +
    `رقم الهوية / الإقامة: ${empNid}\n` +
    `المسمى الوظيفي: ${empPos}\n` +
    (params.details ? `بيان الطلب: ${params.details}\n` : "") +
    `\nيرجى الدخول إلى بوابة الموظف لمراجعة الطلب واتخاذ الإجراء المناسب.\n\n` +
    `مع التحية،\nمنصة جداره للموارد البشرية`;

  // إشعار داخلي موجّه للمعتمد (يظهر في جرس البوابة إن كان مستخدماً مسجلاً)
  try {
    await base44.asServiceRole.entities.Notification.create({
      title: subject,
      body: bodyText,
      type: "approval_pending",
      employee_id: approver.id || "",
      user_id: approver.user_id || "",
      unified_number: requesterUn,
      is_read: false,
    });
  } catch {}

  try {
    const { html, text } = wrapEmailContent(bodyText);
    await base44.asServiceRole.integrations.Core.SendEmail({ to: approver.email, subject, html, text });
    return { ok: true, sentTo: approver.email };
  } catch (e: any) {
    return { ok: true, skipped: true, reason: "send-failed", error: String(e?.message || e) };
  }
}