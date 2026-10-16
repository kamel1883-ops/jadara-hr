// نطاق المنشأة = نشاطها التفصيلي + عدد السعوديين + عدد الوافدين.
// النشاط يُختار من دليل الأنشطة (نشاط رئيسي ثم النشاط الذي يندرج تحته).
// حد اللون = م × لوغ(إجمالي العمالة) + ث ، ولوغ هو اللوغاريتم الطبيعي.
// من يقل عن حد الأخضر المنخفض فهو في الأحمر.

import { base44 } from "@/api/base44Client";

let CATALOG = null;
let CATALOG_PENDING = null;

// البيانات الرسمية المُزامَنة: يكتبها إجراء syncNitaqat في سجل NitaqatCatalog بعد قراءتها
// من المصدر الرسمي (منصة قوى / وزارة الموارد البشرية)، فينتقل أي تعديل في النسب إلى هنا تلقائياً.
async function loadFromServer() {
  const rows = await base44.entities.NitaqatCatalog.list("-fetched_at", 1);
  const row = rows && rows[0];
  if (!row) return null;
  let data = null;
  try { data = row.payload ? JSON.parse(row.payload) : null; } catch (_) { data = null; }
  if (!data?.activities?.length) data = null;
  // عند تعذّر آخر قراءة من المصدر الرسمي: تُعرض النسخة الرسمية المخزّنة، ويبقى سبب الحالة ظاهراً للمالك.
  return {
    data,
    meta: {
      source_name: data ? (row.source_name || "منصة قوى") : "النسخة الرسمية المخزّنة",
      source_url: row.source_url || "",
      fetched_at: row.fetched_at || "",
      status: row.status || "ok",
      error: row.error || "",
      ...(data ? { activities: data.activities.length } : {}),
    },
  };
}

// النسخة المرفقة مع النظام: خطة بديلة تعمل بلا اتصال بالمصدر.
async function loadBundled() {
  const res = await fetch(`${import.meta.env.BASE_URL}nitaqat-activities.json`);
  const data = await res.json();
  return {
    data,
    meta: { source_name: "النسخة المرفقة مع النظام", source_url: "", fetched_at: "", status: "bundled", error: "", activities: data?.activities?.length || 0 },
  };
}

// المصدر الثاني الحيّ: الخزنة السعودية — تُزامَن دورياً على السيرفر السعودي من المصدر الوزاري
// (نفّاذ الخزنة غير متاح لكل البيئات، لذا الفشل هنا طبيعي ولا يمنع بقية المصادر).
async function loadFromVault() {
  const res = await base44.functions.invoke("vaultProxy", { action: "nitaqatCatalog" });
  const body = res?.data?.data || res?.data || {};
  const data = body?.data;
  if (!data?.activities?.length) return null;
  return {
    data,
    meta: {
      source_name: body.source ? "الخزنة السعودية (مصدر رسمي مُزامَن)" : "منصة قوى",
      source_url: body.source || "",
      fetched_at: body.fetched_at || "",
      status: body.last_error ? "failed" : "ok",
      error: body.last_error || "",
      activities: data.activities.length,
    },
  };
}

function buildCatalog(data, meta) {
  const byCode = new Map();
  const byGroup = new Map();
  for (const row of data.activities) {
    const bands = row.m
      ? {
          green_low: { m: row.m[0], c: row.c[0] },
          green_medium: { m: row.m[1], c: row.c[1] },
          green_high: { m: row.m[2], c: row.c[2] },
          platinum: { m: row.m[3], c: row.c[3] },
        }
      : null;
    const activity = { code: row.code, ar: row.ar, en: row.en || row.ar, group: row.group, bands };
    byCode.set(row.code, activity);
    const list = byGroup.get(row.group);
    if (list) list.push(activity);
    else byGroup.set(row.group, [activity]);
  }
  CATALOG = { groups: data.groups, byCode, byGroup, meta };
  return CATALOG;
}

export function loadNitaqatCatalog() {
  if (CATALOG) return Promise.resolve(CATALOG);
  if (!CATALOG_PENDING) {
    CATALOG_PENDING = (async () => {
      let loaded = null;
      try { loaded = await loadFromServer(); } catch (_) { loaded = null; }
      if (!loaded?.data) {
        // المصدر الثاني: الخزنة السعودية (مُزامَنة تلقائياً من المصدر الوزاري على السيرفر)
        try { loaded = await loadFromVault(); } catch (_) { loaded = null; }
      }
      if (!loaded?.data) {
        const bundled = await loadBundled();
        // النسب من النسخة الرسمية المخزّنة، وحالة آخر محاولة مزامنة من المصدر تبقى معروضة.
        loaded = { data: bundled.data, meta: { ...bundled.meta, ...(loaded?.meta || {}) } };
      }
      return buildCatalog(loaded.data, loaded.meta);
    })().catch((err) => {
      CATALOG_PENDING = null;
      throw err;
    });
  }
  return CATALOG_PENDING;
}

// مزامنة فورية مع المصدر الرسمي ثم إعادة تحميل البيانات.
// ويمكن تمرير نسخة رسمية محدّثة (payload) فتُعتمد فوراً وتُخزَّن كمرجع لكل المنشآت.
// تُشغَّل المزامنة على المسارين المتاحين (قاعدة Base44 + الخزنة السعودية)؛ فشل أحدهما لا يوقف الآخر.
export async function refreshNitaqatCatalog(payload = null) {
  const tasks = [base44.functions.invoke("syncNitaqat", payload ? { payload } : {})];
  if (!payload) tasks.push(base44.functions.invoke("vaultProxy", { action: "nitaqatSync" }).catch(() => null));
  const results = await Promise.allSettled(tasks);
  const first = results.find((r) => r.status === "fulfilled");
  const res = first ? first.value : null;
  CATALOG = null;
  CATALOG_PENDING = null;
  const catalog = await loadNitaqatCatalog();
  return { catalog, result: res?.data || null };
}

export function findActivity(catalog, code) {
  if (!catalog || code == null || code === "") return null;
  const key = String(code).trim();
  return catalog.byCode.get(key) || catalog.byCode.get(key.padStart(6, "0")) || null;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// الحد الأدنى للنطاق عند حجم عمالة معيّن، بخانتين كما تعرضه الحاسبة.
export function bandThreshold(activity, bandKey, headcount) {
  const row = activity?.bands?.[bandKey];
  if (!row || headcount <= 0) return 0;
  return Math.max(0, round2(row.m * Math.log(headcount) + row.c));
}


// بيانات النطاقات الخمسة — المزايا والإشكاليات منقولة من الدليل الإجرائي لبرنامج نطاقات المطور 2026
export const BAND_META = {
  platinum: {
    key: "platinum", tier: "safe",
    ar: "بلاتيني", en: "Platinum",
    color: "#a16207", bg: "#fef3c7", ring: "#fcd34d",
    benefits_ar: [
      "رصيد التأشيرات (إصدار تأشيرات عمل جديدة)",
      "تغيير مهن العمالة الوافدة للمهن المتاحة",
      "تجديد رخص العمل بغض النظر عن مدة الإقامة (بشرط ألا يزيد المتبقي في إقامة العامل عن ستة أشهر عند التجديد)",
      "نقل الخدمات من أي نطاق",
      "الاحتساب الفوري في البرنامج",
    ],
    risks_ar: [],
  },
  green_high: {
    key: "green_high", tier: "safe",
    ar: "أخضر مرتفع", en: "High Green",
    color: "#15803d", bg: "#dcfce7", ring: "#86efac",
    benefits_ar: [
      "رصيد التأشيرات (إصدار تأشيرات عمل جديدة)",
      "تغيير مهن العمالة الوافدة للمهن المتاحة",
      "تجديد رخص العمل",
      "نقل الخدمات من أي نطاق",
      "الاحتساب الفوري في البرنامج",
    ],
    risks_ar: [],
  },
  green_medium: {
    key: "green_medium", tier: "safe",
    ar: "أخضر متوسط", en: "Medium Green",
    color: "#16a34a", bg: "#dcfce7", ring: "#86efac",
    benefits_ar: [
      "إمكانية استقبال طلبات التأشيرات",
      "تغيير المهن وفق الشروط",
      "تجديد رخص العمل",
      "نقل الخدمات بشروط",
      "الاحتساب الفوري في البرنامج",
    ],
    risks_ar: [],
  },
  green_low: {
    key: "green_low", tier: "warning",
    ar: "أخضر منخفض", en: "Low Green",
    color: "#65a30d", bg: "#ecfccb", ring: "#bef264",
    benefits_ar: [
      "تجديد رخص العمل للعمالة القائمة",
      "الاحتساب الفوري في البرنامج",
    ],
    risks_ar: [
      "إيقاف طلبات التأشيرات الجديدة (لا استقدام جديد)",
      "إيقاف طلبات تغيير المهن",
    ],
  },
  red: {
    key: "red", tier: "danger",
    ar: "أحمر", en: "Red",
    color: "#dc2626", bg: "#fee2e2", ring: "#fca5a5",
    benefits_ar: [],
    risks_ar: [
      "لا تُصدر تأشيرات عمل جديدة",
      "لا يُسمح بإصدار رخص عمل لعمالة جديدة",
      "لا تجديد لرخص العمل للعمالة القائمة (إيقاف التجديد — الخطر التشغيلي الأكبر)",
      "لا نقل خدمات إليك",
      "لا تغيير مهن للعمالة الوافدة",
    ],
  },
};

const BAND_ORDER = ["red", "green_low", "green_medium", "green_high", "platinum"];

// القلب الحسابي: نسبة التوطين مقابل حدود النشاط التفصيلي المختار.
export function computeNitaqat(saudis, expats, activity) {
  const s = Number(saudis) || 0;
  const e = Number(expats) || 0;
  const total = s + e;
  const pct = total > 0 ? (s / total) * 100 : 0;
  const ready = Boolean(activity?.bands);

  const th = ready
    ? {
        green_low: bandThreshold(activity, "green_low", total),
        green_medium: bandThreshold(activity, "green_medium", total),
        green_high: bandThreshold(activity, "green_high", total),
        platinum: bandThreshold(activity, "platinum", total),
      }
    : null;

  let bandKey = null;
  if (ready) {
    if (total === 0 || pct < th.green_low) bandKey = "red";
    else if (pct < th.green_medium) bandKey = "green_low";
    else if (pct < th.green_high) bandKey = "green_medium";
    else if (pct < th.platinum) bandKey = "green_high";
    else bandKey = "platinum";
  }

  return {
    saudis: s, expats: e, total,
    saudizationPct: round2(pct),
    bandKey,
    band: bandKey ? BAND_META[bandKey] : null,
    activity: activity || null,
    thresholds: th,
    micro: false,
    bandOrder: BAND_ORDER,
  };
}

// كم سعودي يلزم للخروج من النطاق الأحمر إلى الأخضر المنخفض؟
export function saudisNeededForSafe(result) {
  if (!result?.activity?.bands || result.total === 0) return result?.bandKey === "red" ? 1 : 0;
  if (result.bandKey !== "red") return 0;
  const { activity, expats, saudis } = result;
  for (let n = saudis; n <= saudis + 5000; n++) {
    const tot = n + expats;
    const thr = bandThreshold(activity, "green_low", tot);
    if (tot > 0 && (n / tot) * 100 >= thr) return n - saudis;
  }
  return 0;
}