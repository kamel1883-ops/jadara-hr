// ذاكرة مسار مستقلة لكل تبويب في الشريط السفلي.
// كل تبويب يتذكّر آخر شاشة فرعية فتحها المستخدم داخله، فالعودة إلى التبويب
// تُرجعك إلى حيث توقفت بدل إعادة تصفير القسم — تماماً كحزم التنقل في التطبيقات الأصلية.
export const TAB_ROOTS = ["/app", "/notifications", "/settings"];

const stacks = {};

export function tabFor(pathname) {
  return TAB_ROOTS.find((t) => pathname === t || pathname.startsWith(t + "/")) || null;
}

export function rememberPath(pathname) {
  const tab = tabFor(pathname);
  if (tab) stacks[tab] = pathname;
}

export function pathForTab(tab) {
  return stacks[tab] || tab;
}