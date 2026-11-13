/**
 * hijri.js — قراءة التواريخ بأي صيغة وتحويل الهجري (أم القرى) إلى ميلادي.
 * التحويل يتم في التطبيق نفسه عبر تقويم أم القرى الرسمي في المتصفح (islamic-umalqura)،
 * لا بالاعتماد على تقدير أي نموذج ذكاء اصطناعي.
 */

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toEn(v) {
  return String(v ?? "").replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

export function digitsOnly(v) {
  return toEn(v).replace(/\D/g, "");
}

const pad = (n) => String(n).padStart(2, "0");
const DAY = 86400000;

function iso(y, m, d) {
  const yy = Number(y), mm = Number(m), dd = Number(d);
  if (!yy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  return `${yy}-${pad(mm)}-${pad(dd)}`;
}

function isoOfDate(dt) {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/* ── تقويم أم القرى ───────────────────────────────────────────── */
const HIJRI_FMT = (() => {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC",
    });
  } catch {
    return null;
  }
})();

const EPOCH = Date.UTC(1900, 0, 1);
const SPAN = Math.round((Date.UTC(2200, 0, 1) - EPOCH) / DAY);

function hKey(ms) {
  const g = {};
  for (const p of HIJRI_FMT.formatToParts(new Date(ms))) g[p.type] = p.value;
  return Number(g.year) * 10000 + Number(g.month) * 100 + Number(g.day);
}

/** 1447/06/15 → 2025-12-06 (تاريخ هجري غير موجود يعيد "") */
export function hijriToISO(hy, hm, hd) {
  const y = Number(hy), m = Number(hm), d = Number(hd);
  if (!HIJRI_FMT || !y || m < 1 || m > 12 || d < 1 || d > 30) return "";
  const target = y * 10000 + m * 100 + d;
  let lo = 0, hi = SPAN;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const k = hKey(EPOCH + mid * DAY);
    if (k === target) return isoOfDate(new Date(EPOCH + mid * DAY));
    if (k < target) lo = mid + 1; else hi = mid - 1;
  }
  return "";
}

const isHijriYear = (y) => Number(y) >= 1300 && Number(y) <= 1500;

/* ── أسماء الأشهر (هجري وميلادي، عربي وإنجليزي) ───────────────── */
const MONTHS = {
  "محرم": 1, "muharram": 1,
  "صفر": 2, "safar": 2,
  "ربيع الاول": 3, "ربيع الأول": 3, "rabi al-awwal": 3, "rabi i": 3,
  "ربيع الاخر": 4, "ربيع الآخر": 4, "ربيع الثاني": 4, "rabi al-thani": 4, "rabi ii": 4,
  "جمادى الاولى": 5, "جمادى الأولى": 5, "jumada al-awwal": 5, "jumada i": 5,
  "جمادى الاخرة": 6, "جمادى الآخرة": 6, "جمادى الثانية": 6, "jumada al-thani": 6, "jumada ii": 6,
  "رجب": 7, "rajab": 7,
  "شعبان": 8, "shaban": 8, "sha'ban": 8, "shabaan": 8,
  "رمضان": 9, "ramadan": 9,
  "شوال": 10, "shawwal": 10, "shawal": 10,
  "ذو القعده": 11, "ذو القعدة": 11, "ذوالقعده": 11, "ذوالقعدة": 11, "dhul qadah": 11, "dhu al-qidah": 11, "dhul qidah": 11,
  "ذو الحجه": 12, "ذو الحجة": 12, "ذوالحجه": 12, "ذوالحجة": 12, "dhul hijjah": 12, "dhu al-hijjah": 12, "dhul hijja": 12,
  "يناير": 1, "january": 1, "jan": 1,
  "فبراير": 2, "february": 2, "feb": 2,
  "مارس": 3, "march": 3, "mar": 3,
  "ابريل": 4, "أبريل": 4, "april": 4, "apr": 4,
  "مايو": 5, "may": 5,
  "يونيو": 6, "june": 6, "jun": 6,
  "يوليو": 7, "july": 7, "jul": 7,
  "اغسطس": 8, "أغسطس": 8, "august": 8, "aug": 8,
  "سبتمبر": 9, "september": 9, "sep": 9, "sept": 9,
  "اكتوبر": 10, "أكتوبر": 10, "october": 10, "oct": 10,
  "نوفمبر": 11, "november": 11, "nov": 11,
  "ديسمبر": 12, "december": 12, "dec": 12,
};

const arClean = (s) => String(s).replace(/[\u064B-\u0652\u0640]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** هل القيمة تاريخ هجري مكتوب (رقمي أو بأسماء الأشهر)؟ */
export function isHijri(v) {
  if (v === null || v === undefined) return false;
  const s = arClean(toEn(v));
  const nums = s.match(/\d{3,4}/g) || [];
  if (nums.some(isHijriYear)) return true;
  return /(محرم|صفر|ربيع|جمادى|رجب|شعبان|رمضان|شوال|ذو ال|muharram|safar|rabi|jumada|rajab|sha.?ban|ramadan|shawwal|dhul|dhu al)/i.test(s);
}

/**
 * يحوّل أي تاريخ مقروء إلى YYYY-MM-DD ميلادي، أو "" إذا لم يكن تاريخاً.
 * يقبل: 2026-03-15 · 15/06/2026 · 06/15/2026 · أرقام Excel · 1447/06/15 · 15/06/1447 · 15 رجب 1447
 */
export function parseAnyDate(v) {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : isoOfDate(v);

  if (typeof v === "number") {
    if (v >= 20000 && v <= 80000) {
      return isoOfDate(new Date(Math.round((v - 25569) * DAY)));
    }
    return "";
  }

  const s = arClean(toEn(v));

  // YYYY-MM-DD (أو بـ / أو .)
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    return isHijriYear(m[1]) ? hijriToISO(m[1], m[2], m[3]) : iso(m[1], m[2], m[3]);
  }

  // DD/MM/YYYY أو MM/DD/YYYY
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) {
    let day = Number(m[1]), mon = Number(m[2]);
    if (mon > 12 && day <= 12) { const t = day; day = mon; mon = t; }
    return isHijriYear(m[3]) ? hijriToISO(m[3], mon, day) : iso(m[3], mon, day);
  }

  // 15 رجب 1447 · 15 Mar 2026
  const named = s.match(/(\d{1,2})\s+([^\d]{3,24}?)\s+(\d{4})/u);
  if (named) {
    const mon = MONTHS[arClean(named[2])];
    if (mon) {
      return isHijriYear(named[3])
        ? hijriToISO(named[3], mon, named[1])
        : iso(named[3], mon, named[1]);
    }
  }

  // شهر اسمه ثم سنة: "رجب 1447" غير كافٍ — يُتجاهل
  return "";
}