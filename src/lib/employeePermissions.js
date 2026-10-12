// مصفوفة الصلاحيات التوثيقية لملف الموظف — وحدات نظام جداره.
// كل وحدة: مفتاح (يطابق مسار اللوحة) + اسم عربي + إنجليزي.
// مصفوفة توثيقية فقط (وصول للوحدة) — تُسجّل في ملف الموظف دون تفعيل منع فعلي.
export const PERMISSION_MODULES = [
  { key: "dashboard", ar: "لوحة المعلومات", en: "Dashboard" },
  { key: "notifications", ar: "الإشعارات", en: "Notifications" },
  { key: "recruitment", ar: "التوظيف والاستقطاب", en: "Recruitment" },
  { key: "employees", ar: "الموظفون", en: "Employees" },
  { key: "attendance", ar: "الحضور والبصمة", en: "Attendance" },
  { key: "import-attendance", ar: "استيراد الحضور", en: "Import attendance" },
  { key: "approvals", ar: "الاعتمادات", en: "Approvals" },
  { key: "leaves", ar: "الإجازات", en: "Leaves" },
  { key: "business-trips", ar: "الانتدابات", en: "Business trips" },
  { key: "payroll", ar: "الرواتب", en: "Payroll" },
  { key: "gosi", ar: "التأمينات الاجتماعية", en: "GOSI" },
  { key: "fleet", ar: "الأسطول وتفويض المركبات", en: "Fleet & delegations" },
  { key: "end-of-service", ar: "نهاية الخدمة", en: "End of service" },
  { key: "performance", ar: "تقييم الأداء", en: "Performance" },
  { key: "training", ar: "التدريب والتطوير", en: "Training" },
  { key: "succession", ar: "خطة الإحلال", en: "Succession" },
  { key: "org-structure", ar: "الهيكل التنظيمي", en: "Org structure" },
  { key: "workforce-planning", ar: "تخطيط القوى العاملة", en: "Workforce planning" },
  { key: "exit-interviews", ar: "مقابلات الخروج", en: "Exit interviews" },
  { key: "surveys", ar: "استبيانات الموظفين", en: "Surveys" },
  { key: "investigations", ar: "محضر التحقيق", en: "Investigation report" },
  { key: "warnings", ar: "الإنذارات", en: "Warnings" },
  { key: "decisions", ar: "القرارات الإدارية", en: "Decisions" },
  { key: "incentives", ar: "الحوافز", en: "Incentives" },
  { key: "analytics", ar: "التحليلات والتقارير", en: "Analytics" },
  { key: "licenses", ar: "تراخيص المنشأة", en: "Licenses" },
  { key: "platform-subscriptions", ar: "اشتراكات المنصات", en: "Platform subscriptions" },
  { key: "customer-surveys", ar: "استبيانات تجربة العميل", en: "Customer surveys" },
  { key: "settings", ar: "الإعدادات", en: "Settings" },
];

export const allPermissionKeys = () => PERMISSION_MODULES.map((m) => m.key);

export const parsePermissions = (str) => {
  if (!str) return [];
  try {
    const p = JSON.parse(str);
    return Array.isArray(p) ? p.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
};

export const togglePermission = (str, key) => {
  const arr = parsePermissions(str);
  return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
};

export const permissionsLabels = (str, lang = "ar") =>
  parsePermissions(str).map((k) => {
    const m = PERMISSION_MODULES.find((x) => x.key === k);
    return m ? (lang === "ar" ? m.ar : m.en) : k;
  });