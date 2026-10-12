// سجل أقسام التفويض في بوابة الموظف — مرتّب بنفس ترتيب قائمة بوابة الشركات.
// كل مفتاح يطابق مفتاح مصفوفة الصلاحيات في ملف الموظف.
export const DELEGATED_SECTIONS = [
  { key: "employees", ar: "إدارة الموظفين", en: "Employees", icon: "Users" },
  { key: "recruitment", ar: "إدارة التوظيف", en: "Recruitment", icon: "UserPlus" },
  { key: "attendance", ar: "إدارة الحضور والانصراف", en: "Attendance", icon: "Fingerprint" },
  { key: "import-attendance", ar: "استيراد البصمات", en: "Import attendance", icon: "Upload" },
  { key: "approvals", ar: "إدارة الموافقات", en: "Approvals", icon: "CheckCircle2" },
  { key: "leaves", ar: "إدارة الإجازات", en: "Leaves", icon: "CalendarDays" },
  { key: "business-trips", ar: "إدارة رحلات العمل", en: "Business trips", icon: "Plane" },
  { key: "payroll", ar: "إدارة الرواتب", en: "Payroll", icon: "Banknote" },
  { key: "gosi", ar: "إدارة التأمينات الاجتماعية", en: "GOSI", icon: "ShieldCheck" },
  { key: "fleet", ar: "إدارة المركبات والتوكيلات", en: "Fleet & delegations", icon: "Car" },
  { key: "end-of-service", ar: "إدارة نهاية الخدمة", en: "End of service", icon: "FileText" },
  { key: "performance", ar: "إدارة تقييم الأداء", en: "Performance", icon: "Target" },
  { key: "training", ar: "إدارة التدريب والتطوير", en: "Training", icon: "GraduationCap" },
  { key: "succession", ar: "إدارة خطة الإحلال", en: "Succession", icon: "Network" },
  { key: "org-structure", ar: "إدارة الهيكل التنظيمي", en: "Org structure", icon: "Network" },
  { key: "workforce-planning", ar: "إدارة تخطيط القوى العاملة", en: "Workforce planning", icon: "Target" },
  { key: "exit-interviews", ar: "إدارة مقابلات الخروج", en: "Exit interviews", icon: "MessageSquare" },
  { key: "surveys", ar: "إدارة استبيانات الموظفين", en: "Surveys", icon: "MessageSquare" },
  { key: "investigations", ar: "محضر التحقيق", en: "Investigation report", icon: "FileSearch" },
  { key: "warnings", ar: "إدارة الإنذارات", en: "Warnings", icon: "AlertTriangle" },
  { key: "decisions", ar: "إدارة القرارات الإدارية", en: "Decisions", icon: "ScrollText" },
  { key: "incentives", ar: "إدارة الحوافز والمكافآت", en: "Incentives", icon: "Gift" },
  { key: "analytics", ar: "التحليلات والتقارير", en: "Analytics", icon: "BarChart3" },
  { key: "licenses", ar: "إدارة تراخيص المنشأة", en: "Licenses", icon: "FileBadge" },
  { key: "platform-subscriptions", ar: "إدارة اشتراكات المنصات", en: "Platform subscriptions", icon: "Globe" },
  { key: "customer-surveys", ar: "إدارة استبيانات العملاء", en: "Customer surveys", icon: "MessageSquare" },
  { key: "settings", ar: "الإعدادات", en: "Settings", icon: "Settings" },
];

// الأقسام المفوّضة فعلياً للموظف — تُعرض فقط ما صرّحت به الموارد البشرية صراحةً في ملف الموظف.
// مصفوفة صلاحيات فارغة = لا تظهر أي أقسام إدارية (الموظف العادي لا يرى شيئاً).
export const delegatedFor = (perms) =>
  DELEGATED_SECTIONS.filter((s) => Array.isArray(perms) && perms.includes(s.key));