import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { OFFICIAL_SOURCES, parseCatalog, fingerprint } from "../../shared/nitaqatSource.ts";

// مزامنة بيانات النطاقات (نسب التوطين) من المصدر الرسمي.
//
// الجهة المُصدرة للقرارات هي وزارة الموارد البشرية والتنمية الاجتماعية، وتُنشر عبر منصة قوى.
// ولأن النسب قد تُعدَّل في نشاط معيّن (ارتفاعاً أو انخفاضاً) بعد قرار وزاري، لا تُنسخ الأرقام
// يدوياً: هذا الإجراء يقرأ النسب من المصدر الرسمي ويخزّنها في سجل واحد، والنظام يقرأ ذلك
// السجل تلقائياً — فأي تعديل في المصدر ينتقل إلى النظام كما هو، بالزيادة أو النقصان.
//
// مسارات العمل:
//   1) مزامنة تلقائية من المصدر الرسمي (تُشغَّل دورياً) — تُخزَّن النسخة الرسمية الأخيرة.
//   2) تعذّر القراءة الآلية (حجب المصدر لطلبات آلية): تبقى آخر نسخة رسمية مخزّنة سليمة كما هي،
//      وتُسجَّل حالة آخر محاولة وسببها ليظهر ذلك للمالك في صفحة النطاقات.
//   3) تمرير نسخة رسمية محدّثة في body.payload (JSON) — تُعتمد فوراً وتُخزَّن كمرجع للنظام.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const sr = base44.asServiceRole.entities;

    const existingRows = await sr.NitaqatCatalog.list("-fetched_at", 1);
    const existing = existingRows?.[0] || null;

    const store = async (args: {
      sourceName: string;
      sourceUrl: string;
      checksum: string;
      status: string;
      error?: string;
      catalog?: { groups: any[]; activities: any[] } | null;
    }) => {
      const record: any = {
        source_name: args.sourceName,
        source_url: args.sourceUrl,
        fetched_at: new Date().toISOString(),
        checksum: args.checksum,
        status: args.status,
        error: args.error || "",
        activities_count: args.catalog?.activities?.length || existing?.activities_count || 0,
        groups_count: args.catalog?.groups?.length || existing?.groups_count || 0,
      };
      // نُحدّث بيانات النطاقات فقط عند قراءة سليمة — وإلا تبقى آخر نسخة رسمية كما هي.
      if (args.catalog) record.payload = JSON.stringify(args.catalog);
      if (existing?.id) await sr.NitaqatCatalog.update(existing.id, record);
      else await sr.NitaqatCatalog.create(record);
    };

    // المسار 3: نسخة رسمية محدّثة تُمرَّر مباشرة.
    if (body?.payload) {
      const text = typeof body.payload === "string" ? body.payload : JSON.stringify(body.payload);
      const catalog = parseCatalog(text);
      const checksum = await fingerprint(JSON.stringify(catalog));
      await store({
        sourceName: String(body.source_name || "استيراد رسمي محدّث"),
        sourceUrl: String(body.source_url || ""),
        checksum,
        status: existing?.checksum === checksum ? "unchanged" : "ok",
        catalog,
      });
      return Response.json({
        ok: true, mode: "import", activities: catalog.activities.length,
        groups: catalog.groups.length, changed: existing?.checksum !== checksum,
      });
    }

    // المسار 1: مزامنة تلقائية من المصدر الرسمي (منصة قوى / وزارة الموارد البشرية).
    const sources = OFFICIAL_SOURCES;

    const attempts: { url: string; error: string }[] = [];
    for (const source of sources) {
      try {
        const res = await fetch(source.url, {
          headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "ar,en;q=0.8",
            "User-Agent": "JadaraHR-NitaqatSync/1.0",
          },
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) {
          attempts.push({ url: source.url, error: `HTTP ${res.status}` });
          continue;
        }
        const text = await res.text();
        // حماية الموقع الرسمي (WAF) تردّ صفحة رفض قصيرة للطلبات الآلية — تُسجَّل صراحةً كحجب،
        // حتى لا تختلط بسبب المصدر بخطأ صيغة، ويبقى سبب الحالة واضحاً للمالك.
        if (/(Request Rejected|Access Denied|Request unsuccessful)/i.test(text) && text.length < 5000) {
          attempts.push({ url: source.url, error: "source_blocked" });
          continue;
        }
        const catalog = parseCatalog(text);
        const checksum = await fingerprint(JSON.stringify(catalog));
        const changed = existing?.checksum !== checksum;
        await store({ sourceName: source.name, sourceUrl: source.url, checksum, status: changed ? "ok" : "unchanged", catalog });
        return Response.json({
          ok: true, mode: "sync", source: source.name, source_url: source.url,
          activities: catalog.activities.length, groups: catalog.groups.length, changed,
        });
      } catch (error) {
        attempts.push({ url: source.url, error: String((error as Error)?.message || error) });
      }
    }

    // تعذّرت كل المحاولات: لا نمسّ البيانات المخزّنة، ونُسجّل الحالة والسبب.
    await store({
      sourceName: sources[0].name,
      sourceUrl: sources[0].url,
      checksum: existing?.checksum || "",
      status: "failed",
      error: attempts.map((a) => `${a.url}: ${a.error}`).join(" | ").slice(0, 500),
    });
    return Response.json({ ok: false, mode: "sync", error: "source_unreachable", attempts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}