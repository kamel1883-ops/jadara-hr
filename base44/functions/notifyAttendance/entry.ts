import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyCronSecret } from "../../shared/renewal.ts";
import { wrapEmailContent } from "../../shared/emailFooter.ts";
import { requiredNetHours, resolveBranchHours } from "../../shared/payrollCompute.ts";

// يُستدعى تلقائياً عبر workflow عند إنشاء/تعديل سجل حضور بحالة "متأخر" أو "غياب".
// ينشئ إشعاراً موجّهاً للموظف (بكل لغات البوابة) ويرسل بريداً للعنوان المسجل لديه.
// تعمل عبر service-role لتفادي قيود RLS (بدون مستخدم Base44 حقيقي).

const LANGS = ["ar", "en", "hi", "ne", "bn", "fil", "ur"];

function toMinutes(hm: string): number | null {
  const m = String(hm || "").match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// مدة النقص بالساعات العشرية → { ساعات، دقائق } لعرضها في الإشعار
function shortfallDuration(shortHours: number): { hours: number; minutes: number } | null {
  const s = Number(shortHours) || 0;
  if (s <= 0) return null;
  const totalMin = Math.round(s * 60);
  return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 };
}

// احتياطي للسجلات القديمة (تأخير وصول بلا انصراف): الفرق بين بداية الدوام والحضور
function computeLateDuration(workStart: string, checkIn: string): { hours: number; minutes: number } | null {
  if (!workStart || !checkIn) return null;
  const startMins = toMinutes(workStart);
  const checkMins = toMinutes(checkIn);
  if (startMins == null || checkMins == null) return null;
  const diff = checkMins - startMins;
  if (diff <= 0) return null;
  return { hours: Math.floor(diff / 60), minutes: diff % 60 };
}

function formatDuration(dur: { hours: number; minutes: number }, lang: string): string {
  const { hours: h, minutes: m } = dur;
  if (lang === "ar") return h > 0 ? `${h} ساعة و${m} دقيقة` : `${m} دقيقة`;
  if (lang === "hi") return h > 0 ? `${h} घंटे ${m} मिनट` : `${m} मिनट`;
  if (lang === "ne") return h > 0 ? `${h} घण्टा ${m} मिनेट` : `${m} मिनेट`;
  if (lang === "bn") return h > 0 ? `${h} ঘণ্টা ${m} মিনিট` : `${m} মিনিট`;
  if (lang === "fil") return h > 0 ? `${h} oras at ${m} minuto` : `${m} minuto`;
  if (lang === "ur") return h > 0 ? `${h} گھنٹے ${m} منٹ` : `${m} منٹ`;
  // en default
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// رسالة التأخير الجديدة: تُبنى على صافي ساعات العمل عند الانصراف (لا على وقت الوصول).
// late(d, actual, req, dur): التاريخ، الصافي المسجل، الصافي المطلوب، مدة النقص.
const MESSAGES = {
  late: {
    ar: { title: "تأخير في الدوام", body: (d: string, actual: string, req: string, dur: string | null) => `تم تسجيل تأخير بتاريخ ${d} — ساعات العمل المسجلة: ${actual} من ${req} المطلوبة${dur ? ` — مدة النقص: ${dur}` : ""}.` },
    en: { title: "Short working day", body: (d: string, actual: string, req: string, dur: string | null) => `Shortfall recorded on ${d} — worked ${actual} of the required ${req} hours${dur ? ` — short by ${dur}` : ""}.` },
    hi: { title: "कार्य दिवस में कमी", body: (d: string, actual: string, req: string, dur: string | null) => `${d} को कमी दर्ज — आवश्यक ${req} में से ${actual} घंटे कार्य${dur ? ` — कमी: ${dur}` : ""}।` },
    ne: { title: "कार्य दिनमा कमी", body: (d: string, actual: string, req: string, dur: string | null) => `${d} मा कमी — आवश्यक ${req} घण्टामध्ये ${actual} घण्टा काम${dur ? ` — कमी: ${dur}` : ""}।` },
    bn: { title: "কর্মদিবসে ঘাটতি", body: (d: string, actual: string, req: string, dur: string | null) => `${d} তারিখে ঘাটতি — প্রয়োজনীয় ${req} ঘণ্টার মধ্যে ${actual} ঘণ্টা কাজ${dur ? ` — ঘাটতি: ${dur}` : ""}।` },
    fil: { title: "Kakulangan sa oras", body: (d: string, actual: string, req: string, dur: string | null) => `Kakulangan naitala noong ${d} — nagtrabaho ng ${actual} sa ${req} kinakailangang oras${dur ? ` — kulang ng ${dur}` : ""}.` },
    ur: { title: "کام کے اوقات میں کمی", body: (d: string, actual: string, req: string, dur: string | null) => `${d} کو کمی ریکارڈ — مطلوبہ ${req} گھنٹوں میں سے ${actual} گھنٹے کام${dur ? ` — کمی: ${dur}` : ""}۔` },
  },
  absent: {
    ar: { title: "غياب عن العمل", body: (d: string) => `تم تسجيل غياب عن العمل بتاريخ ${d}.` },
    en: { title: "Absence", body: (d: string) => `An absence was recorded on ${d}.` },
    hi: { title: "अनुपस्थिति", body: (d: string) => `${d} को अनुपस्थिति दर्ज की गई।` },
    ne: { title: "अनुपस्थिति", body: (d: string) => `${d} मा अनुपस्थिति रेकर्ड भयो।` },
    bn: { title: "অনুপস্থিতি", body: (d: string) => `${d} তারিখে অনুপস্থিতি রেকর্ড করা হয়েছে।` },
    fil: { title: "Kawalan", body: (d: string) => `Naitala ang absence noong ${d}.` },
    ur: { title: "غیر حاضری", body: (d: string) => `${d} کو غیر حاضری درج ہوئی۔` },
  },
};

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!verifyCronSecret(body?.cron_secret)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const attendanceId = String(body.attendance_id || "");
    if (!attendanceId) return Response.json({ ok: false, error: "missing" }, { status: 400 });

    const att: any = await base44.asServiceRole.entities.Attendance.get(attendanceId);
    if (!att) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    const status = String(att.status || "");
    if (status !== "late" && status !== "absent") return Response.json({ ok: true, skipped: true });

    let emp: any = null;
    if (att.employee_id) {
      try { emp = await base44.asServiceRole.entities.Employee.get(att.employee_id); } catch {}
    }

    const dateStr = String(att.date || "");
    const checkIn = String(att.check_in || "");

    // جلب الدوام المعتمد (فرع الانصراف إن كان له دوام خاص، وإلا إعدادات منشأة الموظف نفسه فقط)
    // لحساب الصافي المطلوب (8 ساعات كحد أقصى) ومدة النقص المؤهلة للخصم.
    let schedule = { work_hours_per_day: 0, late_grace_minutes: 0 };
    const empUnified = String(emp?.unified_number || "").trim();
    try {
      const orgs: any[] = empUnified
        ? await base44.asServiceRole.entities.Organization.filter({ unified_number: empUnified }, "-created_date", 5)
        : [];
      const org = orgs?.[0] || {};
      let branch: any = null;
      if (att.branch_id) {
        try { branch = await base44.asServiceRole.entities.Branch.get(att.branch_id); } catch {}
      }
      schedule = resolveBranchHours(org, { branch_id: att.branch_id }, branch ? [branch] : []);
    } catch {}

    const required = requiredNetHours(schedule.work_hours_per_day);
    const graceMinutes = schedule.late_grace_minutes;
    const actual = Number(att.work_hours) || 0;
    const hasCheckout = !!att.check_out && actual > 0;
    // النقص المؤهل للخصم (بعد السماح) — هو ما يُعرض في الإشعار ويُحتسب في الرواتب
    const short = required > 0 && hasCheckout
      ? Math.max(0, Number((required - actual - graceMinutes / 60).toFixed(2)))
      : 0;
    const shortDur = short > 0 ? shortfallDuration(short) : null;
    // احتياطي للسجلات القديمة بلا انصراف: مدة التأخير من وقت الوصول وبداية الدوام
    let legacyWorkStart = "";
    try {
      const orgs: any[] = empUnified
        ? await base44.asServiceRole.entities.Organization.filter({ unified_number: empUnified }, "-created_date", 5)
        : [];
      legacyWorkStart = String(orgs?.[0]?.work_start_time || "");
    } catch {}
    const legacyDur = !hasCheckout && status === "late"
      ? computeLateDuration(legacyWorkStart, checkIn)
      : null;
    const lateDur = shortDur || legacyDur;

    const dict: any = MESSAGES[status];
    const i18n: Record<string, { title: string; body: string }> = {};
    const actualStr = hasCheckout ? String(actual) : "—";
    const reqStr = required > 0 ? String(required) : "—";
    for (const lg of LANGS) {
      const m = dict[lg];
      const durStr = lateDur ? formatDuration(lateDur, lg) : null;
      i18n[lg] = { title: m.title, body: status === "late" ? m.body(dateStr, actualStr, reqStr, durStr) : m.body(dateStr) };
    }

    // إنشاء الإشعار موجّهاً للموظف — بكل اللغات (تُعرض للموظف بلغته المختارة بالبوابة)
    await base44.asServiceRole.entities.Notification.create({
      title: i18n.ar.title,
      body: i18n.ar.body,
      type: "attendance",
      employee_id: att.employee_id || "",
      user_id: emp?.user_id || "",
      unified_number: String(emp?.unified_number || ""),
      i18n: JSON.stringify(i18n),
      is_read: false,
    });

    // إرسال بريد إلكتروني للعنوان المسجد لدى الموظف (عربي + إنجليزي) — دون إحباط الإشعار
    if (emp?.email) {
      const subject = `${i18n.ar.title} — ${i18n.en.title}`;
      const emailBody =
        `${i18n.ar.body}\n\n${i18n.en.body}\n\n— منصة جداره | Jadara HR`;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: emp.email, subject, ...wrapEmailContent(emailBody) });
      } catch {}
    }

    // إشعار بوابة الشركات بالتأخير: يُوجَّه لمسؤول الموارد البشرية للمنشأة نفسها،
    // وإلا للمدير المباشر للموظف — يظهر في جرس البوابة وصفحة الإشعارات (مرحلة الموارد).
    // لا يُنشأ إشعار شركة للغياب (له مساره الخاص) — فقط عند توفر صافي مسجل.
    if (status === "late" && hasCheckout) {
      try {
        let recipient: any = null;
        if (empUnified) {
          const sameOrg: any[] = await base44.asServiceRole.entities.Employee.filter(
            { unified_number: empUnified }, "-created_date", 1000
          );
          recipient = (sameOrg || []).find((e) => e?.is_approver_hr) || null;
          if (!recipient && emp?.manager_id) {
            recipient = (sameOrg || []).find((e) => e?.id === emp.manager_id) || null;
          }
        }
        if (recipient) {
          const durAr = shortDur ? formatDuration(shortDur, "ar") : "—";
          const empName = emp?.full_name || att.employee_name || "—";
          const empNo = emp?.employee_number || "—";
          await base44.asServiceRole.entities.Notification.create({
            title: `تأخير موظف — ${empName}`,
            body: `الموظف ${empName} (${empNo}) سجّل ${actualStr} ساعات عمل بتاريخ ${dateStr} من أصل ${reqStr} ساعات مطلوبة — النقص: ${durAr}. تم إشعار الموظف واحتساب النقص في مسير الرواتب.`,
            type: "attendance_late",
            stage: "hr",
            employee_id: recipient.id || "",
            user_id: recipient.user_id || "",
            unified_number: empUnified,
            is_read: false,
          });
        }
      } catch {}
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}