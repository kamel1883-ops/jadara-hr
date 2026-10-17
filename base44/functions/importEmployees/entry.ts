import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { storeEmployeesBulk } from '../../shared/vaultClient.ts';

const pad = (n) => String(n).padStart(2, '0');

function parseDate(s) {
  if (s == null) return '';
  s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`; // dd/mm/yyyy
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  return '';
}

function num(v) {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// قاعدة المملكة الموحّدة لتمييز السعودي من المقيم:
// الهوية الوطنية تبدأ بـ"1" → سعودي، وتبدأ بـ"2" → مقيم.
// تُشتق من رقم الهوية حصراً (مصدر الحقيقة) وتتجاوز أي قيمة مدخلة يدوياً في الملف.
function deriveSaudi(national_id) {
  const s = String(national_id ?? '').trim();
  if (!s) return false;
  return s.startsWith('1');
}

function boolSaudi(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return ['نعم', 'yes', 'true', '1', 'سعودي', 'saudi'].includes(s);
}

const lower = (s) => String(s ?? '').trim().toLowerCase();
const GENDER = { 'ذكر':'male','male':'male','m':'male','أنثى':'female','انثى':'female','female':'female','f':'female' };
const CONTRACT = { 'دوام كامل':'full_time','full_time':'full_time','full':'full_time','كامل':'full_time','full-time':'full_time','جزئي':'part_time','part_time':'part_time','part':'part_time','part-time':'part_time','عقد':'contract','contract':'contract' };
const PAYMENT = { 'مدد':'mudad','mudad':'mudad','madad':'mudad','كاش':'cash','cash':'cash','نقدي':'cash' };
const TICKET = { 'سنوي':'yearly','yearly':'yearly','annual':'yearly','كل سنتين':'biennial','biennial':'biennial','سنتين':'biennial','every 2 years':'biennial','every 2 year':'biennial','لا':'none','none':'none','لا ينطبق':'none','no':'none' };
const ROLE = { 'executive':'executive','تنفيذي':'executive','manager':'manager','مدير':'manager','supervisor':'supervisor','مشرف':'supervisor','employee':'employee','موظف':'employee','worker':'worker','عامل':'worker' };

function monthDiff(fromISO, toISO) {
  if (!fromISO) return 0;
  const a = new Date(fromISO); const b = new Date(toISO);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}
function yearsOfServiceHire(hireDate, asOf = new Date()) {
  if (!hireDate) return 0;
  const a = new Date(hireDate); const b = asOf;
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  let y = b.getFullYear() - a.getFullYear();
  if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) y--;
  return Math.max(0, y);
}
// الرصيد الإجمالي المستحق وفق سياسة جدارة (نفس معادلة النظام في الواجهة — أيام فعلية):
// 5+ سنوات خدمة → 30 يوماً إلزامياً؛ أقل → خيار الشركة/الموظف 21 أو 30 من تاريخ المباشرة الفعلي.
function computeEntitlement(hireDate, annualDays) {
  if (!hireDate) return 0;
  const a = new Date(hireDate);
  if (isNaN(a.getTime())) return 0;
  const sd = Math.max(0, Math.floor((Date.now() - a.getTime()) / 86400000));
  if (sd <= 0) return 0;
  const days = yearsOfServiceHire(hireDate) >= 5 ? 30 : (Number(annualDays) || 21);
  return Math.round((sd / 365) * days * 100) / 100;
}

function normalizeRecord(r) {
  const g = lower(r.gender);
  const c = lower(r.contract_type);
  const rl = lower(r.role_level);
  const pm = lower(r.salary_payment_method);
  const tk = lower(r.ticket_entitlement);
  const ann = num(r.annual_leave_entitlement);
  return {
    full_name: String(r.full_name ?? '').trim(),
    employee_number: String(r.employee_number ?? '').trim(),
    national_id: String(r.national_id ?? '').trim(),
    email: String(r.email ?? '').trim(),
    is_saudi: deriveSaudi(r.national_id),
    gender: GENDER[g] || '',
    birth_date: parseDate(r.birth_date),
    phone: String(r.phone ?? '').trim(),
    department: String(r.department ?? '').trim(),
    branch_name: String(r.branch_name ?? '').trim(),
    position: String(r.position ?? '').trim(),
    job_grade: String(r.job_grade ?? '').trim(),
    role_level: ROLE[rl] || 'employee',
    hire_date: parseDate(r.hire_date),
    contract_type: CONTRACT[c] || 'full_time',
    contract_start_date: parseDate(r.contract_start_date),
    contract_end_date: parseDate(r.contract_end_date),
    base_salary: num(r.base_salary),
    housing_allowance: num(r.housing_allowance),
    transport_allowance: num(r.transport_allowance),
    other_allowances: num(r.other_allowances),
    iqama_expiry: parseDate(r.iqama_expiry),
    passport_number: String(r.passport_number ?? '').trim(),
    passport_expiry: parseDate(r.passport_expiry),
    health_insurance_number: String(r.health_insurance_number ?? '').trim(),
    health_insurance_expiry: parseDate(r.health_insurance_expiry),
    bank_account: String(r.bank_account ?? '').trim(),
    salary_payment_method: PAYMENT[pm] || 'mudad',
    nationality: String(r.nationality ?? '').trim(),
    address: String(r.address ?? '').trim(),
    emergency_contact: String(r.emergency_contact ?? '').trim(),
    annual_leave_entitlement: (ann === 30) ? 30 : 21,
    ticket_entitlement: TICKET[tk] || 'yearly',
    ticket_value: num(r.ticket_value),
    prior_used_leave: num(r.prior_used_leave),
    leave_total_entitled: num(r.leave_total_entitled),
    leave_used: num(r.leave_used),
    leave_remaining: num(r.leave_remaining),
    manager_employee_number: String(r.manager_employee_number ?? '').trim(),
  };
}

// الحقول الإلزامية للتحقق — مطابقة لمتطلبات كيان Employee
const REQUIRED = [
  { key: 'employee_number', label: 'الرقم الوظيفي' },
  { key: 'department', label: 'الإدارة / القسم' },
  { key: 'position', label: 'المسمى الوظيفي' },
  { key: 'hire_date', label: 'تاريخ المباشرة' },
  { key: 'base_salary', label: 'الراتب الأساسي' },
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // الرقم الموحد للمنشأة الحالية — ربط دائم للموظفين بالعميل
    const meEmail = String(user.email || '').trim().toLowerCase();
    const myTenants = await base44.asServiceRole.entities.Tenant.filter({}, undefined, 100);
    const myTenant = (myTenants || []).find(
      (tt) => String(tt.admin_email || '').trim().toLowerCase() === meEmail
        || String(tt.contact_email || '').trim().toLowerCase() === meEmail
    );
    const myUnified = String(myTenant?.unified_number || '').trim();
    if (!myUnified) return Response.json({ error: 'الحساب غير مرتبط بمنشأة' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const records = Array.isArray(body.records) ? body.records : null;
    const confirm = !!body.confirm;
    if (!records || records.length === 0) {
      return Response.json({ error: 'لا توجد بيانات للاستيراد' }, { status: 400 });
    }

    // تجهيز الفروع: فروع هذه المنشأة فقط (بالرقم الموحّد) — لا يظهر أي فرع لمنشأة أخرى.
    // كل فرع مذكور في ملف الاستيراد يُنشأ فعلياً في «إدارة الفروع» ليُضبط له الموقع/البصمة.
    const branches = await base44.asServiceRole.entities.Branch.filter({ unified_number: myUnified }, '-created_date', 5000);
    const branchMap = new Map();
    for (const b of branches) branchMap.set(lower(b.name), b);
    let mainBranch = branches.find((b) => b.is_main) || branches[0] || null;
    if (mainBranch) branchMap.set(lower(mainBranch.name), mainBranch);

    // أسماء الفروع الواردة في الملف (إن وُجدت) — إن لم يحتوِ الملف على فروع لا ننشئ شيئاً
    const fileBranchNames = [...new Set(
      records.map((row) => String(row?.branch_name ?? row?.['الفرع'] ?? '').trim()).filter(Boolean)
    )];
    if (!mainBranch && fileBranchNames.length) {
      mainBranch = await base44.asServiceRole.entities.Branch.create({ name: 'الفرع الرئيسي', is_main: true, unified_number: myUnified });
      branchMap.set(lower(mainBranch.name), mainBranch);
    }

    async function resolveBranch(name) {
      const n = String(name ?? '').trim();
      if (!n) return mainBranch;
      const key = lower(n);
      if (branchMap.has(key)) return branchMap.get(key);
      const nb = await base44.asServiceRole.entities.Branch.create({ name: n, is_main: false, unified_number: myUnified });
      branchMap.set(key, nb);
      return nb;
    }

    // إعدادات منشأة العميل نفسها فقط
    const orgs = await base44.asServiceRole.entities.Organization.filter({ unified_number: myUnified }, "-created_date", 1);
    const annualDays = Number(orgs[0]?.annual_leave_days) || 21;

    // موظفو منشأة العميل فقط — لا مطابقة ولا ربط بأرقام موظفين من منشأة أخرى
    const existing = await base44.asServiceRole.entities.Employee.filter({ unified_number: myUnified }, '-created_date', 5000);
    const byNumber = new Set();
    for (const e of existing) if (e.employee_number) byNumber.add(String(e.employee_number).trim());

    const toCreate = [];
    const incomplete = [];
    let duplicate = 0;
    let detected = 0;
    const validPreview = [];
    const localSeen = new Set();

    // أرقام الموظفين الموجودة في الملف — للتحقق من المدير المباشر قبل الحفظ
    const fileNumbers = new Set();
    for (const rawRow of records) {
      const n = String(rawRow?.employee_number ?? rawRow?.['الرقم الوظيفي'] ?? '').trim();
      if (n) fileNumbers.add(n);
    }
    const issues = []; // { row, name, employee_number, problems: [] }
    // موظفون تجاوز فرق الإجمالي المستحق حدّ المسامحة (3 أيام) → يُرفض الملف كاملاً بلا استيراد جزئي
    const entitlementMismatch = [];
    let rowNo = 0;

    for (const rawRow of records) {
      const r = normalizeRecord(rawRow);
      // تخطٍّ الصفوف الفارغة (صفوف الصيغة الجاهزة بلا بيانات تعريفية)
      if (!r.employee_number && !r.full_name && !r.national_id) continue;
      detected++;
      rowNo++;
      const mgr = String(r.manager_employee_number || '').trim();
      if (mgr && !fileNumbers.has(mgr) && !byNumber.has(mgr)) {
        issues.push({
          row: rowNo, name: r.full_name || '—', employee_number: r.employee_number || '—',
          problems: [`المدير المباشر غير معروف (الرقم الوظيفي: ${mgr})`],
        });
      }
      const missing = REQUIRED.filter((f) => !r[f.key]);
      if (missing.length) {
        incomplete.push({
          row: rowNo,
          ref: r.employee_number || r.full_name || r.national_id || '—',
          name: r.full_name || '—',
          missing: missing.map((m) => m.label),
        });
        issues.push({
          row: rowNo, name: r.full_name || '—', employee_number: r.employee_number || '—',
          problems: missing.map((m) => `حقل إلزامي ناقص: ${m.label}`),
        });
        continue;
      }
      const key = String(r.employee_number).trim();
      if (byNumber.has(key) || localSeen.has(key)) { duplicate++; continue; }
      localSeen.add(key);
      if (!r.contract_start_date) r.contract_start_date = r.hire_date;
      if (!r.contract_end_date && r.contract_start_date) {
        const d = new Date(r.contract_start_date);
        d.setFullYear(d.getFullYear() + 1);
        r.contract_end_date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
      const br = await resolveBranch(r.branch_name);
      if (br) { r.branch_id = br.id; r.branch_name = br.name; }
      else r.branch_name = r.branch_name || '';
      // الرصيد المستخدم (إجمالي المستخدم) يُعتمد كما هو من ملف العميل لهذا الموظف وحده،
      // ولا يُعدَّل عليه. إذا لم يُملأ يكون 0 (لا رصيد سابق).
      r.prior_used_leave = r.leave_used || r.prior_used_leave || 0;
      // مصدر الرصيد الافتتاحي: "excel" فقط للموظفين المرفوعين من ملف — وهو وحده ما تُحتسب
      // له أيام ما قبل النظام. من يُضاف داخل النظام يبقى "manual" ولا رصيد افتتاحي له.
      r.opening_balance_source = Number(r.prior_used_leave) > 0 ? 'excel' : 'manual';
      // أساس الاحتساب: عمود الإجازات في الملف (21/30) إن مُلئ صريحاً، وإلا سياسة المنشأة.
      const rawAnn = num(rawRow.annual_leave_entitlement);
      const empChoice = rawAnn === 30 ? 30 : (rawAnn === 21 ? 21 : annualDays);
      r.annual_leave_entitlement = empChoice;
      // الإجمالي المستحق: يُحسب في النظام من تاريخ المباشرة الفعلي حتى تاريخ رفع الملف (اليوم)،
      // بمعدل 21 أو 30 يوماً بالسنة، و30 إلزامياً بعد 5 سنوات خدمة. تاريخ رفع الملف مرجع للمقارنة
      // فقط ولا يُخزَّن كأساس دائم — الاحتساب يبقى من تاريخ المباشرة.
      const sysEntitled = computeEntitlement(r.hire_date, empChoice);
      const rate = yearsOfServiceHire(r.hire_date) >= 5 ? 30 : empChoice;
      const excelEntitled = num(r.leave_total_entitled);
      // المقارنة: فرق مطلق حتى 3 أيام مقبول (زائداً أو ناقصاً)؛ وما زاد عليه يجعل الملف غير مقبول كاملاً.
      let entitledDiff = null;
      let entitledMatch = null;
      if (excelEntitled > 0) {
        entitledDiff = Math.round((excelEntitled - sysEntitled) * 100) / 100;
        entitledMatch = Math.abs(entitledDiff) <= 3;
        if (!entitledMatch) {
          entitlementMismatch.push({
            row: rowNo,
            name: r.full_name || '—',
            employee_number: r.employee_number || '—',
            hire_date: r.hire_date,
            annual_days: rate,
            entitled_excel: excelEntitled,
            entitled_system: sysEntitled,
            entitled_diff: entitledDiff,
          });
        }
      }
      // القيمة الصريحة (قد تكون سالبة عند تجاوز الاستحقاق) — لا تُصفَّر
      r.leave_balance = Math.round((sysEntitled - r.prior_used_leave) * 10) / 10;
      r.unified_number = myUnified;
      toCreate.push(r);
      validPreview.push({
        full_name: r.full_name,
        employee_number: r.employee_number,
        department: r.department,
        position: r.position,
        branch_name: r.branch_name,
        entitled_excel: excelEntitled || null,
        entitled_system: sysEntitled,
        entitled_match: entitledMatch,
        entitled_diff: entitledDiff,
        entitled_rate: rate,
      });
    }

    let saved = 0, managersLinked = 0, managersUnresolved = 0;
    const errors = [];

    // مرحلة التأكيد فقط: نُنشئ الموظفين فعلياً ونربط المديرين المباشرين.
    // رفض شامل للدفعة: أي موظف تجاوز فرق الإجمالي المستحق حدّ 3 أيام يمنع الحفظ كاملاً.
    if (confirm && toCreate.length && entitlementMismatch.length === 0) {
      // === عزل البيانات الحساسة في الخزنة السعودية ===
      // الحقول الحساسة تُرسل للخزنة وتُستبدل برمز معتم (emp_ref) في Base44.
      // إن لم تكن الخزنة مُهيّأة بعد، نستمر بالنمط القديم (تخزين محلي) حتى لا ينكسر الاستيراد.
      const SENSITIVE_KEYS = [
        'national_id', 'birth_date', 'phone', 'address', 'emergency_contact',
        'passport_number', 'passport_expiry', 'bank_account', 'health_insurance_number',
      ];
      // يجب استخدام user.id كمفتاح مستأجر للخزنة — مطابقةً لما يستخدمه vaultProxy
      // عند الاسترجاع (getEmployee عبر enrichEmployee في الواجهة). استخدام myTenant.id
      // يُخزّن تحت مفتاح مختلف ويؤدي إلى 404 عند فتح ملف الموظف لاحقاً.
      const vaultTenantId = user.id;
      const vaultRows = toCreate.map((r) => {
        const o = { employee_number: r.employee_number };
        for (const k of SENSITIVE_KEYS) {
          if (r[k]) o[k] = String(r[k]);
        }
        return o;
      });
      let vaultStored = 0;
      try {
        const vaultRes = await storeEmployeesBulk(vaultTenantId, vaultRows);
        const refs = vaultRes?.refs || vaultRes?.data?.refs || null;
        if (Array.isArray(refs) && refs.length === toCreate.length) {
          toCreate.forEach((r, i) => {
            r.emp_ref = refs[i];
            // تعمية الحقول الحساسة في Base44 — المرجع المعتم (emp_ref) يكفي
            for (const k of SENSITIVE_KEYS) r[k] = '';
          });
          vaultStored = refs.length;
        }
      } catch (e) {
        // الخزنة غير مُهيّأة أو غير متاحة — الاستمرار بالنمط القديم
        console.log('[importEmployees] vault unavailable, legacy mode:', e.message);
      }

      await base44.asServiceRole.entities.Employee.bulkCreate(toCreate);
      saved = toCreate.length;

      const needLink = toCreate.filter((r) => r.manager_employee_number);
      if (needLink.length) {
        const allEmps = await base44.asServiceRole.entities.Employee.filter({ unified_number: myUnified }, '-created_date', 5000);
        const numToId = new Map();
        for (const e of allEmps) if (e.employee_number) numToId.set(String(e.employee_number).trim(), e.id);
        const updates = [];
        for (const r of needLink) {
          const mid = numToId.get(String(r.manager_employee_number).trim());
          const myId = numToId.get(String(r.employee_number).trim());
          if (!mid) { managersUnresolved++; errors.push(`مدير مباشر غير معروف: ${r.manager_employee_number} (للموظف ${r.employee_number})`); continue; }
          if (mid === myId) continue;
          updates.push({ id: myId, manager_id: mid });
        }
        if (updates.length) {
          await base44.asServiceRole.entities.Employee.bulkUpdate(updates);
          managersLinked = updates.length;
        }
      }
    }

    return Response.json({
      total: records.length,
      detected,
      valid: toCreate.length,
      duplicate,
      incomplete_count: incomplete.length,
      incomplete: incomplete.slice(0, 100),
      issues: issues.slice(0, 200),
      // رفض الملف: الفرق بين إجمالي المستحق في الإكسل وحساب النظام من تاريخ المباشرة يتجاوز 3 أيام
      entitlement_rejected: entitlementMismatch.length > 0,
      entitlement_mismatch_count: entitlementMismatch.length,
      entitlement_mismatches: entitlementMismatch.slice(0, 200),
      preview: confirm ? [] : validPreview.slice(0, 200),
      confirm,
      saved,
      managers_linked: managersLinked,
      managers_unresolved: managersUnresolved,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}