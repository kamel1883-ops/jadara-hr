// نطاقات المطور — المرفق الأول من الدليل الإجرائي 2026 لوزارة الموارد البشرية.
// نفس مدخلات حاسبة قوى: عدد السعوديين، عدد المقيمين، ونشاط نطاقات المنشأة.
// ص = م × لوغ(س) + ث ، ولوغ هو اللوغاريتم الطبيعي. لكل لون ثابت منحنى وثابت سنة.
// خانات الثابت: 2026 ثم 2027 ثم 2028. من يقل عن حد الأخضر المنخفض فهو في الأحمر.

const b = (m, y2026, y2027, y2028) => ({ m, y2026, y2027, y2028 });

export const NITAQAT_ACTIVITIES = [
  { code: "0", ar: "الإنتاج الزراعي والحيواني وخدماتها وأندية الفروسية", en: "Agriculture, livestock and equestrian clubs", bands: { green_low: b(0.19, 4.38, 4.38, 4.38), green_medium: b(0.58, 5.13, 5.13, 5.13), green_high: b(0.58, 9.38, 9.38, 9.38), platinum: b(0.58, 14.38, 14.38, 14.38) } },
  { code: "1", ar: "أنشطة الهيدروكربونات وعملياتها", en: "Hydrocarbons and their operations", bands: { green_low: b(4.98, 5.62, 7.62, 9.62), green_medium: b(6.00, 20.00, 22.00, 24.00), green_high: b(6.00, 22.00, 24.00, 26.00), platinum: b(6.00, 24.00, 26.00, 28.00) } },
  { code: "2", ar: "تعدين المعادن الفلزية والأحجار الكريمة", en: "Metallic mining and gemstones", bands: { green_low: b(1.68, 16.00, 16.00, 16.00), green_medium: b(1.87, 19.00, 19.00, 19.00), green_high: b(2.08, 28.00, 28.00, 28.00), platinum: b(6.00, 23.00, 23.00, 23.00) } },
  { code: "3", ar: "تعدين المعادن غير الفلزية والصناعية", en: "Non-metallic and industrial mining", bands: { green_low: b(1.68, 18.00, 20.00, 22.00), green_medium: b(1.87, 19.00, 21.00, 23.00), green_high: b(2.08, 21.00, 23.00, 25.00), platinum: b(6.00, 25.00, 27.00, 29.00) } },
  { code: "4", ar: "تعدين مواد البناء", en: "Building materials mining", bands: { green_low: b(0.00, 7.00, 7.00, 7.00), green_medium: b(0.00, 10.00, 10.00, 10.00), green_high: b(0.00, 13.00, 13.00, 13.00), platinum: b(6.00, 23.00, 23.00, 23.00) } },
  { code: "5", ar: "الطاقة والمياه وخدماتها", en: "Energy, water and their services", bands: { green_low: b(1.35, 8.36, 10.36, 12.36), green_medium: b(2.60, 9.32, 11.32, 13.32), green_high: b(3.00, 17.18, 19.18, 21.18), platinum: b(3.00, 32.93, 34.93, 36.93) } },
  { code: "6", ar: "الصناعات", en: "Industries", bands: { green_low: b(1.68, 15.08, 18.08, 21.08), green_medium: b(1.87, 21.87, 24.87, 27.87), green_high: b(2.08, 23.97, 26.97, 29.97), platinum: b(2.08, 29.87, 32.87, 35.87) } },
  { code: "7", ar: "مقاولات التشييد والبناء", en: "Construction contracting", bands: { green_low: b(-0.37, 14.17, 16.17, 18.17), green_medium: b(-0.37, 16.17, 18.17, 20.17), green_high: b(0.00, 17.50, 19.50, 21.50), platinum: b(0.00, 22.50, 24.50, 26.50) } },
  { code: "8", ar: "التشغيل والصيانة", en: "Operation and maintenance", bands: { green_low: b(0.14, 17.12, 18.12, 19.12), green_medium: b(0.14, 21.12, 22.12, 23.12), green_high: b(0.48, 24.96, 25.96, 26.96), platinum: b(0.76, 29.09, 30.09, 31.09) } },
  { code: "9", ar: "مقاولات النظافة والمغاسل", en: "Cleaning and laundry contracting", bands: { green_low: b(-0.37, 12.17, 12.17, 12.17), green_medium: b(-0.37, 14.17, 14.17, 14.17), green_high: b(0.00, 17.00, 17.00, 17.00), platinum: b(0.00, 22.00, 22.00, 22.00) } },
  { code: "10", ar: "البيع بالجملة والتجزئة العامة", en: "Wholesale and general retail", bands: { green_low: b(2.47, 23.25, 26.25, 29.25), green_medium: b(2.47, 27.72, 30.72, 33.72), green_high: b(2.67, 30.41, 33.41, 36.41), platinum: b(2.84, 38.91, 41.91, 44.91) } },
  { code: "11", ar: "البيع بالتجزئة للعطور والساعات", en: "Perfume and watch retail", bands: { green_low: b(2.47, 25.25, 30.25, 35.25), green_medium: b(2.47, 29.72, 34.72, 39.72), green_high: b(2.67, 33.91, 38.91, 43.91), platinum: b(2.84, 41.91, 46.91, 51.91) } },
  { code: "12", ar: "البيع بالتجزئة للأزياء والكماليات والسلع المتنوعة", en: "Fashion, accessories and general goods retail", bands: { green_low: b(2.47, 24.25, 28.25, 32.25), green_medium: b(2.47, 28.72, 32.72, 36.72), green_high: b(2.67, 32.91, 36.91, 40.91), platinum: b(2.84, 40.91, 44.91, 48.91) } },
  { code: "13", ar: "السلع النسائية، بيع الهواتف المحمولة وصيانتها", en: "Women's goods and mobile phone sales and repair", bands: { green_low: b(0.00, 82.00, 82.00, 82.00), green_medium: b(0.00, 85.00, 85.00, 85.00), green_high: b(0.00, 89.00, 89.00, 89.00), platinum: b(0.27, 93.42, 93.42, 93.42) } },
  { code: "14", ar: "حلول الاتصالات", en: "Telecom solutions", bands: { green_low: b(2.19, 27.76, 29.76, 31.76), green_medium: b(2.52, 36.76, 38.76, 40.76), green_high: b(2.91, 42.02, 44.02, 46.02), platinum: b(3.22, 48.15, 50.15, 52.15) } },
  { code: "15", ar: "أنشطة البريد", en: "Postal activities", bands: { green_low: b(0.81, 17.10, 17.10, 17.10), green_medium: b(0.81, 22.10, 22.10, 22.10), green_high: b(1.01, 32.50, 32.50, 32.50), platinum: b(1.01, 42.50, 42.50, 42.50) } },
  { code: "16", ar: "البنية التحتية لتقنية المعلومات", en: "IT infrastructure", bands: { green_low: b(3.61, 17.77, 19.77, 21.77), green_medium: b(3.61, 24.64, 26.64, 28.64), green_high: b(3.61, 40.00, 42.00, 44.00), platinum: b(3.61, 50.00, 52.00, 54.00) } },
  { code: "17", ar: "البنية التحتية للاتصالات", en: "Telecom infrastructure", bands: { green_low: b(0.00, 17.00, 19.00, 21.00), green_medium: b(0.00, 21.00, 23.00, 25.00), green_high: b(0.00, 23.50, 25.50, 27.50), platinum: b(0.00, 28.50, 30.50, 32.50) } },
  { code: "18", ar: "التشغيل والصيانة للاتصالات", en: "Telecom operation and maintenance", bands: { green_low: b(0.00, 17.00, 19.00, 21.00), green_medium: b(0.39, 20.98, 22.98, 24.98), green_high: b(0.39, 23.83, 25.83, 27.83), platinum: b(0.39, 29.00, 31.00, 33.00) } },
  { code: "19", ar: "التشغيل والصيانة لتقنية المعلومات", en: "IT operation and maintenance", bands: { green_low: b(4.85, 15.96, 17.96, 19.96), green_medium: b(4.85, 24.42, 26.42, 28.42), green_high: b(4.85, 27.42, 29.42, 31.42), platinum: b(4.85, 33.36, 35.36, 37.36) } },
  { code: "20", ar: "حلول تقنية المعلومات", en: "IT solutions", bands: { green_low: b(2.19, 26.76, 28.76, 30.76), green_medium: b(2.34, 32.54, 34.54, 36.54), green_high: b(2.91, 40.02, 42.02, 44.02), platinum: b(3.22, 48.15, 50.15, 52.15) } },
  { code: "21", ar: "النقل البري والتخزين", en: "Land transport and storage", bands: { green_low: b(1.15, 12.09, 13.09, 14.09), green_medium: b(1.15, 16.20, 17.20, 18.20), green_high: b(1.50, 17.82, 18.82, 19.82), platinum: b(1.71, 27.74, 28.74, 29.74) } },
  { code: "22", ar: "النقل البحري والجوي", en: "Sea and air transport", bands: { green_low: b(1.45, 26.57, 28.57, 30.57), green_medium: b(1.45, 39.98, 41.98, 43.98), green_high: b(1.86, 48.38, 50.38, 52.38), platinum: b(2.67, 56.29, 58.29, 60.29) } },
  { code: "23", ar: "مطاعم مع الخدمة لا تشمل مطاعم الوجبات السريعة", en: "Full-service restaurants, excluding fast food", bands: { green_low: b(1.58, 13.47, 14.47, 15.47), green_medium: b(1.67, 16.98, 17.98, 18.98), green_high: b(1.67, 20.26, 21.26, 22.26), platinum: b(1.67, 26.71, 27.71, 28.71) } },
  { code: "24", ar: "مطاعم خدمة سريعة ومحلات الآيسكريم", en: "Fast food and ice cream shops", bands: { green_low: b(1.58, 15.08, 16.08, 17.08), green_medium: b(1.67, 20.04, 21.04, 22.04), green_high: b(1.67, 23.27, 24.27, 25.27), platinum: b(1.67, 29.26, 30.26, 31.26) } },
  { code: "25", ar: "المقاهي ومحلات تقديم المشروبات", en: "Cafes and beverage shops", bands: { green_low: b(1.58, 16.98, 17.98, 18.98), green_medium: b(1.67, 20.49, 21.49, 22.49), green_high: b(1.67, 31.42, 32.42, 33.42), platinum: b(1.67, 35.52, 36.52, 37.52) } },
  { code: "26", ar: "التموين والإعاشة", en: "Catering", bands: { green_low: b(1.58, 14.46, 15.46, 16.46), green_medium: b(1.67, 17.97, 18.97, 19.97), green_high: b(1.67, 21.25, 22.25, 23.25), platinum: b(1.67, 27.93, 28.93, 29.93) } },
  { code: "27", ar: "حراسات أمنية ومكاتب التوظيف الأهلية", en: "Security guards and private recruitment offices", bands: { green_low: b(0.34, 74.50, 74.50, 74.50), green_medium: b(0.34, 77.50, 77.50, 77.50), green_high: b(0.34, 80.50, 80.50, 80.50), platinum: b(0.34, 84.50, 84.50, 84.50) } },
  { code: "28", ar: "المؤسسات المالية", en: "Financial institutions", bands: { green_low: b(2.60, 50.00, 50.00, 50.00), green_medium: b(2.60, 57.00, 57.00, 57.00), green_high: b(2.60, 62.00, 62.00, 62.00), platinum: b(2.60, 65.00, 65.00, 65.00) } },
  { code: "29", ar: "خدمات الأعمال", en: "Business services", bands: { green_low: b(1.03, 33.78, 36.78, 39.78), green_medium: b(1.03, 42.62, 45.62, 48.62), green_high: b(2.19, 43.62, 46.62, 49.62), platinum: b(2.19, 54.82, 57.82, 60.82) } },
  { code: "30", ar: "الخدمات الاجتماعية", en: "Social services", bands: { green_low: b(1.83, 14.82, 16.82, 18.82), green_medium: b(2.38, 26.90, 28.90, 30.90), green_high: b(3.50, 32.74, 34.74, 36.74), platinum: b(3.50, 56.52, 58.52, 60.52) } },
  { code: "31", ar: "الخدمات الشخصية", en: "Personal services", bands: { green_low: b(1.46, 14.07, 14.07, 14.07), green_medium: b(1.92, 20.36, 20.36, 20.36), green_high: b(4.40, 24.63, 24.63, 24.63), platinum: b(5.00, 26.13, 26.13, 26.13) } },
  { code: "32", ar: "التعليم العالي", en: "Higher education", bands: { green_low: b(0.00, 34.00, 34.00, 34.00), green_medium: b(0.00, 48.00, 48.00, 48.00), green_high: b(0.43, 75.37, 75.37, 75.37), platinum: b(0.43, 82.00, 82.00, 82.00) } },
  { code: "33", ar: "التعليم العالي للتخصصات الصحية", en: "Higher education for health specialties", bands: { green_low: b(0.00, 25.00, 25.00, 25.00), green_medium: b(0.00, 30.00, 30.00, 30.00), green_high: b(0.00, 35.00, 35.00, 35.00), platinum: b(0.00, 37.00, 37.00, 37.00) } },
  { code: "34", ar: "مدارس البنات ورياض الأطفال والحضانات", en: "Girls schools, kindergartens and nurseries", bands: { green_low: b(0.00, 51.00, 51.00, 51.00), green_medium: b(0.00, 66.00, 66.00, 66.00), green_high: b(0.00, 89.56, 89.56, 89.56), platinum: b(0.00, 95.00, 95.00, 95.00) } },
  { code: "35", ar: "المدارس الأجنبية", en: "Foreign schools", bands: { green_low: b(2.30, 4.95, 4.95, 4.95), green_medium: b(2.30, 14.19, 14.19, 14.19), green_high: b(2.30, 19.99, 19.99, 19.99), platinum: b(2.30, 28.77, 28.77, 28.77) } },
  { code: "36", ar: "المختبرات والخدمات الصحية", en: "Laboratories and health services", bands: { green_low: b(0.35, 25.74, 27.74, 29.74), green_medium: b(0.35, 30.74, 32.74, 34.74), green_high: b(0.35, 34.24, 36.24, 38.24), platinum: b(0.35, 34.74, 36.74, 38.74) } },
  { code: "37", ar: "الإيواء والسياحة", en: "Accommodation and tourism", bands: { green_low: b(2.42, 24.60, 26.60, 28.60), green_medium: b(2.42, 31.02, 33.02, 35.02), green_high: b(2.59, 36.40, 38.40, 40.40), platinum: b(2.59, 42.52, 44.52, 46.52) } },
  { code: "38", ar: "السلع الأساسية والمحروقات", en: "Basic goods and fuels", bands: { green_low: b(0.17, 9.86, 10.86, 11.86), green_medium: b(0.56, 12.22, 13.22, 14.22), green_high: b(0.56, 22.59, 23.59, 24.59), platinum: b(1.19, 26.09, 27.09, 28.09) } },
  { code: "39", ar: "مدارس البنين ومجمعات البنين والبنات", en: "Boys schools and mixed complexes", bands: { green_low: b(1.31, 29.30, 29.30, 29.30), green_medium: b(1.31, 39.15, 39.15, 39.15), green_high: b(1.31, 50.27, 50.27, 50.27), platinum: b(1.31, 61.00, 61.00, 61.00) } },
  { code: "40", ar: "الكيانات المجمعة", en: "Aggregated entities", bands: { green_low: b(2.23, 10.99, 10.99, 10.99), green_medium: b(2.23, 22.40, 22.40, 22.40), green_high: b(2.23, 33.81, 33.81, 33.81), platinum: b(2.23, 44.00, 44.00, 44.00) } },
];

export function activityByCode(code) {
  return NITAQAT_ACTIVITIES.find((a) => a.code === String(code)) || NITAQAT_ACTIVITIES.find((a) => a.code === "10");
}

function constantForYear(row, year) {
  const y = Number(year) || new Date().getFullYear();
  if (y >= 2028) return row.y2028;
  if (y === 2027) return row.y2027;
  return row.y2026;
}

// الحد الأدنى للنطاق عند حجم عمالة معيّن، بخانة السنة من المرفق الأول.
export function bandThreshold(activity, bandKey, headcount, year) {
  if (headcount <= 0) return 0;
  const row = activity.bands[bandKey];
  const value = row.m * Math.log(headcount) + constantForYear(row, year);
  return Math.max(0, Math.round(value * 10) / 10);
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

// القلب الحسابي: يحدد النطاق بناءً على نسبة التوطين ونشاط الكيان وحجم العمالة (معادلة نطاقات المطور)
export function computeNitaqat(saudis, expats, activityCode, year) {
  const s = Number(saudis) || 0;
  const e = Number(expats) || 0;
  const total = s + e;
  const pct = total > 0 ? (s / total) * 100 : 0;
  const activity = activityByCode(activityCode);
  const y = Number(year) || new Date().getFullYear();

  const th = {
    green_low: bandThreshold(activity, "green_low", total, y),
    green_medium: bandThreshold(activity, "green_medium", total, y),
    green_high: bandThreshold(activity, "green_high", total, y),
    platinum: bandThreshold(activity, "platinum", total, y),
  };

  let bandKey;
  if (total === 0) bandKey = "red";
  else if (pct < th.green_low) bandKey = "red";
  else if (pct < th.green_medium) bandKey = "green_low";
  else if (pct < th.green_high) bandKey = "green_medium";
  else if (pct < th.platinum) bandKey = "green_high";
  else bandKey = "platinum";

  return {
    saudis: s, expats: e, total,
    saudizationPct: Math.round(pct * 10) / 10,
    bandKey,
    band: BAND_META[bandKey],
    activity,
    thresholds: th,
    micro: false,
    year: y,
    bandOrder: BAND_ORDER,
  };
}

// كم سعودي يلزم للخروج من النطاق الأحمر إلى الأخضر المنخفض؟
// (يتحرك الحد مع تغير الإجمالي، لذا نبحث عددياً عن أقل عدد يحقق النسبة)
export function saudisNeededForSafe(result) {
  if (!result || result.total === 0) return 1;
  if (result.bandKey !== "red") return 0;
  const { activity, expats, saudis, year } = result;
  for (let n = saudis; n <= saudis + 5000; n++) {
    const tot = n + expats;
    const thr = bandThreshold(activity, "green_low", tot, year);
    if (tot > 0 && (n / tot) * 100 >= thr) return n - saudis;
  }
  return 0;
}