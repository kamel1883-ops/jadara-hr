/**
 * مسيرات الرواتب المتعددة داخل الشهر (الدفعات).
 *
 * المنشأة قد تسيّر رواتب جزء من الموظفين فقط وتستثني الباقي، ثم تعود لاحقاً لتسيير
 * مسير جديد لنفس الشهر للمستثنين فقط. كل مسير يحمل رقم دفعة (1 = الأولى، 2 = الثانية…)
 * وتبقى الطبعات والإرسال إلى مدد وكشف الكاش منفصلة لكل دفعة على حِدة.
 */
import { PAID_STATUSES } from "@/lib/payrollCompute";

/** أرقام الدفعات بالعربية/الإنجليزية: الأولى، الثانية … */
export const BATCH_ORDINALS_AR = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
export const BATCH_ORDINALS_EN = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

export function batchOrdinal(n, isAr) {
  const list = isAr ? BATCH_ORDINALS_AR : BATCH_ORDINALS_EN;
  const i = Math.max(1, Number(n) || 1) - 1;
  return list[i] || String(n);
}

/** عنوان الدفعة: «الدفعة الأولى» أو «المسير الأول» بحسب المسار. */
export function batchTitle(n, isAr, kind = "batch") {
  const ord = batchOrdinal(n, isAr);
  if (isAr) return kind === "run" ? `المسير ${ord}` : `الدفعة ${ord}`;
  return `${ord} payroll run`;
}

export function batchOf(p) {
  return Number(p?.batch) || 1;
}

/** عدد الموظفين الذين لم تُعتمد أو تُصرف رواتبهم بعد في هذا الشهر (المستثنون وغير المسيَّرين). */
export function isSettled(record) {
  return PAID_STATUSES.has(record?.status);
}

/** يجمّع صفوف الشهر في دفعات مرتبة تصاعدياً مع إجماليات كل دفعة. */
export function groupByBatch(payrolls, methodOf) {
  const map = new Map();
  for (const p of (payrolls || [])) {
    const n = batchOf(p);
    if (!map.has(n)) map.set(n, []);
    map.get(n).push(p);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([batch, rows]) => {
    const included = rows.filter((r) => r.include_in_payroll !== false);
    const sumOf = (arr) => arr.reduce((s, r) => s + (Number(r.net_salary) || 0), 0);
    const mudad = included.filter((r) => (methodOf ? methodOf(r) : r.salary_payment_method) === "mudad");
    const cash = included.filter((r) => (methodOf ? methodOf(r) : r.salary_payment_method) === "cash");
    return {
      batch, rows, included, mudad, cash,
      count: included.length,
      total: sumOf(included),
      mudadTotal: sumOf(mudad),
      cashTotal: sumOf(cash),
      drafts: rows.filter((r) => r.status === "draft"),
      approved: rows.filter((r) => r.status === "approved"),
      paid: rows.filter((r) => r.status === "paid"),
    };
  });
}

/** رقم الدفعة المفتوحة (التي تحتوي مسودات) — أو null إن كان الشهر مكتملاً ومعتمداً بالكامل. */
export function openBatchNumber(payrolls) {
  const drafts = (payrolls || []).filter((p) => p.status === "draft");
  if (drafts.length === 0) return null;
  return Math.max(...drafts.map(batchOf));
}

export function nextBatchNumber(payrolls) {
  const numbers = (payrolls || []).map(batchOf);
  return (numbers.length ? Math.max(...numbers) : 0) + 1;
}