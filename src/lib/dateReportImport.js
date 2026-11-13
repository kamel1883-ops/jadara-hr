/**
 * dateReportImport — قراءة ملفات تحديث تواريخ الإقامة/العقود ومطابقتها برقم الهوية.
 *
 * Excel / CSV / JSON / HTML تُقرأ محلياً خلية بخلية (دقيقة ولا تعتمد على تقدير أي نموذج).
 * PDF والصور تُقرأ بذكاء اصطناعي، لكن التاريخ يُستخرج كما هو مكتوب فقط،
 * والتحويل الهجري → ميلادي يتم دائماً داخل التطبيق عبر تقويم أم القرى.
 * الملف يُرفع للخزنة الخاصة (stored privately) ويُقرأ عبر رابط موقّع مؤقت.
 */
import ExcelJS from "exceljs";
import { base44 } from "@/api/base44Client";
import { digitsOnly, parseAnyDate, isHijri, toEn } from "@/lib/hijri";

export { digitsOnly };
export const normalizeDate = parseAnyDate;

const VALID_ID = /^[127]\d{9}$/;

const arNorm = (s) => toEn(s)
  .replace(/[\u064B-\u0652\u0640]/g, "")
  .replace(/[أإآ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/\s+/g, " ")
  .trim();

const ID_COL = /(هوي|اقام|إقام|iqama|national|resident|identity|passport|\bid\b)/;
const NOT_ID = /(تاريخ|انتها|نهاي|بداي|date|expir|start|end)/;
const DATE_EXCLUDE = /(بداي|بداية|مباشر|تعيين|ميلاد|اصدار|إصدار|birth|hire|start|issue)/;

/** يحدد صف العناوين وعمود الهوية وعمود التاريخ */
function findHeader(rows, kind) {
  const isId = (c) => ID_COL.test(c) && !NOT_ID.test(c);
  const isEnd = (c) => /(انتها|انتهاء|نهاية|نهاي|expir|end|terminat)/.test(c);
  const anyDate = (c) => /(تاريخ|date)/.test(c) && !DATE_EXCLUDE.test(c);
  const preferred = kind === "contract" ? /(عقد|contract)/ : /(اقام|إقام|هوي|iqama|id)/;
  const limit = Math.min(rows.length, 15);

  for (let i = 0; i < limit; i++) {
    const cells = (rows[i] || []).map((c) => arNorm(c).toLowerCase());
    const idIdx = cells.findIndex((c) => c && isId(c));
    if (idIdx < 0) continue;

    let dateIdx = cells.findIndex((c, idx) => idx !== idIdx && isEnd(c) && preferred.test(c));
    if (dateIdx < 0) dateIdx = cells.findIndex((c, idx) => idx !== idIdx && isEnd(c));
    if (dateIdx < 0) dateIdx = cells.findIndex((c, idx) => idx !== idIdx && anyDate(c));
    if (dateIdx >= 0) return { headerRow: i, idIdx, dateIdx };
  }
  return null;
}

/** يحوّل صفوف الجدول إلى [{ national_id, expiry_date }] */
function buildRecords(rows, kind) {
  const header = findHeader(rows, kind);
  const out = [];
  let hijriCount = 0;
  const start = header ? header.headerRow + 1 : 0;

  for (let i = start; i < rows.length; i++) {
    const row = rows[i] || [];
    let nid = "";
    let raw = "";
    let date = "";

    if (header) {
      const idv = digitsOnly(row[header.idIdx]);
      nid = VALID_ID.test(idv) ? idv : "";
      raw = row[header.dateIdx];
      date = parseAnyDate(raw);
    } else {
      // بلا صف عناوين: نلتقط أول رقم هوية/إقامة، وآخر تاريخ صالح في الصف (نهاية المدة)
      for (const cell of row) {
        const dv = digitsOnly(cell);
        if (!nid && VALID_ID.test(dv)) nid = dv;
      }
      const dates = row.map((c) => parseAnyDate(c)).filter(Boolean);
      if (dates.length) {
        date = dates[dates.length - 1];
        raw = row.find((c) => parseAnyDate(c) === date);
      }
    }

    if (!nid || !date) continue;
    if (isHijri(raw)) hijriCount++;
    out.push({ national_id: nid, expiry_date: date });
  }
  return { records: out, hijriCount };
}

/* ── قارئات محلية ───────────────────────────────────────────── */

async function rowsFromXlsx(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const rows = [];
  wb.eachSheet((sheet) => {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const vals = (row.values || []).slice(1).map((v) => (v && typeof v === "object" && "result" in v ? v.result : v));
      rows.push(vals);
    });
  });
  return rows;
}

function rowsFromDelimited(text) {
  const src = toEn(text).replace(/^\ufeff/, "");
  const lines = src.split(/\r?\n/).filter((l) => l.trim() !== "");
  const delim = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? "\t" : ",";
  return lines.map((line) => {
    const cells = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
      } else if (ch === delim && !quoted) {
        cells.push(cur.trim()); cur = "";
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

function rowsFromHtml(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const rows = [];
  doc.querySelectorAll("tr").forEach((tr) => {
    rows.push(Array.from(tr.querySelectorAll("th,td")).map((td) => td.textContent.trim()));
  });
  return rows;
}

function rowsFromJson(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : (data.records || data.rows || data.data || []);
  if (!Array.isArray(list) || !list.length) return [];
  if (Array.isArray(list[0])) return list.map((r) => r.map((c) => (c === null ? "" : c)));
  const keys = Object.keys(list[0]);
  return [keys, ...list.map((o) => keys.map((k) => (o[k] === null || o[k] === undefined ? "" : o[k])))];
}

/** يعيد صفوف الجدول، أو null إذا كانت الصيغة تحتاج قراءة بالذكاء الاصطناعي (PDF/صورة) */
async function localRows(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".xls")) throw new Error("legacy_xls");
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) return rowsFromXlsx(file);
  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) return rowsFromDelimited(await file.text());
  if (name.endsWith(".json")) return rowsFromJson(await file.text());
  if (name.endsWith(".html") || name.endsWith(".htm")) return rowsFromHtml(await file.text());
  return null;
}

/* ── قراءة PDF/الصور ─────────────────────────────────────────── */

const RAW_SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          national_id: { type: "string", description: "رقم الهوية أو الإقامة كما هو (10 أرقام)" },
          date_raw: { type: "string", description: "تاريخ الانتهاء كما هو مكتوب في الملف تماماً، دون تحويل" },
        },
      },
    },
  },
};

function labelOf(kind) {
  return kind === "contract" ? "تاريخ نهاية العقد" : "تاريخ انتهاء الهوية أو الإقامة";
}

async function recordsFromAI(url, kind) {
  const prompt = `هذا ملف يخص موظفي منشأة. استخرج لكل صف موجود: رقم الهوية الوطنية أو رقم الإقامة (10 أرقام)، و${labelOf(kind)} كما هو مكتوب في الملف تماماً (date_raw) دون تحويله ولا تفسيره — سواء كان ميلادياً أو هجرياً. لا تختلق أي رقم أو تاريخ غير موجود في الملف.`;

  let rows = [];
  try {
    const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: url, json_schema: RAW_SCHEMA });
    const out = res?.output;
    rows = Array.isArray(out) ? out : (out?.rows || []);
  } catch { rows = []; }

  if (!rows.length) {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt, file_urls: [url], response_json_schema: RAW_SCHEMA,
    });
    rows = res?.rows || [];
  }
  return rows;
}

/**
 * يقرأ ملفاً ويعيد { records: [{ national_id, expiry_date }], hijriCount, aiUsed }.
 */
export async function extractDatesFromFile(file, kind) {
  const rows = await localRows(file);

  if (rows) {
    const { records, hijriCount } = buildRecords(rows, kind);
    if (!records.length) throw new Error("no_rows");
    return { records, hijriCount, aiUsed: false };
  }

  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 900 });
  const aiRows = await recordsFromAI(signed_url, kind);

  let hijriCount = 0;
  const records = [];
  for (const r of aiRows || []) {
    const nid = digitsOnly(r?.national_id);
    const raw = r?.date_raw;
    const date = parseAnyDate(raw);
    if (!VALID_ID.test(nid) || !date) continue;
    if (isHijri(raw)) hijriCount++;
    records.push({ national_id: nid, expiry_date: date });
  }
  if (!records.length) throw new Error("no_rows");
  return { records, hijriCount, aiUsed: true };
}

/**
 * يطابق الملف مع الموظفين برقم الهوية فقط، ويحدد من تتغيّر قيمته فعلياً.
 */
export function planDateUpdates(records, employees, field) {
  const byId = new Map();
  for (const e of employees || []) {
    const nid = digitsOnly(e.national_id);
    if (nid && !byId.has(nid)) byId.set(nid, e);
  }
  const updates = [];
  const unchanged = [];
  const unmatched = [];
  const seen = new Set();
  for (const r of records) {
    const emp = byId.get(r.national_id);
    if (!emp) { unmatched.push(r); continue; }
    if (seen.has(emp.id)) continue;
    seen.add(emp.id);
    const current = normalizeDate(emp[field]);
    if (current === r.expiry_date) {
      unchanged.push({ national_id: r.national_id, name: emp.full_name, date: r.expiry_date });
    } else {
      updates.push({ id: emp.id, name: emp.full_name, national_id: r.national_id, from: current, to: r.expiry_date });
    }
  }
  return { updates, unchanged, unmatched };
}

/** ينفّذ التحديث دفعات (كل دفعة حتى 450 سجلاً) */
export async function applyDateUpdates(updates, field) {
  const payload = updates.map((u) => ({ id: u.id, [field]: u.to }));
  for (let i = 0; i < payload.length; i += 450) {
    await base44.entities.Employee.bulkUpdate(payload.slice(i, i + 450));
  }
  return payload.length;
}