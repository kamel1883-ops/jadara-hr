import { orgStats, buildChartModel, chartColors, chartNodeText, employeeDisplayName, roleLabel } from "@/lib/orgTree";
import { genDateBoth } from "@/lib/printDate";
import { CLIENT_LOGO_CSS, PRINT_MARK_PX } from "@/lib/printBrand";

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

// أبعاد صناديق الطباعة (أصغر قليلاً من الشاشة لتناسب A4)
const PRINT_COL_W = 140;

function printBox(cls, colors, title, sub) {
  return (
    "<div class=\"" + cls + "\" style=\"background:" + colors.bg + ";border-color:" + colors.border + ";color:" + colors.color + ";\">" +
      "<div class=\"box-title\">" + escapeHtml(title) + "</div>" +
      (sub ? "<div class=\"box-sub\">" + escapeHtml(sub) + "</div>" : "") +
    "</div>"
  );
}

function renderTopBox(node, lang) {
  const colors = chartColors(node.role_level);
  const text = chartNodeText(node, lang);
  const sub = [text.name && text.name !== text.title ? text.name : "", text.num].filter(Boolean).join(" ");
  return printBox("box box-top", colors, text.title, sub);
}

function renderMemberBox(node, lang) {
  const colors = chartColors(node.role_level);
  const text = chartNodeText(node, lang);
  const sub = [text.name && text.name !== text.title ? text.name : "", text.num].filter(Boolean).join(" ");
  return printBox("box box-sm", colors, text.title, sub);
}

// المخطط العمودي: صندوق الإدارة في الأعلى وتحته في نفس العمود موظفوها
// وفي وضع "الإدارات والأقسام" تُعرض رؤوس الإدارات ورؤساء الأقسام دون الموظفين
function renderChart(employees, lang, noneLabel, noManagerLabel, structureOnly) {
  const model = buildChartModel(employees, { structureOnly });
  const top = model.top || [];
  const cols = model.columns || [];
  if (!top.length && !cols.length) return "";

  const topHtml = top.length
    ? "<div class=\"oc-top\">" +
        top.map((node, i) => (i > 0 ? "<div class=\"oc-stem\"></div>" : "") + renderTopBox(node, lang)).join("") +
      "</div>"
    : "";

  const busHalf = ((cols.length - 1) * PRINT_COL_W) / 2;
  const busHtml = cols.length > 1
    ? "<div class=\"oc-bus\" style=\"left:calc(50% - " + busHalf + "px);right:calc(50% - " + busHalf + "px);\"></div>"
    : "";

  const colsHtml = cols.map((col) => {
    const colors = col.manager ? chartColors(col.manager.role_level) : chartColors("manager");
    const head = col.name || noneLabel;
    const sub = col.manager
      ? employeeDisplayName(col.manager) + (col.manager.role_level ? " \u2022 " + roleLabel(col.manager.role_level, lang) : "")
      : noManagerLabel;
    const members = col.members
      .map((m) => "<div class=\"oc-stub\"></div>" + renderMemberBox(m, lang))
      .join("");
    return "<div class=\"oc-col\" style=\"width:" + PRINT_COL_W + "px;\">" +
      "<div class=\"oc-stem\"></div>" + printBox("box box-head", colors, head, sub) + members +
    "</div>";
  }).join("");

  const link = top.length && cols.length ? "<div class=\"oc-stem\"></div>" : "";
  return "<div class=\"oc-wrap\"><div class=\"oc\" dir=\"" + (lang === "ar" ? "rtl" : "ltr") + "\">" +
    topHtml + link +
    "<div class=\"oc-row\">" + busHtml + colsHtml + "</div>" +
  "</div></div>";
}

export function buildOrgHTML(_ref) {
  const employees = _ref.employees || [];
  const lang = _ref.lang || "ar";
  const orgName = _ref.orgName || "";
  const logoUrl = _ref.logoUrl || "";
  const orgUnified = _ref.unifiedNumber || "";
  const structureOnly = !!_ref.structure;
  const isAr = lang === "ar";
  const stats = orgStats(employees);

  const title = structureOnly
    ? (isAr ? "الهيكل التنظيمي — الإدارات والأقسام" : "Org Structure — Departments & Sections")
    : (isAr ? "الهيكل التنظيمي" : "Organizational Structure");
  const scopeNote = structureOnly
    ? (isAr ? "النطاق: الإدارات ورؤساء الأقسام فقط دون الموظفين" : "Scope: departments and section heads only, without employees")
    : "";
  const dateL = isAr ? "تاريخ الإصدار" : "Issue date";
  const noneLabel = isAr ? "أخرى" : "Others";
  const noManagerLabel = isAr ? "بلا مدير" : "No manager";
  const statsRows = isAr
    ? [["إجمالي القوى العاملة", stats.total], ["عدد الإدارات", stats.departments.length],
       ["المدراء", stats.byLevel.manager + stats.byLevel.executive + stats.byLevel.owner],
       ["المشرفون", stats.byLevel.supervisor]]
    : [["Total workforce", stats.total], ["Departments", stats.departments.length],
       ["Managers", stats.byLevel.manager + stats.byLevel.executive + stats.byLevel.owner],
       ["Supervisors", stats.byLevel.supervisor]];

  const statsCells = statsRows.map((r) =>
    "<td style=\"border:1px solid #e2e8f0;padding:8px 12px;text-align:center;width:25%;\">" +
      "<div style=\"font-size:20px;font-weight:700;color:#7c3aed;\">" + r[1] + "</div>" +
      "<div style=\"font-size:11px;color:#64748b;margin-top:2px;\">" + escapeHtml(r[0]) + "</div>" +
    "</td>"
  ).join("");

  const treeHtml = renderChart(employees, lang, noneLabel, noManagerLabel, structureOnly);

  const logo = logoUrl
    ? "<img src=\"" + escapeHtml(logoUrl) + "\" style=\"" + CLIENT_LOGO_CSS + "\" />"
    : "";
  const crown = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#c5a059\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m2 4 3 12h14l3-12-6.5 6L12 4l-3.5 6L2 4Z\"/><path d=\"M5 20h14\"/></svg>";
  const brandName = isAr ? "جداره" : "Jadara";
  const brandSub = isAr ? "لإدارة الموارد البشرية" : "HR Platform";
  const foot = isAr ? "تم إنشاء هذا المستند عبر نظام جداره للموارد البشرية" : "Generated by Jadara HR System";

  const style =
    "@page { size: A4 portrait; margin: 6mm; }" +
    "body { font-family: 'Tajawal','IBM Plex Sans Arabic','Arial',sans-serif; color:#0f172a; margin:0; }" +
    ".doc { width:100%; margin:0 auto; }" +
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
    ".stats { width:100%; border-collapse:collapse; margin:14px 0 18px; }" +
    ".foot { margin-top:24px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; text-align:center; }" +
    // المخطط العمودي: الإدارة فوق وموظفوها أسفلها في عمود واحد
    ".oc-wrap { display:flex; justify-content:center; padding-top:4px; }" +
    ".oc { flex:0 0 auto; display:inline-flex; flex-direction:column; align-items:center; }" +
    ".oc-top { display:flex; flex-direction:column; align-items:center; }" +
    ".oc-row { display:flex; align-items:flex-start; justify-content:center; position:relative; }" +
    ".oc-col { display:flex; flex-direction:column; align-items:center; }" +
    ".oc-bus { position:absolute; top:0; height:2px; background:#1e293b; }" +
    ".oc-stem { width:2px; height:12px; background:#1e293b; }" +
    ".oc-stub { width:2px; height:8px; background:#1e293b; }" +
    ".box { box-sizing:border-box; border:2px solid #1e293b; border-radius:7px; padding:5px 4px; text-align:center; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(15,23,42,.08); }" +
    ".box-head { width:130px; height:58px; }" +
    ".box-top { width:136px; height:58px; }" +
    ".box-sm { width:120px; height:40px; }" +
    ".box-title { font-size:10px; font-weight:800; line-height:1.2; max-height:2.4em; overflow:hidden; }" +
    ".box-sub { font-size:8.5px; line-height:1.2; margin-top:2px; max-height:2.4em; overflow:hidden; }" +
    ".box-sm .box-title { font-size:9px; }" +
    "@media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }";

  // ملاءمة المخطط على ورقة A4 واحدة: قياس المحتوى ثم تصغيره واختيار الاتجاه المناسب
  const fitScript =
    "function fitOrg(){var doc=document.querySelector('.doc');if(!doc)return;" +
    "doc.style.zoom='1';doc.style.width='max-content';" +
    "var W=Math.max(doc.offsetWidth||0,1);var H=Math.max(doc.offsetHeight||0,1);doc.style.width='';" +
    "var LW=1077,LH=748,PW=748,PH=1077;" +
    "var zL=Math.min(LW/W,LH/H,1);var zP=Math.min(PW/W,PH/H,1);" +
    "var land=zL>=zP;var z=(land?zL:zP);if(z<0.3)z=0.3;" +
    "var st=document.getElementById('org-page');if(!st){st=document.createElement('style');st.id='org-page';document.head.appendChild(st);}" +
    "st.textContent='@page{size:A4 '+(land?'landscape':'portrait')+';margin:6mm;}';" +
    "doc.style.zoom=String(z);}" +
    "window.addEventListener('load',fitOrg);window.addEventListener('beforeprint',fitOrg);";

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
        (scopeNote ? "<div class=\"sub\" style=\"font-weight:700;color:#7c3aed;\">" + escapeHtml(scopeNote) + "</div>" : "") +
      "</div>" +
      "<table class=\"stats\"><tr>" + statsCells + "</tr></table>" +
      treeHtml +
      "<div class=\"foot\">" + foot + "</div>" +
    "</div>" +
    "<script>" + fitScript + "<\/script>" +
    "</body></html>";
}

export function printOrgChartPDF(opts) {
  const html = buildOrgHTML(opts);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(function () { try { w.print(); } catch (e) {} }, 600);
}

export function downloadOrgWord(opts) {
  const html = buildOrgHTML(opts);
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts && opts.structure ? "org-chart-departments.doc" : "org-chart.doc";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
