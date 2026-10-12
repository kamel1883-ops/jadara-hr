// محضر التحقيق — رقم مرجعي وأطراف (معني / شاهد) لكل المنشآت.

export function parseParties(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function makeInvestigationRef(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const n = String(Math.floor(1000 + Math.random() * 9000));
  return `MJ-${y}${m}${d}-${n}`;
}

// الإغلاق يبقى مغلقاً. غير ذلك: المعنيون أولاً، ثم الشهود، ثم جاهز للتوصية.
export function nextInvestigationStatus(parties, closed = false) {
  if (closed) return "closed";
  const list = Array.isArray(parties) ? parties : [];
  if (!list.length) return "awaiting_subjects";
  if (list.some((p) => p.role !== "witness" && p.status !== "replied")) return "awaiting_subjects";
  if (list.some((p) => p.role === "witness" && p.status !== "replied")) return "awaiting_witnesses";
  return "ready";
}

export function partyOf(report, employeeId) {
  return parseParties(report?.parties).find((p) => String(p.employee_id || "") === String(employeeId || "")) || null;
}
