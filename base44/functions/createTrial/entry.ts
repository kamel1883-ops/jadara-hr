import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { verifyTurnstile, createRateLimiter } from "../../shared/turnstile.ts";

// تقييد المعدّل لمنع الإنشاء الآلي المكثّف لطلبات التجربة (يُضاف لإغلاق ثغرة الإساءة عند تعطيل الكابتشا)
const RL = createRateLimiter(10 * 60 * 1000, 5); // 5 طلبات / 10 دقائق لكل IP
import { tierForCount } from "../../shared/pricing.ts";
import { signProof } from "../../shared/contractProof.ts";
import { wrapEmailContent } from "../../shared/emailFooter.ts";
import { escapeHtml } from "../../shared/escapeHtml.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const SUPPORT_WA = '+966 59 470 0782';
    const SUPPORT_EMAIL = 'info@jadara-hr.com';
    const SUPPORT_CONTACT = '\n\nلأي مساعدة، تواصل مع الدعم الفني لتفعيل حسابك عبر واتساب: ' + SUPPORT_WA + ' أو البريد: ' + SUPPORT_EMAIL;

    // تقييد المعدّل قبل أي معالجة لمنع الإغراق الآلي
    if (RL.rateLimited(RL.clientIp(req)))
      return Response.json({ error: 'طلبات كثيرة، يرجى المحاولة لاحقاً' }, { status: 429 });

    const name = String(body.name || '').trim();
    const email = String(body.contact_email || '').trim();
    const phone = String(body.contact_phone || '').trim();
    const unified = String(body.unified_number || '').trim();
    const employeeCount = Number(body.employee_count);
    if (!name) return Response.json({ error: 'اسم المنشأة مطلوب' }, { status: 400 });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return Response.json({ error: 'بريد جهة اتصال صحيح مطلوب' }, { status: 400 });
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits) return Response.json({ error: 'رقم الهاتف مطلوب' }, { status: 400 });
    // إلزام رقم جوال من 10 أرقام على الأقل — لا يُقبَل الطلب ولا يُرسَل بريد إن كان الرقم ناقصاً
    if (phoneDigits.length < 10) return Response.json({ error: 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل' }, { status: 400 });
    if (!unified || !/^7\d{9}$/.test(unified))
      return Response.json({ error: 'الرقم الوطني الموحد للمنشآت مطلوب (10 خانات تبدأ بـ7)' }, { status: 400 });
    if (!Number.isFinite(employeeCount) || employeeCount <= 0)
      return Response.json({ error: 'عدد الموظفين المتوقع مطلوب' }, { status: 400 });
    if (!String(body.commercial_register_doc_url || '').trim())
      return Response.json({ error: 'إرفاق صورة من السجل التجاري إلزامي للتحقق من ملكية الرقم الموحّد' }, { status: 400 });

    // التحقق البشري (Cloudflare Turnstile) — يمنع الإساءة الآلية لبوابة التسجيل العامة
    const captchaToken = String(body.captcha_token || '');
    if (!captchaToken) return Response.json({ error: 'التحقق البشري مطلوب' }, { status: 400 });
    if (!(await verifyTurnstile(captchaToken))) return Response.json({ error: 'فشل التحقق البشري' }, { status: 403 });

    // ——— فحص فريد للرقم الموحّد: لا يمكن لشركتين أن تتشاركا نفس الرقم الوطني الموحّد
    // داخل جداره. الرقم الموحّد هو المفتاح الدائم لربط بيانات المنشأة (حتى لو فقد البريد
    // تُستعاد بيانات الدخول بموجبه). لذا نمنع تسجيل تجربة/عرض سعر برقم موحّد مُستخدم مسبقاً
    // تفادياً لاندماج بيانات شركتين أو اطلاع شركة على بيانات الأخرى.
    {
      const taken = await base44.asServiceRole.entities.Tenant.filter(
        { unified_number: unified }, undefined, 5
      );
      if (taken && taken.length) {
        const mine = taken.find(
          (tt) => String(tt.contact_email || '').trim().toLowerCase() === email.toLowerCase()
        );
        return Response.json({
          error: mine
            ? 'بيانات منشأتك مسجّلة وعليها اشتراك/تجربة على منصة جداره بهذا الرقم الموحّد — لم يُنشأ حساب جديد. سجّل الدخول أو استعد كلمة المرور من بوابة الشركة بدلاً من إنشاء طلب جديد.' + SUPPORT_CONTACT
            : 'هذا الرقم الموحّد مسجّل وعليه اشتراك على منصة جداره لمنشأة أخرى — لا يمكن لشركتين أن تتشاركا نفس الرقم الموحّد، ولم يُنشأ حساب جديد. تحقق من الرقم أو تواصل مع الدعم الفني لتفعيل حسابك.' + SUPPORT_CONTACT,
        }, { status: 409 });
      }
    }

    // —— كود الخصم (اختياري)
    let discount_percent = 0;
    let discount_code = '';
    const rawCode = String(body.discount_code || '').trim();
    if (rawCode) {
      const normalized = rawCode.toLowerCase();
      // مطابقة غير حسّاسة لحالة الأحرف — الأكواد تُخزَّن عادةً بحروف كبيرة (مثل JADARA-HR-96)
      const found = await base44.asServiceRole.entities.DiscountCode.filter({ status: 'active' }, undefined, 200);
      const code = (found || []).find((c) => String(c.code || '').trim().toLowerCase() === normalized);
      if (!code) return Response.json({ error: 'كود الخصم غير صالح' }, { status: 400 });
      if (code.max_uses && (Number(code.used_count) || 0) >= code.max_uses)
        return Response.json({ error: 'كود الخصم مستهلك بالكامل' }, { status: 400 });
      discount_percent = Number(code.discount_percent) || 0;
      if (discount_percent < 0 || discount_percent > 100) discount_percent = 0;
      discount_code = code.code;
      await base44.asServiceRole.entities.DiscountCode.update(code.id, {
        used_count: (Number(code.used_count) || 0) + 1,
      });
    }

    // —— السعر يُحتسب تلقائياً حسب شريحة عدد الموظفين
    const tier = tierForCount(employeeCount);
    const basePrice = tier ? tier.yearly : 0;
    const pricingTier = tier ? tier.tier : '';
    const quoted_amount = Math.round(basePrice * (1 - discount_percent / 100));

    // —— نسبة الإحالة لبرنامج شركاء جداره (اختيارية وصارمة):
    // تُسجَّل فقط إذا وصل العميل عبر رابط شريك (?ref=CODE) ويطابق الرمز شريكاً «مُعتمداً» (active).
    // أي رمز غير موجود أو غير مُعتمد أو غير مُرسَل = لا نسبة إحالة إطلاقاً (يظهر العميل كعميل مباشر لجداره).
    let referral_code = "";
    let referral_affiliate_id = "";
    let referral_affiliate_name = "";
    const rawRef = String(body.referral_code || "").trim().toUpperCase().slice(0, 24);
    if (rawRef && /^[A-Z0-9-]{4,24}$/.test(rawRef)) {
      const affs = await base44.asServiceRole.entities.Affiliate.filter({ ref_code: rawRef }, undefined, 2);
      const aff = (affs || []).find((a: any) => a.status === "active");
      if (aff) {
        referral_code = rawRef;
        referral_affiliate_id = String(aff.id);
        referral_affiliate_name = String(aff.full_name || "");
      }
    }

    const today = new Date();
    const trialEnd = new Date(today);
    trialEnd.setDate(today.getDate() + 30);
    // رقم عرض سعر دائم يُحفظ مع المنشأة — يُستخدم في صفحة العميل وبوابة المالك لإنتاج نفس النسخة.
    const stamp = today.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(100 + Math.random() * 900);
    const contract_quote_no = `JQ${stamp}${rand}`;

    const tenant = await base44.asServiceRole.entities.Tenant.create({
      name,
      commercial_register: String(body.commercial_register || '').trim(),
      commercial_register_doc_url: String(body.commercial_register_doc_url || '').trim(),
      commercial_register_verified: true,
      vat_number: String(body.vat_number || '').trim(),
      industry: String(body.industry || '').trim(),
      contact_name: String(body.contact_name || '').trim(),
      contact_email: email,
      contact_phone: phone,
      unified_number: unified,
      city: String(body.city || '').trim(),
      country: String(body.country || 'السعودية').trim(),
      plan: 'trial',
      // الآلية الجديدة: طلبات عرض السعر تصبح تجربة مرئية للمالك (status=trial) وتميّز بـ lead_source=quote،
      // ولا تُحجب — ينتظر المالك وصول إيصال التحويل عبر واتساب ثم يؤكد الاشتراك من البوابة.
      status: 'trial',
      trial_start: today.toISOString().slice(0, 10),
      trial_end: trialEnd.toISOString().slice(0, 10),
      discount_code,
      discount_percent,
      quoted_amount,
      employee_count: employeeCount,
      pricing_tier: pricingTier,
      lead_source: String(body.lead_source || 'trial').trim() === 'quote' ? 'quote' : 'trial',
      contract_quote_no,
      referral_code: referral_code || null,
      referral_affiliate_id: referral_affiliate_id || null,
      referral_affiliate_name: referral_affiliate_name || null,
      notes: String(body.notes || '').trim(),
    });

    const officialEmail = 'info@jadara-hr.com';
    const isQuote = String(body.lead_source || 'trial').trim() === 'quote';
    // في الآلية الجديدة: طلبات عرض السعر (quote) تأخذ حالة تجربة مرئية للمالك وتبقى مميّزة بـ lead_source=quote،
    // فينتظر المالك وصول إيصال التحويل عبر واتساب ثم يؤكد الاشتراك من بوابة المالك.
    // نُعلِم المالك دائماً بكلا النوعين (تجربة مباشرة أو طلب عرض سعر) ليستقبل إيصال العميل ويتواصل معه.
    try {
      const esc = (v) => escapeHtml(v || '-');
      let emailBody =
        (isQuote
          ? 'عميل جديد طلب عرض سعر عبر الموقع:\n\n'
          : 'عميل جديد سجّل الفترة التجريبية عبر الموقع:\n\n') +
        'المنشأة: ' + escapeHtml(name) + '\n' +
        'القطاع: ' + esc(body.industry) + '\n' +
        'جهة الاتصال: ' + esc(body.contact_name) + '\n' +
        'البريد: ' + escapeHtml(email) + '\n' +
        'الهاتف: ' + escapeHtml(phone) + '\n' +
        'الرقم الوطني الموحّد للمنشآت: ' + escapeHtml(unified) + '\n' +
        'المدينة: ' + esc(body.city) + '\n' +
        'عدد الموظفين: ' + employeeCount + '\n' +
        'الشريحة: ' + escapeHtml(pricingTier) + '\n' +
        'السعر السنوي للباقة: ' + basePrice + ' ر.س\n\n' +
        'تنتهي التجربة في: ' + trialEnd.toISOString().slice(0, 10) + '\n' +
        'السجل التجاري: ' + esc(body.commercial_register) + '\n' +
        'صورة السجل التجاري: ' + escapeHtml(String(body.commercial_register_doc_url || '')) + '\n' +
        'التحقق الآلي من السجل التجاري: مطابق للرقم الموحّد ✓\n' +
        'الرقم الضريبي: ' + esc(body.vat_number) + '\n';
      if (discount_percent > 0) {
        emailBody +=
          'كود الخصم: ' + discount_code + ' — نسبة الخصم: ' + discount_percent + '%\n' +
          'المبلغ المعروض بعد الخصم: ' + quoted_amount + ' ر.س (بدلاً من ' + basePrice + ' ر.س)\n';
      }
      emailBody += '\n' + (isQuote
        ? 'يرجى التواصل مع العميل لإتمام التحويل وتفعيل الاشتراك السنوي.'
        : 'يرجى التواصل مع العميل خلال فترة التجربة لإتمام التحويل للاشتراك السنوي.');
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: officialEmail,
        subject: (isQuote ? 'طلب عرض سعر جديد — ' : 'اشتراك تجريبي جديد — ') + name,
        ...wrapEmailContent(emailBody),
      });
    } catch (_e) {
      // رسالة تسجيل الإنشاء لا يجب أن تفشل كل العملية إذا تعطل البريد
    }

    const contract_proof = await signProof(tenant.id);
    return Response.json({ ok: true, tenant_id: tenant.id, contract_proof, contract_quote_no, discount_percent, quoted_amount, pricing_tier: pricingTier, employee_count: employeeCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}