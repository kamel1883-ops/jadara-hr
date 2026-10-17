import React from "react";
import { base44 } from "@/api/base44Client";
import { renderToPdfBlob } from "@/lib/pdfDocs";
import { archiveBlobToVault } from "@/lib/vaultDocuments";
import saveLeaveDocument from "@/lib/saveLeaveDocument";
import { enrichEmployee } from "@/lib/vaultSensitive";
import { entitledLeaveDays, usedLeaveTotal } from "@/lib/leaveBalance";
import LeaveClearanceDoc from "@/components/docs/LeaveClearanceDoc";
import LoanStatementDoc from "@/components/docs/LoanStatementDoc";
import BusinessTripApprovalDoc from "@/components/docs/BusinessTripApprovalDoc";

async function employeeForDoc(emp) {
  if (!emp?.emp_ref) return emp;
  return enrichEmployee(emp);
}

// مخالصة تصفية إجازة — تُولّد PDF، تُرفع، وتُخزّن على الطلب + تُرجع الرابط
export async function generateLeaveSettlement(leave, emp, org, allLeavesForEmp) {
  const asOf = leave?.start_date ? new Date(leave.start_date) : new Date();
  const entitled = entitledLeaveDays(emp, org, asOf);
  const granted = Number(leave?.balance_deducted) || 0;
  // المستخدم الكلي قبل هذا الطلب = الرصيد الافتتاحي (prior_used_leave) + المعتمد داخل النظام عدا هذا الطلب.
  // مهم: تُحصر القائمة على إجازات هذا الموظف فقط — القائمة الممرّرة قد تكون لكل الموظفين.
  const empId = emp?.id || leave?.employee_id;
  const usedBefore = usedLeaveTotal(
    emp,
    (allLeavesForEmp || []).filter((l) => l.id !== leave?.id && l.employee_id === empId)
  );
  // القيم الصريحة بلا تصفير: صفر يُكتب صفر، ومتجاوز الاستحقاق يظهر بالسالب في المخالصة.
  const bBefore = Math.round((entitled - usedBefore) * 10) / 10;
  const bAfter = Math.round((bBefore - granted) * 10) / 10;
  const mw = (Number(emp?.base_salary) || 0) + (Number(emp?.housing_allowance) || 0) + (Number(emp?.transport_allowance) || 0) + (Number(emp?.other_allowances) || 0);
  const dailyWage = mw / 30;
  const daysCash = (leave?.leave_type === "annual" || leave?.is_full_clearance) ? Math.round(granted * dailyWage * 100) / 100 : 0;

  const employee = await employeeForDoc(emp);
  const blob = await renderToPdfBlob(
    <LeaveClearanceDoc employee={employee} leave={leave} org={org} balanceBefore={bBefore} balanceAfter={bAfter} daysCash={daysCash} dailyWage={dailyWage} />
  );
  // نجاح العملية يعني أن الخزنة أعادت مرجعاً وأن المرجع حُفظ على الطلب، لا مجرد توليد PDF.
  return saveLeaveDocument(blob, leave.id, { balance_before: bBefore, balance_after: bAfter });
}

// كشف سلفة — تُولّد PDF محدّث بالمدفوع/المتبقي وتُخزّن على الطلب
export async function generateLoanStatement(loan, emp, org) {
  const employee = await employeeForDoc(emp);
  const blob = await renderToPdfBlob(<LoanStatementDoc employee={employee} loan={loan} org={org} />);
  const url = await archiveBlobToVault(blob, { fileName: `loan-statement-${loan.id}.pdf`, empRef: employee?.emp_ref || null, docType: "loan_statement" });
  if (url) await base44.entities.LoanRequest.update(loan.id, { statement_pdf_url: url });
  return url || loan?.statement_pdf_url || "";
}

// مستند موافقة الانتداب — يُولّد PDF بتفاصيل الرحلة والملاحظات ويُخزّن على الطلب، ويُرجع الرابط
export async function generateBusinessTripApproval(trip, emp, org) {
  const employee = await employeeForDoc(emp);
  const blob = await renderToPdfBlob(<BusinessTripApprovalDoc employee={employee} trip={trip} org={org} />);
  const url = await archiveBlobToVault(blob, { fileName: `trip-approval-${trip.id}.pdf`, empRef: employee?.emp_ref || null, docType: "trip_approval" });
  if (url) await base44.entities.BusinessTrip.update(trip.id, { approval_pdf_url: url });
  return url || trip?.approval_pdf_url || "";
}