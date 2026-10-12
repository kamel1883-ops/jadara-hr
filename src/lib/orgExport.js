import { orgStats, roleLabel, employeeDisplayName } from "@/lib/orgTree";
import { genDateBoth } from "@/lib/printDate";
import { CLIENT_LOGO_CSS, PRINT_MARK_PX } from "@/lib/printBrand";

const ROLE_COLORS = {
  owner: "#b45309",
  executive: "#7c3aed",
  manager: "#2563eb",
  supervisor: "#059669",
  employee: "#475569",
  worker: "#ea580c",
};

const DEPT_COLOR = "#7c3aed";
const TITLE_COLOR = "#1d4ed8";

// بناء كيانات HTML برمجياً لتجنّب كتابتها حرفياً في المصدر
const AMP = String.fromCharCode(38);
const ENT = {
  amp: AMP + "amp;",
  lt: AMP + "lt;",
  gt: AMP + "gt;",
  quot: AMP + "quot;",
  apos: AMP + "#39;",
  bull: "\u2022",
};

function escapeHtml(s) {
  s = s == null ? "" : String(s);
  return s
    .replace(/&/g, ENT.amp)
    .replace(/</g, ENT.lt)
    .replace(/>/g, ENT.gt)
    .replace(/"/g, ENT.quot)
    .replace(/'/g, ENT.apos);
}

function formatDate(lang) {
  return genDateBoth(lang === "ar");
}

// تجميع الموظفين حسب القسم، ثم داخل كل قسم حسب المسمى الوظيفي
function buildDepartmentTree(employees, lang) {
  const tops = employees.filter((e) => e.role_level === "owner" || e.role_level === "executive");
  const rest = employees.filter((e) => e.role_level !== "owner" && e.role_level !== "executive");

  const depts = [];
  const byDept = new Map();
  rest.forEach((e) => {
    const d = e.department && String(e.department).trim() ? String(e.department).trim() : (lang === "ar" ? "غير مصنّف" : "Uncategorized");
    if (!byDept.has(d)) { byDept.set(d, []); depts.push(d); }
    byDept.get(d).push(e);
  });
  depts.sort((a, b) => a.localeCompare(b, lang === "ar" ? "ar" : "en"));

  const deptNodes = depts.map((d) => {
    const members = byDept.get(d);
    const byTitle = new Map();
    const titles = [];
    members.forEach((e) => {
      const t = e.position && String(e.position).trim() ? String(e.position).trim() : roleLabel(e.role_level, lang);
      if (!byTitle.has(t)) { byTitle.set(t, []); titles.push(t); }
      byTitle.get(t).push(e);
    });
    titles.sort((a, b) => a.localeCompare(b, lang === "ar" ? "ar" : "en"));
    const titleNodes = titles.map((t) => ({ title: t, employees: byTitle.get(t) }));
    // مدير القسم (إن وُجد) لعرضه في رأس صندوق القسم
    const mgr = members.find((m) => ["manager", "supervisor"].includes(m.role_level)) || null;
    return { department: d, count: members.length, manager: mgr, titles: titleNodes };
  });

  return { tops, deptNodes };
}

function renderNameList(emps) {
  return emps.map((e) => {
    const name = escapeHtml(employeeDisplayName(e));
    const num = e.employee_number ? " <span class=\"num\">#" + escapeHtml(e.employee_number) + "</span>" : "";
    return "<li>" + name + num + "</li>";
  }).join("");
}

function renderTitleNode(tn) {
  const names = renderNameList(tn.employees);
  return (
    "<li>" +
      "<div class=\"node title\" style=\"border-color:" + TITLE_COLOR + ";\">" +
        "<div class=\"node-title\">" + escapeHtml(tn.title) + "</div>" +
        "<ul class=\"members\">" + names + "</ul>" +
      "</div>" +
    "</li>"
  );
}

function renderDeptNode(dn) {
  const titleNodes = dn.titles.map(renderTitleNode).join("");
  const mgrHtml = dn.manager
    ? "<div class=\"dept-mgr\">" + escapeHtml(roleLabel(dn.manager.role_level, langRef)) + ": " + escapeHtml(employeeDisplayName(dn.manager)) + "</div>"
    : "";
  return (
    "<li>" +
      "<div class=\"node dept\" style=\"border-color:" + DEPT_COLOR + ";\">" +
        "<div class=\"node-title\">" + escapeHtml(dn.department) + "</div>" +
        "<div class=\"node-meta\">" + dn.count + "</div>" +
      "</div>" +
      (titleNodes ? "<ul>" + titleNodes + "</ul>" : "")
    + "</li>"
  );
}

// مرجع لغة يُحدّث عند بناء المستند (لتجنّب تمريره عبر دوال الرسم)
let langRef = "ar";

export function buildOrgHTML(_ref) {
  const employees = _ref.employees || [];
  const lang = _ref.lang || "ar";
  langRef = lang;
  const orgName = _ref.orgName || "";
  const logoUrl = _ref.logoUrl || "";
  const orgUnified = _ref.unifiedNumber || "";
  const isAr = lang === "ar";
  const stats = orgStats(employees);
  const orphans = employees.filter((e) => !e.manager_id && e.role_level !== "owner" && e.role_level !== "executive");
  const { tops, deptNodes } = buildDepartmentTree(employees, lang);

  const title = isAr ? "الهيكل التنظيمي" : "Organizational Structure";
  const dateL = isAr ? "تاريخ الإصدار" : "Issue date";
  const rootL = isAr ? "الإدارة العليا" : "Top Management";
  const statsRows = isAr
    ? [["إجمالي القوى العاملة", stats.total], ["عدد الإدارات", stats.departments.length],
       ["المدراء", stats.byLevel.manager + stats.byLevel.executive + stats.byLevel.owner],
       ["المشرفون", stats.byLevel.supervisor]]
    : [["Total workforce", stats.total], ["Departments", stats.departments.length],
       ["Managers", stats.byLevel.manager + stats.byLevel.executive + stats.byLevel.owner],
       ["Supervisors", stats.byLevel.supervisor]];
  const orphansL = isAr ? "موظفون بدون مدير مباشر" : "Employees without direct manager";

  const statsCells = statsRows.map((r) =>
    "<td style=\"border:1px solid #e2e8f0;padding:8px 12px;text-align:center;width:25%;\">" +
      "<div style=\"font-size:20px;font-weight:700;color:#7c3aed;\">" + r[1] + "</div>" +
      "<div style=\"font-size:11px;color:#64748b;margin-top:2px;\">" + escapeHtml(r[0]) + "</div>" +
    "</td>"
  ).join("");

  // صندوق الإدارة العليا — قائمة بأسماء كبار المسؤولين داخل الصندوق
  const topsList = tops.length
    ? "<ul class=\"members top\">" + tops.map((e) => {
        const nm = escapeHtml(employeeDisplayName(e));
        const rl = escapeHtml(roleLabel(e.role_level, lang));
        const ps = e.position ? " <span class=\"dim\">(" + escapeHtml(e.position) + ")</span>" : "";
        return "<li><span class=\"role-tag\">" + rl + "</span> " + nm + ps + "</li>";
      }).join("") + "</ul>"
    : "<div class=\"empty-top\">" + escapeHtml(isAr ? "—" : "—") + "</div>";

  const deptHtml = deptNodes.map(renderDeptNode).join("");

  const treeHtml = (
    "<div class=\"org-chart\">" +
      "<ul>" +
        "<li>" +
          "<div class=\"node root\" style=\"border-color:" + ROLE_COLORS.owner + ";\">" +
            "<div class=\"node-title\">" + escapeHtml(rootL) + "</div>" +
            topsList +
          "</div>" +
          (deptHtml ? "<ul>" + deptHtml + "</ul>" : "") +
        "</li>" +
      "</ul>" +
    "</div>"
  );

  const orphansHtml = orphans.length
    ? ("<div class=\"orphans\">" +
         "<div class=\"orphans-h\">" + escapeHtml(orphansL) + " (" + orphans.length + ")</div>" +
         orphans.map((e) =>
           "<span class=\"chip\">" + escapeHtml(employeeDisplayName(e)) + "</span>"
         ).join("") +
       "</div>")
    : "";

  const logo = logoUrl
    ? "<img src=\"" + escapeHtml(logoUrl) + "\" style=\"" + CLIENT_LOGO_CSS + "\" />"
    : "";
  const crown = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#c5a059\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m2 4 3 12h14l3-12-6.5 6L12 4l-3.5 6L2 4Z\"/><path d=\"M5 20h14\"/></svg>";
  const brandName = isAr ? "جداره" : "Jadara";
  const brandSub = isAr ? "لإدارة الموارد البشرية" : "HR Platform";
  const foot = isAr ? "تم إنشاء هذا المستند عبر نظام جداره للموارد البشرية" : "Generated by Jadara HR System";

  const style =
    "@page { size: A4; margin: 12mm; }" +
    "body { font-family: 'Tajawal','IBM Plex Sans Arabic','Arial',sans-serif; color:#0f172a; margin:0; }" +
    ".doc { width:100%; max-width:1000px; margin:0 auto; }" +
    ".head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding-bottom:12px; border-bottom:2px solid #0b1120; margin-bottom:16px; }" +
    ".org { display:flex; flex-direction:column; align-items:" + (isAr ? "flex-end" : "flex-start") + "; max-width:260px; }" +
    ".org img { " + CLIENT_LOGO_CSS + " }" +
    ".org-name { font-size:13px; font-weight:700; color:#0b1120; margin-top:6px; text-align:" + (isAr ? "right" : "left") + "; }" +
    ".org-un { font-size:10px; color:#666; }" +
    ".brand { display:flex; align-items:center; gap:10px; }" +
    ".brand-badge { width:" + PRINT_MARK_PX + "px; height:" + PRINT_MARK_PX + "px; border-radius:14px; background:#2d234a; box-shadow:0 0 0 1px rgba(197,160,89,.35); display:flex; align-items:center; justify-content:center; flex-shrink:0; }" +
    ".brand-name { font-size:15px; font-weight:800; color:#1a1a2e; }" +
    ".brand-sub { font-size:10px; color:#1a1a2e; opacity:.75; margin-top:1px; }" +
    ".head h1 { font-size:20px; margin:0; text-align:center; }" +
    ".head .sub { font-size:11px; color:#64748b; margin-top:4px; text-align:center; }" +
    ".stats { width:100%; border-collapse:collapse; margin:14px 0 22px; }" +
    ".foot { margin-top:28px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; text-align:center; }" +
    // === الشجرة الهرمية ===
    ".org-chart { direction:" + (isAr ? "rtl" : "ltr") + "; text-align:center; padding:10px 0 0; }" +
    ".org-chart ul { position:relative; padding-top:26px; display:flex; justify-content:center; flex-wrap:wrap; gap:6px; list-style:none; margin:0; }" +
    ".org-chart li { position:relative; padding:0 6px; }" +
    // خطوط الربط العمودية والأفقية
    ".org-chart li::before, .org-chart li::after { content:''; position:absolute; top:0; width:50%; height:26px; border-top:2px solid #94a3b8; }" +
    (isAr
      ? ".org-chart li::before { right:50%; } .org-chart li::after { left:50%; border-right:2px solid #94a3b8; }"
      : ".org-chart li::before { left:50%; } .org-chart li::after { right:50%; border-left:2px solid #94a3b8; }") +
    ".org-chart li:only-child::before, .org-chart li:only-child::after { display:none; }" +
    ".org-chart li:only-child { padding-top:0; }" +
    ".org-chart li:first-child::before { border:0 none; }" +
    ".org-chart li:last-child::" + (isAr ? "before" : "after") + " { border-" + (isAr ? "left" : "right") + ":2px solid #94a3b8; border-radius:0; }" +
    ".org-chart ul ul::before { content:''; position:absolute; top:0; " + (isAr ? "right" : "left") + ":50%; width:0; height:26px; border-" + (isAr ? "right" : "left") + ":2px solid #94a3b8; }" +
    // الصناديق
    ".node { display:inline-block; min-width:150px; max-width:240px; background:#fff; border:2px solid #cbd5e1; border-radius:10px; padding:8px 12px; box-shadow:0 1px 3px rgba(16,24,40,.06); }" +
    ".node.root { min-width:200px; background:#fffbeb; }" +
    ".node.dept { background:#f5f3ff; }" +
    ".node.title { background:#eff6ff; min-width:130px; max-width:200px; }" +
    ".node-title { font-size:12.5px; font-weight:800; color:#0f172a; line-height:1.3; }" +
    ".node.root .node-title { font-size:14px; color:" + ROLE_COLORS.owner + "; }" +
    ".node.dept .node-title { color:" + DEPT_COLOR + "; }" +
    ".node.title .node-title { color:" + TITLE_COLOR + "; font-size:12px; }" +
    ".node-meta { font-size:10px; color:#64748b; margin-top:2px; }" +
    // قوائم الأسماء داخل الصناديق
    "ul.members { list-style:none; padding:0; margin:6px 0 0; text-align:" + (isAr ? "right" : "left") + "; }" +
    "ul.members li { font-size:11px; color:#1e293b; padding:2px 0; line-height:1.4; display:block; }" +
    "ul.members li .num { color:#94a3b8; font-size:10px; }" +
    "ul.members li .dim { color:#64748b; font-size:10px; }" +
    "ul.members.top li { padding:3px 0; font-weight:600; }" +
    ".role-tag { display:inline-block; font-size:9.5px; font-weight:700; color:#fff; background:" + ROLE_COLORS.executive + "; padding:1px 6px; border-radius:6px; margin-inline-end:4px; }" +
    ".empty-top { font-size:11px; color:#94a3b8; padding:6px 0; }" +
    // الأيتام
    ".orphans { margin-top:26px; }" +
    ".orphans-h { font-size:12px; font-weight:700; color:#475569; margin-bottom:8px; }" +
    ".chip { display:inline-block; font-size:11px; padding:4px 10px; margin:3px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; }" +
    "@media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } .doc { max-width:none; width:100%; } .org-chart ul { flex-wrap:wrap; } }";

  return "<!DOCTYPE html>" +
    "<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\" xmlns=\"http://www.w3.org/TR/REC-html40\" dir=\"" + (isAr ? "rtl" : "ltr") + "\" lang=\"" + (isAr ? "ar" : "en") + "\">" +
    "<head><meta charset=\"utf-8\" /><title>" + escapeHtml(title) + "</title><style>" + style + "</style></head><body>" +
    "<div class=\"doc\">" +
      "<div class=\"head\">" +
        "<div class=\"org\">" +
          logo +
          (orgName ? "<div class=\"org-name\">" + escapeHtml(orgName) + "</div>" : "") +
          (orgUnified ? "<div class=\"org-un\">" + escapeHtml(isAr ? "الرقم الموحد: " : "Unified No: ") + escapeHtml(orgUnified) + "</div>" : "") +
        "</div>" +
        "<div class=\"brand\">" +
          "<div class=\"brand-badge\">" + crown + "</div>" +
          "<div><div class=\"brand-name\">" + escapeHtml(brandName) + "</div><div class=\"brand-sub\">" + escapeHtml(brandSub) + "</div></div>" +
        "</div>" +
      "</div>" +
      "<div style=\"text-align:center;margin-bottom:8px;\">" +
        "<h1>" + escapeHtml(title) + "</h1>" +
        "<div class=\"sub\">" + escapeHtml(dateL) + ": " + escapeHtml(formatDate(lang)) + "</div>" +
      "</div>" +
      "<table class=\"stats\"><tr>" + statsCells + "</tr></table>" +
      treeHtml +
      orphansHtml +
      "<div class=\"foot\">" + foot + "</div>" +
    "</div></body></html>";
}

export function printOrgChartPDF(opts) {
  const html = buildOrgHTML(opts);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(function () { try { w.print(); } catch (e) {} }, 500);
}

export function downloadOrgWord(opts) {
  const html = buildOrgHTML(opts);
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "org-chart.doc";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}