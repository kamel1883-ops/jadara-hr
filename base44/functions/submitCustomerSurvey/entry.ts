// استبيانات تجربة العميل — يستقبل رد المنشأة ويتحقق من تطابقها مع سجل Tenant نشط.
// محمي بـ Turnstile لمنع الرسائل الآلية.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyTurnstile, createRateLimiter } from "../../shared/turnstile.ts";

const rl = createRateLimiter(10 * 60 * 1000, 6);

export default async function (req) {
  try {
    const ip = rl.clientIp(req);
    if (rl.rateLimited(ip)) return Response.json({ ok: false, retry: true }, { status: 429 });

    let body = {};
    try { body = await req.json(); } catch {}

    const turnstileOk = await verifyTurnstile(String(body.turnstileToken || ''));
    if (!turnstileOk) return Response.json({ ok: false, captcha: false });

    const surveyId = String(body.survey_id || '').trim();
    const unified = String(body.unified_number || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const answers = body.answers;
    const comment = String(body.comment || '').slice(0, 1000);

    if (!surveyId || !email || !unified || !/^7\d{9}$/.test(unified)) {
      return Response.json({ ok: false });
    }
    if (!Array.isArray(answers) || answers.length === 0) return Response.json({ ok: false });

    const base44 = createClientFromRequest(req);

    const survey = await base44.asServiceRole.entities.CustomerSurvey.get(surveyId).catch(() => null);
    if (!survey) return Response.json({ ok: false, not_found: true });
    if (survey.status !== 'active') return Response.json({ ok: false, closed: true });

    const tenants = await base44.asServiceRole.entities.Tenant.filter({ unified_number: unified }, undefined, 50);
    const tenant = (tenants || []).find(
      (tt) => String(tt.contact_email || '').trim().toLowerCase() === email
    );
    if (!tenant) return Response.json({ ok: false });
    if (!['trial', 'active'].includes(tenant.status)) return Response.json({ ok: false, suspended: true });

    let already = await base44.asServiceRole.entities.CustomerSurveyResponse.filter(
      { survey_id: surveyId, tenant_id: tenant.id },
      undefined,
      1
    );
    if (already && already.length) return Response.json({ ok: false, already: true });

    const ratings = answers
      .map((a) => Number(a?.rating))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    const avg = ratings.length
      ? Math.round((ratings.reduce((s, n) => s + n, 0) / ratings.length) * 10) / 10
      : 0;
    let sentiment = 'neutral';
    if (avg >= 4) sentiment = 'positive';
    else if (avg <= 2) sentiment = 'negative';

    const today = new Date().toISOString().slice(0, 10);
    await base44.asServiceRole.entities.CustomerSurveyResponse.create({
      survey_id: surveyId,
      survey_title: survey.title,
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      unified_number: unified,
      contact_email: email,
      submitted_date: today,
      answers: JSON.stringify(answers),
      avg_rating: avg,
      sentiment,
      comment,
    });

    try {
      await base44.asServiceRole.entities.CustomerSurvey.update(surveyId, {
        responses_count: (survey.responses_count || 0) + 1,
      });
    } catch {}

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}