/**
 * خصم السلف التلقائي من مسيرات الرواتب — مصدر واحد لمنطق التخصيص والإغلاق.
 *
 * القاعدة: تُخصم السلفة المعتمدة والمصروفة من الراتب مباشرةً ضمن «قسط السلفة» في كل مسير،
 * بقيمة القسط الشهري، وبحد المتبقي. شهرٌ واحد لا يُخصم مرتين مهما تعددت المسيرات فيه،
 * وعند اكتمال السلفة تتوقف عن النزول في المسيرات وتُغلق حالتها تلقائياً.
 */
import { base44 } from "@/api/base44Client";

export const monthKeyOf = (month, year) => `${year}-${String(month).padStart(2, "0")}`;

export const loanRemaining = (loan) =>
  Math.max(0, Number(((Number(loan?.amount) || 0) - (Number(loan?.paid_amount) || 0)).toFixed(2)));

/** السلفة قابلة للخصم بعد صرفها فعلياً للموظف من المالية */
export const isLoanDisbursed = (loan) =>
  !!(loan && (loan.finance_status === "paid" || loan.status === "paid" || loan.status === "completed"));

export const parsePaymentLog = (loan) => {
  try { return JSON.parse(loan?.payment_log || "[]"); } catch { return []; }
};

export const loanLoggedForMonth = (loan, key) => parsePaymentLog(loan).some((p) => p?.month === key);

/** قسط هذا الشهر المستحق على السلفة — صفر إن كانت مغلقة أو مخصومة سابقاً في نفس الشهر */
export function loanInstallmentDue(loan, key) {
  const rem = loanRemaining(loan);
  if (rem <= 0 || !isLoanDisbursed(loan) || loanLoggedForMonth(loan, key)) return 0;
  const count = Math.max(1, Number(loan.installment_count) || 1);
  const monthly = Number(loan.monthly_installment) || (Number(loan.amount) || 0) / count;
  return Number(Math.min(monthly, rem).toFixed(2));
}

/** القسط الواجب على موظف في شهر معيّن (أول سلفة نشطة غير مخصومة هذا الشهر) */
export function dueInstallmentFor(loans, employeeId, key) {
  for (const loan of (loans || []).filter((l) => l.employee_id === employeeId)) {
    const amount = loanInstallmentDue(loan, key);
    if (amount > 0) return amount;
  }
  return 0;
}

/** ملاحظة إغلاق السلفة: إجمالي السلفة · عدد الدفعات · تم استلام · المتبقي */
export const loanSummaryNote = (loan, paid) => {
  const total = Number(loan?.amount) || 0;
  const count = Math.max(1, Number(loan?.installment_count) || 1);
  return `إجمالي السلفة ${total} · عدد الدفعات ${count} · تم استلام ${Number(paid || 0)} · المتبقي ${loanRemaining({ amount: total, paid_amount: paid })}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * إثبات خصم أقساط مسير الرواتب المعتمد على السلف (يُستدعى لحظة الاعتماد).
 * يُحدّث «تم استلام/الكشف» لكل سلفة، ويُغلق السلفة عند اكتمالها.
 * يعيد إجمالي ما تم إثباته.
 */
export async function commitLoanDeductions(rows, { month, year, byName = "" } = {}) {
  const key = monthKeyOf(month, year);
  const targets = (rows || []).filter((r) => Number(r.loan_installment) > 0 && r.employee_id);
  if (targets.length === 0) return 0;

  const loans = await base44.entities.LoanRequest.list("-created_date", 500).catch(() => []);
  const live = (loans || []).map((l) => ({ ...l }));
  let committed = 0;

  for (const row of targets) {
    let amount = Number(row.loan_installment) || 0;
    for (const loan of live.filter((l) => l.employee_id === row.employee_id)) {
      if (amount <= 0) break;
      const due = loanInstallmentDue(loan, key);
      if (due <= 0) continue;
      const take = Number(Math.min(due, amount).toFixed(2));
      const total = Number(loan.amount) || 0;
      const paid = Number(Math.min(total, (Number(loan.paid_amount) || 0) + take).toFixed(2));
      const log = [...parsePaymentLog(loan), { date: todayISO(), month: key, amount: take, by: byName, source: "payroll" }];
      const done = total > 0 && paid >= total;
      await base44.entities.LoanRequest.update(loan.id, {
        paid_amount: paid,
        payment_log: JSON.stringify(log),
        status: done ? "completed" : loan.status,
      });
      // تحديث النسخة المحلية حتى لا يُخصم نفس القسط مرتين في نفس الاستدعاء
      loan.paid_amount = paid;
      loan.payment_log = JSON.stringify(log);
      loan.status = done ? "completed" : loan.status;
      amount = Number((amount - take).toFixed(2));
      committed = Number((committed + take).toFixed(2));
    }
  }
  return committed;
}