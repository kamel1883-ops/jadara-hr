import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { wrapEmailContent } from "../../shared/emailFooter.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const new_email = String(body?.new_email || "").trim().toLowerCase();
    const unified_number = String(body?.unified_number || "").trim();
    const client_name = String(body?.client_name || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(new_email)) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!/^7\d{9}$/.test(unified_number)) {
      return Response.json({ error: "Invalid unified number" }, { status: 400 });
    }

    const greeting = client_name ? `مرحباً ${client_name}،` : "مرحباً،";
    const subject = "تم تفعيل بريدكم الجديد في منصة جداره";
    const bodyText =
      greeting + "\n\n" +
      "تم استبدال البريد الإلكتروني المرتبط بمنشأتكم في منصة جداره وإتمام تفعيل بريدكم الجديد:\n" +
      new_email + "\n\n" +
      "لا تزال جميع بيانات منشأتكم محفوظة بالكامل كما هي (الموظفون، الرواتب، الحقوق، المركبات، الطلبات...) ومرتبطة بالرقم الوطني الموحّد للمنشآت الثابت: " +
      unified_number + "\n\n" +
      "خطوات تسجيل الدخول:\n" +
      "1) توجهوا إلى بوابة الشركات في منصة جداره واضغطوا «نسيت كلمة المرور».\n" +
      "2) أدخلوا بريدكم الجديد أعلاه + الرقم الوطني الموحّد للمنشآت (10 خانات تبدأ بـ7).\n" +
      "3) ستصلكم رسالة برابط استعادة كلمة المرور؛ افتحوه وعيّنوا كلمة مرور جديدة.\n" +
      "4) بعد ذلك سجّلوا دخولكم بالإيميل الجديد + الرقم الوطني الموحّد للمنشآت + كلمة المرور الجديدة.\n\n" +
      "ملاحظة: الإيميل هو وسيلة الدخول فقط، أما بيانات منشأتكم فثابتة ومرتبطة بالرقم الوطني الموحّد للمنشآت ولا تتأثر بتغيير البريد.\n\n" +
      "تحياتنا — فريق دعم جداره";

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: new_email,
      subject,
      ...wrapEmailContent(bodyText),
      from_name: "جداره",
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}