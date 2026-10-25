import ExcelJS from "exceljs";

// خريطة عناوين القالب العربية → مفاتيح الحقول
const HEADER_TO_KEY = {
  "الاسم الكامل": "full_name",
  "الرقم الوظيفي": "employee_number",
  "الهوية الوطنية / رقم الإقامة": "national_id",
  "البريد الإلكتروني": "email",
  "سعودي (نعم/لا)": "is_saudi",
  "الجنس (ذكر/أنثى)": "gender",
  "تاريخ الميلاد": "birth_date",
  "رقم الجوال": "phone",
  "الإدارة / القسم": "department",
  "الفرع": "branch_name",
  "المسمى الوظيفي": "position",
  "الدرجة الوظيفية": "job_grade",
  "المستوى الوظيفي (owner/executive/manager/supervisor/employee/worker)": "role_level",
  "تاريخ المباشرة": "hire_date",
  "رصيد الإجازات المستخدم": "leave_used",
  "نوع العقد (دوام كامل/جزئي/عقد)": "contract_type",
  "تاريخ بدء العقد": "contract_start_date",
  "تاريخ نهاية العقد": "contract_end_date",
  "الراتب الأساسي": "base_salary",
  "بدل السكن": "housing_allowance",
  "بدل المواصلات": "transport_allowance",
  "بدلات أخرى": "other_allowances",
  "تاريخ انتهاء الإقامة": "iqama_expiry",
  "رقم الجواز": "passport_number",
  "تاريخ انتهاء الجواز": "passport_expiry",
  "رقم التأمين الطبي": "health_insurance_number",
  "تاريخ انتهاء التأمين الطبي": "health_insurance_expiry",
  "الحساب البنكي": "bank_account",
  "طريقة صرف الراتب (مدد/كاش)": "salary_payment_method",
  "الجنسية": "nationality",
  "العنوان": "address",
  "جهة الاتصال الطارئ": "emergency_contact",
  "الرصيد السنوي للإجازات (21/30)": "annual_leave_entitlement",
  "استحقاق التذكرة (سنوي/كل سنتين/لا)": "ticket_entitlement",
  "قيمة التذكرة (ريال)": "ticket_value",
  "الرقم الوظيفي للمدير المباشر": "manager_employee_number",
  // === عناوين القالب الإنجليزية ===
  "Full Name": "full_name",
  "Employee ID": "employee_number",
  "National ID / Iqama Number": "national_id",
  "Email": "email",
  "Saudi (Yes/No)": "is_saudi",
  "Gender (Male/Female)": "gender",
  "Date of Birth": "birth_date",
  "Mobile Number": "phone",
  "Department / Section": "department",
  "Branch": "branch_name",
  "Job Title": "position",
  "Job Grade": "job_grade",
  "Job Level (owner/executive/manager/supervisor/employee/worker)": "role_level",
  "Start Date": "hire_date",
  "Used Leave Balance": "leave_used",
  "Contract Type (Full-time/Part-time/Contract)": "contract_type",
  "Contract Start Date": "contract_start_date",
  "Contract End Date": "contract_end_date",
  "Basic Salary": "base_salary",
  "Housing Allowance": "housing_allowance",
  "Transportation Allowance": "transport_allowance",
  "Other Allowances": "other_allowances",
  "Iqama Expiry Date": "iqama_expiry",
  "Passport Number": "passport_number",
  "Passport Expiry Date": "passport_expiry",
  "Medical Insurance Number": "health_insurance_number",
  "Medical Insurance Expiry Date": "health_insurance_expiry",
  "Bank Account": "bank_account",
  "Salary Payment Method (Madad/Cash)": "salary_payment_method",
  "Nationality": "nationality",
  "Address": "address",
  "Emergency Contact": "emergency_contact",
  "Annual Leave Balance (21/30)": "annual_leave_entitlement",
  "Ticket Entitlement (Annual/Every 2 Years/No)": "ticket_entitlement",
  "Ticket Value (SAR)": "ticket_value",
  "Direct Manager Employee ID": "manager_employee_number",
};

// === أسماء بديلة شائعة لكل حقل (عربي/إنجليزي) ===
// تسمح للنظام بالتعرّف على الأعمدة حتى لو غيّر المستخدم العنوان قليلاً أو استخدم
// ترويسة مختلفة (مثلاً: «الإدارة» أو «القسم» أو «Department» بدلاً من العنوان الكامل).
const HEADER_ALIASES = {
  full_name: ["الاسم الكامل", "الاسم", "اسم الموظف", "اسم", "Full Name", "Name", "Employee Name", "Worker Name"],
  employee_number: ["الرقم الوظيفي", "الرقم الموظف", "رقم الموظف", "الرقم", "Employee ID", "Emp ID", "ID", "Employee Number", "Staff ID"],
  national_id: ["الهوية الوطنية / رقم الإقامة", "الهوية الوطنية", "رقم الهوية", "الهوية", "رقم الإقامة", "الإقامة", "National ID / Iqama Number", "National ID", "Iqama Number", "Iqama", "ID Number"],
  email: ["البريد الإلكتروني", "البريد", "الايميل", "Email", "E-mail", "Mail"],
  is_saudi: ["سعودي (نعم/لا)", "سعودي", "السعودية", "الجنسية سعودي", "Saudi (Yes/No)", "Saudi", "Is Saudi", "Saudi?","KSA"],
  gender: ["الجنس (ذكر/أنثى)", "الجنس", "Gender (Male/Female)", "Gender", "Sex"],
  birth_date: ["تاريخ الميلاد", "الميلاد", "تاريخ الولادة", "Date of Birth", "DOB", "Birth Date"],
  phone: ["رقم الجوال", "الجوال", "رقم الهاتف", "الهاتف", "الموبايل", "Mobile Number", "Phone", "Mobile", "Phone Number", "Contact Number"],
  department: ["الإدارة / القسم", "الإدارة", "الادارة", "القسم", "القسم / الإدارة", "القسم/الإدارة", "الادارة / القسم", "الإدارة/القسم", "الادارة/القسم", "القسم والإدارة", "الإدارة والقسم", "Department / Section", "Department", "Dept", "Section", "Department/Section", "Dept/Section", "Division"],
  branch_name: ["الفرع", "اسم الفرع", "الفرع / المنطقة", "الفرع/المنطقة", "Branch", "Branch Name", "Branch/Region", "Site", "Location"],
  position: ["المسمى الوظيفي", "المسمى", "الوظيفة", "المسمي الوظيفي", "Job Title", "Position", "Title", "Job Position"],
  job_grade: ["الدرجة الوظيفية", "الدرجة", "Job Grade", "Grade"],
  role_level: ["المستوى الوظيفي (owner/executive/manager/supervisor/employee/worker)", "المستوى الوظيفي", "المستوى", "Job Level (owner/executive/manager/supervisor/employee/worker)", "Job Level", "Level", "Role Level"],
  hire_date: ["تاريخ المباشرة", "تاريخ التعيين", "تاريخ الالتحاق", "تاريخ التوظيف", "Start Date", "Hire Date", "Joining Date", "Date of Joining"],
  contract_type: ["نوع العقد (دوام كامل/جزئي/عقد)", "نوع العقد", "العقد", "Contract Type (Full-time/Part-time/Contract)", "Contract Type", "Contract"],
  contract_start_date: ["تاريخ بدء العقد", "بداية العقد", "Contract Start Date", "Contract Start"],
  contract_end_date: ["تاريخ نهاية العقد", "نهاية العقد", "Contract End Date", "Contract End"],
  base_salary: ["الراتب الأساسي", "الراتب", "الأساسي", "Basic Salary", "Salary", "Base Salary", "Basic"],
  housing_allowance: ["بدل السكن", "سكن", "بدل السكنى", "Housing Allowance", "Housing"],
  transport_allowance: ["بدل المواصلات", "المواصلات", "بدل النقل", "Transportation Allowance", "Transport Allowance", "Transport", "Travel Allowance"],
  other_allowances: ["بدلات أخرى", "بدلات اخرى", "بدلات", "بدلات أخرى ", "Other Allowances", "Other Allowance", "Allowances"],
  iqama_expiry: ["تاريخ انتهاء الإقامة", "انتهاء الإقامة", "انتهاء الاقامة", "Iqama Expiry Date", "Iqama Expiry", "Iqama Expiration"],
  passport_number: ["رقم الجواز", "الجواز", "Passport Number", "Passport No", "Passport"],
  passport_expiry: ["تاريخ انتهاء الجواز", "انتهاء الجواز", "Passport Expiry Date", "Passport Expiry", "Passport Expiration"],
  health_insurance_number: ["رقم التأمين الطبي", "التأمين الطبي", "رقم التامين", "Medical Insurance Number", "Insurance Number", "Insurance No"],
  health_insurance_expiry: ["تاريخ انتهاء التأمين الطبي", "انتهاء التأمين", "Medical Insurance Expiry Date", "Insurance Expiry", "Insurance Expiration"],
  bank_account: ["الحساب البنكي", "الحساب", "الآيبان", "ايبان", "Bank Account", "IBAN", "Account", "Bank IBAN"],
  salary_payment_method: ["طريقة صرف الراتب (مدد/كاش)", "طريقة صرف الراتب", "طريقة الصرف", "Salary Payment Method (Madad/Cash)", "Payment Method", "Salary Payment Method", "Payout Method"],
  nationality: ["الجنسية", "Nationality", "Nationality "],
  address: ["العنوان", "Address", "Residence Address", "Home Address"],
  emergency_contact: ["جهة الاتصال الطارئ", "جهة اتصال الطارئ", "الاتصال الطارئ", "طوارئ", "Emergency Contact", "Emergency", "Emergency Phone"],
  annual_leave_entitlement: ["الرصيد السنوي للإجازات (21/30)", "الرصيد السنوي للإجازات", "الرصيد السنوي", "Annual Leave Balance (21/30)", "Annual Leave", "Annual Leave Entitlement", "Leave Entitlement"],
  ticket_entitlement: ["استحقاق التذكرة (سنوي/كل سنتين/لا)", "استحقاق التذكرة", "التذكرة", "Ticket Entitlement (Annual/Every 2 Years/No)", "Ticket Entitlement", "Ticket"],
  ticket_value: ["قيمة التذكرة (ريال)", "قيمة التذكرة", "Ticket Value (SAR)", "Ticket Value", "Ticket Cost"],
  manager_employee_number: ["الرقم الوظيفي للمدير المباشر", "المدير المباشر", "مدير مباشر", "رقم مدير مباشر", "Direct Manager Employee ID", "Manager Employee ID", "Manager ID", "Direct Manager", "Reports To", "Supervisor ID"],
  leave_total_entitled: ["إجمالي رصيد الإجازات المستحق", "إجمالي رصيد الإجازات", "رصيد مستحق", "Total Accrued Leave Balance", "Total Leave", "Total Accrued Leave", "Leave Total"],
  leave_used: ["رصيد الإجازات المستخدم", "المستخدم", "رصيد مستخدم", "Used Leave Balance", "Used Leave", "Leave Used"],
  leave_remaining: ["رصيد الإجازات المتبقي (تلقائي)", "رصيد الإجازات المتبقي", "المتبقي", "Remaining Leave Balance (Auto)", "Remaining Leave", "Leave Remaining", "Balance"],
};

// يطبّع النص: يوحّد الهمزات والياء والتاء المربوطة، يطوي المسافات، ويصغّر الإنجليزي —
// كي يطابق «الإدارة / القسم» مع «الادارة/القسم» و«Department / Section» مع «department/section».
function normalizeHeader(h) {
  return String(h ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s*\/\s*/g, "/")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// يبني خريطة مطابقة: نص مطبَّع → مفتاح الحقل. يجمع HEADER_TO_KEY و HEADER_ALIASES.
const NORMALIZED_KEY_MAP = (() => {
  const map = new Map();
  for (const [k, v] of Object.entries(HEADER_TO_KEY)) map.set(normalizeHeader(k), v);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const a of aliases) {
      const nk = normalizeHeader(a);
      if (!map.has(nk)) map.set(nk, key);
    }
  }
  return map;
})();

function resolveHeader(h) {
  if (!h) return null;
  const n = normalizeHeader(h);
  return NORMALIZED_KEY_MAP.get(n) || null;
}

// محلّل CSV بسيط يدعم الأقواس والفواصل و BOM
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function cellToString(v) {
  if (v == null) return "";
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "object") {
    // خلية صيغة في exceljs: { formula, result }
    if (v.result != null) return String(v.result);
    return "";
  }
  return String(v).trim();
}

// يحلّل ملف CSV أو Xilinx في المتصفح ويعيد مصفوفة كائنات بمفاتيح الحقول
export async function parseEmployeeFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  let rawRows = [];

  if (ext === "csv") {
    const text = await file.text();
    rawRows = parseCSV(text);
  } else {
    const buf = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = row.values; // مفهرس من 1
      const arr = [];
      for (let i = 1; i < vals.length; i++) arr.push(vals[i]);
      rawRows.push(arr);
    });
  }

  if (!rawRows.length) return [];
  const headers = rawRows[0].map((h) => String(h ?? "").trim());
  // مطابقة مرنة: تتعرّف على الأعمدة بعناوينها الكاملة أو المختصرة، عربي/إنجليزي.
  const colKeys = headers.map((h) => resolveHeader(h));
  const records = [];
  for (let i = 1; i < rawRows.length; i++) {
    const vals = rawRows[i];
    const obj = {};
    colKeys.forEach((key, j) => {
      if (!key) return;
      obj[key] = cellToString(vals[j]);
    });
    records.push(obj);
  }
  return records;
}