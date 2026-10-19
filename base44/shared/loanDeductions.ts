/**
 * منطق خصم السلف من مسيرات الرواتب — مرآة خادمية لـ src/lib/loanDeduction.js
 * (تُستخدم في إجراءات بوابة الموظف المُفوّض بصلاحية الرواتب).
 */

export const monthKeyOf = (month: number, year: number) => `${year}-${String(month).padStart(2, "0")}`;

export const loanRemaining = (loan: any) =>
  Math.max(0, Number(((Number(loan?.amount) || 0) - (Number(loan?.paid_amount) || 0)).toFixed(2)));

export const isLoanDisbursed = (loan: any) =>
  !!(loan && (loan.finance_status === "paid" || loan.status === "paid" || loan.status === "completed"));

export const parsePaymentLog = (loan: any): any[] => {
  try { return JSON.parse(loan?.payment_log || "[]"); } catch { return []; }
};

export const loanLoggedForMonth = (loan: any, key: string) => parsePaymentLog(loan).some((p) => p?.month === key);

export function loanInstallmentDue(loan: any, key: string) {
  const rem = loanRemaining(loan);
  if (rem <= 0 || !isLoanDisbursed(loan) || loanLoggedForMonth(loan, key)) return 0;
  const count = Math.max(1, Number(loan.installment_count) || 1);
  const monthly = Number(loan.monthly_installment) || (Number(loan.amount) || 0) / count;
  return Number(Math.min(monthly, rem).toFixed(2));
}

export function dueInstallmentFor(loans: any[], employeeId: string, key: string) {
  for (const loan of (loans || []).filter((l) => l.employee_id === employeeId)) {
    const amount = loanInstallmentDue(loan, key);
    if (amount > 0) return amount;
  }
  return 0;
}

/**
 * تخطيط إثبات خصم قسط على سلفة — يُعيد التحديث المطلوب أو null إن لا قسط مستحق.
 * يخصم بحد المتبقي ويُغلق السلفة عند اكتمالها.
 */
export function planLoanDeduction(loan: any, key: string, wantAmount: number, meta: { by?: string; date?: string } = {}) {
  const due = loanInstallmentDue(loan, key);
  if (due <= 0) return null;
  const take = Number(Math.min(due, Math.max(0, Number(wantAmount) || 0)).toFixed(2));
  if (take <= 0) return null;
  const total = Number(loan.amount) || 0;
  const paid = Number(Math.min(total, (Number(loan.paid_amount) || 0) + take).toFixed(2));
  const log = [...parsePaymentLog(loan), { date: meta.date, month: key, amount: take, by: meta.by || "", source: "payroll" }];
  const done = total > 0 && paid >= total;
  return { id: loan.id, amount: take, patch: { paid_amount: paid, payment_log: JSON.stringify(log), status: done ? "completed" : loan.status } };
}