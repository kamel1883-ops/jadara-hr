import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyToken } from "../../shared/portalToken.ts";
import { notifyApproverForStatus } from "../../shared/approverNotify.ts";

const today = () => new Date().toISOString().slice(0, 10);

// تنفيذ إجراء موافقة — يدعم وضعين:
// 1) بوابة موظف عبر رمز جلسة موقع (portal_token + portal_employee_id).
// 2) مستخدم Base44 مسجّل (المسار القديم).
// المعتمدون: المدير المباشر (is_approver_manager) لمرؤوسيه، والمعتمد المالي (is_approver_finance) للصرف النهائي.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const type = body.type;
    const action = body.action;
    const id = body.id;
    const note = String(body.note || "");
    // يقبل روابط http/https فقط لربط إثبات التحويل — يرفض javascript:/data: لمنع XSS المخزّن
    const proofUrl = /^https?:\/\//i.test(String(body.proof_url || "").trim()) ? String(body.proof_url).trim() : "";

    if (!id || !type || !action)
      return Response.json({ error: "بيانات ناقصة" }, { status: 400 });

    const portalToken = String(body.portal_token || "");
    const portalEmployeeId = String(body.portal_employee_id || "");

    let myEmp = null;
    let actorId = null;
    let actorName = null;

    if (portalToken && portalEmployeeId) {
      const session = await verifyToken(portalToken);
      if (!session.ok || session.employeeId !== portalEmployeeId)
        return Response.json({ error: "جلسة غير صالحة" }, { status: 401 });
      myEmp = await base44.asServiceRole.entities.Employee.get(portalEmployeeId);
      actorId = myEmp?.id || null;
      actorName = myEmp?.full_name || "—";
    } else {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      const allEmployees = await base44.asServiceRole.entities.Employee.list("-created_date", 500);
      myEmp = (allEmployees || []).find((e) => e.user_id === user.id);
      if (!myEmp) return Response.json({ error: "لم يتم ربط حسابك بسجل موظف" }, { status: 403 });
      actorId = user.id;
      actorName = user.full_name;
    }

    const allEmployees = await base44.asServiceRole.entities.Employee.list("-created_date", 2000);
    // خريطة موظف → رقمه الموحد لفحص انتماء السجل لمنشأة المعتمد (منع العبور بين المنشآت)
    const idToUn = new Map();
    for (const e of allEmployees || []) {
      const un = String(e.unified_number || "").trim();
      if (un && e.id) idToUn.set(e.id, un);
    }
    const myUn = String(myEmp.unified_number || "").trim();
    const sameTenant = (employeeId) => !!myUn && idToUn.get(employeeId) === myUn;

    // توثيق «أُعدّ بواسطة»: يُحقن اسم ورقم هوية المعتمد المنفّذ في كل تحديث لطلب/ملف.
    const PREP = {
      prepared_by_name: String(myEmp?.full_name || actorName || ""),
      prepared_by_id: String(myEmp?.national_id || ""),
    };
    const su = async (entity: string, id: string, patch: any) =>
      (base44.asServiceRole.entities as any)[entity].update(id, { ...patch, ...PREP });

    // ===== المدير المباشر — سلف / انتداب (جميع الطلبات تمرّ بالمدير المباشر أولاً) =====
    if (myEmp.is_approver_manager && type === "loans" && (action === "approve" || action === "reject")) {
      const r = await base44.asServiceRole.entities.LoanRequest.get(id);
      const emp = (allEmployees || []).find((e) => e.id === r.employee_id);
      if (!emp || emp.manager_id !== myEmp.id)
        return Response.json({ error: "هذا الطلب خارج نطاق مرؤوسيك" }, { status: 403 });
      if (r.status !== "pending_manager" && r.status !== "pending")
        return Response.json({ error: "الطلب ليس في مرحلة موافقة المدير المباشر" }, { status: 400 });
      if (action === "approve") {
        await su("LoanRequest", id, {
          manager_status: "approved", manager_id: actorId, manager_name: actorName,
          manager_date: today(), status: "manager_approved",
        });
        // تنبيه الموارد البشرية بوجود طلب سلفة انتقل لمرحلة اعتمادها
        try { await notifyApproverForStatus(base44, { type: "loan", employeeId: r.employee_id, employeeName: emp?.full_name || r.employee_name, status: "manager_approved", employeeNationalId: emp?.national_id || "", employeeNumber: emp?.employee_number || "", position: emp?.position || "", details: `سلفة بمبلغ ${r.amount || 0}` }); } catch {}
      } else {
        await su("LoanRequest", id, {
          manager_status: "rejected", manager_id: actorId, manager_name: actorName,
          manager_date: today(), manager_note: note, status: "rejected",
        });
      }
      return Response.json({ ok: true });
    }

    if (myEmp.is_approver_manager && type === "trips" && (action === "approve" || action === "reject")) {
      const r = await base44.asServiceRole.entities.BusinessTrip.get(id);
      const emp = (allEmployees || []).find((e) => e.id === r.employee_id);
      if (!emp || emp.manager_id !== myEmp.id)
        return Response.json({ error: "هذا الطلب خارج نطاق مرؤوسيك" }, { status: 403 });
      if (r.status !== "pending_manager" && r.status !== "pending")
        return Response.json({ error: "الطلب ليس في مرحلة موافقة المدير المباشر" }, { status: 400 });
      if (action === "approve") {
        await su("BusinessTrip", id, {
          manager_status: "approved", manager_id: actorId, manager_name: actorName,
          manager_date: today(), status: "manager_approved",
        });
        // تنبيه الموارد البشرية بوجود انتداب انتقل لمرحلة اعتمادها
        try { await notifyApproverForStatus(base44, { type: "trip", employeeId: r.employee_id, employeeName: emp?.full_name || r.employee_name, status: "manager_approved", employeeNationalId: emp?.national_id || "", employeeNumber: emp?.employee_number || "", position: emp?.position || "", details: `انتداب إلى ${r.destination || ""}` }); } catch {}
      } else {
        await su("BusinessTrip", id, {
          manager_status: "rejected", manager_id: actorId, manager_name: actorName,
          manager_date: today(), manager_note: note, status: "rejected",
        });
      }
      return Response.json({ ok: true });
    }

    // ===== المدير المباشر — العهد والشكاوى: إحالة للموارد البشرية أو رفض (لا تمرّ بالمالية) =====
    if (myEmp.is_approver_manager && (type === "equipment" || type === "complaints") && (action === "approve" || action === "reject")) {
      const entity = type === "equipment" ? "EquipmentRequest" : "Complaint";
      const r = await (base44.asServiceRole.entities as any)[entity].get(id);
      const emp = (allEmployees || []).find((e) => e.id === r.employee_id);
      if (!emp || emp.manager_id !== myEmp.id)
        return Response.json({ error: "هذا الطلب خارج نطاق مرؤوسيك" }, { status: 403 });
      if (r.status !== "pending_manager" && r.status !== "pending")
        return Response.json({ error: "الطلب ليس في مرحلة المدير المباشر" }, { status: 400 });
      await su(entity, id, action === "approve"
        ? { manager_status: "approved", manager_id: actorId, manager_name: actorName, manager_date: today(), manager_note: note, status: "manager_approved" }
        : { manager_status: "rejected", manager_id: actorId, manager_name: actorName, manager_date: today(), manager_note: note, status: "rejected" });
      return Response.json({ ok: true });
    }

    // ===== معتمد الموارد البشرية — سلف =====
    if (myEmp.is_approver_hr && type === "loans" && (action === "approve" || action === "reject")) {
      const r = await base44.asServiceRole.entities.LoanRequest.get(id);
      if (!sameTenant(r.employee_id))
        return Response.json({ error: "هذا الطلب خارج نطاق منشأتك" }, { status: 403 });
      if (r.status !== "pending" && r.status !== "manager_approved")
        return Response.json({ error: "الطلب ليس في مرحلة اعتماد الموارد البشرية" }, { status: 400 });
      if (action === "approve") {
        const newAmount = Number(body.amount);
        const newInst = Number(body.installment_count);
        const patch = {
          hr_status: "approved", hr_id: actorId, hr_name: actorName, hr_date: today(), hr_note: note,
          status: "awaiting_finance",
        };
        if (Number.isFinite(newAmount) && newAmount > 0) {
          const inst = (Number.isFinite(newInst) && newInst >= 1) ? newInst : (Number(r.installment_count) || 1);
          patch.amount = newAmount;
          patch.installment_count = inst;
          patch.monthly_installment = Math.round((newAmount / inst) * 100) / 100;
        }
        await su("LoanRequest", id, patch);
        // تنبيه المالية بوجود سلفة بانتظار الصرف
        try { const empN = (allEmployees || []).find((e) => e.id === r.employee_id); await notifyApproverForStatus(base44, { type: "loan", employeeId: r.employee_id, employeeName: empN?.full_name || r.employee_name, status: "awaiting_finance", employeeNationalId: empN?.national_id || "", employeeNumber: empN?.employee_number || "", position: empN?.position || "", details: `سلفة بمبلغ ${r.amount || patch.amount || 0}` }); } catch {}
      } else {
        await su("LoanRequest", id, {
          hr_status: "rejected", hr_id: actorId, hr_name: actorName, hr_date: today(), hr_note: note,
          status: "rejected",
        });
      }
      return Response.json({ ok: true });
    }

    // ===== معتمد الموارد البشرية — انتداب =====
    if (myEmp.is_approver_hr && type === "trips" && (action === "approve" || action === "reject")) {
      const r = await base44.asServiceRole.entities.BusinessTrip.get(id);
      if (!sameTenant(r.employee_id))
        return Response.json({ error: "هذا الطلب خارج نطاق منشأتك" }, { status: 403 });
      if (r.status !== "pending" && r.status !== "manager_approved")
        return Response.json({ error: "الطلب ليس في مرحلة اعتماد الموارد البشرية" }, { status: 400 });
      if (action === "approve") {
        await su("BusinessTrip", id, {
          approver_id: actorId, approver_name: actorName, approved_date: today(),
          hr_note: note, status: "awaiting_finance",
        });
        // تنبيه المالية بوجود انتداب بانتظار الصرف
        try { const empN = (allEmployees || []).find((e) => e.id === r.employee_id); await notifyApproverForStatus(base44, { type: "trip", employeeId: r.employee_id, employeeName: empN?.full_name || r.employee_name, status: "awaiting_finance", employeeNationalId: empN?.national_id || "", employeeNumber: empN?.employee_number || "", position: empN?.position || "", details: `انتداب إلى ${r.destination || ""}` }); } catch {}
      } else {
        await su("BusinessTrip", id, {
          hr_note: note, status: "rejected",
        });
      }
      return Response.json({ ok: true });
    }

    // ===== المدير المباشر =====
    if (myEmp.is_approver_manager && type === "leaves" && (action === "approve" || action === "reject")) {
      const leave = await base44.asServiceRole.entities.LeaveRequest.get(id);
      const emp = (allEmployees || []).find((e) => e.id === leave.employee_id);
      if (!emp || emp.manager_id !== myEmp.id)
        return Response.json({ error: "هذا الطلب خارج نطاق مرؤوسيك" }, { status: 403 });
      if (leave.status !== "pending_manager" && leave.status !== "pending")
        return Response.json({ error: "الطلب ليس في مرحلة موافقة المدير المباشر" }, { status: 400 });

      if (action === "approve") {
        await su("LeaveRequest", id, {
          manager_status: "approved", manager_id: actorId, manager_name: actorName,
          manager_date: today(), status: "manager_approved",
        });
        // تنبيه الموارد البشرية بوجود طلب إجازة انتقل لمرحلة تصفيتها واعتمادها
        try { await notifyApproverForStatus(base44, { type: "leave", employeeId: leave.employee_id, employeeName: emp?.full_name || leave.employee_name, status: "manager_approved", employeeNationalId: emp?.national_id || "", employeeNumber: emp?.employee_number || "", position: emp?.position || "", details: `إجازة من ${leave.start_date || ""} إلى ${leave.end_date || ""} (${leave.days_count || 0} يوم)` }); } catch {}
      } else {
        await su("LeaveRequest", id, {
          manager_status: "rejected", manager_id: actorId, manager_name: actorName,
          manager_date: today(), manager_note: note, status: "rejected",
        });
      }
      return Response.json({ ok: true });
    }

    // ===== المعتمد المالي =====
    if (myEmp.is_approver_finance && (action === "confirm" || action === "reject")) {
      if (type === "leaves") {
        const r = await base44.asServiceRole.entities.LeaveRequest.get(id);
        if (!sameTenant(r.employee_id))
          return Response.json({ error: "هذا الطلب خارج نطاق منشأتك" }, { status: 403 });
        if (!["awaiting_finance", "hr_approved"].includes(r.status))
          return Response.json({ error: "الطلب ليس في مرحلة الصرف" }, { status: 400 });
        if (action === "confirm") {
          await su("LeaveRequest", id, {
            finance_status: "paid", finance_paid_date: today(), finance_proof_url: proofUrl,
            finance_proof_date: today(), finance_note: note, status: "completed",
          });
          // الإجازة السنوية: تمييز سفر فعلي (على إجازة) عن تصفية مع مواصلة العمل (على رأس العمل)
          if (r.leave_type === "annual") {
            const empL = await base44.asServiceRole.entities.Employee.get(r.employee_id).catch(() => null);
            if (empL) {
              const newStatus = r.annual_leave_mode === "encash_continue" ? "active" : "on_leave";
              await su("Employee", empL.id, { status: newStatus });
            }
          }
          if (Number(r.ticket_amount) > 0) {
            const emp = await base44.asServiceRole.entities.Employee.get(r.employee_id).catch(() => null);
            if (emp) await su("Employee", emp.id, { ticket_last_used_year: new Date().getFullYear() });
          }
        } else {
          await su("LeaveRequest", id, {
            finance_status: "rejected", finance_note: note, status: "rejected",
          });
        }
        return Response.json({ ok: true });
      }

      if (type === "loans") {
        const r = await base44.asServiceRole.entities.LoanRequest.get(id);
        if (!sameTenant(r.employee_id))
          return Response.json({ error: "هذا الطلب خارج نطاق منشأتك" }, { status: 403 });
        if (!["awaiting_finance", "hr_approved"].includes(r.status))
          return Response.json({ error: "الطلب ليس في مرحلة الصرف" }, { status: 400 });
        if (action === "confirm") {
          await su("LoanRequest", id, {
            finance_status: "paid", finance_paid_date: today(), finance_proof_url: proofUrl,
            finance_proof_date: today(), finance_note: note, paid_amount: 0, status: "paid",
          });
        } else {
          await su("LoanRequest", id, {
            finance_status: "rejected", finance_note: note, status: "rejected",
          });
        }
        return Response.json({ ok: true });
      }

      if (type === "trips") {
        const r = await base44.asServiceRole.entities.BusinessTrip.get(id);
        if (!sameTenant(r.employee_id))
          return Response.json({ error: "هذا الطلب خارج نطاق منشأتك" }, { status: 403 });
        if (r.status !== "awaiting_finance")
          return Response.json({ error: "الطلب ليس في مرحلة الصرف" }, { status: 400 });
        if (action === "confirm") {
          await su("BusinessTrip", id, {
            finance_status: "paid", finance_paid_date: today(), finance_proof_url: proofUrl,
            finance_proof_date: today(), finance_note: note, status: "completed",
          });
        } else {
          await su("BusinessTrip", id, {
            finance_status: "rejected", finance_note: note, status: "rejected",
          });
        }
        return Response.json({ ok: true });
      }

      if (type === "settlements") {
        const r = await base44.asServiceRole.entities.Settlement.get(id);
        if (!sameTenant(r.employee_id))
          return Response.json({ error: "هذا الطلب خارج نطاق منشأتك" }, { status: 403 });
        if (r.status !== "awaiting_finance")
          return Response.json({ error: "الطلب ليس في مرحلة الصرف" }, { status: 400 });
        if (action === "confirm") {
          await su("Settlement", id, {
            finance_status: "paid", finance_id: actorId, finance_name: actorName,
            finance_paid_date: today(), finance_proof_url: proofUrl, finance_proof_date: today(),
            finance_note: note, status: "completed",
          });
          if (r.employee_id) {
            const empStatus = r.reason === "resignation" ? "resigned" : "terminated";
            await su("Employee", r.employee_id, {
              status: empStatus, termination_reason: r.reason, termination_date: r.last_working_date,
            });
          }
        } else {
          await su("Settlement", id, {
            finance_status: "rejected", finance_note: note, status: "rejected",
          });
        }
        return Response.json({ ok: true });
      }
    }

    return Response.json({ error: "غير مصرح لك بهذا الإجراء" }, { status: 403 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}