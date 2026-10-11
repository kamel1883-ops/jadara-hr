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
