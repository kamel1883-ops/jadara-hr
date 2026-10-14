// Legacy account keys are allowed only when they are exclusive to one company.
export async function companyLegacyKeys(base44, unified, candidates) {
  if (!unified) return [];
  const ids = [...new Set(candidates.map(v => String(v || '').trim()).filter(Boolean))];
  const allowed = [];
  for (let i = 0; i < ids.length; i += 3) {
    const checks = await Promise.all(ids.slice(i, i + 3).map(async id => {
      const other = { $nin: [unified, '', null] };
      let employees = 0, tenants = 0;
      try {
        [employees, tenants] = await Promise.all([
          base44.asServiceRole.entities.Employee.count({ created_by_id: id, unified_number: other }),
          base44.asServiceRole.entities.Tenant.count({ admin_user_id: id, unified_number: other }),
        ]);
      } catch { return null; }
      return employees === 0 && tenants === 0 ? id : null;
    }));
    allowed.push(...checks.filter(Boolean));
  }
  return allowed;
}