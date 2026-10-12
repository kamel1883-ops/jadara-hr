import { base44 } from "@/api/base44Client";

// ترتيب المستويات الوظيفية من الأعلى للأدنى
export const ROLE_ORDER = ["owner", "executive", "manager", "supervisor", "employee", "worker"];

export const ROLE_LABELS = {
  ar: {
    owner: "المالك",
    executive: "مدير تنفيذي",
    manager: "مدير إدارة",
    supervisor: "مشرف",
    employee: "موظف",
    worker: "عامل",
  },
  en: {
    owner: "Owner",
    executive: "Executive",
    manager: "Department manager",
    supervisor: "Supervisor",
    employee: "Employee",
    worker: "Worker",
  },
};

export const ROLE_STYLES = {
  owner: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200", dot: "bg-amber-500", icon: "👑" },
  executive: { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200", dot: "bg-violet-500", icon: "🎯" },
  manager: { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-200", dot: "bg-blue-500", icon: "🗂️" },
  supervisor: { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500", icon: "🧭" },
  employee: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200", dot: "bg-slate-400", icon: "👤" },
  worker: { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200", dot: "bg-orange-500", icon: "🛠️" },
};

export const roleRank = (level) => {
  const i = ROLE_ORDER.indexOf(level);
  return i === -1 ? 4 : i;
};

export const roleLabel = (level, lang = "ar") => ROLE_LABELS[lang]?.[level] || level;

// ألوان الطباعة والمخطط: قمة فاتحة، إدارة بنفسجي، قسم أصفر، مسمى أزرق — مثل الهيكل المرجعي.
export const CHART_COLORS = {
  owner: { bg: "#f8fbff", border: "#1d4ed8", color: "#1e3a8a" },
  executive: { bg: "#eef2ff", border: "#3730a3", color: "#1e1b4b" },
  manager: { bg: "#6d28d9", border: "#5b21b6", color: "#ffffff" },
  supervisor: { bg: "#fde047", border: "#a16207", color: "#1c1917" },
  employee: { bg: "#1e3a8a", border: "#172554", color: "#ffffff" },
  worker: { bg: "#1d4ed8", border: "#1e3a8a", color: "#ffffff" },
};

export const chartColors = (level) => CHART_COLORS[level] || CHART_COLORS.employee;

export const chartNodeText = (node, lang = "ar") => {
  const title = (node.position && String(node.position).trim()) || roleLabel(node.role_level, lang);
  const name = node.full_name || "";
  const num = node.employee_number ? "#" + node.employee_number : "";
  return { title, name, num };
};

// اسم عرض الموظف (الاسم الكامل، أو المسمى الوظيفي، أو الرقم)
export const employeeDisplayName = (emp) => {
  const name = emp.full_name || emp.position || (emp.employee_number ? `#${emp.employee_number}` : "—");
  return name;
};

// ببناء شجرة الهيكل التنظيمي من بيانات الموظفين اعتماداً على المدير المباشر (manager_id)
// الجذور: الموظفون الذين ليس لديهم مدير مباشر أو مديرهم غير موجود في القائمة
// مع تنظيم الأقسام/الإدارات تحت كل مدير
export const buildOrgTree = (employees) => {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const childrenMap = new Map();
  employees.forEach((e) => {
    const key = e.manager_id || "__root__";
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key).push(e);
  });

  // الموظفون الذين مديرهم غير موجود يُعتبرون جذوراً
  const roots = [];
  employees.forEach((e) => {
    if (!e.manager_id || !byId.has(e.manager_id)) roots.push(e);
  });

  const sortSiblings = (list) =>
    list.slice().sort((a, b) => {
      const r = roleRank(a.role_level) - roleRank(b.role_level);
      if (r !== 0) return r;
      const d = (a.department || "").localeCompare(b.department || "");
      if (d !== 0) return d;
      return employeeDisplayName(a).localeCompare(employeeDisplayName(b));
    });

  const buildNode = (emp) => {
    const kids = childrenMap.get(emp.id) || [];
    return {
      ...emp,
      _children: sortSiblings(kids).map(buildNode),
    };
  };

  // لو لا توجد جذور (كلها مرتبطة بمدير موجود) نُعيد الأعلى تصعيداً
  let rootNodes = sortSiblings(roots);
  if (rootNodes.length === 0 && employees.length > 0) {
    // الوضع الافتراضي: المالك أو التنفيذي بدون مدير، أو الأقدم
    const top = employees.find((e) => e.role_level === "owner" || e.role_level === "executive") || employees[0];
    rootNodes = [buildNode(top)];
    return rootNodes;
  }
  return rootNodes.map(buildNode);
};

// إحصاءات الهيكل: عدد المستويات، الإدارات، المديرين، المشرفين، الموظفين، العمال
export const orgStats = (employees) => {
  const byLevel = { owner: 0, executive: 0, manager: 0, supervisor: 0, employee: 0, worker: 0 };
  employees.forEach((e) => {
    const lvl = byLevel[e.role_level] !== undefined ? e.role_level : "employee";
    byLevel[lvl] += 1;
  });
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  // مدير كل إدارة = أول موظف بمستوى manager/owner/executive في تلك الإدارة
  const deptManagers = departments.map((d) => {
    const members = employees.filter((e) => e.department === d);
    const mgr = members.find((m) => ["manager", "executive", "owner"].includes(m.role_level)) || null;
    return { department: d, count: members.length, manager: mgr };
  });
  return { byLevel, departments, deptManagers, total: employees.length };
};

// قائمة الإدارات الموحدة (المستخدمة في النماذج لاستيعاب التوحيد)
export const uniqueDepartments = (employees) =>
  Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar"));

// المرشحون ليكونوا مدراء مباشرين — أي موظف في الشركة (يستثنى الموظف نفسه)، لضمان حرية ربط كل موظف بمديره المباشر.
export const managerCandidates = (employees, excludeId = null) =>
  employees.filter((e) => e.id !== excludeId);