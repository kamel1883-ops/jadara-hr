import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { verifyToken } from "../../shared/portalToken.ts";
import { resolveBranchSchedule } from "../../shared/branchSchedule.ts";
import { closeStaleOpenAttendance } from "../../shared/autoCloseAttendance.ts";
// تُحمَّل مكتبة الدفع ديناميكياً داخل getVapid/sendWebPush فقط،
// حتى تبقى بقية أفعال الدالة (mine/request/status) تعمل لو تعذّر تحميلها.

// طلب إثبات الحضور الفوري — نطاق المنشأة فقط.
// يصدر طلباً واحداً نشطاً لكل منشأة، ويستهدف الموجودين في الدوام حالياً فقط.
// لا يغيّر الحضور ولا الرواتب: عدم التأكيد يظهر في تقرير المتابعة فقط.

const PROOF_MS = 5 * 60 * 1000;
const RIYADH_TZ = "Asia/Riyadh";
const LANGS = ["ar", "en", "hi", "ne", "bn", "fil", "ur"];

function asList(page: any): any[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

function parseJsonArray(raw: any): string[] {
  try {
    const parsed = JSON.parse(String(raw || "[]"));
    if (Array.isArray(parsed)) return parsed.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {}
  return [];
}

function hmToMin(hm: string): number | null {
  const m = String(hm || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

function riyadhNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: RIYADH_TZ,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now).map((p) => [p.type, p.value])
  );
  const weekday = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[String(parts.weekday || "")] ?? -1;
  const minutes = (Number(parts.hour) || 0) % 24 * 60 + (Number(parts.minute) || 0);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    minutes,
    clock: `${String((Number(parts.hour) || 0) % 24).padStart(2, "0")}:${String(parts.minute || "00").padStart(2, "0")}`,
  };
}

function inShift(start: string, end: string, nowMin: number): boolean {
  const s = hmToMin(start);
  const e = hmToMin(end);
  if (s == null || e == null || s === e) return false;
  if (e > s) return nowMin >= s && nowMin < e;
  return nowMin >= s || nowMin < e;
}

function parseWorkDays(raw: any): number[] {
  const fallback = [0, 1, 2, 3, 4, 6];
  try {
    const days = String(raw ?? fallback.join(","))
      .split(",")
      .map((x) => Number(String(x || "").trim()))
      .filter((x) => Number.isInteger(x) && x >= 0 && x <= 6);
    return days.length ? [...new Set(days)] : fallback;
  } catch {
    return fallback;
  }
}

function parsePermissions(raw: any): string[] {
  try {
    const parsed = JSON.parse(String(raw || "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function resolveTenantForUser(base44: any, user: any) {
  const uid = String(user?.id || "");
  const email = String(user?.email || "").trim().toLowerCase();
  const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({}, undefined, 2000));
  const norm = (x: any) => String(x || "").trim().toLowerCase();
  let tenant = uid ? tenants.find((x: any) => String(x?.admin_user_id || "") === uid) : null;
  if (!tenant && email) {
    const hits = tenants.filter((x: any) => norm(x?.contact_email) === email || norm(x?.admin_email) === email);
    if (hits.length === 1) tenant = hits[0];
  }
  if (!tenant) {
    try {
      const mine = asList(await base44.asServiceRole.entities.TenantMember.filter({ user_id: uid })).filter(
        (x: any) => x && x.active !== false
      );
      const uns = [...new Set(mine.map((x: any) => String(x?.unified_number || "").trim()).filter(Boolean))];
      if (uns.length === 1) tenant = tenants.find((x: any) => String(x?.unified_number || "").trim() === uns[0]);
    } catch {}
  }
  if (!tenant) {
    try {
      let emps = uid ? asList(await base44.asServiceRole.entities.Employee.filter({ user_id: uid })) : [];
      if (!emps.length && email) emps = asList(await base44.asServiceRole.entities.Employee.filter({ email }));
      const uns = [...new Set(emps.map((e: any) => String(e?.unified_number || "").trim()).filter(Boolean))];
      if (uns.length === 1) tenant = tenants.find((x: any) => String(x?.unified_number || "").trim() === uns[0]);
    } catch {}
  }
  return tenant || null;
}

// إشعارات الويب (Web Push): تصل للجوال والتطبيق مغلق بلا حساب تطبيق ولا بريد.
// الموظف يفعّلها مرة من بوابة الموظف بعد الدخول برقم هويته، ويُربط اشتراكه بسجل الموظف.
function envVar(name: string): string {
  try {
    const deno: any = (globalThis as any).Deno;
    if (deno?.env?.get) return String(deno.env.get(name) || "");
  } catch {}
  try { return String((globalThis as any)?.process?.env?.[name] || ""); } catch {}
  return "";
}

async function webpushLib() {
  const mod: any = await import("npm:web-push@3.6.7");
  return mod?.default || mod;
}

async function getVapid(base44: any) {
  const envPublic = envVar("VAPID_PUBLIC_KEY");
  const envPrivate = envVar("VAPID_PRIVATE_KEY");
  const envSubject = envVar("VAPID_SUBJECT") || "mailto:support@jadara.app";
  if (envPublic && envPrivate) return { publicKey: envPublic, privateKey: envPrivate, subject: envSubject };
  const rows = asList(await base44.asServiceRole.entities.PushServerKey.list("-created_date", 5).catch(() => []));
  const row = rows?.[0];
  if (row?.public_key && row?.private_key) {
    return { publicKey: String(row.public_key), privateKey: String(row.private_key), subject: String(row.subject || envSubject) };
  }
  const webpush = await webpushLib();
  const keys = webpush.generateVAPIDKeys();
  try {
    await base44.asServiceRole.entities.PushServerKey.create({ public_key: keys.publicKey, private_key: keys.privateKey, subject: envSubject });
  } catch {}
  return { publicKey: keys.publicKey, privateKey: keys.privateKey, subject: envSubject };
}

async function sendWebPush(base44: any, employeeId: string, payload: any) {
  let subs: any[] = [];
  try {
    subs = asList(
      await base44.asServiceRole.entities.EmployeePushSubscription.filter(
        { employee_id: String(employeeId || ""), active: true }, undefined, 50
      )
    );
  } catch {
    return { sent: 0, failed: 0, devices: 0 };
  }
  if (!subs.length) return { sent: 0, failed: 0, devices: 0 };
  let vapid: any = null;
  try {
    vapid = await getVapid(base44);
  } catch {
    return { sent: 0, failed: 0, devices: subs.length, degraded: true };
  }
  let webpush: any = null;
  try {
    webpush = await webpushLib();
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  } catch {
    return { sent: 0, failed: 0, devices: subs.length, degraded: true };
  }
  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: String(sub?.endpoint || ""), keys: { p256dh: String(sub?.p256dh || ""), auth: String(sub?.auth || "") } },
        JSON.stringify(payload),
        { TTL: 600, urgency: "high" }
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      const code = Number((err as any)?.statusCode || 0);
      // 404/410 = اشتراك منتهٍ أو أُلغي من الجوال.
      if (code === 404 || code === 410) {
        try { await base44.asServiceRole.entities.EmployeePushSubscription.update(String(sub?.id || ""), { active: false }); } catch {}
      }
    }
  }
  return { sent, failed, devices: subs.length };
}

async function portalContext(base44: any, body: any) {
  const token = String(body?.token || "");
  const employeeId = String(body?.employee_id || "");
  if (!token || !employeeId) return null;
  const session = await verifyToken(token);
  if (!session.ok || session.employeeId !== employeeId) return null;
  const emp = await base44.asServiceRole.entities.Employee.get(employeeId).catch(() => null);
  if (!emp || emp.status === "terminated" || emp.status === "resigned") return null;
  return { emp, unified: String(emp?.unified_number || "").trim() };
}

function proofMessages(deadlineClock: string) {
  return {
    ar: {
      title: "تنبيه عاجل: إثبات الحضور الآن",
      body: `طلبت الإدارة إثبات وجودك في الدوام الآن — اضغط «أنا موجود الآن» قبل ${deadlineClock}. عدم التأكيد يظهر في تقرير المتابعة فقط ولا يُحتسب غياباً أو خصماً تلقائياً.`,
    },
    en: {
      title: "Urgent: confirm your presence now",
      body: `Management requested an immediate presence check — tap “I’m present now” before ${deadlineClock}. A missed confirmation appears only in the follow-up report; it is not automatic absence or payroll deduction.`,
    },
    hi: {
      title: "तुरंत उपस्थिति सत्यापित करें",
      body: `प्रबंधन ने अभी उपस्थिति सत्यापन मांगा है — ${deadlineClock} से पहले “मैं मौजूद हूँ” दबाएँ। पुष्टि न करने पर केवल अनुवर्ती रिपोर्ट में दिखेगा; यह स्वतः अनुपस्थिति या वेतन कटौती नहीं है।`,
    },
    ne: {
      title: "तुरुन्त उपस्थिति पुष्टि गर्नुहोस्",
      body: `व्यवस्थापनले अहिले उपस्थिति पुष्टि मागेको छ — ${deadlineClock} भन्दा पहिले “म उपस्थित छु” थिच्नुहोस्। पुष्टि नगरेमा केवल अनुगमन रिपोर्टमा देखिन्छ; यो स्वतः अनुपस्थिति वा तलब कटौती होइन।`,
    },
    bn: {
      title: "এখনই উপস্থিতি নিশ্চিত করুন",
      body: `ব্যবস্থাপনা এখনই উপস্থিতি যাচাই চেয়েছে — ${deadlineClock}-এর আগে “আমি উপস্থিত” চাপুন। নিশ্চিত না করলে শুধু ফলো-আপ প্রতিবেদনে দেখাবে; এটি স্বয়ংক্রিয় অনুপস্থিতি বা বেতন কর্তন নয়।`,
    },
    fil: {
      title: "Kumpirmahin ang presensya ngayon",
      body: `Humihingi ang management ng agarang patunay ng presensya — pindutin ang “Narito ako” bago ang ${deadlineClock}. Ang hindi pagkumpirma ay sa follow-up report lamang; hindi ito awtomatikong absence o kaltas sa sahod.`,
    },
    ur: {
      title: "ابھی حاضری کی تصدیق کریں",
      body: `انتظامیہ نے ابھی حاضری کی تصدیق مانگی ہے — ${deadlineClock} سے پہلے ”میں موجود ہوں“ دبائیں۔ تصدیق نہ کرنے پر صرف فالو اپ رپورٹ میں ظاہر ہوگا؛ یہ خودکار غیر حاضری یا تنخواہ کٹوتی نہیں ہے۔`,
    },
  };
}

async function expireOverdue(base44: any, unified: string, nowMs: number) {
  const rows = asList(
    await base44.asServiceRole.entities.PresenceProofRequest.filter({ unified_number: unified }, "-requested_at", 100).catch(() => [])
  );
  for (const row of rows || []) {
    if (String(row?.status || "") === "active" && Number(row?.deadline_at || 0) <= nowMs) {
      try {
        await base44.asServiceRole.entities.PresenceProofRequest.update(row.id, { status: "expired" });
        row.status = "expired";
      } catch {}
    }
  }
  return rows || [];
}

function summarize(row: any) {
  const targetIds = parseJsonArray(row?.target_ids);
  const confirmedIds = parseJsonArray(row?.confirmed_ids);
  let log: any[] = [];
  try {
    const parsed = JSON.parse(String(row?.confirmed_log || "[]"));
    if (Array.isArray(parsed)) log = parsed;
  } catch {}
  const confirmedAt: Record<string, number> = {};
  for (const item of log) {
    const id = String(item?.employee_id || "").trim();
    const at = Number(item?.confirmed_at || 0);
    if (id && at > 0 && !confirmedAt[id]) confirmedAt[id] = at;
  }
  return { targetIds, confirmedIds, confirmedAt };
}

async function hydrate(base44: any, row: any) {
  const { targetIds, confirmedAt } = summarize(row);
  const employees = asList(
    await base44.asServiceRole.entities.Employee.filter({ unified_number: row.unified_number }, "-created_date", 5000).catch(() => [])
  );
  const branches = asList(
    await base44.asServiceRole.entities.Branch.filter({ unified_number: row.unified_number }, "-created_date", 500).catch(() => [])
  );
  const employeeById = new Map((employees || []).map((e: any) => [String(e?.id || ""), e]));
  const branchById = new Map((branches || []).map((b: any) => [String(b?.id || ""), b]));
  const targets = targetIds.map((id) => {
    const emp = employeeById.get(id) || {};
    const branch = emp?.branch_id ? branchById.get(String(emp.branch_id)) : null;
    return {
      employee_id: id,
      full_name: String(emp?.full_name || ""),
      employee_number: String(emp?.employee_number || ""),
      branch_name: String(branch?.name || emp?.branch_name || ""),
      confirmed: id in confirmedAt,
      confirmed_at: confirmedAt[id] || 0,
    };
  });
  const pending = targets.filter((t) => !t.confirmed);
  return {
    id: row.id,
    unified_number: row.unified_number,
    status: row.status,
    scope: row.scope || "on_shift",
    requested_by_name: row.requested_by_name || "",
    requested_at: Number(row.requested_at) || 0,
    deadline_at: Number(row.deadline_at) || 0,
    target_count: targetIds.length,
    confirmed_count: targets.filter((t) => t.confirmed).length,
    pending_count: pending.length,
    targets,
    pending,
    payroll_effect: "none",
    push_status: String(row?.push_status || ""),
    push_sent_count: Number(row?.push_sent_count || 0),
    push_failed_count: Number(row?.push_failed_count || 0),
    push_skipped_count: Number(row?.push_skipped_count || 0),
    };
}

// الموظفون الموجودون فعلياً في الدوام الآن داخل المنشأة — نفس منطق إصدار الطلب.
// يُستخدم لإصدار الطلب وللدفع التجريبي حتى يستهدف الحاضرين في هذه اللحظة لا آخر طلب فقط.
async function collectOnShift(base44: any, unified: string, org: any) {
  const now = riyadhNow(new Date());
  const workDays = parseWorkDays(org?.work_days);
  const orgStart = String(org?.work_start_time || "08:00");
  const orgEnd = String(org?.work_end_time || "17:00");
  const branches = asList(
    await base44.asServiceRole.entities.Branch.filter({ unified_number: unified }, "-created_date", 500).catch(() => [])
  );
  const branchById = new Map((branches || []).map((b: any) => [String(b?.id || ""), b]));
  const employees = asList(
    await base44.asServiceRole.entities.Employee.filter(
      { unified_number: unified, status: "active" }, "-created_date", 5000
    ).catch(() => [])
  );
  const ids = (employees || []).map((e: any) => String(e?.id || "")).filter(Boolean);
  // إغلاق السجلات المفتوحة المنسية أولاً حتى لا تُحتسب أياماً مفتوحة ولا تُستهدف الأشباح.
  try {
    await closeStaleOpenAttendance(base44, { org, employees, branches, nowMs: Date.now() });
  } catch {}
  const attendanceByEmployee: Record<string, any> = {};
  if (ids.length) {
    try {
      const att = asList(
        await base44.asServiceRole.entities.Attendance.filter({ employee_id: { $in: ids } }, "-date", 5000)
      );
      for (const row of att || []) {
        const key = String(row?.employee_id || "");
        if (key && String(row?.date || "") === now.date && !attendanceByEmployee[key]) attendanceByEmployee[key] = row;
      }
    } catch {}
  }
  const targets = (employees || []).filter((emp: any) => {
    const id = String(emp?.id || "");
    if (!id) return false;
    if (!workDays.includes(now.weekday)) return false;
    const branch = emp?.branch_id ? branchById.get(String(emp.branch_id)) : null;
    const schedule = resolveBranchSchedule(org || {}, branch || {});
    const start = schedule.work_start_time || orgStart;
    const end = schedule.work_end_time || orgEnd;
    if (!inShift(start, end, now.minutes)) return false;
    const status = String(attendanceByEmployee[id]?.status || "");
    if (status === "leave" || status === "holiday" || status === "absent") return false;
    return true;
  });
  return { now, employees, targets };
}

export default async function (req) {
  let body: any = {};
  try {
    const base44 = createClientFromRequest(req);
    body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    if (!action) return Response.json({ ok: false, error: "missing" }, { status: 400 });

    // التأكيد من بوابة الموظف يتطلب جلسة البوابة نفسها.
    if (action === "mine" || action === "confirm") {
      const ctx = await portalContext(base44, body);
      if (!ctx) return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
      if (!ctx.unified) return Response.json({ ok: false, error: "no_company" }, { status: 400 });
      const nowMs = Date.now();
      await expireOverdue(base44, ctx.unified, nowMs);
      const rows = asList(
        await base44.asServiceRole.entities.PresenceProofRequest.filter(
          { unified_number: ctx.unified }, "-requested_at", 20
        ).catch(() => [])
      );
      const active = (rows || []).find((r: any) => String(r?.status || "") === "active");
      if (!active) return Response.json({ ok: true, active: null });

      const { targetIds, confirmedAt } = summarize(active);
      const employeeId = String(ctx.emp.id);
      if (!targetIds.includes(employeeId)) return Response.json({ ok: true, active: null });

      const activeView = {
        id: active.id,
        deadline_at: Number(active.deadline_at) || 0,
        remaining_ms: Math.max(0, Number(active.deadline_at || 0) - nowMs),
        confirmed: employeeId in confirmedAt,
        confirmed_at: confirmedAt[employeeId] || 0,
      };
      if (action === "mine") return Response.json({ ok: true, active: activeView });

      if (activeView.confirmed) return Response.json({ ok: true, already: true, active: activeView });
      const confirmedIds = [...new Set([...targetIds.filter((id) => id in confirmedAt), employeeId])];
      let log: any[] = [];
      try {
        const parsed = JSON.parse(String(active.confirmed_log || "[]"));
        if (Array.isArray(parsed)) log = parsed;
      } catch {}
      const nextLog = [...log.filter((x) => String(x?.employee_id || "") !== employeeId), { employee_id: employeeId, confirmed_at: nowMs }];
      await base44.asServiceRole.entities.PresenceProofRequest.update(active.id, {
        confirmed_ids: JSON.stringify(confirmedIds),
        confirmed_log: JSON.stringify(nextLog),
      });
      try {
        await base44.asServiceRole.entities.Notification.updateMany(
          { employee_id: employeeId, type: "presence_proof", is_read: false },
          { $set: { is_read: true } }
        );
      } catch {}
      return Response.json({
        ok: true,
        active: { ...activeView, confirmed: true, confirmed_at: nowMs, remaining_ms: Math.max(0, Number(active.deadline_at || 0) - Date.now()) },
      });
    }

    // الإغلاق التلقائي للمنسي: يقبله مسؤول الشركة لنطاق المنشأة، أو الموظف
    // لجلسة بوابته لنفسه فقط — يُستدعى عند فتح جداول الحضور وبوابة الموظف.
    if (action === "auto_close") {
      const pctx = await portalContext(base44, body);
      let acUnified = "";
      let acEmpIds: string[] = [];
      if (pctx) {
        acUnified = pctx.unified;
        acEmpIds = [String(pctx.emp.id)];
      } else {
        let user: any = null;
        try { user = await base44.auth.me(); } catch { user = null; }
        if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        if (user.role !== "admin") return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        const tenant = await resolveTenantForUser(base44, user);
        acUnified = String(tenant?.unified_number || "").trim();
        if (!acUnified) return Response.json({ ok: false, error: "no_company" }, { status: 400 });
      }
      const acOrgs = asList(
        await base44.asServiceRole.entities.Organization.filter({ unified_number: acUnified }, "-created_date", 5).catch(() => [])
      );
      const acOrg = acOrgs?.[0] || {};
      const acEmps = pctx
        ? [pctx.emp]
        : asList(
          await base44.asServiceRole.entities.Employee.filter(
            { unified_number: acUnified, status: "active" }, "-created_date", 5000
          ).catch(() => [])
        );
      const acBranches = asList(
        await base44.asServiceRole.entities.Branch.filter({ unified_number: acUnified }, "-created_date", 500).catch(() => [])
      );
      const closed = await closeStaleOpenAttendance(base44, {
        org: acOrg,
        employees: acEmps,
        branches: acBranches,
        employeeIds: acEmpIds.length ? acEmpIds : undefined,
        nowMs: Date.now(),
      }).catch(() => 0);
      return Response.json({ ok: true, closed });
    }

    // الإصدار والمتابعة للإدارة فقط: مسؤول الشركة، أو موظف مفوّض على الحضور/الإعدادات.
    let unified = "";
    let issuerUserId = "";
    let issuerEmployeeId = "";
    let issuerName = "";
    const portal = await portalContext(base44, body);
    if (portal) {
      const perms = parsePermissions(portal.emp?.permissions);
      if (!perms.includes("attendance") && !perms.includes("settings")) {
        return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
      unified = portal.unified;
      issuerEmployeeId = String(portal.emp.id || "");
      issuerName = String(portal.emp.full_name || "");
    } else {
      let user: any = null;
      try { user = await base44.auth.me(); } catch { user = null; }
      if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      if (user.role !== "admin") return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      const tenant = await resolveTenantForUser(base44, user);
      unified = String(tenant?.unified_number || "").trim();
      if (!unified) return Response.json({ ok: false, error: "no_company" }, { status: 400 });
      issuerUserId = String(user.id || "");
      issuerName = String(user.full_name || user.email || "");
    }
    if (!unified) return Response.json({ ok: false, error: "no_company" }, { status: 400 });

    // مفاتيح دفع الويب العامة للجوال — تُقرأ بعد تسجيل دخول الموظف برقم هويته.
    if (action === "push_key") {
      const ctx = await portalContext(base44, body);
      if (!ctx) return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
      try {
        const vapid = await getVapid(base44);
        return Response.json({ ok: true, public_key: vapid.publicKey });
      } catch {
        return Response.json({ ok: false, error: "vapid_failed" }, { status: 500 });
      }
    }

    // ربط جوال الموظف بسجل هويته: يُحفظ اشتراك الدفع على الموظف نفسه، لا على بريد.
    if (action === "push_subscribe") {
      const ctx = await portalContext(base44, body);
      if (!ctx) return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
      const sub = body?.subscription || {};
      const endpoint = String(sub?.endpoint || "").trim();
      const p256dh = String(sub?.keys?.p256dh || "").trim();
      const auth = String(sub?.keys?.auth || "").trim();
      if (!endpoint || !p256dh || !auth) {
        return Response.json({ ok: false, error: "invalid_subscription" }, { status: 400 });
      }
      const existing = asList(
        await base44.asServiceRole.entities.EmployeePushSubscription.filter({ endpoint }, undefined, 5).catch(() => [])
      );
      const data = {
        unified_number: ctx.unified,
        employee_id: String(ctx.emp.id),
        endpoint,
        p256dh,
        auth,
        user_agent: String(body?.user_agent || "").slice(0, 300),
        active: true,
        subscribed_at: Date.now(),
      };
      if (existing?.[0]) {
        await base44.asServiceRole.entities.EmployeePushSubscription.update(String(existing[0].id), data);
      } else {
        await base44.asServiceRole.entities.EmployeePushSubscription.create(data);
      }
      return Response.json({ ok: true });
    }

    if (action === "push_unsubscribe") {
      const ctx = await portalContext(base44, body);
      if (!ctx) return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
      const endpoint = String(body?.endpoint || "").trim();
      if (!endpoint) return Response.json({ ok: true });
      const rows = asList(
        await base44.asServiceRole.entities.EmployeePushSubscription.filter({ endpoint }, undefined, 5).catch(() => [])
      );
      for (const row of rows || []) {
        try { await base44.asServiceRole.entities.EmployeePushSubscription.update(String(row.id), { active: false }); } catch {}
      }
      return Response.json({ ok: true });
    }

    // ربط حساب التطبيق (Play/Apple) بسجل الموظف تلقائياً: الموظف المسجّل دخوله
    // في التطبيق ويفتح بوابة الموظف برقم هويته على نفس الجوال يُربط حسابه،
    // فيصله تنبيه التطبيق الأصلي — بلا بريد ولا إدخال يدوي. الربط لمرة واحدة فقط.
    if (action === "link_app_user") {
      const ctx = await portalContext(base44, body);
      if (!ctx) return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
      const appUserId = String(body?.app_user_id || "").trim();
      if (!appUserId) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      if (String((ctx.emp as any)?.user_id || "").trim()) {
        return Response.json({ ok: true, linked: false, reason: "already" });
      }
      let appUser: any = null;
      try { appUser = await base44.asServiceRole.entities.User.get(appUserId); } catch { appUser = null; }
      if (!appUser) return Response.json({ ok: false, error: "no_user" }, { status: 404 });
      const empEmail = String((ctx.emp as any)?.email || "").trim().toLowerCase();
      const userEmail = String((appUser as any)?.email || "").trim().toLowerCase();
      // أمان الربط: إن كان للسجل وللحساب بريدان مختلفان نرفض — دفع التنبيه لجهاز
      // شخص آخر تسريب. من لا بريد له (الدخول بالهوية) يُربط مباشرة.
      if (empEmail && userEmail && empEmail !== userEmail) {
        return Response.json({ ok: false, error: "email_mismatch" }, { status: 403 });
      }
      try {
        await base44.asServiceRole.entities.Employee.update(String(ctx.emp.id), { user_id: appUserId });
        return Response.json({ ok: true, linked: true });
      } catch {
        return Response.json({ ok: false, error: "save_failed" }, { status: 500 });
      }
    }

    // دفع تجريبي للإدارة فقط: يستهدف الموظفين الحاضرين في الدوام الآن داخل المنشأة
    // (نفس منطق إصدار الطلب)، ويُظهر بالاسم من وصلته الدفعة ومن لا يملك حساب تطبيق مرتبط.
    if (action === "test_push") {
      const wantedId = String(body?.employee_id || "").trim();
      const orgs = asList(
        await base44.asServiceRole.entities.Organization.filter({ unified_number: unified }, "-created_date", 5).catch(() => [])
      );
      const org = orgs?.[0] || null;
      const rows = asList(
        await base44.asServiceRole.entities.PresenceProofRequest.filter({ unified_number: unified }, "-requested_at", 5).catch(() => [])
      );
      const latest = rows?.[0] || null;
      const { now, employees, targets: onShift } = await collectOnShift(base44, unified, org);
      const byId = new Map((employees || []).map((e: any) => [String(e?.id || ""), e]));
      let ids: string[] = [];
      let source = "on_shift";
      if (wantedId) {
        ids = [wantedId];
        source = "employee";
      } else if (onShift.length) {
        ids = onShift.map((e: any) => String(e?.id || "")).filter(Boolean);
      } else {
        ids = parseJsonArray(latest?.target_ids);
        source = ids.length ? "last_request" : "none";
      }
      if (!ids.length) {
        return Response.json({ ok: false, error: "no_targets", date: now.date, clock: now.clock }, { status: 400 });
      }
      const test = {
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        first_error: "",
        source,
        date: now.date,
        clock: now.clock,
        total: ids.length,
        web_sent: 0,
        web_failed: 0,
        web_devices: 0,
        with_phone: ids.filter((id: string) => String((byId.get(String(id)) as any)?.phone || "").trim()).length,
        details: [] as any[],
      };
      for (const id of ids) {
        const emp = byId.get(String(id || ""));
        if (!emp) {
          test.skipped += 1;
          test.details.push({ employee_id: id, name: "", status: "missing", app: false });
          continue;
        }
        const name = String((emp as any)?.full_name || (emp as any)?.employee_number || "");
        let userId = String((emp as any)?.user_id || "").trim();
        if (!userId) {
          const key = String((emp as any)?.email || "").trim().toLowerCase();
          if (key) {
            try {
              const users = asList(await base44.asServiceRole.entities.User.filter({ email: key }, undefined, 5));
              const hit = (users || []).find((u: any) => String(u?.email || "").trim().toLowerCase() === key);
              userId = String(hit?.id || "");
            } catch {}
          }
          if (userId) {
            try { await base44.asServiceRole.entities.Employee.update(String(emp.id || ""), { user_id: userId }); } catch {}
          }
        }
        const web = await sendWebPush(base44, id, {
          title: "\uD83D\uDD14 دفع تجريبي — إثبات الحضور",
          body: "إشعار تجريبي من الإدارة للتأكد من وصول التنبيه والجوال مقفل. اضغطه لفتح البوابة.",
          url: "/portal",
          tag: "presence-proof-test",
        });
        test.web_sent += web.sent;
        test.web_failed += web.failed;
        test.web_devices = Number(test.web_devices || 0) + Number((web as any)?.devices || 0);
        // تمييز من لم يفعّل أبداً (بلا اشتراك) ممن انتهى اشتراكه (كان مفعّلاً وتعطّل) —
        // الثاني تكفيه إعادة فتح البوابة على جواله لتجديد الاشتراك تلقائياً.
        const webStatus = web.sent > 0 ? "web" : (Number((web as any)?.devices || 0) > 0 ? "expired" : "no_account");
        if (!userId) {
          test.skipped += 1;
          test.details.push({ employee_id: id, name, status: webStatus, app: false });
          continue;
        }
        test.attempted += 1;
        try {
          await base44.asServiceRole.integrations.Core.SendPushNotification({
            user_id: userId,
            title: "🔔 دفع تجريبي — إثبات الحضور",
            content: "هذا إشعار تجريبي من الإدارة للتأكد من وصول التنبيه وشاشة الجوال مغلقة. اضغطه لفتح التطبيق.",
            action_label: "افتح التطبيق الآن",
            action_url: "/portal",
          });
          test.sent += 1;
          test.details.push({ employee_id: id, name, status: "sent", app: true });
        } catch (err) {
          test.failed += 1;
          let message = "send_failed";
          try { message = String(err?.message || err?.code || "send_failed").slice(0, 160); } catch {}
          if (!test.first_error) test.first_error = message;
          test.details.push({ employee_id: id, name, status: "failed", error: message, app: true });
        }
      }
      return Response.json({ ok: true, test });
    }

    if (action === "request") {
      const orgs = asList(
        await base44.asServiceRole.entities.Organization.filter({ unified_number: unified }, "-created_date", 5).catch(() => [])
      );
      const org = orgs?.[0] || null;
      if (org && org.presence_proof_enabled === false) {
        return Response.json({ ok: false, error: "proof_disabled" }, { status: 403 });
      }

      const nowMs = Date.now();
      const rows = await expireOverdue(base44, unified, nowMs);
      const active = (rows || []).find((r: any) => String(r?.status || "") === "active");
      if (active) {
        return Response.json({ ok: false, error: "active_exists", request: await hydrate(base44, active) }, { status: 409 });
      }

      const { now, employees, targets: onShift } = await collectOnShift(base44, unified, org);

      let issuerEmpId = issuerEmployeeId;
      if (!issuerEmpId) {
        try {
          const byUser = (employees || []).find((e: any) => issuerUserId && String(e?.user_id || "") === issuerUserId);
          const authedEmail = String((await base44.auth.me().catch(() => null))?.email || "").trim().toLowerCase();
          const byEmail = authedEmail
            ? (employees || []).find((e: any) => String(e?.email || "").trim().toLowerCase() === authedEmail)
            : null;
          issuerEmpId = String(byUser?.id || byEmail?.id || "");
        } catch {}
      }

      // من أصدر الطلب لا يُستهدف هو نفسه.
      const targets = (onShift || []).filter((emp: any) => !(issuerEmpId && String(emp?.id || "") === issuerEmpId));
      if (!targets.length) {
        return Response.json({ ok: false, error: "no_targets", date: now.date, clock: now.clock }, { status: 400 });
      }

      const targetIds = targets.map((e: any) => String(e.id));
      const deadlineMs = nowMs + PROOF_MS;
      const deadlineClock = riyadhNow(new Date(deadlineMs)).clock;
      const messages = proofMessages(deadlineClock);
      const i18n: Record<string, { title: string; body: string }> = {};
      for (const lang of LANGS) i18n[lang] = messages[lang];

      const created = await base44.asServiceRole.entities.PresenceProofRequest.create({
        unified_number: unified,
        status: "active",
        scope: "on_shift",
        requested_by_user_id: issuerUserId,
        requested_by_employee_id: issuerEmployeeId || issuerEmpId,
        requested_by_name: issuerName,
        requested_at: nowMs,
        deadline_at: deadlineMs,
        target_ids: JSON.stringify(targetIds),
        target_count: targetIds.length,
        confirmed_ids: JSON.stringify([]),
        confirmed_log: JSON.stringify([]),
      });

      // ربط احتياطي لحساب التطبيق عند توفر بريد العمل المطابق فقط.
      // الاستهداف نفسه يبقى بسجل هوية الموظف داخل نفس المنشأة، ولا يُستخدم البريد للتعريف.
      const findAppUserId = async (email: string) => {
        const key = String(email || "").trim().toLowerCase();
        if (!key) return "";
        try {
          const rows = asList(await base44.asServiceRole.entities.User.filter({ email: key }, undefined, 5));
          const hit = (rows || []).find((u: any) => String(u?.email || "").trim().toLowerCase() === key);
          return String(hit?.id || "");
        } catch {
          return "";
        }
      };
      for (const emp of targets) {
        if (String(emp?.user_id || "").trim()) continue;
        const appUserId = await findAppUserId(emp?.email);
        if (!appUserId) continue;
        try {
          await base44.asServiceRole.entities.Employee.update(String(emp.id || ""), { user_id: appUserId });
          emp.user_id = appUserId;
        } catch {}
      }

      const notifications = targets.map((emp: any) => ({
        title: messages.ar.title,
        body: messages.ar.body,
        type: "presence_proof",
        employee_id: String(emp.id || ""),
        user_id: emp.user_id || "",
        unified_number: unified,
        i18n: JSON.stringify(i18n),
        link: "/portal",
        is_read: false,
      }));
      try {
        if (notifications.length) await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
      } catch {
        for (const item of notifications) {
          try { await base44.asServiceRole.entities.Notification.create(item); } catch {}
        }
      }

      // تنبيه الجوال الأصلي للمستهدفين فقط — لا يؤثر في الحضور أو الرواتب.
      // يصل للتطبيق المغلق عبر إشعار النظام بشرط: نسخة المتجر المحدّثة، وربط الحساب بالهوية،
      // وتفعيل الإشعارات مع الصوت وإيقاف الكتم/عدم الإزعاج. واجهة الدفع لا توفر بارامتر
      // صورة أو صوت مخصص — الأيقونة والصوت من نسخة المتجر نفسها، والنص هنا عربي مباشر.
      const pushTitle = "\uD83D\uDEA8 إثبات الحضور الآن".slice(0, 100);
      const pushBody = `الإدارة تطلب إثبات وجودك في الدوام الآن — افتح التطبيق واضغط «أنا موجود الآن» قبل ${deadlineClock}. عدم التأكيد يظهر في تقرير المتابعة فقط.`.slice(0, 500);
      const push = {
        attempted: targetIds.length,
        sent: 0,
        failed: 0,
        skipped: 0,
        status: "skipped_no_user",
        first_error: "",
        web_sent: 0,
        web_failed: 0,
      };
      for (const emp of targets) {
        const userId = String(emp?.user_id || "").trim();
        // إشعار الجوال بلا حساب تطبيق: يصل عبر اشتراك دفع الويب المسجّل باسم الموظف نفسه.
        const web = await sendWebPush(base44, String(emp?.id || ""), {
          title: pushTitle,
          body: pushBody,
          url: "/portal",
          tag: `presence-proof-${String(created?.id || "")}`,
        });
        push.web_sent += web.sent;
        push.web_failed += web.failed;
        if (!userId) {
          push.skipped += 1;
          continue;
        }
        try {
          await base44.asServiceRole.integrations.Core.SendPushNotification({
            user_id: userId,
            title: pushTitle,
            content: pushBody,
            action_label: "افتح التطبيق الآن",
            action_url: "/portal",
          });
          push.sent += 1;
        } catch (err) {
          push.failed += 1;
          if (!push.first_error) {
            try { push.first_error = String(err?.message || err?.code || "send_failed").slice(0, 160); } catch {}
          }
        }
      }
      const delivered = push.sent + push.web_sent;
      const undelivered = push.failed + push.web_failed;
      if (delivered > 0 && undelivered === 0) push.status = "sent";
      else if (delivered > 0) push.status = "partial";
      else if (undelivered > 0) push.status = "failed";
      // تنبيه التطبيق فقط — دون أي اتصال صوتي.
      // يُرسل للحساب المرتبط بهوية الموظف في نفس المنشأة فقط.
      try {
        await base44.asServiceRole.entities.PresenceProofRequest.update(created.id, {
          push_status: push.status,
          push_sent_count: push.sent + push.web_sent,
          push_failed_count: push.failed + push.web_failed,
          push_skipped_count: push.skipped,
          push_web_count: push.web_sent,
          push_web_failed_count: push.web_failed,
        });
        created.push_status = push.status;
        created.push_sent_count = push.sent + push.web_sent;
        created.push_failed_count = push.failed + push.web_failed;
        created.push_skipped_count = push.skipped;
        created.push_web_count = push.web_sent;
      } catch {}
      return Response.json({ ok: true, request: await hydrate(base44, created), push });
    }

    if (action === "status") {
      const nowMs = Date.now();
      const rows = await expireOverdue(base44, unified, nowMs);
      const sorted = [...(rows || [])].sort((a: any, b: any) => Number(b?.requested_at || 0) - Number(a?.requested_at || 0));
      const current = sorted.find((r: any) => String(r?.status || "") === "active") || sorted[0] || null;
      if (!current) return Response.json({ ok: true, request: null });
      return Response.json({ ok: true, request: await hydrate(base44, current) });
    }

    return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (error) {
    console.error("presenceProof failed", { action: String(body?.action || "") });
    return Response.json({ ok: false, error: error?.message || "server_error", action: String(body?.action || "") }, { status: 500 });
  }
}
