/**
 * عزل منشأة الموظف في بوابة الخدمة الذاتية.
 * الرقم الموحّد على سجل الموظف هو الحد: لا تُعرض منشأة أخرى، ولا تُقرأ سجلاتها.
 */
function asList(page: any): any[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

export type CompanyBag = { unified: string; ids: Set<string>; employees: any[] };

/** كيانات المنشأة نفسها — تُقيَّد بالرقم الموحّد */
export const COMPANY_FIELD = new Set([
  "Branch", "OrgUnit", "Vehicle", "License", "Job", "JobApplication",
  "Survey", "SurveyResponse", "WorkforcePlan", "AdminDecision", "TrialEvaluation",
  "Organization", "Employee", "CustomerSurveyResponse", "Notification",
]);

/** سجلات تشغيلية مربوطة بموظف */
export const EMPLOYEE_KEYED: Record<string, string[]> = {
  Attendance: ["employee_id"],
  BusinessTrip: ["employee_id"],
  Complaint: ["employee_id"],
  Equipment: ["employee_id"],
  EquipmentRequest: ["employee_id"],
  ExitInterview: ["employee_id"],
  GosiRecord: ["employee_id"],
  Incentive: ["employee_id"],
  LeaveRequest: ["employee_id"],
  LoanRequest: ["employee_id"],
  Payroll: ["employee_id"],
  Performance: ["employee_id"],
  Settlement: ["employee_id"],
  SuccessionPlan: ["current_holder_id", "successor_id"],
  TrainingPlan: ["employee_id"],
  VehicleDelegation: ["employee_id"],
  Warning: ["employee_id"],
};

export async function loadCompanyBag(base44: any, emp: any): Promise<CompanyBag> {
  const unified = String(emp?.unified_number || "").trim();
  if (!unified || emp?.id === "owner") return { unified: "", ids: new Set(), employees: [] };
  let employees: any[] = [];
  try {
    employees = asList(await base44.asServiceRole.entities.Employee.filter({ unified_number: unified }));
  } catch {
    employees = [];
  }
  const ids = new Set(employees.map((e) => String(e?.id || "")).filter(Boolean));
  if (emp?.id) ids.add(String(emp.id));
  return { unified, ids, employees };
}

/**
 * إعدادات منشأة هذا الموظف فقط.
 * لا تُستخدم آخر منشأة سُجّلت في المنصة.
 */
export async function organizationForEmployee(base44: any, emp: any) {
  const unified = String(emp?.unified_number || "").trim();
  if (!unified || emp?.id === "owner") return null;
  try {
    const orgs = asList(await base44.asServiceRole.entities.Organization.filter({ unified_number: unified }));
    if (orgs[0]) return orgs[0];
  } catch { /* لا سجل إعدادات */ }
  try {
    const tenants = asList(await base44.asServiceRole.entities.Tenant.filter({ unified_number: unified }));
    const t = tenants[0];
    if (!t) return { name: "", logo_url: "", unified_number: unified };
    return {
      name: t.name || "",
      logo_url: t.logo_url || "",
      unified_number: unified,
      contact_name: t.contact_name || "",
      contact_phone: t.contact_phone || "",
      contact_email: t.contact_email || "",
    };
  } catch {
    return { name: "", logo_url: "", unified_number: unified };
  }
}

function linkedIds(entity: string, rec: any): string[] {
  const keys = EMPLOYEE_KEYED[entity] || [];
  const out: string[] = [];
  for (const k of keys) {
    const v = String(rec?.[k] || "").trim();
    if (v) out.push(v);
  }
  if (entity === "TrainingPlan") {
    try {
      const ids = JSON.parse(rec?.employee_ids || "[]");
      if (Array.isArray(ids)) {
        for (const id of ids) {
          const v = String(id || "").trim();
          if (v) out.push(v);
        }
      }
    } catch { /* مصفوفة غير صالحة */ }
  }
  return out;
}

export function inCompany(entity: string, rec: any, bag: CompanyBag): boolean {
  if (!rec || !bag.unified) return false;
  const un = String(rec.unified_number || "").trim();
  if (entity === "Employee" || COMPANY_FIELD.has(entity)) {
    if (un === bag.unified) return true;
    if (entity === "SurveyResponse" || entity === "Notification") {
      return bag.ids.has(String(rec.employee_id || ""));
    }
    return false;
  }
  if (!EMPLOYEE_KEYED[entity]) return false;
  return linkedIds(entity, rec).some((id) => bag.ids.has(id));
}

export function canWrite(entity: string, data: any, bag: CompanyBag): boolean {
  if (!bag.unified) return false;
  if (entity === "Employee" || COMPANY_FIELD.has(entity)) return true;
  if (!EMPLOYEE_KEYED[entity]) return false;
  const linked = linkedIds(entity, data);
  if (!linked.length) return false;
  return linked.every((id) => bag.ids.has(id));
}

export function stampCompany(entity: string, data: any, bag: CompanyBag) {
  if (!data || typeof data !== "object" || !bag.unified) return data;
  if (entity === "Employee" || COMPANY_FIELD.has(entity)) {
    return { ...data, unified_number: bag.unified };
  }
  return data;
}

export function scopeQuery(entity: string, query: any, bag: CompanyBag) {
  const q = { ...(query || {}) };
  if (!bag.unified) return { id: "__outside_company__" };
  if (entity === "Employee" || COMPANY_FIELD.has(entity)) {
    q.unified_number = bag.unified;
    return q;
  }
  const keys = EMPLOYEE_KEYED[entity];
  if (!keys) return { id: "__outside_company__" };
  const ids = bag.ids.size ? [...bag.ids] : ["__outside_company__"];
  if (keys.length === 1) {
    const k = keys[0];
    const wanted = q[k];
    if (typeof wanted === "string" && wanted) q[k] = bag.ids.has(wanted) ? wanted : "__outside_company__";
    else q[k] = { $in: ids };
    return q;
  }
  q.$or = keys.map((k) => ({ [k]: { $in: ids } }));
  return q;
}

export function filterPayload(entity: string, result: any, bag: CompanyBag) {
  if (result == null) return result;
  if (Array.isArray(result)) return result.filter((r) => inCompany(entity, r, bag));
  if (Array.isArray(result?.items)) {
    return { ...result, items: result.items.filter((r: any) => inCompany(entity, r, bag)) };
  }
  if (typeof result === "object") return inCompany(entity, result, bag) ? result : null;
  return result;
}
