import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Download, Upload, FileSpreadsheet, Loader2, BadgeCheck, AlertTriangle,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useI18n } from "@/lib/i18n";
import { parseEmployeeFile } from "@/lib/employeeImport";
import ExcelJS from "exceljs";

const TEMPLATE_HEADERS = [
  "الاسم الكامل", "الرقم الوظيفي", "الهوية الوطنية / رقم الإقامة", "البريد الإلكتروني",
  "سعودي (نعم/لا)", "الجنس (ذكر/أنثى)", "تاريخ الميلاد", "رقم الجوال",
  "الإدارة / القسم", "الفرع", "المسمى الوظيفي", "الدرجة الوظيفية",
  "المستوى الوظيفي (owner/executive/manager/supervisor/employee/worker)", "تاريخ المباشرة",
  "إجمالي رصيد الإجازات المستحق",
  "رصيد الإجازات المستخدم",
  "رصيد الإجازات المتبقي (تلقائي)",
  "نوع العقد (دوام كامل/جزئي/عقد)", "تاريخ بدء العقد", "تاريخ نهاية العقد",
  "الراتب الأساسي", "بدل السكن", "بدل المواصلات",
  "بدلات أخرى", "تاريخ انتهاء الإقامة", "رقم الجواز", "تاريخ انتهاء الجواز",
  "رقم التأمين الطبي", "تاريخ انتهاء التأمين الطبي", "الحساب البنكي",
  "طريقة صرف الراتب (مدد/كاش)",
  "الجنسية", "العنوان", "جهة الاتصال الطارئ",
  "الرصيد السنوي للإجازات (21/30)",
  "استحقاق التذكرة (سنوي/كل سنتين/لا)", "قيمة التذكرة (ريال)",
  "الرقم الوظيفي للمدير المباشر",
];

export default function EmployeeImport({ open, onClose, onSaved }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "استيراد الموظفين عبر Excel",
    desc: "حمّل القالب، عبّئ بيانات موظفيك (مع تحديد الفرع لكل موظف)، ثم ارفع الملف. اضغط «استيراد الآن» للتحقق ومعاينة الموظفين المكتشَفين، ثم أكّد إضافتهم إلى المنشأة.",
    download: "تحميل قالب Excel (XLSX)",
    upload: "اختر ملف Excel/CSV",
    importing: "جارٍ التحليل والتحقق…",
    import: "استيراد الآن",
    close: "إغلاق",
    supported: "صيغ مدعومة: Excel (xlsx) و CSV — يجب أن تحتوي الأعمدة على نفس حقول القالب.",
    result: "نتيجة التحقق",
    detected: "تم التعرف عليها", valid: "صالحة للاستيراد", duplicate: "مكرر (موجود)", incomplete: "ناقصة حقول",
    incompleteTitle: "صفوف ناقصة حقول إلزامية",
    issuesTitle: "أخطاء مكتشفة في الملف",
    issuesHint: "الترقيم يبدأ من أول موظف في الملف (وليس رقم صف الإكسل) — افتح الملف وصحّح الموظف المذكور برقمه.",
    validList: "الموظفون الصالحون",
    entitledHint: "الإجمالي المستحق: يُحسب في النظام من تاريخ المباشرة حتى تاريخ رفع الملف (اليوم) بمعدل 21 أو 30 يوماً بالسنة، و30 إلزامياً بعد 5 سنوات، ثم يُقارن برقم الإكسل. يُقبل الملف إذا كان الفرق 3 أيام أو أقل لكل موظف؛ وما تجاوز ذلك يُرفض الملف كاملاً. الرصيد المستخدم يُعتمد كما هو من الملف.",
    matchOk: (excel, sys) => `مطابق (الإكسل ${excel} · النظام ${sys})`,
    matchDiff: (diff) => `غير مطابق — الفرق ${diff} يوم`,
    rejectedTitle: "الملف غير مقبول — إجمالي رصيد الإجازات المستحق",
    rejectedHint: "هؤلاء الموظفون تجاوز فرق إجمالي الرصيد المستحق بين الإكسل وحساب النظام من تاريخ المباشرة حدّ الثلاثة أيام. لا يتم استيراد أي موظف من هذا الملف حتى تصحيح الأرقام وإعادة الرفع.",
    rejectedBanner: "الملف غير مقبول: صحّح عمود «إجمالي رصيد الإجازات المستحق» ثم أعد رفع الملف.",
    colEmployee: "الموظف", colHire: "تاريخ المباشرة", colExcel: "إجمالي الإكسل", colSystem: "حساب النظام", colDiff: "الفرق", colRate: "المعدل",
    confirmQ: "هل ترغب بإضافة هؤلاء الموظفين إلى المنشأة؟ سيتم تثبيتهم في قائمة الموظفين النشطين.",
    confirmBtn: "إضافة الموظفين إلى المنشأة",
    adding: "جارٍ الإضافة…",
    successTitle: "تمت الإضافة بنجاح",
    successBody: (n) => `تم تثبيت ${n} موظف في قائمة الموظفين النشطين.`,
    noValid: "لا توجد موظفون صالحون للاستيراد في هذا الملف. صحّح الصفوف الناقصة ثم أعد المحاولة.",
    errEmpty: "لم يتم العثور على صفوف بيانات في الملف — تأكد من استخدام قالب جداره.",
    errGeneric: "تعذّر قراءة الملف، تأكد من تطابق الأعمدة مع القالب",
  } : {
    title: "Import Employees via Excel",
    desc: "Download the template, fill your staff data (set the branch per employee), then upload. Click 'Import now' to verify and preview detected employees, then confirm adding them to the organization.",
    download: "Download Excel template (XLSX)",
    upload: "Choose an Excel/CSV file",
    importing: "Analyzing & verifying…",
    import: "Import now",
    close: "Close",
    supported: "Supported formats: CSV / Excel (xlsx) — columns must match the template.",
    result: "Verification result",
    detected: "Detected", valid: "Valid to import", duplicate: "Duplicate (exists)", incomplete: "Missing fields",
    incompleteTitle: "Rows missing required fields",
    issuesTitle: "Issues found in the file",
    issuesHint: "Numbering starts from the first employee in the file (not the Excel row number).",
    validList: "Valid employees",
    entitledHint: "Total entitlement is computed in the system from the hire date up to the file upload date (today) at 21 or 30 days/year, 30 mandatory after 5 years, then compared with the Excel figure. The file is accepted when the difference is 3 days or fewer per employee; anything beyond rejects the whole file. The used balance is adopted as-is from the file.",
    matchOk: (excel, sys) => `Matched (Excel ${excel} · system ${sys})`,
    matchDiff: (diff) => `Mismatch — difference ${diff} days`,
    rejectedTitle: "File not accepted — total accrued leave balance",
    rejectedHint: "These employees' total accrued balance differs from the system calculation from the hire date by more than three days. No employee is imported from this file until the figures are corrected and re-uploaded.",
    rejectedBanner: "File not accepted: fix the 'Total Accrued Leave Balance' column, then re-upload the file.",
    colEmployee: "Employee", colHire: "Hire date", colExcel: "Excel total", colSystem: "System", colDiff: "Diff", colRate: "Rate",
    confirmQ: "Do you want to add these employees to the organization? They will be confirmed in the active employees list.",
    confirmBtn: "Add employees to organization",
    adding: "Adding…",
    successTitle: "Added successfully",
    successBody: (n) => `${n} employee(s) confirmed in the active employees list.`,
    noValid: "No valid employees to import in this file. Fix the incomplete rows and retry.",
    errEmpty: "No data rows found in the file — make sure you used the Jadara template.",
    errGeneric: "Could not read the file, make sure columns match the template",
  };

  const [file, setFile] = useState(null);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [savedCount, setSavedCount] = useState(null);
  const [err, setErr] = useState("");

  const reset = () => {
    setFile(null); setParsedRecords([]); setBusy(false); setSaving(false);
    setPreview(null); setSavedCount(null); setErr("");
  };
  const handleClose = () => { reset(); onClose(); };

  const downloadTemplate = async () => {
    setDlBusy(true);
    let mainName = "الفرع الرئيسي";
    try {
      const branches = await base44.entities.Branch.list("-is_main", 500);
      const main = branches.find((b) => b.is_main) || branches[0];
      if (main) mainName = main.name;
    } catch (_) {}
    setDlBusy(false);

    const colLetter = (n) => { let s = ""; let nn = n + 1; while (nn > 0) { const r = (nn - 1) % 26; s = String.fromCharCode(65 + r) + s; nn = Math.floor((nn - 1) / 26); } return s; };
    const totalIdx = TEMPLATE_HEADERS.indexOf("إجمالي رصيد الإجازات المستحق");
    const usedIdx = TEMPLATE_HEADERS.indexOf("رصيد الإجازات المستخدم");
    const remIdx = TEMPLATE_HEADERS.indexOf("رصيد الإجازات المتبقي (تلقائي)");
    const totalCol = colLetter(totalIdx);
    const usedCol = colLetter(usedIdx);

    const sample = [
      "محمد عبدالله", "1001", "1234567890", "mohammed@company.sa", "نعم", "ذكر",
      "1990-01-15", "0551234567", "المبيعات", mainName, "مندوب مبيعات",
      "الثالثة", "employee", "2023-03-01",
      "21", "10", `=${totalCol}2-${usedCol}2`,
      "دوام كامل", "2023-03-01", "2024-03-01",
      "8000", "1000", "500", "0",
      "2027-05-01", "X1234567", "2030-01-01", "T123456", "2026-12-31", "SA00001234",
      "مدد", "السعودية", "الرياض", "0559876543",
      "21", "سنوي", "0",
      "1000",
    ];

    const extraRows = 40;
    const rows = [TEMPLATE_HEADERS, sample];
    for (let i = 0; i < extraRows; i++) {
      const row = TEMPLATE_HEADERS.map(() => "");
      row[remIdx] = `=${totalCol}${3 + i}-${usedCol}${3 + i}`;
      rows.push(row);
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(isAr ? "الموظفون" : "Employees", { views: [{ rightToLeft: isAr }] });
    rows.forEach((r) => ws.addRow(r.map((c) => (typeof c === "string" && c.startsWith("=") ? { formula: c.slice(1) } : c))));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).height = 28;
    ws.columns = TEMPLATE_HEADERS.map((h) => ({ width: Math.min(38, Math.max(14, h.length + 4)) }));
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isAr ? "قالب_موظفي_جداره.xlsx" : "jadara_employees_template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // الخطوة 1: تحليل الملف في المتصفح + التحقق عبر الدالة (بدون حفظ)
  const runVerify = async () => {
    if (!file) return;
    setBusy(true); setErr(""); setPreview(null); setSavedCount(null);
    try {
      const records = await parseEmployeeFile(file);
      if (!records.length) { setErr(t.errEmpty); return; }
      setParsedRecords(records);
      const res = await base44.functions.invoke("importEmployees", { records, confirm: false });
      const data = res?.data || res;
      if (data?.error) { setErr(data.error); return; }
      setPreview(data);
    } catch (e) {
      setErr(e?.message || t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  // الخطوة 2: التأكيد — إنشاء الموظفين فعلياً في قائمة الموظفين النشطين
  const runConfirm = async () => {
    if (!parsedRecords.length) return;
    setSaving(true); setErr("");
    try {
      const res = await base44.functions.invoke("importEmployees", { records: parsedRecords, confirm: true });
      const data = res?.data || res;
      if (data?.error) { setErr(data.error); return; }
      setSavedCount(data.saved || 0);
      if (onSaved) onSaved();
    } catch (e) {
      setErr(e?.message || t.errGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy && !saving) handleClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet size={18} /> {t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <div className="text-sm font-medium text-violet-700 mb-2">{t.download}</div>
            <Button type="button" variant="outline" onClick={downloadTemplate} disabled={dlBusy} className="gap-2">
              {dlBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {t.download}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">{t.supported}</p>
          </div>

          <div className="rounded-2xl border border-border p-4 space-y-3">
            <Label>{t.upload}</Label>
            <label className="flex items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-violet-400 hover:bg-violet-50/40 transition px-4 py-6">
              <Upload size={18} className="text-violet-600" />
              <span className="text-sm text-muted-foreground">{file ? file.name : t.upload}</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setSavedCount(null); setErr(""); }} />
            </label>

            {err && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{err}</div>}

            {/* الخطوة 1: نتيجة التحقق والمعاينة */}
            {preview && savedCount == null && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm"><BadgeCheck size={16} /> {t.result}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <Metric label={t.detected} value={preview.detected} />
                  <Metric label={t.valid} value={preview.valid} tone="emerald" />
                  <Metric label={t.duplicate} value={preview.duplicate} tone="amber" />
                  <Metric label={t.incomplete} value={preview.incomplete_count} tone="rose" />
                </div>

                {(preview.issues?.length > 0) && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 text-sm font-medium"><AlertTriangle size={14} /> {t.issuesTitle}</div>
                    <p className="text-[11px] text-rose-600">{t.issuesHint}</p>
                    <div className="max-h-52 overflow-y-auto space-y-1.5 text-xs">
                      {preview.issues.map((iss, i) => (
                        <div key={i} className="rounded-lg bg-white border border-rose-200 px-2.5 py-1.5">
                          <div className="font-bold text-rose-700">
                            {isAr ? `الموظف رقم ${iss.row}` : `Employee #${iss.row}`}
                            {iss.name && iss.name !== "—" ? ` — ${iss.name}` : ""}
                            {iss.employee_number && iss.employee_number !== "—" ? ` (${iss.employee_number})` : ""}
                          </div>
                          <ul className="list-disc ps-4 mt-0.5 text-rose-700">
                            {iss.problems.map((p, j) => <li key={j}>{p}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {preview.valid > 0 && (
                  <div className="rounded-xl bg-white border border-border p-3 space-y-1.5">
                    <div className="text-sm font-medium text-emerald-700">{t.validList} ({preview.valid})</div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{t.entitledHint}</p>
                    <div className="max-h-44 overflow-y-auto divide-y divide-border">
                      {preview.preview.map((e, i) => (
                        <div key={i} className="py-1.5 flex items-center justify-between text-xs gap-2">
                          <span className="font-medium">
                            {e.full_name} <span className="text-muted-foreground">({e.employee_number})</span>
                            {e.entitled_match != null && (
                              <span className={e.entitled_match ? "ms-2 text-emerald-600" : "ms-2 text-rose-600"}>
                                · {e.entitled_match ? t.matchOk(e.entitled_excel, e.entitled_system) : t.matchDiff(e.entitled_diff)}
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground text-left">{e.department} · {e.branch_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {preview.entitlement_rejected && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 text-sm font-medium"><AlertTriangle size={14} /> {t.rejectedTitle}</div>
                    <p className="text-[11px] leading-relaxed text-rose-600">{t.rejectedHint}</p>
                    <div className="max-h-56 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-rose-700">
                            <th className="text-start font-semibold py-1 pe-2">{t.colEmployee}</th>
                            <th className="text-start font-semibold py-1 pe-2">{t.colHire}</th>
                            <th className="text-start font-semibold py-1 pe-2">{t.colRate}</th>
                            <th className="text-start font-semibold py-1 pe-2">{t.colExcel}</th>
                            <th className="text-start font-semibold py-1 pe-2">{t.colSystem}</th>
                            <th className="text-start font-semibold py-1">{t.colDiff}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-200">
                          {preview.entitlement_mismatches.map((m, i) => (
                            <tr key={i}>
                              <td className="py-1.5 pe-2 font-medium">{m.name}<span className="text-muted-foreground"> ({m.employee_number})</span></td>
                              <td className="py-1.5 pe-2">{m.hire_date}</td>
                              <td className="py-1.5 pe-2">{m.annual_days}</td>
                              <td className="py-1.5 pe-2">{m.entitled_excel}</td>
                              <td className="py-1.5 pe-2">{m.entitled_system}</td>
                              <td className="py-1.5 font-bold">{m.entitled_diff > 0 ? `+${m.entitled_diff}` : m.entitled_diff}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {preview.entitlement_rejected ? (
                  <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">{t.rejectedBanner}</div>
                ) : preview.valid > 0 ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                    <div className="text-sm text-violet-700 font-medium">{t.confirmQ}</div>
                    <Button type="button" onClick={runConfirm} disabled={saving} className="gap-2 w-full">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                      {saving ? t.adding : `${t.confirmBtn} (${preview.valid})`}
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">{t.noValid}</div>
                )}
              </div>
            )}

            {/* الخطوة 2: تمت الإضافة */}
            {savedCount != null && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-medium"><BadgeCheck size={18} /> {t.successTitle}</div>
                <div className="text-sm">{t.successBody(savedCount)}</div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose} disabled={busy || saving}>{t.close}</Button>
              <Button type="button" onClick={runVerify} disabled={!file || busy || saving} className="gap-2 min-w-[140px]">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {busy ? t.importing : t.import}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, tone }) {
  const cls = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "rose" ? "text-rose-700" : tone === "violet" ? "text-violet-700" : "text-foreground";
  return (
    <div className="rounded-lg bg-white border border-border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${cls}`}>{value ?? 0}</div>
    </div>
  );
}