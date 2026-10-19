import ExcelJS from "exceljs";

// مولّد كشف رواتب الكاش (xlsx) — للموظفين الذين يُصرف راتبهم نقداً
// ورقة عمل واحدة، ترويسة جداره، أعمدة الرواتب، صف الإجمالي، عمود توقيع الاستلام.

const NAVY = "FF0B2545";
const GOLD = "FFB6901F";
const LIGHT = "FFF6ECC8";
const BORDER_GRAY = "FFD9D9D9";
const BORDER = {
  top: { style: "thin", color: { argb: BORDER_GRAY } },
  bottom: { style: "thin", color: { argb: BORDER_GRAY } },
  left: { style: "thin", color: { argb: BORDER_GRAY } },
  right: { style: "thin", color: { argb: BORDER_GRAY } },
};
const NAVY_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
const GOLD_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
const LIGHT_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };

const HEADERS = [
  "م",
  "اسم الموظف",
  "الهوية/الإقامة",
  "الراتب الأساسي",
  "بدل السكن",
  "بدل المواصلات",
  "بدلات أخرى",
  "إجمالي الراتب",
  "حافز",
  "عمل إضافي",
  "خصم الغياب",
  "خصومات أخرى",
  "قسط السلفة",
  "صافي الراتب",
  "توقيع الاستلام",
];

export async function downloadCashPayrollExcel({ payrolls = [], employees = [], month, year, monthName, batch = null }) {
  const included = payrolls.filter((p) => p.include_in_payroll !== false);
  if (included.length === 0) return 0;

  const empMap = {};
  for (const e of employees) empMap[e.id] = e;

  const wb = new ExcelJS.Workbook();
  wb.creator = "جداره — Jadara HR";
  wb.created = new Date();

  const ws = wb.addWorksheet("رواتب الكاش", {
    views: [{ rightToLeft: true }],
    columns: [
      { width: 6 }, { width: 28 }, { width: 20 }, { width: 16 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 16 }, { width: 12 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 24 },
    ],
  });

  // الترويسة — جداره (يسار) + بيانات كشف الكاش (يمين)
  ws.mergeCells("A1:E1");
  ws.mergeCells("F1:O1");
  const brand = ws.getCell("A1");
  brand.value = "جداره — Jadara HR";
  brand.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  brand.fill = NAVY_FILL;
  brand.alignment = { horizontal: "center", vertical: "middle" };
  const title = ws.getCell("F1");
  title.value = `كشف رواتب الكاش — ${monthName} ${year}`;
  title.font = { bold: true, size: 16, color: { argb: "FF0B2545" } };
  title.fill = LIGHT_FILL;
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;
  for (let c = 1; c <= 15; c++) ws.getRow(1).getCell(c).border = BORDER;

  // صف عناوين الأعمدة
  const hr = ws.getRow(2);
  HEADERS.forEach((h, i) => {
    const c = hr.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    c.fill = NAVY_FILL;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = BORDER;
  });
  hr.height = 40;

  let count = 0;
  let totalBase = 0, totalHousing = 0, totalTransport = 0, totalOther = 0;
  let totalGross = 0, totalBonus = 0, totalOvertime = 0;
  let totalAbsentDed = 0, totalDed = 0, totalLoan = 0, totalNet = 0;

  for (const p of included) {
    const emp = empMap[p.employee_id] || {};
    const base = Number(p.base_salary) || 0;
    const housing = Number(p.housing_allowance) || 0;
    const transport = Number(p.transport_allowance) || 0;
    const other = Number(p.other_allowances) || 0;
    const gross = Number(p.gross_salary) || (base + housing + transport + other);
    const bonus = Number(p.bonus) || 0;
    const overtime = Number(p.overtime_amount) || 0;
    const absentDed = Number(p.deductions) || 0;
    const otherDed = 0;
    const loan = Number(p.loan_installment) || 0;
    const net = Number(p.net_salary) || 0;

    totalBase += base; totalHousing += housing; totalTransport += transport; totalOther += other;
    totalGross += gross; totalBonus += bonus; totalOvertime += overtime;
    totalAbsentDed += absentDed; totalDed += otherDed; totalLoan += loan; totalNet += net;

    const row = ws.addRow([
      count + 1,
      emp.full_name || p.employee_name || "",
      emp.national_id || p.national_id || "",
      base, housing, transport, other, gross,
      bonus, overtime, absentDed, otherDed, loan, net, "",
    ]);
    row.eachCell({ includeEmpty: true }, (c, col) => {
      c.border = BORDER;
      c.alignment = { vertical: "middle", horizontal: col === 2 ? "right" : col === 15 ? "center" : "center" };
      if (col >= 4 && col <= 14) c.numFmt = "#,##0.00";
      if (count % 2 === 1) c.fill = LIGHT_FILL;
    });
    count++;
  }

  // صف الإجمالي
  const tr = ws.addRow([
    "", "الإجمالي", "",
    totalBase, totalHousing, totalTransport, totalOther, totalGross,
    totalBonus, totalOvertime, totalAbsentDed, totalDed, totalLoan, totalNet, "",
  ]);
  tr.eachCell({ includeEmpty: true }, (c, col) => {
    c.border = BORDER;
    c.fill = GOLD_FILL;
    c.font = { bold: true, color: { argb: "FF3A2A09" } };
    c.alignment = { horizontal: col === 2 ? "right" : "center", vertical: "middle" };
    if (col >= 4 && col <= 14) c.numFmt = "#,##0.00";
  });
  tr.height = 26;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const mm = String(month).padStart(2, "0");
  a.download = `Cash_Payroll_${year}-${mm}${batch ? `_Batch${batch}` : ""}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return count;
}