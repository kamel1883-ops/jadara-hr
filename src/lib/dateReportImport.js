/**
 * dateReportImport — قراءة ملفات تحديث تواريخ الإقامة/العقود ومطابقتها برقم الهوية.
 * الملف يُرفع للخزنة الخاصة (stored privately) ويُقرأ عبر رابط موقّع مؤقت.
 */
import { base44 } from "@/api/base44Client";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toEn = (s) => String(s ?? "").replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

export function digitsOnly(v) {
  return toEn(v).replace(/\D/g, "");
}

const pad = (n) => String(n).padStart(2, "0");

function iso(y, m, d) {
  const yy = Number(y), mm = Number(m), dd = Number(d);
  if (!yy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  return `${yy}-${pad(mm)}-${pad(dd)}`;
}

function excelSerialToISO(n) {
  if (!Number.isFinite(n) || n < 20000 || n > 80000) return "";
  const d = new Date(Math.round((n - 25569) * 86400000));
  if (isNaN(d.getTime())) return "";
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** يحوّل أي تاريخ مقروء (YYYY-MM-DD أو DD/MM/YYYY أو تاريخ Excel) إلى YYYY-MM-DD */
export function normalizeDate(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return excelSerialToISO(v);
  const s = toEn(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(m[1], m[2], m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return iso(m[3], m[2], m[1]);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return "";
}

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    records: {
      type: "array",
      items: {
        type: "object",
        properties: {
          national_id: { type: "string", description: "رقم الهوية الوطنية أو الإقامة كما هو في الملف" },
          expiry_date: { type: "string", description: "تاريخ الانتهاء بالصيغة YYYY-MM-DD" },
        },
        required: ["national_id", "expiry_date"],
      },
    },
  },
  required: ["records"],
};

function labelOf(kind) {
  return kind === "contract" ? "تاريخ نهاية العقد" : "تاريخ انتهاء الهوية أو الإقامة";
}

/**
 * يقرأ ملف (PDF/Excel/CSV/صورة/أي صيغة) ويعيد [{ national_id, expiry_date }].
 */
export async function extractDatesFromFile(file, kind) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 900 });

  let rows = [];
  try {
    const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: signed_url,
      json_schema: EXTRACT_SCHEMA,
    });
    const out = res?.output;
    rows = Array.isArray(out) ? out : (out?.records || []);
  } catch { rows = []; }

  if (!rows.length) {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `هذا ملف يخص موظفي منشأة. استخرج منه لكل صف موجود: رقم الهوية الوطنية أو رقم الإقامة (10 أرقام) و${labelOf(kind)} بالصيغة YYYY-MM-DD. لا تختلق أي رقم أو تاريخ غير موجود في الملف، وتجاهل الصفوف بلا رقم هوية.`,
      file_urls: [signed_url],
      response_json_schema: EXTRACT_SCHEMA,
    });
    rows = res?.records || [];
  }

  const cleaned = (rows || [])
    .map((r) => ({ national_id: digitsOnly(r?.national_id), expiry_date: normalizeDate(r?.expiry_date) }))
    .filter((r) => r.national_id && r.expiry_date);
  if (!cleaned.length) throw new Error("no_rows");
  return cleaned;
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