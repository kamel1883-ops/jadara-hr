// مصدر بيانات النطاقات (التوطين): قراءة النسب من المصدر الرسمي وتحويلها إلى صيغة النظام.
//
// قاعدة العمل: الجهة التي تُصدر قرارات نسب التوطين هي وزارة الموارد البشرية والتنمية
// الاجتماعية، وتُنشر عبر منصة قوى (نطاقات المطور). النسب تختلف من نشاط تفصيلي إلى آخر،
// وقد تُعدَّل (ترتفع أو تنخفض) في نشاط معيّن بعد صدور قرار وزاري — لذلك لا تُنسخ الأرقام
// يدوياً في النظام: تُقرأ من المصدر الرسمي وتُخزَّن، ويقرأها النظام من المخزون تلقائياً.

export type NitaqatRow = {
  code: string;
  ar: string;
  en: string;
  group: string;
  m: number[];
  c: number[];
};

export type NitaqatGroup = { id: string; ar: string };

// مصادر رسمية تُجرّب بالترتيب. يمكن تجاوزها بمتغيّر بيئة NITAQAT_SOURCE_URL
// (منصة قوى أو وزارة الموارد البشرية) فيُجرَّب أولاً.
export const OFFICIAL_SOURCES = [
  { name: "حاسبة النطاقات — منصة قوى", url: "https://qiwa.sa/ar/tools-and-calculators/nitaqat-forecast-calculator" },
  { name: "وزارة الموارد البشرية والتنمية الاجتماعية", url: "https://www.hrsd.gov.sa/" },
];

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// يقرأ نص المصدر (JSON) ويعيد قائمة الأنشطة التفصيلية بمعاملاتها (م، ث) لكل نطاق.
// يرفض أي محتوى غير مكتمل (أقل من 100 نشاط) حتى لا تُستبدل بيانات رسمية سليمة بقراءة ناقصة.
export function parseCatalog(text: string): { groups: NitaqatGroup[]; activities: NitaqatRow[] } {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("unsupported_format");
  }
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.activities) ? raw.activities : null;
  if (!rows) throw new Error("unsupported_format");

  const activities: NitaqatRow[] = [];
  for (const r of rows) {
    const code = String(r?.code ?? "").trim();
    const m = Array.isArray(r?.m) ? r.m : null;
    const c = Array.isArray(r?.c) ? r.c : null;
    if (!code || !m || !c || m.length < 4 || c.length < 4) continue;
    if (!m.every(isNum) || !c.every(isNum)) continue;
    activities.push({
      code,
      ar: String(r?.ar ?? "").trim(),
      en: String(r?.en ?? r?.ar ?? "").trim(),
      group: String(r?.group ?? "").trim(),
      m: (m as number[]).slice(0, 4),
      c: (c as number[]).slice(0, 4),
    });
  }
  if (activities.length < 100) throw new Error("insufficient_activities");

  const groups: NitaqatGroup[] = Array.isArray(raw?.groups)
    ? raw.groups
        .map((g: any) => ({ id: String(g?.id ?? "").trim(), ar: String(g?.ar ?? "").trim() }))
        .filter((g: NitaqatGroup) => g.id)
    : [];

  return { groups, activities };
}

// بصمة المحتوى — بها يعرف النظام أن المصدر تغيّر فعلاً (ارتفاعاً أو انخفاضاً في النسب).
export async function fingerprint(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}