// حارس العزل: حتى لو أعاد الخادم صفوف منشآت أخرى، لا تُعرض إلا صفوف الرقم الموحّد الحالي.
// سجل قديم بلا رقم موحّد يظهر لمن أنشأه فقط، ولا يُعار لشركة ثانية.

export function asRows(page) {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

export function visibleByUnified(rec, ctx) {
  if (!rec || !ctx?.unified) return false;
  const un = String(rec.unified_number || "").trim();
  if (un) return un === ctx.unified;
  return !!ctx.userId && String(rec.created_by_id || "") === String(ctx.userId);
}

// معاملة أي منشأة: رقمها الموحّد يكفي لإظهارها. سجل بلا رقم يظهر فقط إذا كان موظفه من هذه المنشأة.
// رقم منشأة أخرى يُستبعد دائماً، أياً كان الرقم.
export function recordBelongsToCompany(rec, ctx, keys = ["employee_id"]) {
  if (!rec || !ctx?.unified) return false;
  const un = String(rec.unified_number || "").trim();
  if (un) return un === String(ctx.unified);
  const ids = Array.isArray(ctx.employeeIds) ? ctx.employeeIds : [];
  return ids.some((id) => keys.some((k) => String(rec?.[k] || "") === String(id)));
}

// يجمع صفوف الرقم الموحّد مع السجلات القديمة بلا رقم، ويسقط المكرر وصفوف الشركات الأخرى.
export function mergeCompanyRows(primary, legacy, ctx) {
  const seen = new Set();
  const out = [];
  for (const rec of [...asRows(primary), ...asRows(legacy)]) {
    const id = String(rec?.id || "");
    if (!id || seen.has(id)) continue;
    if (!visibleByUnified(rec, ctx)) continue;
    seen.add(id);
    out.push(rec);
  }
  return out;
}

export function pickByUnified(list, unified) {
  const want = String(unified || "").trim();
  if (!want) return null;
  return asRows(list).find((row) => String(row?.unified_number || "").trim() === want) || null;
}

export function onlyMatching(result, pred) {
  if (result == null || typeof result === "number" || typeof result === "string") return result;
  if (Array.isArray(result)) return result.filter(pred);
  if (Array.isArray(result.items)) return { ...result, items: result.items.filter(pred) };
  if (typeof result === "object") return pred(result) ? result : null;
  return result;
}
