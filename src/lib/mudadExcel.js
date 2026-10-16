import ExcelJS from "exceljs";
import { gosiRates } from "@/lib/eos";

// مولّد ملف مسير الرواتب لبوابة «مدد» — مطابق للنموذج الرسمي (xlsx)
// شعار مدد أعلى الملف + لوحة الألوان الرسمية + أعمدة محمية مقفولة (A–F).

const BLUE = "FF0070C0";
const LIGHT_GRAY = "FFE6E6E6";
const BORDER_GRAY = "FFD9D9D9";

const BORDER = {
  top: { style: "thin", color: { argb: BORDER_GRAY } },
  bottom: { style: "thin", color: { argb: BORDER_GRAY } },
  left: { style: "thin", color: { argb: BORDER_GRAY } },
  right: { style: "thin", color: { argb: BORDER_GRAY } },
};
const BLUE_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
const GRAY_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };

const HEADERS = [
  "اسم الموظف",
  "رقم هوية الموظف",
  "الراتب الأساسي",
  "بدل السكن",
  "بدل نقل",
  "إجمالي الراتب",
  "خارج دوام (الكمية)",
  "مستحقات أخرى (الكمية)",
  "خصم التأمينات الاجتماعية (نسبة)",
  "غياب (الكمية)",
  "إستقطاعات أخرى (الكمية)",
];

// لون شريط عناوين الأقسام في دليل التعليمات (أزرق فاتح كما في النموذج الرسمي)
const SEC_BAND_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F6FF" } };

// محتوى دليل التعليمات — 5 أقسام بالنص الحرفي للنموذج الرسمي
const GUIDE_SECTIONS = [
  { title: "1: عدم إجراء التعديلات على هذه الحقول", body: [
    { t: "- اسم الموظف", indent: 1 },
    { t: "- رقم هوية الموظف", indent: 1 },
    { t: "- الراتب الأساسي", indent: 1 },
    { t: "- بدل السكن", indent: 1 },
    { t: "- بدل النقل", indent: 1 },
    { t: "- إجمالي الراتب", indent: 1 },
  ]},
  { title: "2: إضافة / حذف الموظفين", body: [
    { t: "- إضافة موظفين:", indent: 1 },
    { t: "لا يمكن إضافة الموظفين مباشرة في هذا الملف، قم بإضافة الموظفين من خلال منصة مدد والتأمينات الاجتماعية، ثم قم بتحميل ملف الرواتب المحدث من صفحة الرواتب الشهرية.", indent: 2 },
    { t: "- حذف موظفين:", indent: 1 },
    { t: "إذا قمت بحذف صف الموظف، سيعتبر النظام الموظف غير مُحدد في مسير الرواتب.", indent: 2 },
  ]},
  { title: "3: لا تدخل القيم التالية في حقول الاستحقاقات والاستقطاعات", body: [
    { t: "- قيم أو أعداد بالسالب", indent: 1 },
    { t: "- الرموز (مثل: @ ، # ، %)", indent: 1 },
    { t: "- الحروف (مثل: أ ، ب ، ج)", indent: 1 },
  ]},
  { title: "4: لإضافة استحقاقات أو استقطاعات إضافية", body: [
    { t: "- انتقل إلى صفحة بيانات المنشأة في النظام", indent: 1 },
    { t: "- اضغط على خانة تفاصيل الراتب", indent: 1 },
    { t: "- قم بتفعيل الاستحقاقات أو الاستقطاعات المطلوبة", indent: 1 },
    { t: "- ثم قم بتحميل ملف الرواتب المحدث من صفحة الرواتب الشهرية", indent: 1 },
  ]},
  { title: "* ملاحظات إضافية", body: [
    { t: "* أي تعديلات خارج هذه التعليمات قد تؤدي إلى أخطاء في النظام", indent: 1 },
    { t: "* يرجى مراجعة جميع الحقول والتأكد من صحة البيانات المدخلة قبل رفع الملف على النظام", indent: 1 },
  ]},
];

function idValue(raw) {
  const s = String(raw ?? "").trim();
  return /^[0-9]+$/.test(s) ? Number(s) : s;
}

// صورة شعار «مدد» الرسمية (أصل مرفوع) — تُدرج داخل الملف كما هي دون رسم
const MUDAD_LOGO_URL =
  "https://media.base44.com/images/public/6a74edc8f347046365c2e1a4/2e6721a29_image.png";

async function fetchMudadLogoBase64() {
  const res = await fetch(MUDAD_LOGO_URL);
  if (!res.ok) throw new Error("logo fetch failed");
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function downloadMudadExcel({ payrolls = [], employees = [], org = null, month, year }) {
  const included = payrolls.filter((p) => p.include_in_payroll !== false);
  const rows = included.filter((p) => p.status === "approved" || p.status === "paid");
  if (rows.length === 0) return 0;

  const empMap = {};
  for (const e of employees) empMap[e.id] = e;

  const wb = new ExcelJS.Workbook();
  wb.creator = "جداره — Jadara HR";
  wb.created = new Date();

  const ws = wb.addWorksheet("ملف مسير الرواتب", {
    views: [{ rightToLeft: true }],
    columns: [
      { width: 30 }, { width: 24 }, { width: 17 }, { width: 15 }, { width: 13 }, { width: 18 },
      { width: 20 }, { width: 22 }, { width: 26 }, { width: 16 }, { width: 24 },
    ],
  });

  // الصفان 1–2: شعار مدد (يمين) + عنوان «ملف مسير الرواتب» (وسط)
  ws.mergeCells("A1:B2");
  ws.mergeCells("C1:K2");
  const titleCell = ws.getCell("C1");
  titleCell.value = "ملف مسير الرواتب";
  titleCell.font = { bold: true, size: 18, color: { argb: BLUE } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 20;

  // تضمين صورة شعار مدد أعلى الملف (الصورة الرسمية كما هي) — تُجلب مرة وتُعاد للورقتين
  let logoBase64 = null;
  try { logoBase64 = await fetchMudadLogoBase64(); } catch (_) {}
  if (logoBase64) {
    const logoId = wb.addImage({ base64: logoBase64, extension: "png" });
    ws.addImage(logoId, { tl: { col: 0.05, row: 0.15 }, ext: { width: 120, height: 44 } });
  }

  // الصف 3 — لافتات الأقسام (أزرق) + لافتة جانب محمي (رمادي) أسفل اللوقو أعلى الجدول
  ws.mergeCells("A3:F3");
  ws.getCell("A3").value = "(هذا الجانب محمي — لا يتم تعديله)";
  ws.mergeCells("G3:H3");
  ws.getCell("G3").value = "الاستحقاقات";
  ws.mergeCells("I3:K3");
  ws.getCell("I3").value = "الاستقطاعات";
  for (const ref of ["A3", "G3", "I3"]) {
    const c = ws.getCell(ref);
    c.border = BORDER;
    c.alignment = { horizontal: "center", vertical: "middle" };
    if (ref === "A3") {
      c.fill = GRAY_FILL;
      c.font = { bold: true, size: 12, color: { argb: "FF000000" } };
    } else {
      c.fill = BLUE_FILL;
      c.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    }
  }
  ws.getRow(3).height = 26;
  // أكمل حدود باقي خلايا الصف 3 (المدمجة)
  for (let col = 1; col <= 11; col++) {
    const c = ws.getRow(3).getCell(col);
    if (!c.border || !c.border.top) {
      c.border = BORDER;
      if (!c.fill || !c.fill.fgColor) {
        c.fill = col <= 6 ? GRAY_FILL : BLUE_FILL;
        if (!c.font || !c.font.color) c.font = { bold: true, color: col <= 6 ? { argb: "FF000000" } : { argb: "FFFFFFFF" } };
      }
    }
  }
  ws.getRow(3).height = 22;

  // الصف 4 — عناوين الأعمدة (رمادي فاتح) + فلتر
  const headerRow = ws.getRow(4);
  HEADERS.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, size: 11, color: { argb: "FF000000" } };
    if (i < 6) c.fill = GRAY_FILL; // الجانب المحمي رمادي، الاستحقاقات/الاستقطاعات أبيض
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = BORDER;
    c.protection = { locked: i < 6 }; // عناوين الجانب المحمي مقفولة، والجانب الآخر قابل للتعديل
  });
  headerRow.height = 52;
  ws.autoFilter = { from: "A4", to: "K4" };

  // الصفوف 5+ — بيانات المسير
  let count = 0;
  for (const p of rows) {
    const emp = empMap[p.employee_id] || { national_id: p.national_id, full_name: p.employee_name };
    const base = Number(p.base_salary) || 0;
    const housing = Number(p.housing_allowance) || 0;
    const transport = Number(p.transport_allowance) || 0;
    const gross = Number((base + housing + transport).toFixed(2));
    const overtime = Number(p.overtime_amount) || 0;
    const otherEarnings = Number(((p.bonus || 0) + (p.other_allowances || 0)).toFixed(2));
    // نسبة حصة الموظف في التأمينات حسب فئة تسجيله (9.75% قبل 3 يوليو 2024 / 10.75% بعدها / 0% للمقيم)
    const gosiPct = emp ? gosiRates({ employee: emp, org }).employee_rate : 0;
    const absent = Number(p.absent_days) || 0;
    const otherDeductions = Number(((p.deductions || 0) + (p.loan_installment || 0)).toFixed(2));

    const row = ws.addRow([
      emp?.full_name || p.employee_name || "",
      idValue(emp?.national_id ?? p.national_id),
      base, housing, transport, gross,
      overtime, otherEarnings, gosiPct, absent, otherDeductions,
    ]);

    row.eachCell({ includeEmpty: true }, (c, col) => {
      c.border = BORDER;
      c.alignment = { vertical: "middle", horizontal: col === 1 ? "right" : "center" };
      c.protection = { locked: col <= 6 };
      if (col <= 6) c.fill = GRAY_FILL;
      if (col === 2 && typeof c.value === "number") c.numFmt = "0";
      if (col >= 3 && col <= 8) c.numFmt = "#,##0.00";
      if (col === 9) c.numFmt = "0.00";
    });
    count++;
  }

  // تفعيل حماية الورقة (بدون كلمة مرور) بحيث لا يمكن تحرير الأعمدة المحمية A–F
  await ws.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: true,
    formatColumns: true,
    formatRows: true,
    insertRows: false,
    insertColumns: false,
    deleteRows: false,
    deleteColumns: false,
    sort: true,
    autoFilter: true,
  });

  // الورقة الثانية — دليل التعليمات (شعار + عنوان + 5 أقسام)
  const ws2 = wb.addWorksheet("دليل التعليمات", { views: [{ rightToLeft: true }] });
  ws2.columns = [
    { width: 4 }, // A (هامش للمظهر فقط)
    { width: 90 }, // B (المحتوى)
  ];
  ws2.getRow(1).height = 34;
  ws2.mergeCells("B1:H1");
  const gTitle = ws2.getCell("B1");
  gTitle.value = "دليل التعليمات";
  gTitle.font = { bold: true, size: 18, color: { argb: BLUE } };
  gTitle.alignment = { horizontal: "center", vertical: "middle" };
  if (logoBase64) {
    const logoId2 = wb.addImage({ base64: logoBase64, extension: "png" });
    ws2.addImage(logoId2, { tl: { col: 0.05, row: 0.2 }, ext: { width: 120, height: 44 } });
  }

  let r = 3;
  for (const sec of GUIDE_SECTIONS) {
    const sRow = ws2.getRow(r);
    const sc = sRow.getCell(2);
    sc.value = sec.title;
    sc.font = { bold: true, size: 13, color: { argb: "FF1A2336" } };
    sc.fill = SEC_BAND_FILL;
    sc.alignment = { horizontal: "right", vertical: "middle" };
    sRow.height = 24;
    r++;
    for (const item of sec.body) {
      const row = ws2.getRow(r);
      const cell = row.getCell(2);
      cell.value = item.t;
      cell.alignment = { horizontal: "right", vertical: "top", wrapText: true, indent: item.indent || 0 };
      cell.font = { size: 11, color: { argb: "FF000000" } };
      row.height = item.t.length > 70 ? 34 : 20;
      r++;
    }
    r++; // سطر فاصل بين الأقسام
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const mm = String(month).padStart(2, "0");
  a.download = `Mudad_Payroll_${org?.unified_number || org?.name || "EST"}_${year}-${mm}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return count;
}