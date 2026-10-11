import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyToken } from "../../shared/portalToken.ts";
import { organizationForEmployee } from "../../shared/companyScope.ts";

// يعيد طابور الموافقات للموظف — يدعم وضعين:
// 1) بوابة موظف عبر رمز جلسة موقع (portal_token + portal_employee_id).
// 2) مستخدم Base44 مسجّل (المسار القديم).
// يُحدد الدور من علامات سجل الموظف (is_approver_manager / is_approver_finance).

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
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
      if (!myEmp) return Response.json({ role: "none", message: "لم يُربط حسابك بسجل موظف بعد." });
      actorId = myEmp.id;
      actorName = myEmp.full_name || "—";
    } else {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      const allEmployees = await base44.asServiceRole.entities.Employee.list("-created_date", 500);
      myEmp = (allEmployees || []).find((e) => e.user_id === user.id) || null;
      if (!myEmp) return Response.json({ role: "none", message: "لم يُربط حسابك بسجل موظف بعد." });
      actorId = user.id;
      actorName = user.full_name;
    }

    // خريطة موظف → رقمه الموحد لتحديد نطاق منشأة المعتمد (منع العبور بين المنشآت).
    // متين: الموظفون المنشؤون عبر بوابة التفويض (service role) قد لا يحملون unified_number
    // مباشرة، فنُورّطه من موظف شقيق أُنشئ بالمنشئ نفسه (نفس created_by_id) يملك الرقم.
    const allEmployees = await base44.asServiceRole.entities.Employee.list("-created_date", 2000);
    const idToUn = new Map();
    const byCreator = new Map();
    for (const e of allEmployees || []) {
      if (e.id) idToUn.set(e.id, String(e.unified_number || "").trim());
      if (e.created_by_id) {
        if (!byCreator.has(e.created_by_id)) byCreator.set(e.created_by_id, []);
        byCreator.get(e.created_by_id).push(e);
      }
    }
    for (const [, emps] of byCreator) {
      const sample = (emps || []).find((e) => String(e.unified_number || "").trim());
      if (!sample) continue;
      const un = String(sample.unified_number || "").trim();
      for (const e of emps) if (!idToUn.get(e.id)) idToUn.set(e.id, un);
    }
    const myUn = String(myEmp.unified_number || "").trim();
    const sameTenant = (rec) => !!myUn && idToUn.get(rec.employee_id) === myUn;

    // منشأة المعتمد نفسه فقط — لا آخر منشأة سُجّلت في المنصة.
    let myOrg = null;
    try { myOrg = await organizationForEmployee(base44, { ...myEmp, unified_number: myUn || myEmp.unified_number }); } catch { myOrg = null; }

    const idToNat = new Map();
    const idToName = new Map();
    for (const e of allEmployees || []) {
      if (e.id) { idToNat.set(e.id, e.national_id || ""); idToName.set(e.id, e.full_name || ""); }
    }
    const withNat = (arr) => (arr || []).map((r) => ({
      ...r,
      national_id: r.national_id || idToNat.get(r.employee_id) || "",
      employee_name: r.employee_name || idToName.get(r.employee_id) || "",
    }));

    if (myEmp.is_approver_manager) {
      const subs = (allEmployees || []).filter((e) => {
        if (e.manager_id !== myEmp.id) return false;
        const un = String(e.unified_number || "").trim();
        return myUn ? un === myUn : !un;
      });
      const subIds = new Set(subs.map((s) => s.id));
      const mgrPending = ["pending_manager", "pending"];
      const [allLeaves, allLoans, allTrips, allEquip, allComplaints] = await Promise.all([
        base44.asServiceRole.entities.LeaveRequest.list("-created_date", 500),
        base44.asServiceRole.entities.LoanRequest.list("-created_date", 500),
        base44.asServiceRole.entities.BusinessTrip.list("-created_date", 500),
        base44.asServiceRole.entities.EquipmentRequest.list("-created_date", 500),
        base44.asServiceRole.entities.Complaint.list("-created_date", 500),
      ]);
      const bySub = (arr) => (arr || []).filter((r) => subIds.has(r.employee_id) && mgrPending.includes(r.status));
      // سجلّ معاملات المرؤوسين — كل ما تجاوز مرحلة المدير (إجازات + سلف + انتدابات) لتكون تواريخها وحالاتها ومستنداتها مرئية للمدير المباشر.
      const subName = (id) => subs.find((s) => s.id === id)?.full_name || "";
      const done = (arr) => (arr || [])
        .filter((r) => subIds.has(r.employee_id) && !mgrPending.includes(r.status))
        .map((r) => ({ ...r, employee_name: r.employee_name || subName(r.employee_id) }));
      // سجلّات الحضور والانصراف لمرؤوسي المدير — أحدث 300 سجل
      const allAttendance = await base44.asServiceRole.entities.Attendance.list("-date", 300);
      const attendance = withNat((allAttendance || []).filter((a) => subIds.has(a.employee_id)));
      return Response.json({
        role: "manager",
        myEmp, org: myOrg,
        actorId, actorName,
        subordinates: subs.map((s) => ({ id: s.id, full_name: s.full_name, department: s.department, position: s.position, national_id: s.national_id || "" })),
        leaves: withNat(bySub(allLeaves)),
        loans: withNat(bySub(allLoans)),
        trips: withNat(bySub(allTrips)),
        // العهد والشكاوى: تبدأ عند المدير المباشر ثم تُحال للموارد البشرية — لا تمرّ بالمالية.
        equipment: withNat(bySub(allEquip)),
        complaints: withNat(bySub(allComplaints)),
        leaveHistory: withNat(done(allLeaves)),
        loanHistory: withNat(done(allLoans)),
        tripHistory: withNat(done(allTrips)),
        attendance,
        message: subs.length === 0 ? "لا يوجد مرؤوسون مربوطون بك حالياً." : null,
      });
    }

    // معتمد الموارد البشرية للمنشأة — يرى طلبات السلف والانتدابات قبل الصرف المالي.
    if (myEmp.is_approver_hr) {
      const [allLoans, allTrips] = await Promise.all([
        base44.asServiceRole.entities.LoanRequest.list("-created_date", 500),
        base44.asServiceRole.entities.BusinessTrip.list("-created_date", 500),
      ]);
      const loans = (allLoans || []).filter((l) => l.status === "pending" && sameTenant(l));
      const trips = (allTrips || []).filter((t) => t.status === "pending" && sameTenant(t));
      return Response.json({ role: "hr", myEmp, org: myOrg, actorId, actorName, loans: withNat(loans), trips: withNat(trips) });
    }

    if (myEmp.is_approver_finance) {
      const [allLeaves, allLoans, allTrips, allSettlements] = await Promise.all([
        base44.asServiceRole.entities.LeaveRequest.list("-created_date", 500),
        base44.asServiceRole.entities.LoanRequest.list("-created_date", 500),
        base44.asServiceRole.entities.BusinessTrip.list("-created_date", 500),
        base44.asServiceRole.entities.Settlement.list("-created_date", 500),
      ]);
      const finStatuses = ["awaiting_finance", "hr_approved"];
      const leaves = (allLeaves || []).filter((l) => finStatuses.includes(l.status) && sameTenant(l));
      const loans = (allLoans || []).filter((l) => finStatuses.includes(l.status) && sameTenant(l));
      const trips = (allTrips || []).filter((t) => t.status === "awaiting_finance" && sameTenant(t));
      const settlements = (allSettlements || []).filter((s) => s.status === "awaiting_finance" && sameTenant(s));
      // سجل دائم للمالية — كل ما تجاوز مرحلة الصرف (مدفوع/مرفوض/مكتمل) ليبقى مرجعاً تدقيقياً للمدير المالي.
      const doneFin = (arr) => (arr || [])
        .filter((r) => sameTenant(r) && !finStatuses.includes(r.status) && r.status !== "awaiting_finance")
        .map((r) => ({ ...r, employee_name: r.employee_name || idToName.get(r.employee_id) || "" }));
      return Response.json({
        role: "finance", myEmp, org: myOrg, actorId, actorName,
        leaves: withNat(leaves), loans: withNat(loans), trips: withNat(trips), settlements: withNat(settlements),
        leaveHistory: withNat(doneFin(allLeaves)),
        loanHistory: withNat(doneFin(allLoans)),
        tripHistory: withNat(doneFin(allTrips)),
        settlementHistory: withNat(doneFin(allSettlements)),
      });
    }

    return Response.json({ role: "none" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}