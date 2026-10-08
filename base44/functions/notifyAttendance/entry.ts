import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyCronSecret } from "../../shared/renewal.ts";
import { wrapEmailContent } from "../../shared/emailFooter.ts";

// يُستدعى تلقائياً عبر workflow عند إنشاء/تعديل سجل حضور بحالة "متأخر" أو "غياب".
// ينشئ إشعاراً موجّهاً للموظف (بكل لغات البوابة) ويرسل بريداً للعنوان المسجل لديه.
// تعمل عبر service-role لتفادي قيود RLS (بدون مستخدم Base44 حقيقي).

const LANGS = ["ar", "en", "hi", "ne", "bn", "fil", "ur"];

// احتساب مدة التأخير بين وقت بداية الدوام (مثلاً "08:00") ووقت الحضور الفعلي (مثلاً "10:46")
// إذا لم يتوفّر وقت الدوام أو وقت الحضور → يُعيد null
function computeLateDuration(workStart: string, checkIn: string): { hours: number; minutes: number } | null {
  if (!workStart || !checkIn) return null;
  const [sh, sm] = workStart.split(":").map(Number);
  const [ch, cm] = checkIn.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(ch) || isNaN(cm)) return null;
  const startMins = sh * 60 + sm;
  const checkMins = ch * 60 + cm;
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

const MESSAGES = {
  late: {
    ar: { title: "تأخّر في الحضور", body: (d: string, t: string, dur: string | null) => `تم تسجيل تأخّر في الحضور بتاريخ ${d}${t ? ` — وقت الحضور: ${t}` : ""}${dur ? ` — مدة التأخير: ${dur}` : ""}.` },
    en: { title: "Late arrival", body: (d: string, t: string, dur: string | null) => `Late check-in recorded on ${d}${t ? ` at ${t}` : ""}${dur ? ` — late by ${dur}` : ""}.` },
    hi: { title: "देरी से आगमन", body: (d: string, t: string, dur: string | null) => `${d} को देर से चेक-इन${t ? ` ${t} पर` : ""}${dur ? ` — ${dur} देरी` : ""}.` },
    ne: { title: "ढिलो आगमन", body: (d: string, t: string, dur: string | null) => `${d} मा ढिलो चेक-इन${t ? ` ${t}` : ""}${dur ? ` — ${dur} ढिलो` : ""}.` },
    bn: { title: "বিলম্বে উপস্থিতি", body: (d: string, t: string, dur: string | null) => `${d} তারিখে বিলম্বে চেক-ইন${t ? ` ${t}` : ""}${dur ? ` — ${dur} বিলম্ব` : ""}.` },
    fil: { title: "Huling pagdating", body: (d: string, t: string, dur: string | null) => `Late check-in noong ${d}${t ? ` ng ${t}` : ""}${dur ? ` — ${dur} huli` : ""}.` },
    ur: { title: "دیر سے آمد", body: (d: string, t: string, dur: string | null) => `${d} کو دیر سے چیک اِن${t ? ` ${t} پر` : ""}${dur ? ` — ${dur} تاخیر` : ""}.` },
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

    // جلب وقت بداية الدوام من إعدادات المنشأة لحساب مدة التأخير
    let workStart = "";
    try {
      // إعدادات منشأة الموظف نفسه فقط (بمطابقة رقمها الموحّد) — لا إعدادات أي منشأة أخرى
      const empUnified = String(emp?.unified_number || "").trim();
      const orgs: any[] = empUnified
        ? await base44.asServiceRole.entities.Organization.filter({ unified_number: empUnified }, "-created_date", 5)
        : [];
      workStart = String(orgs[0]?.work_start_time || "");
    } catch {}

    const lateDur = status === "late" ? computeLateDuration(workStart, checkIn) : null;

    const dict: any = MESSAGES[status];
    const i18n: Record<string, { title: string; body: string }> = {};
    for (const lg of LANGS) {
      const m = dict[lg];
      const durStr = lateDur ? formatDuration(lateDur, lg) : null;
      i18n[lg] = { title: m.title, body: status === "late" ? m.body(dateStr, checkIn, durStr) : m.body(dateStr) };
    }

    // إنشاء الإشعار موجّهاً للموظف — بكل اللغات (تُعرض للموظف بلغته المختارة بالبوابة)
    await base44.asServiceRole.entities.Notification.create({
      title: i18n.ar.title,
      body: i18n.ar.body,
      type: "attendance",
      employee_id: att.employee_id || "",
      user_id: emp?.user_id || "",
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

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}