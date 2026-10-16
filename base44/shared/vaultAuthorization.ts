export const validVaultRef = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value);

// استجابة القوائم قد تعود صفحة { items } أو مصفوفة مباشرة حسب مسار الاستدعاء.
// بلا هذا التوحيد يسقط الفحص بخطأ JS يُترجم إلى 502، فتفشل كل عملية خزنة مرتبطة
// بموظف (قراءة حقول حساسة، وأرشفة مستند المخالصة) ويظهر المستند فارغاً في السجلات.
const asList = page => Array.isArray(page) ? page : (Array.isArray(page?.items) ? page.items : []);

export async function employeeRefsInCompany(base44, context, user, refs) {
  if (!refs.length) return true;
  // يُقبل الموظف إذا كان من منشأة المستخدم (بنفس الرقم الموحّد) **أو** أُنشئ بواسطة
  // المستخدم نفسه أو أحد منشئي موظفي منشأته. القيد السابق كان يشترط شرطين معاً
  // (منشئ = المستخدم، والرقم الموحّد فارغاً)، فيرفض موظفي المنشأة أنفسهم ممن يحملون
  // رقماً موحّداً أو أُنشئوا من مدير آخر ⇒ 403 عند أرشفة المستند، ويبقى حقل المستند
  // فارغاً (شرطة) رغم نجاح التخزين في الخزنة. العزل لم يتغيّر: موظف منشأة أخرى
  // لا يستوفي الشرطين.
  const owners = [...new Set([user.id, ...(context.keys || [])].filter(Boolean))].slice(0, 24);
  const or: any[] = [{ created_by_id: { $in: owners } }];
  if (context.unified) or.push({ unified_number: context.unified });
  const page = await base44.asServiceRole.entities.Employee.filter(
    { emp_ref: { $in: refs }, $or: or },
    { limit: 500, fields: ['emp_ref'] }
  );
  const found = new Set(asList(page).map(row => row?.emp_ref));
  return refs.every(ref => found.has(ref));
}

// Possession of a reference is not permission: link it to this employee's record.
export async function employeeOwnsDocument(base44, employee, ref) {
  const unified = String(employee?.unified_number || '').trim();
  if (!unified || !validVaultRef(ref)) return false;
  const sources = [
    ['LeaveRequest', ['settlement_pdf_url', 'finance_proof_url', 'hr_document_url', 'medical_report_url']],
    ['LoanRequest', ['statement_pdf_url', 'finance_proof_url']],
    ['Settlement', ['finance_proof_url']],
    ['BusinessTrip', ['employee_document_url', 'hr_document_url', 'approval_pdf_url', 'finance_proof_url']],
  ];
  const linked = await Promise.all(sources.map(async ([entity, fields]) => {
    const page = await base44.asServiceRole.entities[entity].filter({
      employee_id: employee.id,
      $or: fields.map(field => ({ [field]: ref })),
    }, { limit: 1, fields: ['unified_number'] });
    return asList(page).some(row => !row.unified_number || row.unified_number === unified);
  }));
  if (linked.some(Boolean)) return true;
  const page = await base44.asServiceRole.entities.Investigation.filter({
    unified_number: unified, parties: { $regex: ref },
  }, { limit: 50, fields: ['parties'] });
  for (const row of asList(page)) {
    let parties = [];
    try { parties = JSON.parse(row.parties || '[]'); } catch { continue; }
    if (Array.isArray(parties) && parties.some(p => String(p.employee_id) === String(employee.id) && p.evidence_ref === ref)) return true;
  }
  return false;
}