import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyToken } from "../../shared/portalToken.ts";
import {
  PAID_STATUSES, computeWorkDaysSet, computeWorkDaysInMonth,
  computeAbsentDeduction, computeNetFromAttendance,
} from "../../shared/payrollCompute.ts";
import { notifyApproverForStatus } from "../../shared/approverNotify.ts";
import { getDocumentLinkInCompany, buildDownloadUrl, storeDocument } from "../../shared/vaultClient.ts";
import { vaultErrorCode } from "../../shared/vaultErrors.ts";
import { tenantKeysForEmployee } from "../../shared/vaultIdentity.ts";
import {
  loadCompanyBag, organizationForEmployee, inCompany, canWrite, stampCompany, scopeQuery, filterPayload,
} from "../../shared/companyScope.ts";

// وصلة بيانات بوابة المالك/الموظف: تتحقق من رمز الجلسة الموقّع ثم ترد/تنشئ
// بيانات الموظف (طلباته، حضوره، إنذاراته) وإنشاء طلبات إجازة/سلفة/انتداب وبصمة الحضور،
// وكذلك إدارة كودات الخصم للمالك.
// كل العمليات تتم عبر خدمة-الدور لتفادي قيود RLS (لا يوجد مستخدم Base44 مسجّل).

const todayISO = () => new Date().toISOString().slice(0, 10);

// مسافة Haversine بالأمتار بين نقطتين — تُستخدم للتحقّق الفعلي من قرب الموظف من مقر العمل.
const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "");
    const employeeId = String(body.employee_id || "");
    const action = String(body.action || "");
    if (!token || !employeeId || !action)
      return Response.json({ ok: false, error: "missing" }, { status: 400 });

    const session = await verifyToken(token);
    if (!session.ok || session.employeeId !== employeeId)
      return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });

    // المالك — جلسة مستقلة عن جدول الموظفين (employee_id = "owner")،
    // فلا يحتاج المالك سجل موظف ولا يظهر للعملاء في قوائم الموظفين.
    const isOwnerSession = employeeId === "owner";
    const emp = isOwnerSession
      ? { id: "owner", full_name: Deno.env.get("OWNER_FULL_NAME") || "مالك النظام", employee_number: "", position: "المالك", department: "الإدارة", role_level: "owner", user_id: null }
      : await base44.asServiceRole.entities.Employee.get(employeeId);
    const empLabel = isOwnerSession ? "مالك النظام" : `${emp.employee_number} - ${emp.position}`;
    // سلطة المالك مرتبطة بجلسة المالك فقط (employeeId === "owner"، Via verifyOwnerLogin) —
    // لا تُشتق من Employee.role_level القابل للتعديل لمنع التصعيد.
    const isOwner = isOwnerSession;

    let companyMemo: Promise<any> | null = null;
    const companyBag = () => {
      if (isOwnerSession) return Promise.resolve({ unified: "", ids: new Set<string>(), employees: [] as any[] });
      if (!companyMemo) companyMemo = loadCompanyBag(base44, emp);
      return companyMemo;
    };
    const sessionOrg = async () => {
      if (isOwnerSession) {
        try {
          const orgs = await base44.asServiceRole.entities.Organization.list("-created_date", 1);
          return orgs?.[0] || null;
        } catch { return null; }
      }
      try { return await organizationForEmployee(base44, emp); } catch { return null; }
    };
    const rowsOfCompany = async (rows: any[]) => {
      if (isOwnerSession) return rows || [];
      const bag = await companyBag();
      if (!bag.unified) return [];
      return (rows || []).filter((r) => bag.ids.has(String(r?.employee_id || "")));
    };

    if (action === "fetch") {
      const [orgRow, leaves, loans, attendance, trips, warnings, performances, allPlans, settlements, allDecisions, allIncentives, notifications, equipmentReqs, complaints] = await Promise.all([
        sessionOrg(),
        base44.asServiceRole.entities.LeaveRequest.filter({ employee_id: employeeId }, "-created_date", 200),
        base44.asServiceRole.entities.LoanRequest.filter({ employee_id: employeeId }, "-created_date", 200),
        base44.asServiceRole.entities.Attendance.filter({ employee_id: employeeId }, "-date", 10),
        base44.asServiceRole.entities.BusinessTrip.filter({ employee_id: employeeId }, "-created_date", 200),
        base44.asServiceRole.entities.Warning.filter({ employee_id: employeeId }, "-created_date", 100),
        base44.asServiceRole.entities.Performance.filter({ employee_id: employeeId }, "-created_date", 100),
        base44.asServiceRole.entities.TrainingPlan.list("-created_date", 500),
        base44.asServiceRole.entities.Settlement.filter({ employee_id: employeeId }, "-created_date", 200),
        base44.asServiceRole.entities.AdminDecision.list("-issued_date", 500),
        base44.asServiceRole.entities.Incentive.list("-granted_date", 500),
        // إشعارات الموظف الموجّهة له (تبقى محفوظة دائماً — تُعرض بلغة البوابة المختارة)
        base44.asServiceRole.entities.Notification.filter({ employee_id: employeeId }, "-created_date", 500),
        // طلبات العهد والشكاوى الخاصة بالموظف — تُعرض في بوابة الموظف ومسار الاعتماد.
        base44.asServiceRole.entities.EquipmentRequest.filter({ employee_id: employeeId }, "-created_date", 200),
        base44.asServiceRole.entities.Complaint.filter({ employee_id: employeeId }, "-created_date", 200),
      ]);
      // القرارات والحوار — تظهر للموظف وفق نطاق الإرسال (الكل / قسمه / سجل فرد خاص به)
      const bagForFetch = isOwnerSession ? null : await companyBag();
      const sameCompanyRecord = (rec: any) => {
        if (isOwnerSession) return true;
        if (!bagForFetch?.unified) return false;
        const recUn = String(rec?.unified_number || "").trim();
        if (recUn) return recUn === bagForFetch.unified;
        return bagForFetch.ids.has(String(rec?.employee_id || ""));
      };
      const matchesTarget = (rec: any) => {
        if (!rec || !sameCompanyRecord(rec)) return false;
        if (rec.target === "all") return !!String(rec.unified_number || "").trim();
        if (rec.target === "department") return !!rec.department && !!emp?.department && rec.department === emp.department;
        if (rec.target === "employee") return String(rec.employee_id || "") === String(employeeId);
        return false;
      };
      const decisions = (allDecisions || []).filter((d: any) => d?.status === "issued" && matchesTarget(d));
      const incentives = (allIncentives || []).filter((i: any) => i?.status === "granted" && matchesTarget(i));
      // يظهر للموظف فقط التقييمات التي اعتمدتها الموارد البشرية (مكتملة أو معتمدة)
      const reviews = (performances || []).filter((p) => p?.status === "completed" || p?.status === "acknowledged");
      // خطط التدريب المشمولة للموظف: ضمن employee_ids (JSON) أو employee_id القديم،
      // أو خطة على مستوى قسمه. تُستثنى المسودات والملغيات.
      const sid = String(employeeId);
      const trainings = (allPlans || []).filter((p: any) => {
        if (p?.status === "draft" || p?.status === "cancelled") return false;
        let ids: any[] = [];
        try { ids = JSON.parse(p.employee_ids || "[]"); if (!Array.isArray(ids)) ids = []; } catch { ids = []; }
        const linked = [p.employee_id, ...ids].map((x: any) => String(x || "")).filter(Boolean);
        if (!isOwnerSession) {
          const tied = sameCompanyRecord(p) || (!!bagForFetch?.unified && linked.some((id: string) => bagForFetch.ids.has(id)));
          if (!tied) return false;
        }
        if (ids.includes(sid) || p.employee_id === sid) return true;
        return p?.scope === "department" && p.department && emp?.department && p.department === emp.department && sameCompanyRecord(p);
      });
      // مخالصات نهاية الخدمة المكتملة/المصروفة فقط (لإطلاع الموظف على مستحقاته المحفوظة)
      const paidSettlements = (settlements || []).filter((s: any) => s?.status === "completed");
      let investigations: any[] = [];
      try {
        const unified = String(emp?.unified_number || bagForFetch?.unified || "").trim();
        const invRows = unified
          ? await base44.asServiceRole.entities.Investigation.filter({ unified_number: unified }, "-created_date", 200)
          : [];
        const sidInv = String(employeeId);
        investigations = (invRows || []).flatMap((r: any) => {
          let parties: any[] = [];
          try { const p = JSON.parse(r?.parties || "[]"); if (Array.isArray(p)) parties = p; } catch { parties = []; }
          const mine = parties.find((p) => String(p?.employee_id || "") === sidInv);
          if (!mine) return [];
          return [{
            id: r.id,
            ref_no: r.ref_no,
            violation_type: r.violation_type,
            custom_type: r.custom_type || "",
            allegations: r.allegations || "",
            status: r.status,
            role: mine.role === "witness" ? "witness" : "subject",
            reply_status: mine.status || "pending",
            reply: mine.reply || "",
            evidence_ref: mine.evidence_ref || "",
            witness_names: mine.witness_names || "",
          }];
        });
      } catch { investigations = []; }
      let branch: any = null;
      if (!isOwnerSession && emp?.branch_id) {
        try { branch = await base44.asServiceRole.entities.Branch.get(emp.branch_id); } catch { branch = null; }
        const branchUn = String(branch?.unified_number || "").trim();
        const myUn = String(emp?.unified_number || "").trim();
        if (branch && branchUn && myUn && branchUn !== myUn) branch = null;
      }
      const publicEmployee = { ...(emp || {}) };
      delete publicEmployee.portal_password_hash;
      delete publicEmployee.portal_password_salt;
      return Response.json({
        ok: true,
        employee: publicEmployee,
        org: orgRow || null,
        branch,
        leaves, loans, attendance, trips, warnings,
        reviews, trainings,
        settlements: paidSettlements,
        decisions, incentives,
        notifications: notifications || [],
        equipmentRequests: equipmentReqs || [],
        complaints: complaints || [],
        investigations,
      });
    }

    // ====== الإشعارات — بوابة الموظف ======
    // قائمة إشعارات الموظف (بترتيب زمني تنازلي) — حدّ قصوى قابل للضبط (للجرس 50، للسجل الكامل 500)
    if (action === "notifications") {
      const limit = Math.min(Number(body.limit) || 50, 500);
      const notifs = await base44.asServiceRole.entities.Notification.filter(
        { employee_id: employeeId }, "-created_date", limit
      );
      return Response.json({ ok: true, notifications: notifs || [] });
    }
    // فتح مستند محفوظ في الخزنة من بوابة الموظف. الرمز العشوائي لا يكفي وحده:
    // البحث محصور بمفاتيح منشأة هذا الموظف، والرابط مؤقت.
    if (action === "document_link") {
      if (isOwnerSession) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const docRef = String(body.doc_ref || "").trim();
      if (!docRef || docRef.length > 80 || /^https?:\/\//i.test(docRef))
        return Response.json({ ok: false, error: "doc_ref_required" }, { status: 400 });
      try {
        const keys = await tenantKeysForEmployee(base44, emp);
        const link = await getDocumentLinkInCompany(keys, docRef);
        return Response.json({ ok: true, download_url: buildDownloadUrl(link.token) });
      } catch (e: any) {
        // نُعيد السبب الحقيقي (غير مُهيّأة/مفتاح مرفوض/غير موجود/مهلة) بدل not_found دائماً
        const code = vaultErrorCode(e);
        return Response.json({ ok: false, error: code }, { status: code === "not_found" ? 404 : 502 });
      }
    }

    // تعليم كل إشعارات الموظف غير المقروءة كمقروءة
    if (action === "mark_notifications_read") {
      await base44.asServiceRole.entities.Notification.updateMany(
        { employee_id: employeeId, is_read: false },
        { $set: { is_read: true } }
      );
      return Response.json({ ok: true });
    }

    // ====== إدارة العملاء — بوابة المالك ======
    if (action === "owner_list") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const [allTenants, employees, users] = await Promise.all([
        base44.asServiceRole.entities.Tenant.list("-created_date", 500),
        base44.asServiceRole.entities.Employee.list("-created_date", 2000),
        base44.asServiceRole.entities.User.list(undefined, 500),
      ]);
      // إخفاء المنشآت التي لم تُكمل الدفع بعد (pending_payment) عن قائمة المالك والإحصاءات.
      const tenants = (allTenants || []).filter((t: any) => t.status !== "pending_payment");
      // ربط الموظفين بالمنشأة عبر حساب المنشئ (created_by_id للموظف = حساب المستخدم).
      // maps: user.id → tenantId عبر admin_user_id مباشرة، أو عبر tacкет admin_email /
      // contact_email المطابق لبريد المستخدم — يغطّي الحالات التي لم يُضبط فيها
      // admin_user_id (مثل المنشآت التي أُنشئت قبل اعتماد المالك).
      const unifiedToTenantId = new Map<string, string>();
      const idToTenantId = new Map<string, string>();
      const emailToTenantId = new Map<string, string>();
      for (const t of tenants || []) {
        const tid = String(t.id || "");
        const un = String(t.unified_number || "").trim();
        if (un) unifiedToTenantId.set(un, tid);
        if (t.admin_user_id) idToTenantId.set(String(t.admin_user_id), tid);
        for (const em of [t.admin_email, t.contact_email]) {
          const k = String(em || "").trim().toLowerCase();
          if (k && !emailToTenantId.has(k)) emailToTenantId.set(k, tid);
        }
      }
      const userIdToTenantId = new Map<string, string>();
      for (const u of users || []) {
        if (!u?.id) continue;
        if (idToTenantId.has(u.id)) { userIdToTenantId.set(u.id, idToTenantId.get(u.id)!); continue; }
        const k = String(u.email || "").trim().toLowerCase();
        if (k && emailToTenantId.has(k)) userIdToTenantId.set(u.id, emailToTenantId.get(k)!);
      }
      // عدّ دقيق 100% بالرقم الموحد فقط — لا مسار بديل يختلط بين العملاء.
      // الموظف يُحتسب للمنشأة iff unified_number يطابق رقمها الموحد.
      // التعبئة الرجعية: من يفتقد unified_number ويُنشئه مسؤول مرتبط بمنشأة
      // يُربط تلقائياً برقمها (يُحتسب في الاستدعاء التالي بعد الربط).
      // ما لا يُربط تلقائياً (أنشأه المالك مثلاً) يربطه المالك يدوياً عبر owner_list_orphans.
      const byTenant: Record<string, { active: number; total: number }> = {};
      const backfill: { id: string; unified_number: string }[] = [];
      for (const e of employees || []) {
        const empUn = String(e.unified_number || "").trim();
        const tid = empUn ? unifiedToTenantId.get(empUn) : undefined;
        if (!tid) {
          if (!empUn) {
            const uid = String(e.created_by_id || "");
            const btid = userIdToTenantId.get(uid) || idToTenantId.get(uid);
            if (btid && e.id) {
              const tMatch = (tenants || []).find((tt: any) => String(tt.id) === btid);
              const un2 = String(tMatch?.unified_number || "").trim();
              if (un2) backfill.push({ id: String(e.id), unified_number: un2 });
            }
          }
          continue;
        }
        if (!byTenant[tid]) byTenant[tid] = { active: 0, total: 0 };
        byTenant[tid].total++;
        if (e.status !== "terminated" && e.status !== "resigned") byTenant[tid].active++;
      }
      if (backfill.length) {
        try { await base44.asServiceRole.entities.Employee.bulkUpdate(backfill); } catch {}
      }
      const stats = { total: 0, trials: 0, quotes: 0, paid: 0, suspended: 0, cancelled: 0, revenue: 0 };
      for (const x of tenants || []) {
        if (/\(المالك\)|\(owner\)/i.test(x?.name || "")) continue;
        stats.total++;
        if (x.status === "trial") stats.trials++;
        if (x.lead_source === "quote") stats.quotes++;
        if (x.status === "active") { stats.paid++; stats.revenue += Number(x.quoted_amount) || 0; }
        if (x.status === "expired") stats.suspended++;
        if (x.status === "cancelled") stats.cancelled++;
        const counts = byTenant[String(x.id)] || { active: 0, total: 0 };
        x.employees_active_count = counts.active;
        x.employees_total_count = counts.total;
      }
      return Response.json({ ok: true, tenants: tenants || [], stats });
    }

    if (action === "owner_extend_trial") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      const days = Number(body.days) || 0;
      if (!tenant_id || days <= 0) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const base = t.trial_end ? new Date(t.trial_end) : new Date(today);
      const start = base < today ? new Date(today) : base;
      start.setDate(start.getDate() + days);
      await base44.asServiceRole.entities.Tenant.update(tenant_id, {
        trial_end: start.toISOString().slice(0, 10),
        status: "trial",
        suspended_from: null,
      });
      return Response.json({ ok: true });
    }

    if (action === "owner_suspend") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      if (!tenant_id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      if (t.status !== "trial" && t.status !== "active") return Response.json({ ok: false, error: "invalid_status" }, { status: 400 });
      await base44.asServiceRole.entities.Tenant.update(tenant_id, {
        status: "expired",
        suspended_from: t.status,
      });
      return Response.json({ ok: true });
    }

    if (action === "owner_activate_trial") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      if (!tenant_id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const todayStr = new Date().toISOString().slice(0, 10);
      const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 30);
      // تفعيل تجربة فقط: يبقى الحساب «تجربة» لمدة 30 يوماً من اليوم دون اشتراك سنوي ولا إيراد.
      await base44.asServiceRole.entities.Tenant.update(tenant_id, {
        status: "trial",
        plan: "trial",
        trial_start: todayStr,
        trial_end: end.toISOString().slice(0, 10),
        suspended_from: null,
      });
      return Response.json({ ok: true });
    }

    if (action === "owner_activate") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      if (!tenant_id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const amount = Number(body.amount) || 0;
      const next = new Date(); next.setHours(0, 0, 0, 0); next.setFullYear(next.getFullYear() + 1);
      const subscription_start = String(body.subscription_start || new Date().toISOString().slice(0, 10));
      const subscription_end = String(body.subscription_end || next.toISOString().slice(0, 10));
      const proof_raw = String(body.proof_url || "").trim();
      const proof_url_safe = /^https?:\/\//i.test(proof_raw) ? proof_raw : "";
      const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      const todayStr = new Date().toISOString().slice(0, 10);
      await base44.asServiceRole.entities.Tenant.update(tenant_id, {
        status: "active",
        plan: "annual",
        subscription_end,
        contract_confirmed: true,
        contract_generated_date: todayStr,
        suspended_from: null,
        quoted_amount: amount || Number(t.quoted_amount) || 0,
        activation_proof_url: proof_url_safe || null,
      });
      // === فصل تام بين توليد العقود والإيرادات ===
      // توليد/إعادة توليد العقد والفاتورة لا يُسجّل أي إيراد إطلاقاً — يمكن تكراره كما يشاء المالك.
      // الإيراد يُسجَّل فقط من إجراء «التجديد السنوي» المنفصل (owner_renew_year).
      return Response.json({ ok: true, subscription_start, subscription_end, revenue_added: false });
    }

    // ====== التجديد السنوي — منفصل تماماً عن توليد العقود ======
    // يُحدّد المالك الفترة والمبلغ ويرفع الإيصال → يُسجَّل إيراد واحد لهذه الفترة (بدون تكرار) وتُمدّ نهاية الاشتراك.
    if (action === "owner_renew_year") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      const period_start = String(body.period_start || "").slice(0, 10);
      const period_end = String(body.period_end || "").slice(0, 10);
      const amount = Number(body.amount) || 0;
      if (!tenant_id || !period_start || !period_end || amount <= 0)
        return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const proof_raw = String(body.proof_url || "").trim();
      const proof_url_safe = /^https?:\/\//i.test(proof_raw) ? proof_raw : "";
      const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      const todayStr = new Date().toISOString().slice(0, 10);
      const subsAll: any[] = await base44.asServiceRole.entities.Subscription.filter({ tenant_id }, "-period_start", 200);
      const existing = (subsAll || []).find(
        (s: any) => s.status === "paid" && s.period_start === period_start && s.period_end === period_end
      );
      const subPayload: any = {
        tenant_id, tenant_name: t.name, plan: "annual", amount,
        period_start, period_end,
        payment_method: "direct", status: "paid",
        paid_date: String(body.paid_date || "").slice(0, 10) || existing?.paid_date || todayStr,
        notes: proof_url_safe ? ("تجديد سنوي — بوابة المالك — إيصال: " + proof_url_safe) : "تجديد سنوي — بوابة المالك",
      };
      if (existing) await base44.asServiceRole.entities.Subscription.update(existing.id, subPayload);
      else await base44.asServiceRole.entities.Subscription.create(subPayload);
      await base44.asServiceRole.entities.Tenant.update(tenant_id, {
        status: "active", plan: "annual",
        subscription_end: period_end,
        contract_confirmed: true,
        suspended_from: null,
        quoted_amount: amount,
        activation_proof_url: proof_url_safe || t.activation_proof_url || null,
      });
      return Response.json({ ok: true, revenue_added: !existing, duplicate: !!existing });
    }

    // حفظ روابط العقد والفاتورة المُولَّدين من الواجهة بعد تأكيد الاشتراك.
    if (action === "owner_save_documents") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      if (!tenant_id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const isUrl = (u: any): string => { const s = String(u || "").trim(); return /^https?:\/\//i.test(s) ? s : ""; };
      const payload: any = {};
      const cp = isUrl(body.contract_pdf_url); if (cp) payload.contract_pdf_url = cp;
      const iv = isUrl(body.invoice_pdf_url); if (iv) payload.invoice_pdf_url = iv;
      const csc = isUrl(body.client_sealed_contract_url); if (csc) payload.client_sealed_contract_url = csc;
      if (body.clear_client_sealed_contract) payload.client_sealed_contract_url = null;
      if (body.contract_quote_no) payload.contract_quote_no = String(body.contract_quote_no).slice(0, 60);
      if (Object.keys(payload).length === 0) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      await base44.asServiceRole.entities.Tenant.update(tenant_id, payload);
      return Response.json({ ok: true });
    }

    // إعادة تصنيف كل العملاء وفق الشرائح الجديدة وفق عدد الموظفين، وتحديث pricing_tier و quoted_amount.
    // لا يُغيّر الحالة (trial/active/expired...) ولا يُولّد مستندات — يكتفي بتحديث الحقول.
    if (action === "owner_retiert_all") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      // مرآة خادمية لـ src/lib/pricing.js (الأسعار الحالية — بدون رسوم تأسيس)
      const TIERS = [
        { min: 1, max: 20, tier: "البداية", yearly: 1900 },
        { min: 21, max: 60, tier: "الناشئة", yearly: 3200 },
        { min: 61, max: 150, tier: "المتوسطة", yearly: 4500 },
        { min: 151, max: 400, tier: "المتقدمة", yearly: 6800 },
        { min: 401, max: Infinity, tier: "الكبرى", yearly: 9900 },
      ];
      const fn = (cnt: number) => {
        const n = Number(cnt) || 0;
        if (n <= 0) return null;
        for (const t of TIERS) if (n <= t.max) return t;
        return TIERS[TIERS.length - 1];
      };
      const all = await base44.asServiceRole.entities.Tenant.list("-created_date", 500);
      const tenants = (all || []).filter((t: any) => t.status !== "pending_payment");
      let updated = 0;
      const skipped: string[] = [];
      for (const t of tenants) {
        const seg = fn(t.employee_count);
        if (!seg) { skipped.push(t.id); continue; }
        const pct = Number(t.discount_percent) || 0;
        const quoted = pct > 0 ? Math.round(seg.yearly * (1 - pct / 100)) : seg.yearly;
        await base44.asServiceRole.entities.Tenant.update(t.id, {
          pricing_tier: seg.tier,
          quoted_amount: quoted,
        });
        updated++;
      }
      return Response.json({ ok: true, updated, skipped: skipped.length });
    }

    // ====== ربط الموظفين الأيتام بالمنشأة — دقة 100% بالرقم الموحد ======
    // «يتيم» = موظف unified_number فارغ أو لا يطابق أي منشأة مسجّلة.
    // المالك يرى الأيتام ثم يحدّد منهم من يتبع لهذه المنشأة فيُربط برقمها الموحد.
    if (action === "owner_list_orphans") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const [allTenants, employees] = await Promise.all([
        base44.asServiceRole.entities.Tenant.list("-created_date", 500),
        base44.asServiceRole.entities.Employee.list("-created_date", 2000),
      ]);
      const validUns = new Set(
        (allTenants || [])
          .filter((t: any) => t.status !== "pending_payment")
          .map((t: any) => String(t.unified_number || "").trim())
          .filter(Boolean)
      );
      const orphans = (employees || []).filter((e: any) => {
        const un = String(e.unified_number || "").trim();
        return !un || !validUns.has(un);
      }).map((e: any) => ({
        id: e.id, full_name: e.full_name, employee_number: e.employee_number,
        national_id: e.national_id, department: e.department, position: e.position,
        status: e.status, unified_number: String(e.unified_number || ""),
      }));
      return Response.json({ ok: true, orphans });
    }
    if (action === "owner_link_orphans") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      const ids: string[] = Array.isArray(body.employee_ids) ? body.employee_ids.map(String).filter(Boolean) : [];
      if (!tenant_id || !ids.length) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      const un = String(t?.unified_number || "").trim();
      if (!un) return Response.json({ ok: false, error: "no_unified_number" }, { status: 400 });
      await base44.asServiceRole.entities.Employee.bulkUpdate(
        ids.map((id) => ({ id, unified_number: un }))
      );
      return Response.json({ ok: true, linked: ids.length, unified_number: un });
    }

    if (action === "owner_cancel") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      if (!tenant_id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      await base44.asServiceRole.entities.Tenant.update(tenant_id, {
        status: "cancelled",
        suspended_from: t.status === "trial" || t.status === "active" ? t.status : "active",
      });
      return Response.json({ ok: true });
    }

    if (action === "owner_restore") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      if (!tenant_id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      const prev = t.suspended_from === "trial" ? "trial" : "active";
      await base44.asServiceRole.entities.Tenant.update(tenant_id, {
        status: prev,
        suspended_from: null,
      });
      return Response.json({ ok: true });
    }

    // تغيير بريد المنشأة — عند فقدان البريد الأصلي. يدعو بريداً جديداً كمسؤول،
    // يربط المنشأة به، ويُعيد تفعيل الحساب. كل البيانات تبقى عبر الرقم الموحد.
    if (action === "owner_change_email") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      const new_email = String(body.new_email || "").trim().toLowerCase();
      if (!tenant_id || !new_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(new_email))
        return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      const oldUserId = String(t.admin_user_id || "");
      const currentEmail = String(t.admin_email || t.contact_email || "").trim().toLowerCase();
      if (currentEmail === new_email && oldUserId) return Response.json({ ok: true, same: true });
      // ادعُ البريد الجديد كمسؤول منشأة
      try { await base44.asServiceRole.users.inviteUser(new_email, "admin"); } catch {
        return Response.json({ ok: false, error: "invite_failed" }, { status: 500 });
      }
      // ابحث عن المستخدم الجديد لربط admin_user_id به
      const found = await base44.asServiceRole.entities.User.filter({}, undefined, 500);
      const newUser = (found || []).find((u) => String(u.email || "").toLowerCase() === new_email);
      const newUserId = String(newUser?.id || "");
      // أَنسِ المالك القديم (إسقاط صلاحية المسؤول) لمنع الدخول بالبريد المفقود
      if (oldUserId && oldUserId !== newUserId) {
        try { await base44.asServiceRole.entities.User.update(oldUserId, { role: "user" }); } catch {}
      }
      // أعد ربط المنشأة بالبريد/الحساب الجديد وأعد تفعيلها إن كانت موقوفة/ملغاة
      const wasInactive = t.status === "expired" || t.status === "cancelled";
      const restoreStatus = wasInactive ? (t.suspended_from === "trial" ? "trial" : "active") : t.status;
      await base44.asServiceRole.entities.Tenant.update(tenant_id, {
        admin_email: new_email,
        contact_email: new_email,
        admin_user_id: newUserId,
        status: restoreStatus,
        suspended_from: wasInactive ? null : t.suspended_from,
      });
      return Response.json({ ok: true, reactivated: wasInactive });
    }

    if (action === "owner_approve_admin") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant_id = String(body.tenant_id || "");
      const approve = body.approve !== false;
      if (!tenant_id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      const uid = String(t?.admin_user_id || "");
      if (approve) {
        if (!uid) return Response.json({ ok: false, error: "no_pending" }, { status: 400 });
        await base44.asServiceRole.entities.User.update(uid, { role: "admin" });
        await base44.asServiceRole.entities.Tenant.update(tenant_id, { admin_status: "approved" });
      } else {
        await base44.asServiceRole.entities.Tenant.update(tenant_id, { admin_status: "rejected", admin_user_id: "", admin_email: "" });
      }
      return Response.json({ ok: true });
    }

    // ====== استبيانات تجربة العميل — إدارة كاملة من بوابة المالك ======
    if (action === "owner_survey_list") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const surveys = await base44.asServiceRole.entities.CustomerSurvey.list("-created_date", 200);
      const respAll = await base44.asServiceRole.entities.CustomerSurveyResponse.list("-created_date", 1000);
      const counts: any = {};
      for (const r of respAll || []) counts[r.survey_id] = (counts[r.survey_id] || 0) + 1;
      return Response.json({ ok: true, surveys: surveys || [], responses_count: counts, responses: respAll || [] });
    }
    if (action === "owner_survey_save") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      const payload: any = {
        title: String(body.title || "").trim(),
        description: String(body.description || "").trim(),
        questions: String(body.questions || "[]"),
        status: String(body.status || "active"),
        notes: String(body.notes || ""),
      };
      if (!payload.title) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      if (id) await base44.asServiceRole.entities.CustomerSurvey.update(id, payload);
      else await base44.asServiceRole.entities.CustomerSurvey.create(payload);
      return Response.json({ ok: true });
    }
    if (action === "owner_survey_delete") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      await base44.asServiceRole.entities.CustomerSurvey.delete(id);
      return Response.json({ ok: true });
    }
    if (action === "owner_survey_responses") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const survey_id = String(body.survey_id || "");
      if (!survey_id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const responses = await base44.asServiceRole.entities.CustomerSurveyResponse.filter({ survey_id }, "-created_date", 1000);
      return Response.json({ ok: true, responses: responses || [] });
    }

    // ====== برنامج الشركاء — بوابة المالك ======
    // قائمة الشركاء المسجّلين مع رمز الإحالة وبيانات التواصل، والعملاء المنسوبين لكل شريك
    // وعمولة 7% من أول اشتراك مدفوع لكل عميل (تُصرف مرة واحدة).
    if (action === "affiliate_list") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const [affiliates, allTenants, subs] = await Promise.all([
        base44.asServiceRole.entities.Affiliate.list("-created_date", 300),
        base44.asServiceRole.entities.Tenant.list("-created_date", 500),
        base44.asServiceRole.entities.Subscription.list("period_start", 1000),
      ]);
      const firstPaid: Record<string, number> = {};
      for (const s of subs || []) {
        if (s.status !== "paid") continue;
        const k = String(s.tenant_id || "");
        if (!k || firstPaid[k] !== undefined) continue;
        firstPaid[k] = Number(s.amount) || 0;
      }
      const rows = (affiliates || []).map((a: any) => {
        const code = String(a.ref_code || "").toUpperCase();
        const clients = (allTenants || [])
          .filter((t: any) => t.status !== "pending_payment" &&
            (String(t.referral_affiliate_id || "") === String(a.id) ||
             String(t.referral_code || "").toUpperCase() === code))
          .map((t: any) => {
            const first = firstPaid[String(t.id)] || 0;
            const pct = Number(a.commission_percent) || 7;
            return {
              id: t.id, name: t.name, status: t.status,
              contact_email: t.contact_email, contact_phone: t.contact_phone,
              first_paid_amount: first,
              commission: first > 0 ? Math.round(first * pct / 100) : 0,
            };
          });
        return {
          ...a,
          clients_count: clients.length,
          paid_clients_count: clients.filter((c: any) => c.first_paid_amount > 0).length,
          commission_total: clients.reduce((s: number, c: any) => s + c.commission, 0),
          clients,
        };
      });
      return Response.json({ ok: true, affiliates: rows });
    }
    if (action === "affiliate_save") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const src = body.payload || {};
      const payload: any = {};
      if (src.status) payload.status = ["pending", "active", "suspended"].includes(String(src.status)) ? String(src.status) : "pending";
      if (src.commission_percent !== undefined) payload.commission_percent = Number(src.commission_percent) || 0;
      if (src.bank_name !== undefined) payload.bank_name = String(src.bank_name || "").slice(0, 120);
      if (src.bank_iban !== undefined) payload.bank_iban = String(src.bank_iban || "").slice(0, 60);
      if (src.notes !== undefined) payload.notes = String(src.notes || "").slice(0, 1000);
      if (!Object.keys(payload).length) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      await base44.asServiceRole.entities.Affiliate.update(id, payload);
      return Response.json({ ok: true });
    }

    // ====== العمليات المالية — بوابة المالك (إيرادات مقابل مصروفات وعمولات) ======
    if (action === "finance_list") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const [subs, exps] = await Promise.all([
        base44.asServiceRole.entities.Subscription.list("-paid_date", 1000),
        base44.asServiceRole.entities.Expense.list("-expense_date", 500),
      ]);
      const revenues = (subs || []).filter((s: any) => s.status === "paid");
      return Response.json({ ok: true, revenues, expenses: exps || [] });
    }
    // تنظيف الإيرادات المكرّرة الناتجة عن إعادة توليد العقد لنفس الفترة (يبقى سجل واحد لكل عميل/فترة)
    if (action === "finance_dedupe") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const subs: any[] = await base44.asServiceRole.entities.Subscription.list("-created_date", 1000);
      const seen = new Set<string>();
      const dupIds: string[] = [];
      for (const s of subs || []) {
        if (s.status !== "paid") continue;
        const key = [s.tenant_id, s.period_start || "", s.period_end || ""].join("|");
        if (seen.has(key)) dupIds.push(String(s.id));
        else seen.add(key);
      }
      for (const id of dupIds) {
        try { await base44.asServiceRole.entities.Subscription.delete(id); } catch {}
      }
      return Response.json({ ok: true, removed: dupIds.length });
    }
    if (action === "expense_save") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const src = body.payload || {};
      const payload: any = {
        name: String(src.name || "").trim().slice(0, 200),
        category: String(src.category || "other"),
        amount: Number(src.amount) || 0,
        recurrence: String(src.recurrence || "one_time"),
        expense_date: String(src.expense_date || "").slice(0, 10),
        is_fixed: src.is_fixed === true,
        renewal_date: src.is_fixed === true
          ? String(src.renewal_date || src.expense_date || "").slice(0, 10)
          : null,
        // المصروف الثابت لا تاريخ توقف له — يتجدد تلقائياً كل فترة
        end_date: src.is_fixed === true ? null : (src.end_date ? String(src.end_date).slice(0, 10) : null),
        vendor: String(src.vendor || "").slice(0, 200),
        partner_name: String(src.partner_name || "").slice(0, 200),
        commission_percent: Number(src.commission_percent) || 0,
        base_amount: Number(src.base_amount) || 0,
        revenue_ref: String(src.revenue_ref || "").slice(0, 200),
        status: src.status === "stopped" ? "stopped" : "active",
        notes: String(src.notes || "").slice(0, 1000),
      };
      if (!payload.name || !payload.expense_date) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const id = String(body.id || "");
      if (id) await base44.asServiceRole.entities.Expense.update(id, payload);
      else await base44.asServiceRole.entities.Expense.create(payload);
      return Response.json({ ok: true });
    }
    if (action === "expense_delete") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      await base44.asServiceRole.entities.Expense.delete(id);
      return Response.json({ ok: true });
    }

    // ====== كودات الخصم — إدارة كاملة من بوابة المالك ======
    if (action === "discount_list") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const codes = await base44.asServiceRole.entities.DiscountCode.list("-created_date", 200);
      return Response.json({ ok: true, codes: codes || [] });
    }
    if (action === "discount_save") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      const payload: any = {
        code: String(body.code || "").trim(),
        discount_percent: Number(body.discount_percent || 0),
        label: String(body.label || ""),
        max_uses: Number(body.max_uses || 0),
        status: String(body.status || "active"),
        notes: String(body.notes || ""),
      };
      if (!payload.code) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      if (id) await base44.asServiceRole.entities.DiscountCode.update(id, payload);
      else await base44.asServiceRole.entities.DiscountCode.create(payload);
      return Response.json({ ok: true });
    }
    if (action === "discount_delete") {
      if (!isOwner) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      await base44.asServiceRole.entities.DiscountCode.delete(id);
      return Response.json({ ok: true });
    }

    // ====== الحضور والبصمة — بوابة الموظف ======
    if (action === "today_attendance") {
      const recs = await base44.asServiceRole.entities.Attendance.filter(
        { employee_id: employeeId, date: todayISO() }, "-created_date", 5
      );
      return Response.json({ ok: true, today: recs[0] || null });
    }

    if (action === "clock_in") {
      const date = todayISO();
      const checkIn = String(body.check_in || "").trim();
      const recs = await base44.asServiceRole.entities.Attendance.filter(
        { employee_id: employeeId, date }, "-created_date", 5
      );
      // ربط سجل الحضور بفرع الموظف (للتمييز في تقارير الحضور حسب الفرع)
      let branchId: any = null, branchName = "";
      let branchLat: any = null, branchLng: any = null, branchRadius: any = null;
      if (!isOwnerSession && emp?.branch_id) {
        try { const br = await base44.asServiceRole.entities.Branch.get(emp.branch_id); branchId = br?.id || emp.branch_id; branchName = br?.name || emp.branch_name || ""; branchLat = br?.lat; branchLng = br?.lng; branchRadius = br?.radius; }
        catch { branchId = emp.branch_id; branchName = emp.branch_name || ""; }
      } else if (!isOwnerSession) { branchId = emp?.branch_id || null; branchName = emp?.branch_name || ""; }

      // التحقق المُحكم من موقع الموظف الفعلي (ضد تزييف GPS):
      // إن أرسلت الواجهة إحداثيات حقيقية يُحسب بُعدها عن مقر العمل/الفرع، ويُقبَل الحضور
      // فقط ضمن النطاق المحدد (بالأمتار) ويُرفَض إذا تجاوزه — مصدر القرار هو الخادم.
      const sentLat = Number(body.lat), sentLng = Number(body.lng), sentAcc = Number(body.accuracy || 0);
      const hasCoords = isFinite(sentLat) && isFinite(sentLng) && sentLat !== 0 && sentLng !== 0;
      const orgForWp: any = await sessionOrg();
      let wpLat: number | null = null, wpLng: number | null = null, wpRadius = 50;
      if (branchLat != null && branchLat !== "" && branchLng != null && branchLng !== "") {
        wpLat = Number(branchLat); wpLng = Number(branchLng); wpRadius = Number(branchRadius) || Number(orgForWp?.workplace_radius) || 50;
      } else if (orgForWp?.workplace_lat != null && orgForWp?.workplace_lat !== "" && orgForWp?.workplace_lng != null && orgForWp?.workplace_lng !== "") {
        wpLat = Number(orgForWp.workplace_lat); wpLng = Number(orgForWp.workplace_lng); wpRadius = Number(orgForWp.workplace_radius) || 50;
      }
      if (hasCoords && wpLat != null && wpLng != null) {
        const d = haversineMeters(sentLat, sentLng, wpLat, wpLng);
        const tol = Math.min(isFinite(sentAcc) && sentAcc > 0 ? sentAcc : 0, wpRadius * 0.5) + 5;
        if (d > wpRadius + tol) {
          return Response.json({ ok: false, error: "out_of_range", dist: Math.round(d), radius: wpRadius }, { status: 400 });
        }
      }

      // تحديد حالة الحضور: إذا وصل الموظف بعد وقت الدوام + هامش التسامح → "late"، وإلا → "present"
      let arrivalStatus = "present";
      try {
        const org = orgForWp || {};
        const workStart = String(org.work_start_time || "").trim();
        const graceMinutes = Number(org.late_grace_minutes) || 0;
        if (workStart && checkIn) {
          const toMin = (hm: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(hm); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
          const startMin = toMin(workStart);
          const checkMin = toMin(checkIn);
          if (startMin !== null && checkMin !== null && checkMin > startMin + graceMinutes) {
            arrivalStatus = "late";
          }
        }
      } catch {}

      const today = recs[0] || null;
      if (today) {
        const updated = await base44.asServiceRole.entities.Attendance.update(today.id, {
          check_in: checkIn, status: arrivalStatus, source: "portal", employee_user_id: emp.user_id || null,
          branch_id: branchId, branch_name: branchName,
        });
        return Response.json({ ok: true, today: updated });
      }
      const created = await base44.asServiceRole.entities.Attendance.create({
        employee_id: employeeId, employee_user_id: emp.user_id || null, employee_name: empLabel,
        emp_ref: emp.emp_ref || "", date, check_in: checkIn, status: arrivalStatus, source: "portal", work_hours: 0,
        branch_id: branchId, branch_name: branchName,
      });
      return Response.json({ ok: true, today: created });
    }

    const hmToMin = (hm: string) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || ""));
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const computeNetHours = (checkIn: string, checkOut: string, breakMinutes: number) => {
      const ci = hmToMin(checkIn), co = hmToMin(checkOut);
      if (ci == null || co == null) return 0;
      let gross = co - ci; if (gross < 0) gross += 24 * 60; // عبور منتصف الليل
      const net = Math.max(0, gross - (breakMinutes || 0));
      return Math.round((net / 60) * 100) / 100;
    };

    // بدء استراحة (Break): تتطلب حضوراً مُسجَّلاً وعدم وجود انصراف أو استراحة مفتوحة
    if (action === "break_start") {
      const recs = await base44.asServiceRole.entities.Attendance.filter(
        { employee_id: employeeId, date: todayISO() }, "-created_date", 5
      );
      const today = recs[0] || null;
      if (!today || !today.check_in) return Response.json({ ok: false, error: "no_check_in" }, { status: 400 });
      if (today.check_out) return Response.json({ ok: false, error: "already_out" }, { status: 400 });
      if (today.break_start) return Response.json({ ok: false, error: "already_on_break" }, { status: 400 });
      const updated = await base44.asServiceRole.entities.Attendance.update(today.id, {
        break_start: String(body.break_start || "").trim(), source: "portal",
      });
      return Response.json({ ok: true, today: updated });
    }

    // إنهاء استراحة ومواصلة الدوام: يحسب دقائق الاستراحة ويضمّها للإجمالي ويُسجّلها في السجل
    if (action === "break_end") {
      const breakEnd = String(body.break_end || "").trim();
      const recs = await base44.asServiceRole.entities.Attendance.filter(
        { employee_id: employeeId, date: todayISO() }, "-created_date", 5
      );
      const today = recs[0] || null;
      if (!today || !today.break_start) return Response.json({ ok: false, error: "not_on_break" }, { status: 400 });
      const bs = hmToMin(today.break_start), be = hmToMin(breakEnd);
      let mins = 0;
      if (bs != null && be != null) { mins = be - bs; if (mins < 0) mins += 24 * 60; }
      const total = Math.max(0, Math.round((Number(today.break_minutes) || 0) + Math.max(0, mins)));
      let log: any[] = [];
      try { const p = JSON.parse(today.break_log || "[]"); if (Array.isArray(p)) log = p; } catch {}
      log.push({ start: today.break_start, end: breakEnd, minutes: Math.max(0, mins) });
      const updated = await base44.asServiceRole.entities.Attendance.update(today.id, {
        break_start: "", break_minutes: total, break_log: JSON.stringify(log), source: "portal",
      });
      return Response.json({ ok: true, today: updated });
    }

    if (action === "clock_out") {
      const checkOut = String(body.check_out || "").trim();
      const recs = await base44.asServiceRole.entities.Attendance.filter(
        { employee_id: employeeId, date: todayISO() }, "-created_date", 5
      );
      const today = recs[0] || null;
      if (!today || !today.check_in) return Response.json({ ok: false, error: "no_check_in" }, { status: 400 });
      // إنهاء أي استراحة مفتوحة تلقائياً عند الانصراف وضمها للإجمالي قبل احتساب الصافي
      let breakMinutes = Number(today.break_minutes) || 0;
      let break_start = today.break_start || "";
      let break_log = today.break_log || "";
      if (break_start) {
        const bs = hmToMin(break_start), be = hmToMin(checkOut);
        let mins = 0; if (bs != null && be != null) { mins = be - bs; if (mins < 0) mins += 24 * 60; }
        breakMinutes = Math.max(0, Math.round(breakMinutes + Math.max(0, mins)));
        try { const p = JSON.parse(break_log || "[]"); if (Array.isArray(p)) { p.push({ start: break_start, end: checkOut, minutes: Math.max(0, mins) }); break_log = JSON.stringify(p); } } catch {}
        break_start = "";
      }
      const wh = computeNetHours(today.check_in, checkOut, breakMinutes);
      const updated = await base44.asServiceRole.entities.Attendance.update(today.id, {
        check_out: checkOut, work_hours: wh, break_minutes: breakMinutes, break_start, break_log, source: "portal",
      });
      return Response.json({ ok: true, today: updated });
    }

    // ====== إنشاء الطلبات — بوابة الموظف ======
    // يحلّ المدير المباشر للموظف (المعرّف بـ manager_id على نفس المنشأة) لربط الطلب به.
    const resolveManager = async () => {
      if (!emp?.manager_id) return { manager_id: null, manager_name: "" };
      try {
        const mgr = await base44.asServiceRole.entities.Employee.get(emp.manager_id);
        const myUn = String(emp?.unified_number || "").trim();
        const mgrUn = String(mgr?.unified_number || "").trim();
        if (!mgr || (myUn && mgrUn && myUn !== mgrUn)) return { manager_id: null, manager_name: "" };
        return { manager_id: mgr?.id || emp.manager_id, manager_name: mgr?.full_name || "" };
      } catch {
        return { manager_id: null, manager_name: "" };
      }
    };

    const pick = (obj: any, keys: string[]) => {
      const out: Record<string, any> = {};
      for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
      return out;
    };

    // يقبل روابط http/https فقط لحقول الملفات المرفوعة — يرفض javascript:/data: لمنع XSS المخزّن في وجه الإدارة
    const safeUrl = (u: any): string => {
      const s = String(u || "").trim();
      return /^https?:\/\//i.test(s) ? s : "";
    };
    // حقل مستند: يقبل رابط http قديم أو رمز خزنة سعودية (doc_ref) — يرفض javascript:/data:
    const safeDocField = (u: any): string => {
      const s = String(u || "").trim();
      if (!s) return "";
      if (/^javascript:/i.test(s) || /^data:/i.test(s)) return "";
      return s;
    };

    if (action === "create_leave") {
      const p = pick(body.payload || {}, [
        "leave_type", "start_date", "end_date", "days_count", "reason",
        "medical_report_url", "is_full_clearance", "description", "permission_minutes",
      ]);
      p.medical_report_url = safeDocField(p.medical_report_url);
      const { manager_id, manager_name } = await resolveManager();
      // كل الطلبات تذهب للمدير المباشر أولاً (pending_manager). لكن معتمد الموارد البشرية
      // يملك صلاحية التصرف على الطلب وإعتماده من صفحة الموافقات حتى لو لم يوافق المدير
      // المباشر بعد — لا حاجة لتجاوز المدير هنا، فقط نُبقي المسار الطبيعي.
      const created = await base44.asServiceRole.entities.LeaveRequest.create({
        ...p,
        employee_id: employeeId,
        employee_user_id: emp.user_id || null,
        employee_name: empLabel,
        status: "pending_manager",
        manager_status: "pending", hr_status: "pending", finance_status: "pending",
        manager_id, manager_name,
      });
      // تنبيه المدير المباشر ببريد + إشعار داخلي بوجود طلب إجازة ينتظر موافقته
      try { await notifyApproverForStatus(base44, { type: "leave", employeeId, employeeName: empLabel, status: "pending_manager" }); } catch {}
      return Response.json({ ok: true, leave: created });
    }

    if (action === "create_loan") {
      const p = pick(body.payload || {}, ["amount", "reason", "installment_count", "monthly_installment", "description"]);
      // تاريخ تقديم الطلب — يُحسب في الخادم ويظهر في المستندات والموافقات (لا يُستبدل بتاريخ اليوم لاحقاً)
      p.request_date = todayISO();
      p.requested_amount = Number(p.amount) || 0;
      p.requested_installments = Math.max(1, Number(p.installment_count) || 1);
      // كل الطلبات تمرّ بالمدير المباشر أولاً ثم الموارد البشرية ثم المالية.
      const { manager_id, manager_name } = await resolveManager();
      const loan: any = await base44.asServiceRole.entities.LoanRequest.create({
        ...p,
        employee_id: employeeId,
        employee_user_id: emp.user_id || null,
        employee_name: empLabel,
        status: "pending_manager", manager_status: "pending", hr_status: "pending", finance_status: "pending",
        manager_id, manager_name,
        paid_amount: 0,
      });
      // تنبيه المدير المباشر ببريد + إشعار داخلي بوجود طلب سلفة ينتظر موافقته
      try { await notifyApproverForStatus(base44, { type: "loan", employeeId, employeeName: empLabel, status: "pending_manager" }); } catch {}
      return Response.json({ ok: true, loan });
    }

    if (action === "create_equipment") {
      const p = pick(body.payload || {}, ["item_type", "custom_type", "item_label", "reason"]);
      p.request_date = todayISO();
      const { manager_id, manager_name } = await resolveManager();
      const created = await base44.asServiceRole.entities.EquipmentRequest.create({
        ...p,
        employee_id: employeeId,
        employee_user_id: emp.user_id || null,
        employee_name: empLabel,
        status: "pending_manager", manager_status: "pending", hr_status: "pending",
        manager_id, manager_name,
      });
      try { await notifyApproverForStatus(base44, { type: "equipment", employeeId, employeeName: empLabel, status: "pending_manager" }); } catch {}
      return Response.json({ ok: true, equipment: created });
    }

    if (action === "create_complaint") {
      const p = pick(body.payload || {}, ["complaint_type", "custom_type", "description", "is_confidential", "department"]);
      p.submitted_date = todayISO();
      const confidential = p.is_confidential === true || p.is_confidential === "true";
      const { manager_id, manager_name } = await resolveManager();
      // الشكوى السرية تُحال مباشرة للموارد البشرية دون المرور بالمدير المباشر.
      const status = confidential ? "manager_approved" : "pending_manager";
      const created = await base44.asServiceRole.entities.Complaint.create({
        ...p,
        employee_id: employeeId,
        employee_user_id: emp.user_id || null,
        employee_name: empLabel,
        department: p.department || emp?.department || "",
        is_confidential: confidential,
        status,
        manager_status: confidential ? "approved" : "pending", hr_status: "pending",
        manager_id: confidential ? null : manager_id, manager_name: confidential ? "" : manager_name,
      });
      try { await notifyApproverForStatus(base44, { type: "complaint", employeeId, employeeName: empLabel, status }); } catch {}
      return Response.json({ ok: true, complaint: created });
    }

    if (action === "reply_investigation") {
      if (isOwnerSession) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      const reply = String(body.reply || "").trim().slice(0, 4000);
      const witnessNames = String(body.witness_names || "").trim().slice(0, 1000);
      if (!id || !reply) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const rec: any = await base44.asServiceRole.entities.Investigation.get(id);
      if (!rec) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      const bag = await companyBag();
      const recUn = String(rec.unified_number || "").trim();
      if (!bag.unified || recUn !== bag.unified) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      if (rec.status === "closed") return Response.json({ ok: false, error: "closed" }, { status: 400 });
      let parties: any[] = [];
      try { const p = JSON.parse(rec.parties || "[]"); if (Array.isArray(p)) parties = p; } catch { parties = []; }
      const idx = parties.findIndex((p) => String(p?.employee_id || "") === String(employeeId));
      if (idx < 0) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      let evidenceRef = String(parties[idx].evidence_ref || "");
      let evidenceSaved: boolean | null = null;
      const fileB64 = String(body.file_base64 || "");
      if (fileB64) {
        if (fileB64.length > 3500000) return Response.json({ ok: false, error: "file_too_large" }, { status: 400 });
        evidenceSaved = false;
        try {
          const clean = fileB64.replace(/^data:[^;]+;base64,/, "");
          const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
          const keys = await tenantKeysForEmployee(base44, emp);
          const tenantId = String(emp?.unified_number || "").trim() || keys[0];
          const stored: any = await storeDocument(
            tenantId, bytes, String(body.file_name || "evidence"), String(body.mime_type || "application/octet-stream"),
            emp?.emp_ref || null, "investigation"
          );
          evidenceRef = stored?.doc_ref || stored?.docRef || evidenceRef;
          evidenceSaved = !!evidenceRef;
        } catch { evidenceSaved = false; }
      }
      parties[idx] = {
        ...parties[idx],
        status: "replied",
        reply,
        witness_names: witnessNames,
        evidence_ref: evidenceRef,
        replied_at: new Date().toISOString(),
      };
      const pendingSubject = parties.some((p) => p.role !== "witness" && p.status !== "replied");
      const pendingWitness = parties.some((p) => p.role === "witness" && p.status !== "replied");
      const nextStatus = pendingSubject ? "awaiting_subjects" : pendingWitness ? "awaiting_witnesses" : "ready";
      await base44.asServiceRole.entities.Investigation.update(id, {
        parties: JSON.stringify(parties),
        status: nextStatus,
      });
      const who = parties[idx].employee_name || emp?.full_name || "";
      const kind = parties[idx].role === "witness" ? "الشاهد" : "الموظف";
      try {
        await base44.asServiceRole.entities.Notification.create({
          title: `رد على محضر التحقيق ${rec.ref_no}`,
          body: `${kind} ${who} رد في محضر التحقيق رقم ${rec.ref_no}`,
          type: "investigation",
          user_id: rec.created_by_id || "",
          unified_number: recUn,
          link: "/investigations",
          is_read: false,
        });
      } catch { /* الإشعار لا يمنع حفظ الرد */ }
      return Response.json({ ok: true, evidence_saved: evidenceSaved });
    }

    if (action === "create_trip") {
      const p = pick(body.payload || {}, [
        "trip_type", "destination", "purpose", "start_date", "end_date", "days_count",
        "transport_mode", "employee_note", "employee_document_url", "description",
      ]);
      p.employee_document_url = safeDocField(p.employee_document_url);
      // كل الطلبات تمرّ بالمدير المباشر أولاً ثم الموارد البشرية ثم المالية.
      const { manager_id, manager_name } = await resolveManager();
      const created = await base44.asServiceRole.entities.BusinessTrip.create({
        ...p,
        employee_id: employeeId,
        employee_user_id: emp.user_id || null,
        employee_name: empLabel,
        status: "pending_manager",
        manager_status: "pending", manager_id, manager_name,
      });
      // تنبيه المدير المباشر ببريد + إشعار داخلي بوجود طلب انتداب ينتظر موافقته
      try { await notifyApproverForStatus(base44, { type: "trip", employeeId, employeeName: empLabel, status: "pending_manager" }); } catch {}
      return Response.json({ ok: true, trip: created });
    }

    // ====== تأكيد الاطلاع — بوابة الموظف ======
    // يُلحق سجل اطلاع الموظف على قرار/حافز (JSON: [{ employee_id, date }])
    const ack = async (entity: "AdminDecision" | "Incentive", id: string) => {
      const rec: any = await base44.asServiceRole.entities[entity].get(id);
      if (!rec) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      if (!isOwnerSession) {
        const bag = await companyBag();
        const visible = inCompany(entity, rec, bag) || (
          entity === "Incentive" && bag.ids.has(String(rec.employee_id || ""))
        );
        if (!visible) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
      let log: any[] = [];
      try { const p = JSON.parse(rec.acknowledged_log || "[]"); if (Array.isArray(p)) log = p; } catch {}
      if (!log.find((x) => String(x.employee_id || "") === String(employeeId))) {
        log.push({ employee_id: employeeId, date: new Date().toISOString().slice(0, 10) });
        await base44.asServiceRole.entities[entity].update(id, { acknowledged_log: JSON.stringify(log) });
      }
      return Response.json({ ok: true });
    };
    if (action === "ack_decision") {
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      return await ack("AdminDecision", id);
    }
    if (action === "ack_incentive") {
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      return await ack("Incentive", id);
    }

    // ====== إدارة الرواتب — بوابة الموظف (مُفوّض بصلاحية الرواتب) ======
    // كل الإجراءات تتحقق أن مصفوفة صلاحيات الموظف تشمل "payroll" قبل أي عملية.
    const parsePerms = (p: any): string[] => {
      try { const a = JSON.parse(String(p || "[]")); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
    };
    const canPayroll = parsePerms(emp?.permissions).includes("payroll");
    // هوية المُعِدّ: الموظف المُفوّض الذي ينفّذ الاعتماد من البوابة — اسمه ورقم هويته/إقامته.
    const preparerIdentity = () => ({
      prepared_by_name: emp?.full_name || "الموظف المُفوّض",
      prepared_by_id: String(emp?.national_id || ""),
    });

    if (action === "payroll_list") {
      if (!canPayroll) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const month = Number(body.month), year = Number(body.year);
      const bag = isOwnerSession ? null : await companyBag();
      const empQuery = !isOwnerSession
        ? (bag?.unified ? { status: "active", unified_number: bag.unified } : { id: "__outside_company__" })
        : { status: "active" };
      const [orgRow, emps, pays] = await Promise.all([
        sessionOrg(),
        base44.asServiceRole.entities.Employee.filter(empQuery, "-created_date", 500),
        !month || !year
          ? Promise.resolve([] as any[])
          : base44.asServiceRole.entities.Payroll.filter({ month, year }, "-created_date", 1000),
      ]);
      const payrolls = await rowsOfCompany(pays || []);
      return Response.json({ ok: true, org: orgRow || null, employees: emps || [], payrolls });
    }

    if (action === "payroll_generate") {
      if (!canPayroll) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const month = Number(body.month), year = Number(body.year);
      if (!month || !year) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const mm = String(month).padStart(2, "0");
      const endDay = String(new Date(year, month, 0).getDate()).padStart(2, "0");
      const bag = isOwnerSession ? null : await companyBag();
      const empQuery = !isOwnerSession
        ? (bag?.unified ? { status: "active", unified_number: bag.unified } : { id: "__outside_company__" })
        : { status: "active" };
      const [orgRow, activeEmps, existingPaysAll, attRecordsAll] = await Promise.all([
        sessionOrg(),
        base44.asServiceRole.entities.Employee.filter(empQuery, "-created_date", 500),
        base44.asServiceRole.entities.Payroll.filter({ month, year }, "-created_date", 1000),
        base44.asServiceRole.entities.Attendance.filter({ date: { $gte: `${year}-${mm}-01`, $lte: `${year}-${mm}-${endDay}` } }, "-created_date", 2000),
      ]);
      const existingPays = await rowsOfCompany(existingPaysAll || []);
      const attRecords = await rowsOfCompany(attRecordsAll || []);
      const orgFresh: any = orgRow || {};
      const workDaysSet = computeWorkDaysSet(orgFresh.work_days);
      const workDaysInMonth = computeWorkDaysInMonth(year, month, workDaysSet);
      const workHoursPerDay = Number(orgFresh.work_hours_per_day) || 0;
      const paidDaysByEmp: Record<string, number> = {};
      const shortfallByEmp: Record<string, number> = {};
      for (const a of attRecords || []) {
        if (!a.employee_id) continue;
        if (!PAID_STATUSES.has(a.status)) continue;
        const dow = a.date ? new Date(a.date + "T00:00:00").getDay() : -1;
        if (dow >= 0 && !workDaysSet.has(dow)) continue;
        paidDaysByEmp[a.employee_id] = (paidDaysByEmp[a.employee_id] || 0) + 1;
        if (workHoursPerDay > 0 && (a.status === "present" || a.status === "late")) {
          const wh = Number(a.work_hours) || 0;
          const gap = Number((workHoursPerDay - wh).toFixed(2));
          if (gap > 0) shortfallByEmp[a.employee_id] = Number(((shortfallByEmp[a.employee_id] || 0) + gap).toFixed(2));
        }
      }
      const existingIds = new Set((existingPays || []).map((p: any) => p.employee_id));
      const existingDrafts: Record<string, any> = {};
      for (const p of existingPays || []) if (p.employee_id && p.status === "draft") existingDrafts[p.employee_id] = p;
      const created: any[] = [];
      const updates: any[] = [];
      for (const e of activeEmps || []) {
        const base = Number(e.base_salary) || 0;
        const housing = Number(e.housing_allowance) || 0;
        const transport = Number(e.transport_allowance) || 0;
        const other = Number(e.other_allowances) || 0;
        const gross = base + housing + transport + other;
        const paidDays = Math.min(paidDaysByEmp[e.id] || 0, workDaysInMonth);
        const absentDays = Math.max(0, workDaysInMonth - paidDays);
        const absentHours = shortfallByEmp[e.id] || 0;
        const absentDeduction = computeAbsentDeduction(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay);
        if (existingIds.has(e.id)) {
          const p = existingDrafts[e.id];
          if (p) updates.push({
            id: p.id,
            base_salary: base, housing_allowance: housing, transport_allowance: transport, other_allowances: other,
            gross_salary: gross, national_id: e.emp_ref ? "" : (e.national_id || p.national_id || ""), emp_ref: e.emp_ref || p.emp_ref || "",
            employee_name: e.full_name || p.employee_name || "",
            salary_payment_method: e.salary_payment_method || p.salary_payment_method || "mudad",
            absent_days: absentDays, absent_hours: absentHours, absent_deduction: absentDeduction,
            net_salary: computeNetFromAttendance(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay, p.bonus, p.overtime_amount, p.deductions, p.loan_installment),
            ...preparerIdentity(),
          });
          continue;
        }
        created.push({
          employee_id: e.id, emp_ref: e.emp_ref || "", national_id: e.emp_ref ? "" : (e.national_id || ""),
          month, year, salary_payment_method: e.salary_payment_method || "mudad",
          base_salary: base, housing_allowance: housing, transport_allowance: transport, other_allowances: other,
          gross_salary: gross, bonus: 0, deductions: 0, loan_installment: 0,
          overtime_hours: 0, overtime_amount: 0,
          absent_days: absentDays, absent_hours: absentHours, absent_deduction: absentDeduction,
          net_salary: computeNetFromAttendance(gross, absentDays, absentHours, workDaysInMonth, workHoursPerDay, 0, 0, 0, 0), status: "draft",
          ...preparerIdentity(),
        });
      }
      if (created.length) await base44.asServiceRole.entities.Payroll.bulkCreate(created);
      if (updates.length) await base44.asServiceRole.entities.Payroll.bulkUpdate(updates);
      return Response.json({ ok: true, created: created.length, updated: updates.length });
    }

    if (action === "payroll_update") {
      if (!canPayroll) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const fields = ["bonus", "overtime_amount", "overtime_hours", "deductions", "loan_installment", "absent_days", "absent_hours", "include_in_payroll", "notes"];
      const payload: any = {};
      for (const f of fields) if (body[f] !== undefined) payload[f] = body[f];
      if (!Object.keys(payload).length) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const p: any = await base44.asServiceRole.entities.Payroll.get(id);
      if (!isOwnerSession) {
        const bag = await companyBag();
        if (!bag.ids.has(String(p?.employee_id || ""))) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
      const next: any = { ...p, ...payload };
      const gross = Number(next.gross_salary) || ((Number(next.base_salary)||0)+(Number(next.housing_allowance)||0)+(Number(next.transport_allowance)||0)+(Number(next.other_allowances)||0));
      const o: any = (await sessionOrg()) || {};
      const wdh = computeWorkDaysInMonth(Number(next.year), Number(next.month), computeWorkDaysSet(o.work_days));
      const whp = Number(o.work_hours_per_day) || 0;
      const absent_deduction = computeAbsentDeduction(gross, next.absent_days, next.absent_hours, wdh, whp);
      const net_salary = computeNetFromAttendance(gross, next.absent_days, next.absent_hours, wdh, whp, next.bonus, next.overtime_amount, next.deductions, next.loan_installment);
      const prepUpd = preparerIdentity();
      const { id: _id, ...rest } = next;
      void _id;
      await base44.asServiceRole.entities.Payroll.update(id, { ...payload, gross_salary: gross, absent_deduction, net_salary, ...prepUpd });
      return Response.json({ ok: true, row: { ...rest, ...payload, gross_salary: gross, absent_deduction, net_salary, ...prepUpd } });
    }

    if (action === "payroll_approve") {
      if (!canPayroll) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const month = Number(body.month), year = Number(body.year);
      if (!month || !year) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const pays: any[] = await rowsOfCompany(await base44.asServiceRole.entities.Payroll.filter({ month, year }, "-created_date", 1000));
      const prep = preparerIdentity();
      const updates = (pays || [])
        .filter((p) => p.status === "draft" && p.include_in_payroll !== false)
        .map((p) => ({ id: p.id, status: "approved", prepared_by_name: prep.prepared_by_name, prepared_by_id: prep.prepared_by_id }));
      if (updates.length) await base44.asServiceRole.entities.Payroll.bulkUpdate(updates);
      return Response.json({ ok: true, approved: updates.length });
    }

    if (action === "payroll_pay") {
      if (!canPayroll) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const month = Number(body.month), year = Number(body.year);
      if (!month || !year) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const pays: any[] = await rowsOfCompany(await base44.asServiceRole.entities.Payroll.filter({ month, year }, "-created_date", 1000));
      const today = todayISO();
      const prepPay = preparerIdentity();
      const updates = (pays || [])
        .filter((p) => p.status === "approved" && p.include_in_payroll !== false)
        .map((p) => ({ id: p.id, status: "paid", paid_date: today, ...prepPay }));
      if (updates.length) await base44.asServiceRole.entities.Payroll.bulkUpdate(updates);
      return Response.json({ ok: true, paid: updates.length });
    }

    if (action === "payroll_reopen") {
      if (!canPayroll) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const month = Number(body.month), year = Number(body.year);
      if (!month || !year) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const pays: any[] = await rowsOfCompany(await base44.asServiceRole.entities.Payroll.filter({ month, year }, "-created_date", 1000));
      const prepRe = preparerIdentity();
      const updates = (pays || [])
        .filter((p) => p.status === "paid")
        .map((p) => ({ id: p.id, status: "approved", paid_date: null, ...prepRe }));
      if (updates.length) await base44.asServiceRole.entities.Payroll.bulkUpdate(updates);
      return Response.json({ ok: true, reopened: updates.length });
    }

    // ====== التوظيف — بوابة الموظف (مُفوّض بصلاحية التوظيف) ======
    const canRecruit = parsePerms(emp?.permissions).includes("recruitment");
    const hirePreparer = () => ({
      hired_by_name: emp?.full_name || "موظف الموارد البشرية",
      hired_by_employee_id: String(emp?.id || ""),
    });

    if (action === "recruitment_hires_mine") {
      if (!canRecruit) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const bag = isOwnerSession ? null : await companyBag();
      const hireQuery = bag?.unified
        ? { hired_by_employee_id: String(emp?.id || ""), unified_number: bag.unified }
        : { hired_by_employee_id: String(emp?.id || "") };
      const [hires, orgRow] = await Promise.all([
        base44.asServiceRole.entities.Employee.filter(hireQuery, "-created_date", 200),
        sessionOrg(),
      ]);
      return Response.json({ ok: true, hires: hires || [], org: orgRow || null, preparer: hirePreparer() });
    }

    if (action === "recruitment_create") {
      if (!canRecruit) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const b = body || {};
      const required = ["full_name", "department", "position", "hire_date", "base_salary"];
      for (const f of required) if (!b[f] && b[f] !== 0) return Response.json({ ok: false, error: "missing: " + f }, { status: 400 });
      const bag = isOwnerSession ? null : await companyBag();
      if (!isOwnerSession && !bag?.unified) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const orgFresh: any = (await sessionOrg()) || {};
      const empNumber = String(b.employee_number || "").trim() || `EMP-${String((bag?.employees?.length || 0) + 1).padStart(4, "0")}`;
      const base = Number(b.base_salary) || 0;
      const housing = Number(b.housing_allowance) || 0;
      const transport = Number(b.transport_allowance) || 0;
      const other = Number(b.other_allowances) || 0;
      const prep = hirePreparer();
      const created: any = await base44.asServiceRole.entities.Employee.create({
        full_name: b.full_name, employee_number: empNumber, national_id: b.national_id || "",
        email: b.email || "", nationality: b.nationality || "", is_saudi: !!b.is_saudi, gender: b.gender || "",
        phone: b.phone || "", address: b.address || "",
        department: b.department, branch_id: b.branch_id || "", branch_name: b.branch_name || "",
        position: b.position, role_level: b.role_level || "employee",
        hire_date: b.hire_date, contract_type: b.contract_type || "full_time",
        contract_start_date: b.hire_date,
        base_salary: base, housing_allowance: housing, transport_allowance: transport, other_allowances: other,
        salary_payment_method: b.salary_payment_method || "mudad",
        status: "active", leave_balance: 0, annual_leave_entitlement: orgFresh.annual_leave_days || 21,
        ticket_entitlement: orgFresh.ticket_policy || "yearly",
        unified_number: String(emp?.unified_number || ""),
        hired_by_name: prep.hired_by_name, hired_by_employee_id: prep.hired_by_employee_id,
      });
      return Response.json({ ok: true, employee: created, preparer: prep });
    }

    // ====== إدارة التوظيف الكاملة — بوابة الموظف المُفوّض (وظائف/متقدمون/مقابلات/تعيين/تجربة) ======
    if (action === "recruit_list") {
      if (!canRecruit) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const bag = isOwnerSession ? null : await companyBag();
      const [jobs, apps, evals, orgRow] = await Promise.all([
        base44.asServiceRole.entities.Job.list("-created_date", 300),
        base44.asServiceRole.entities.JobApplication.list("-created_date", 1000),
        base44.asServiceRole.entities.TrialEvaluation.list("-created_date", 500),
        sessionOrg(),
      ]);
      const keep = (entity: string, rows: any[]) => isOwnerSession ? (rows || []) : (rows || []).filter((r) => inCompany(entity, r, bag));
      return Response.json({
        ok: true,
        jobs: keep("Job", jobs),
        applications: keep("JobApplication", apps),
        evaluations: keep("TrialEvaluation", evals),
        org: orgRow || null, preparer: hirePreparer(),
      });
    }

    if (action === "recruit_job_save") {
      if (!canRecruit) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const s = body.payload || {};
      const payload: any = {
        title: String(s.title || "").trim().slice(0, 200),
        profession: String(s.profession || "").slice(0, 200),
        job_type: ["full_time", "part_time", "contract"].includes(String(s.job_type)) ? String(s.job_type) : "full_time",
        grade: String(s.grade || "").slice(0, 100),
        salary: Number(s.salary) || 0,
        nationality_req: ["any", "saudi", "resident"].includes(String(s.nationality_req)) ? String(s.nationality_req) : "any",
        qualifications: String(s.qualifications || "").slice(0, 4000),
        tasks: String(s.tasks || "").slice(0, 4000),
        description: String(s.description || "").slice(0, 10000),
        vacancy_count: Number(s.vacancy_count) || 1,
        department: String(s.department || "").slice(0, 200),
        status: s.status === "closed" ? "closed" : "open",
      };
      if (!payload.title) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const id = String(body.id || "");
      if (payload.status === "closed") payload.closed_date = todayISO();
      const bag = isOwnerSession ? null : await companyBag();
      if (!isOwnerSession && !bag?.unified) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      if (!isOwnerSession) payload.unified_number = bag.unified;
      if (id) {
        if (!isOwnerSession) {
          const existing = await base44.asServiceRole.entities.Job.get(id).catch(() => null);
          if (!inCompany("Job", existing, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        }
        await base44.asServiceRole.entities.Job.update(id, payload);
        return Response.json({ ok: true, id });
      }
      const created: any = await base44.asServiceRole.entities.Job.create({ ...payload, published_date: todayISO() });
      return Response.json({ ok: true, id: created?.id, job: created });
    }

    if (action === "recruit_job_delete") {
      if (!canRecruit) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      if (!isOwnerSession) {
        const bag = await companyBag();
        const existing = await base44.asServiceRole.entities.Job.get(id).catch(() => null);
        if (!inCompany("Job", existing, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
      await base44.asServiceRole.entities.Job.delete(id);
      return Response.json({ ok: true });
    }

    // فرز المتقدمين ومتابعتهم: تغيير الحالة، جدولة المقابلة، ملاحظات، سبب الرفض
    if (action === "recruit_app_update") {
      if (!canRecruit) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const s = body.payload || {};
      const payload: any = {};
      if (s.status && ["applied", "screened", "interview", "hired", "rejected"].includes(String(s.status))) payload.status = String(s.status);
      if (s.interview_date !== undefined) payload.interview_date = String(s.interview_date || "").slice(0, 10) || null;
      if (s.interview_notes !== undefined) payload.interview_notes = String(s.interview_notes || "").slice(0, 3000);
      if (s.reject_reason !== undefined) payload.reject_reason = String(s.reject_reason || "").slice(0, 1000);
      if (!Object.keys(payload).length) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      if (!isOwnerSession) {
        const bag = await companyBag();
        const existing = await base44.asServiceRole.entities.JobApplication.get(id).catch(() => null);
        if (!inCompany("JobApplication", existing, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        payload.unified_number = bag.unified;
      }
      await base44.asServiceRole.entities.JobApplication.update(id, payload);
      return Response.json({ ok: true });
    }

    // إكمال التوظيف: إنشاء سجل الموظف من ملف المتقدم وتعليم الطلب «معيّن» وإغلاق الوظيفة
    if (action === "recruit_hire") {
      if (!canRecruit) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const applicationId = String(body.application_id || "");
      if (!applicationId) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const app: any = await base44.asServiceRole.entities.JobApplication.get(applicationId);
      if (!app) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      const bag = isOwnerSession ? null : await companyBag();
      if (!isOwnerSession && !inCompany("JobApplication", app, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const job: any = app.job_id ? await base44.asServiceRole.entities.Job.get(app.job_id).catch(() => null) : null;
      if (!isOwnerSession && job && !inCompany("Job", job, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const s = body.payload || {};
      const orgFresh: any = (await sessionOrg()) || {};
      const prep = hirePreparer();
      const hireDate = String(s.hire_date || "").slice(0, 10) || todayISO();
      const created: any = await base44.asServiceRole.entities.Employee.create({
        full_name: app.full_name,
        employee_number: String(s.employee_number || "").trim() || `EMP-${String((bag?.employees?.length || 0) + 1).padStart(4, "0")}`,
        national_id: String(s.national_id || "").slice(0, 40),
        email: app.email || "", nationality: app.nationality || "",
        is_saudi: !!s.is_saudi, phone: app.phone || "",
        department: String(s.department || job?.department || "").slice(0, 200),
        position: String(s.position || job?.title || app.job_title || "").slice(0, 200),
        role_level: "employee",
        hire_date: hireDate, contract_start_date: hireDate,
        contract_type: job?.job_type || "full_time",
        base_salary: Number(s.base_salary) || Number(job?.salary) || 0,
        housing_allowance: Number(s.housing_allowance) || 0,
        transport_allowance: Number(s.transport_allowance) || 0,
        other_allowances: Number(s.other_allowances) || 0,
        salary_payment_method: s.salary_payment_method === "cash" ? "cash" : "mudad",
        status: "active", leave_balance: 0,
        annual_leave_entitlement: orgFresh.annual_leave_days || 21,
        ticket_entitlement: orgFresh.ticket_policy || "yearly",
        unified_number: String(emp?.unified_number || ""),
        hired_by_name: prep.hired_by_name, hired_by_employee_id: prep.hired_by_employee_id,
      });
      await base44.asServiceRole.entities.JobApplication.update(applicationId, {
        status: "hired", hired_date: hireDate, hired_employee_id: created?.id || "",
      });
      if (job?.id) {
        await base44.asServiceRole.entities.Job.update(job.id, {
          hired_applicant_name: app.full_name,
          status: "closed", closed_date: todayISO(),
        });
      }
      return Response.json({ ok: true, employee: created });
    }

    // تقييم فترة التجربة (٩٠ يوماً) للمعيّنين
    if (action === "recruit_eval_save") {
      if (!canRecruit) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const s = body.payload || {};
      const num = (v: any) => Math.max(0, Math.min(5, Number(v) || 0));
      const ratings = {
        competence_rating: num(s.competence_rating), behavior_rating: num(s.behavior_rating),
        knowledge_rating: num(s.knowledge_rating), professional_field_rating: num(s.professional_field_rating),
        experience_rating: num(s.experience_rating),
      };
      const vals = Object.values(ratings).filter((x) => x > 0);
      const payload: any = {
        job_id: String(s.job_id || ""), job_title: String(s.job_title || ""),
        applicant_id: String(s.applicant_id || ""),
        employee_name: String(s.employee_name || "").slice(0, 200),
        department: String(s.department || "").slice(0, 200),
        evaluation_date: String(s.evaluation_date || todayISO()).slice(0, 10),
        ...ratings,
        overall_rating: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0,
        strengths: String(s.strengths || "").slice(0, 3000),
        improvements: String(s.improvements || "").slice(0, 3000),
        recommendation: ["confirm", "dismiss_probation", "extend"].includes(String(s.recommendation)) ? String(s.recommendation) : "confirm",
        status: "completed",
        notes: String(s.notes || "").slice(0, 2000),
      };
      if (!payload.employee_name) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const bag = isOwnerSession ? null : await companyBag();
      if (!isOwnerSession && !bag?.unified) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      if (!isOwnerSession) payload.unified_number = bag.unified;
      const id = String(body.id || "");
      if (id) {
        if (!isOwnerSession) {
          const existing = await base44.asServiceRole.entities.TrialEvaluation.get(id).catch(() => null);
          if (!inCompany("TrialEvaluation", existing, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        }
        await base44.asServiceRole.entities.TrialEvaluation.update(id, payload);
      } else await base44.asServiceRole.entities.TrialEvaluation.create(payload);
      return Response.json({ ok: true });
    }

    // ====== تفويض عام للأقسام الإدارية — إنشاء/استعراض/تعديل/حذف عبر بوابة الموظف ======
    // كل قسم محدود بصلاحيته، ويُحقن توثيق «أُعدّت بواسطة (الاسم + الهوية)» تلقائيًا
    // باسم ورقم هوية الموظف المُفوّض المنفّذ للعمل.
    const DELEGATED_MAP: Record<string, { entity: string; perm: string; nameField: string; idField: string; numberField?: string; numberPrefix?: string; idIsEmployeeId?: boolean }> = {
      training:   { entity: "TrainingPlan", perm: "training", nameField: "prepared_by_name", idField: "prepared_by_id" },
      incentives: { entity: "Incentive", perm: "incentives", nameField: "created_by_name", idField: "created_by_id", numberField: "incentive_number", numberPrefix: "INC" },
      warnings:   { entity: "Warning", perm: "warnings", nameField: "prepared_by_name", idField: "prepared_by_id" },
      decisions:  { entity: "AdminDecision", perm: "decisions", nameField: "created_by_name", idField: "created_by_id", numberField: "decision_number", numberPrefix: "DEC" },
      performance: { entity: "Performance", perm: "performance", nameField: "prepared_by_name", idField: "prepared_by_id" },
      succession: { entity: "SuccessionPlan", perm: "succession", nameField: "prepared_by_name", idField: "prepared_by_id" },
      "exit-interviews": { entity: "ExitInterview", perm: "exit-interviews", nameField: "prepared_by_name", idField: "prepared_by_id" },
      surveys:    { entity: "Survey", perm: "surveys", nameField: "prepared_by_name", idField: "prepared_by_id" },
      licenses:   { entity: "License", perm: "licenses", nameField: "prepared_by_name", idField: "prepared_by_id" },
      gosi:       { entity: "GosiRecord", perm: "gosi", nameField: "prepared_by_name", idField: "prepared_by_id" },
      "org-structure": { entity: "OrgUnit", perm: "org-structure", nameField: "prepared_by_name", idField: "prepared_by_id" },
      "workforce-planning": { entity: "WorkforcePlan", perm: "workforce-planning", nameField: "prepared_by_name", idField: "prepared_by_id" },
      "platform-subscriptions": { entity: "PlatformSubscription", perm: "platform-subscriptions", nameField: "prepared_by_name", idField: "prepared_by_id" },
      "customer-surveys": { entity: "CustomerSurvey", perm: "customer-surveys", nameField: "prepared_by_name", idField: "prepared_by_id" },
      "end-of-service": { entity: "Settlement", perm: "end-of-service", nameField: "prepared_by_name", idField: "prepared_by_id" },
      attendance: { entity: "Attendance", perm: "attendance", nameField: "prepared_by_name", idField: "prepared_by_id" },
      leaves: { entity: "LeaveRequest", perm: "leaves", nameField: "prepared_by_name", idField: "prepared_by_id" },
      "business-trips": { entity: "BusinessTrip", perm: "business-trips", nameField: "prepared_by_name", idField: "prepared_by_id" },
      employees: { entity: "Employee", perm: "employees", nameField: "hired_by_name", idField: "hired_by_employee_id", idIsEmployeeId: true },
      fleet: { entity: "VehicleDelegation", perm: "fleet", nameField: "created_by_name", idField: "created_by_id" },
      vehicles: { entity: "Vehicle", perm: "fleet", nameField: "prepared_by_name", idField: "prepared_by_id" },
    };

    if (action === "delegated_list") {
      const key = String(body.section || "");
      const cfg = DELEGATED_MAP[key];
      if (!cfg) return Response.json({ ok: false, error: "unknown_section" }, { status: 400 });
      if (!parsePerms(emp?.permissions).includes(cfg.perm)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const bag = isOwnerSession ? null : await companyBag();
      const [orgRow, emps, records] = await Promise.all([
        sessionOrg(),
        isOwnerSession
          ? base44.asServiceRole.entities.Employee.list("-created_date", 500)
          : Promise.resolve(bag?.employees || []),
        (base44.asServiceRole.entities as any)[cfg.entity].list("-created_date", 500),
      ]);
      const visible = isOwnerSession ? (records || []) : (records || []).filter((r: any) => inCompany(cfg.entity, r, bag));
      return Response.json({ ok: true, org: orgRow || null, employees: emps || [], records: visible, preparer: { name: emp?.full_name || "", id: String(emp?.national_id || "") } });
    }

    if (action === "delegated_create") {
      const key = String(body.section || "");
      const cfg = DELEGATED_MAP[key];
      if (!cfg) return Response.json({ ok: false, error: "unknown_section" }, { status: 400 });
      if (!parsePerms(emp?.permissions).includes(cfg.perm)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const payload: any = { ...(body.payload || {}) };
      const pName = emp?.full_name || "موظف الموارد البشرية";
      const pNid = String(emp?.national_id || "");
      // ملاحظة: created_by_id حقل مدمج تُعيد المنصة كتابته، لذا تُضمَّن هوية المُعِدّ
      // مع الاسم في هذه الأقسام لضمان بقاء التوثيق ظاهراً في لوحة الإدارة.
      payload[cfg.nameField] = cfg.idField === "created_by_id" && pNid ? `${pName} — ${pNid}` : pName;
      if (cfg.idField !== "created_by_id")
        payload[cfg.idField] = cfg.idIsEmployeeId ? String(emp?.id || "") : pNid;
      const bag = isOwnerSession ? null : await companyBag();
      if (!isOwnerSession) {
        if (!bag?.unified || !canWrite(cfg.entity, payload, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        Object.assign(payload, stampCompany(cfg.entity, payload, bag));
      }
      if (cfg.numberField && cfg.numberPrefix && !payload[cfg.numberField]) {
        const all = await (base44.asServiceRole.entities as any)[cfg.entity].list("-created_date", 1);
        payload[cfg.numberField] = `${cfg.numberPrefix}-${String((all?.length || 0) + 1).padStart(4, "0")}`;
      }
      const created = await (base44.asServiceRole.entities as any)[cfg.entity].create(payload);
      return Response.json({ ok: true, record: created });
    }

    if (action === "delegated_update") {
      const key = String(body.section || "");
      const cfg = DELEGATED_MAP[key];
      if (!cfg) return Response.json({ ok: false, error: "unknown_section" }, { status: 400 });
      if (!parsePerms(emp?.permissions).includes(cfg.perm)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const bag = isOwnerSession ? null : await companyBag();
      const existing = await (base44.asServiceRole.entities as any)[cfg.entity].get(id).catch(() => null);
      if (!isOwnerSession && !inCompany(cfg.entity, existing, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const patch = isOwnerSession ? { ...(body.payload || {}) } : stampCompany(cfg.entity, { ...(body.payload || {}) }, bag);
      await (base44.asServiceRole.entities as any)[cfg.entity].update(id, patch);
      return Response.json({ ok: true });
    }

    if (action === "delegated_delete") {
      const key = String(body.section || "");
      const cfg = DELEGATED_MAP[key];
      if (!cfg) return Response.json({ ok: false, error: "unknown_section" }, { status: 400 });
      if (!parsePerms(emp?.permissions).includes(cfg.perm)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const id = String(body.id || "");
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      if (!isOwnerSession) {
        const bag = await companyBag();
        const existing = await (base44.asServiceRole.entities as any)[cfg.entity].get(id).catch(() => null);
        if (!inCompany(cfg.entity, existing, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
      await (base44.asServiceRole.entities as any)[cfg.entity].delete(id);
      return Response.json({ ok: true });
    }

    // ====== التحليلات والتقارير (للموظف المُفوّض بصلاحية «analytics») ======
    if (action === "analytics_stats") {
      if (!parsePerms(emp?.permissions).includes("analytics")) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const [emps, atts, pays, warns, incs] = await Promise.all([
        base44.asServiceRole.entities.Employee.list("-created_date", 2000),
        base44.asServiceRole.entities.Attendance.list("-created_date", 500),
        base44.asServiceRole.entities.Payroll.list("-created_date", 500),
        base44.asServiceRole.entities.Warning.list("-created_date", 500),
        base44.asServiceRole.entities.Incentive.list("-created_date", 500),
      ]);
      const bag = isOwnerSession ? null : await companyBag();
      const e = isOwnerSession ? (emps || []) : (emps || []).filter((x: any) => inCompany("Employee", x, bag));
      const attsC = isOwnerSession ? (atts || []) : (atts || []).filter((x: any) => inCompany("Attendance", x, bag));
      const paysC = isOwnerSession ? (pays || []) : (pays || []).filter((x: any) => inCompany("Payroll", x, bag));
      const warnsC = isOwnerSession ? (warns || []) : (warns || []).filter((x: any) => inCompany("Warning", x, bag));
      const incsC = isOwnerSession ? (incs || []) : (incs || []).filter((x: any) => inCompany("Incentive", x, bag));
      const byDept: Record<string, number> = {};
      e.forEach((x: any) => { const d = x.department || "بدون إدارة"; byDept[d] = (byDept[d] || 0) + 1; });
      return Response.json({ ok: true, stats: {
        employees: e.length,
        active: e.filter((x: any) => x.status === "active").length,
        on_leave: e.filter((x: any) => x.status === "on_leave").length,
        terminated: e.filter((x: any) => x.status === "terminated" || x.status === "resigned").length,
        saudi: e.filter((x: any) => x.is_saudi).length,
        expat: e.filter((x: any) => !x.is_saudi).length,
        departments: Object.keys(byDept).length,
        byDept,
        attendanceRecords: attsC.length,
        payrollRecords: paysC.length,
        warnings: warnsC.length,
        incentives: incsC.length,
      }});
    }

    // ====== استيراد البصمات (للموظف المُفوّض بصلاحية «import-attendance») ======
    // يستقبل السجلات المُحلّلة في المتصفح (CSV) ويطابقها بالموظفين ويُنشئ سجلات الحضور
    // مع توثيق «أُعدّت بواسطة» باسم وهوية المُنفّذ.
    if (action === "delegated_import_attendance") {
      if (!parsePerms(emp?.permissions).includes("import-attendance")) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const records = Array.isArray(body.records) ? body.records : [];
      if (!records.length) return Response.json({ ok: false, error: "empty" }, { status: 400 });
      const bag = isOwnerSession ? null : await companyBag();
      const emps = isOwnerSession
        ? await base44.asServiceRole.entities.Employee.list("-created_date", 2000)
        : (bag?.employees || []);
      const byNum: Record<string, any> = {};
      (emps || []).forEach((x: any) => { if (x.employee_number) byNum[String(x.employee_number).trim()] = x; });
      const pname = emp?.full_name || "موظف الموارد البشرية";
      const pid = String(emp?.national_id || "");
      const toCreate: any[] = [];
      for (const r of records) {
        const num = String(r.employee_number || "").trim();
        const empMatch = byNum[num];
        if (!empMatch || !r.date) continue;
        toCreate.push({
          employee_id: empMatch.id, employee_user_id: empMatch.user_id || "", employee_name: empMatch.full_name,
          emp_ref: empMatch.emp_ref || "", national_id: empMatch.emp_ref ? "" : (empMatch.national_id || ""), branch_id: empMatch.branch_id || "", branch_name: empMatch.branch_name || "",
          date: String(r.date), check_in: r.check_in || "", check_out: r.check_out || "", status: "present", source: "import",
          prepared_by_name: pname, prepared_by_id: pid,
        });
      }
      if (toCreate.length) await base44.asServiceRole.entities.Attendance.bulkCreate(toCreate);
      return Response.json({ ok: true, imported: toCreate.length, total: records.length, skipped: records.length - toCreate.length });
    }

    // ====== قائمة المركبات (لمنتجب منتقي المركبة في قسم «fleet») ======
    if (action === "delegated_vehicles") {
      if (!parsePerms(emp?.permissions).includes("fleet")) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const bag = isOwnerSession ? null : await companyBag();
      const vehicles = await base44.asServiceRole.entities.Vehicle.list("-created_date", 500);
      const visible = isOwnerSession ? (vehicles || []) : (vehicles || []).filter((v: any) => inCompany("Vehicle", v, bag));
      return Response.json({ ok: true, vehicles: visible });
    }

    // ====== جسر البيانات العام — يفتح صفحات لوحة الشركات كما هي للموظف المُفوّض ======
    // الموظف المُفوّض على قسم يحصل على القسم بكامل مهامه: كل قراءة/كتابة تمرّ هنا،
    // فيُتحقق أولاً أن مصفوفة صلاحياته تشمل القسم المالك للكيان، ثم تُنفّذ عبر خدمة-الدور.
    // كيانات مساندة (المنشأة، الموظفون، الفروع...) تُقرأ لأي مُفوّض لأنها لازمة لكل شاشة.
    const ENTITY_PERMS: Record<string, string[]> = {
      Employee: ["employees", "recruitment", "analytics", "end-of-service", "payroll", "gosi", "performance", "training", "warnings", "decisions", "incentives", "leaves", "business-trips", "attendance", "org-structure", "workforce-planning", "succession", "exit-interviews", "fleet", "surveys"],
      Job: ["recruitment"], JobApplication: ["recruitment"], TrialEvaluation: ["recruitment"],
      Attendance: ["attendance", "import-attendance", "analytics", "payroll"],
      LeaveRequest: ["leaves", "approvals"], LoanRequest: ["approvals"],
      BusinessTrip: ["business-trips", "approvals"],
      Payroll: ["payroll", "analytics"], GosiRecord: ["gosi"],
      Vehicle: ["fleet"], VehicleDelegation: ["fleet"],
      Settlement: ["end-of-service"], Performance: ["performance"],
      TrainingPlan: ["training"], SuccessionPlan: ["succession"],
      OrgUnit: ["org-structure"], WorkforcePlan: ["workforce-planning"],
      ExitInterview: ["exit-interviews"], Survey: ["surveys"], SurveyResponse: ["surveys"],
      Warning: ["warnings", "analytics"], AdminDecision: ["decisions"], Incentive: ["incentives", "analytics"],
      License: ["licenses"], PlatformSubscription: ["platform-subscriptions"],
      CustomerSurvey: ["customer-surveys"], CustomerSurveyResponse: ["customer-surveys"],
      Branch: ["employees", "attendance", "settings"], Organization: ["employees", "settings"],
      Notification: ["employees", "settings"],
    };
    const READ_ANY = new Set(["Organization", "Employee", "Branch", "Notification", "Job", "Vehicle"]);
    const READ_OPS = new Set(["list", "filter", "get"]);
    const WRITE_OPS = new Set(["create", "update", "delete", "bulkCreate", "bulkUpdate", "updateMany", "deleteMany"]);

    if (action === "entity_op") {
      const entity = String(body.entity || "");
      const op = String(body.op || "");
      const args = Array.isArray(body.args) ? body.args : [];
      const allowed = ENTITY_PERMS[entity];
      if (!allowed) return Response.json({ ok: false, error: "unknown_entity" }, { status: 400 });
      if (!READ_OPS.has(op) && !WRITE_OPS.has(op)) return Response.json({ ok: false, error: "unknown_op" }, { status: 400 });
      const perms = parsePerms(emp?.permissions);
      if (!perms.length) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const hasPerm = allowed.some((p) => perms.includes(p));
      const readOnlyPass = READ_OPS.has(op) && READ_ANY.has(entity);
      if (!hasPerm && !readOnlyPass) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

      // توثيق «أُعدّت بواسطة»: يُحقن اسم ورقم هوية الموظف المُفوّض في كل عملية كتابة (إنشاء/تعديل)
      // من البوابة — يشمل التعيين، الفسخ، القرارات، التقييم، الرواتب، الوظائف... إلخ.
      const pName = emp?.full_name || "الموظف المُفوّض";
      const pNid = String(emp?.national_id || "");
      // الكيانات التي تملك حقول التوثيق (prepared_by / created_by / hired_by) — فقط هذه تُدمغ.
      const STAMPED = new Set([
        "Employee", "Job", "Payroll", "TrainingPlan", "Warning", "Performance", "SuccessionPlan",
        "ExitInterview", "Survey", "License", "GosiRecord", "OrgUnit", "WorkforcePlan",
        "PlatformSubscription", "CustomerSurvey", "Settlement", "Attendance", "LeaveRequest",
        "BusinessTrip", "Vehicle", "Incentive", "AdminDecision", "VehicleDelegation",
      ]);
      const stampFields = (out: any, isCreate = false) => {
        if (entity === "Employee") {
          out.prepared_by_name = pName; out.prepared_by_id = pNid;
          if (isCreate) {
            out.hired_by_name = pNid ? `${pName} — ${pNid}` : pName; out.hired_by_employee_id = String(emp?.id || "");
            out.unified_number = String(emp?.unified_number || "");
          }
        } else if (entity === "Incentive" || entity === "AdminDecision" || entity === "VehicleDelegation") {
          out.created_by_name = pNid ? `${pName} — ${pNid}` : pName;
        } else {
          out.prepared_by_name = pName; out.prepared_by_id = pNid;
        }
        return out;
      };
      const stamp = (rec: any, isCreate = false) => {
        if (!rec || typeof rec !== "object") return rec;
        return stampFields({ ...rec }, isCreate);
      };
      const target: any = (base44.asServiceRole.entities as any)[entity];
      if (!target) return Response.json({ ok: false, error: "unknown_entity" }, { status: 400 });
      const canStamp = STAMPED.has(entity);
      let callArgs = args;
      if (canStamp) {
        if (op === "create") callArgs = [stamp(args[0], true)];
        else if (op === "bulkCreate") callArgs = [(args[0] || []).map((r: any) => stamp(r, true))];
        else if (op === "update") callArgs = [args[0], stamp(args[1])];
        else if (op === "bulkUpdate") callArgs = [(args[0] || []).map((r: any) => stamp(r))];
        else if (op === "updateMany") {
          const upd: any = { ...(args[1] || {}) };
          const set: any = { ...(upd.$set || {}) };
          stampFields(set);
          upd.$set = set;
          callArgs = [args[0], upd];
        }
      }
      if (!isOwnerSession) {
        const bag = await companyBag();
        if (!bag.unified) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        const owned = async (id: string) => {
          try { return await target.get(id); } catch { return null; }
        };
        if (op === "create") {
          const row = stampCompany(entity, callArgs[0], bag);
          if (!canWrite(entity, row, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
          callArgs = [row];
        } else if (op === "bulkCreate") {
          const rows = (callArgs[0] || []).map((r: any) => stampCompany(entity, r, bag));
          if (rows.some((r: any) => !canWrite(entity, r, bag))) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
          callArgs = [rows];
        } else if (op === "update" || op === "delete") {
          const existing = await owned(String(callArgs[0] || ""));
          if (!inCompany(entity, existing, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
          if (op === "update") {
            const next = stampCompany(entity, callArgs[1], bag);
            if (!inCompany(entity, { ...existing, ...next }, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
            callArgs = [callArgs[0], next];
          }
        } else if (op === "bulkUpdate") {
          const nextRows = [];
          for (const row of callArgs[0] || []) {
            const existing = await owned(String(row?.id || ""));
            if (!inCompany(entity, existing, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
            const next = stampCompany(entity, row, bag);
            if (!inCompany(entity, { ...existing, ...next }, bag)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
            nextRows.push(next);
          }
          callArgs = [nextRows];
        } else if (op === "updateMany" || op === "deleteMany") {
          callArgs = [scopeQuery(entity, callArgs[0], bag), callArgs[1]];
        }
      }
      const result = await target[op](...callArgs);
      if (!isOwnerSession && READ_OPS.has(op)) {
        const bag = await companyBag();
        return Response.json({ ok: true, result: filterPayload(entity, result ?? null, bag) });
      }
      return Response.json({ ok: true, result: result ?? null });
    }

    return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}