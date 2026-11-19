/**
 * منشأة حساب التطبيق (مستخدم Base44) — الرقم الموحّد الذي يُحدّد نطاق بياناته.
 * يُستخدم لعزل الطلبات الإدارية: لا يُسمح لمسؤول منشأة بالعمل على سجلات منشأة أخرى.
 * يعيد "" إذا لم يكن الحساب مرتبطاً بأي منشأة (فلا صلاحية له على أي سجل).
 */
function asList(page: any): any[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

export async function companyOfAppUser(base44: any, user: any): Promise<string> {
  const un = (v: any) => String(v || "").trim();
  const uid = String(user?.id || "");
  if (!uid) return "";

  // 1) الرقم الموحّد المرتبط بالحساب نفسه
  const fromAccount = un(user?.data?.tenant_unified_number);
  if (fromAccount) return fromAccount;

  // 2) سجل الموظف المرتبط بالحساب
  try {
    const emp = asList(await base44.asServiceRole.entities.Employee.filter({ user_id: uid }))[0];
    if (emp && un(emp.unified_number)) return un(emp.unified_number);
  } catch { /* لا سجل موظف */ }

  // 3) منشأة يملك صلاحيتها كمسؤول
  try {
    const t = asList(await base44.asServiceRole.entities.Tenant.filter({ admin_user_id: uid }))[0];
    if (t && un(t.unified_number)) return un(t.unified_number);
  } catch { /* لا منشأة */ }

  // 4) عضوية مفوّضة من المنشأة نفسها
  try {
    const m = asList(await base44.asServiceRole.entities.TenantMember.filter({ user_id: uid }))
      .find((x: any) => x && x.active !== false && un(x.unified_number));
    if (m) return un(m.unified_number);
  } catch { /* لا عضوية */ }

  return "";
}