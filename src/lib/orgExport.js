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

const LINE = "#1e293b";
const PRINT_COL_W = 140;

// شعار جداره (التاج الذهبي داخل مربع كحلي) — نفس هوية باقي مطبوعات النظام
const CROWN_SVG =
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#c5a059\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z\"/><path d=\"M5 21h14\"/></svg>";

// ترويسة الهوية الموحّدة بصيغة جدول: شعار المنشأة واسمها ورقمها الموحد أعلى اليمين،
// وشعار جداره أعلى اليسار — نفس صيغة بقية المستندات، لكنها تعمل أيضاً في Word
// (لأن برنامج Word لا يدعم flex ولا يحفظ ترتيبه).
function brandTable(o) {
  const isAr = o.isAr;
  const logo = o.logoUrl
    ? "<img src=\"" + escapeHtml(o.logoUrl) + "\" alt=\"\" height=\"" + PRINT_MARK_PX + "\" style=\"" + CLIENT_LOGO_CSS + "\" />"
    : "";
  const client =
    "<td align=\"" + (isAr ? "right" : "left") + "\" valign=\"top\" style=\"padding:0 0 10px 0;\">" +
      logo +
      (o.orgName ? "<div style=\"font-size:13px;font-weight:bold;color:#0b1120;margin-top:6px;\">" + escapeHtml(o.orgName) + "</div>" : "") +
      (o.unified ? "<div style=\"font-size:10px;color:#666;\">" + escapeHtml(isAr ? "الرقم الموحد: " : "Unified No: ") + escapeHtml(o.unified) + "</div>" : "") +
    "</td>";
  const jadara =
    "<td align=\"" + (isAr ? "left" : "right") + "\" valign=\"top\" style=\"padding:0 0 10px 0;\">" +
      "<table cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;\"><tr>" +
        "<td valign=\"middle\"><div style=\"width:" + PRINT_MARK_PX + "px;height:" + PRINT_MARK_PX + "px;background:#2d234a;text-align:center;border:1px solid rgba(197,160,89,.4);\">" + CROWN_SVG + "</div></td>" +
        "<td valign=\"middle\" style=\"padding:0 10px;\">" +
          "<div style=\"font-size:15px;font-weight:bold;color:#1a1a2e;\">" + escapeHtml(isAr ? "جداره" : "Jadara") + "</div>" +
          "<div style=\"font-size:10px;color:#1a1a2e;\">" + escapeHtml(isAr ? "لإدارة الموارد البشرية" : "HR Platform") + "</div>" +
        "</td>" +
      "</tr></table>" +
    "</td>";
  return "<table dir=\"" + (isAr ? "rtl" : "ltr") + "\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;border-collapse:collapse;border-bottom:2px solid #0b1120;margin-bottom:16px;\">" +
    "<tr>" + client + jadara + "</tr></table>";
}

/* ===================== نسخة الطباعة (تعمل في المتصفح) ===================== */

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

// المخطط العمودي للطباعة: صندوق الإدارة في الأعلى وتحته في نفس العمود موظفوها
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

/* ===================== نسخة Word (مبنية بجداول) ===================== */

// Word يتجاهل flex، لذا نرسم المخطط بجدول: القمة، ثم صف رؤوس الإدارات،
// ثم صف لكل مستوى من الموظفين — كل إدارة عمود واحد يبقى كما في الطباعة.
function wordBox(colors, title, sub, sizePt) {
  return (
    "<div class=\"wbox\" style=\"border:1px solid " + colors.border + ";background:" + colors.bg + ";color:" + colors.color +
      ";padding:4px 3px;text-align:center;\">" +
      "<div style=\"font-size:" + sizePt + "pt;font-weight:bold;line-height:1.2;\">" + escapeHtml(title) + "</div>" +
      (sub ? "<div style=\"font-size:" + (sizePt - 0.5) + "pt;line-height:1.2;margin-top:2px;\">" + escapeHtml(sub) + "</div>" : "") +
    "</div>"
  );
}

function wordTopBox(node, lang) {
  const colors = chartColors(node.role_level);
  const text = chartNodeText(node, lang);
  const sub = [text.name && text.name !== text.title ? text.name : "", text.num].filter(Boolean).join(" ");
  return wordBox(colors, text.title, sub, 9);
}

function wordMemberBox(node, lang) {
  const colors = chartColors(node.role_level);
  const text = chartNodeText(node, lang);
  const sub = [text.name && text.name !== text.title ? text.name : "", text.num].filter(Boolean).join(" ");
  return wordBox(colors, text.title, sub, 8);
}

function wordHeadBox(col, lang, noneLabel, noManagerLabel) {
  const colors = col.manager ? chartColors(col.manager.role_level) : chartColors("manager");
  const head = col.name || noneLabel;
  const sub = col.manager
    ? employeeDisplayName(col.manager) + (col.manager.role_level ? " \u2022 " + roleLabel(col.manager.role_level, lang) : "")
    : noManagerLabel;
  return wordBox(colors, head, sub, 8.5);
}

const VLINE = "<div style=\"width:2px;height:8px;background:" + LINE + ";margin:0 auto;\"></div>";

function renderWordChart(employees, lang, noneLabel, noManagerLabel, structureOnly) {
  const model = buildChartModel(employees, { structureOnly });
  const top = model.top || [];
  const cols = model.columns || [];
  if (!top.length && !cols.length) return "";

  const span = Math.max(cols.length, 1);
  const rows = [];

  if (top.length) {
    rows.push(
      "<tr><td colspan=\"" + span + "\" align=\"center\" style=\"padding:0 0 8px 0;\">" +
        top.map((node, i) => (i > 0 ? VLINE : "") + wordTopBox(node, lang)).join("") +
        (cols.length ? VLINE : "") +
      "</td></tr>"
    );
  }

  if (cols.length) {
    // خط الإدارات الأفقي (شبيه بناقل الطباعة) أعلى صف رؤوس الإدارات
    rows.push(
      "<tr>" + cols.map((col) =>
        "<td align=\"center\" valign=\"top\" style=\"border-top:2px solid " + LINE + ";padding:6px 3px 0 3px;\">" +
          wordHeadBox(col, lang, noneLabel, noManagerLabel) +
        "</td>"
      ).join("") + "</tr>"
    );

    const maxMembers = cols.reduce((m, c) => Math.max(m, c.members.length), 0);
    for (let i = 0; i < maxMembers; i += 1) {
      rows.push(
        "<tr>" + cols.map((col) => {
          const m = col.members[i];
          return "<td align=\"center\" valign=\"top\" style=\"padding:0 3px;\">" +
            (m ? VLINE + wordMemberBox(m, lang) : "&nbsp;") +
          "</td>";
        }).join("") + "</tr>"
      );
    }
  }

  return "<table class=\"wchart\" dir=\"" + (lang === "ar" ? "rtl" : "ltr") + "\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;border-collapse:collapse;table-layout:fixed;\">" +
    rows.join("") +
  "</table>";
}

/* ===================== بناء المستند ===================== */

const PRINT_CSS = [
  ".oc-wrap { display:flex; justify-content:center; padding-top:4px; }",
  ".oc { flex:0 0 auto; display:inline-flex; flex-direction:column; align-items:center; }",
  ".oc-top { display:flex; flex-direction:column; align-items:center; }",
  ".oc-row { display:flex; align-items:flex-start; justify-content:center; position:relative; }",
  ".oc-col { display:flex; flex-direction:column; align-items:center; }",
  ".oc-bus { position:absolute; top:0; height:2px; background:" + LINE + "; }",
  ".oc-stem { width:2px; height:12px; background:" + LINE + "; }",
  ".oc-stub { width:2px; height:8px; background:" + LINE + "; }",
  ".box { box-sizing:border-box; border:2px solid " + LINE + "; border-radius:7px; padding:5px 4px; text-align:center; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(15,23,42,.08); }",
  ".box-head { width:130px; height:58px; }",
  ".box-top { width:136px; height:58px; }",
  ".box-sm { width:120px; height:40px; }",
  ".box-title { font-size:10px; font-weight:800; line-height:1.2; max-height:2.4em; overflow:hidden; }",
  ".box-sub { font-size:8.5px; line-height:1.2; margin-top:2px; max-height:2.4em; overflow:hidden; }",
  ".box-sm .box-title { font-size:9px; }",
].join("");

// ملاءمة المخطط على ورقة A4 واحدة: قياس المحتوى ثم تصغيره واختيار الاتجاه المناسب
const FIT_SCRIPT =
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

export function buildOrgHTML(_ref) {
  const employees = _ref.employees || [];
  const lang = _ref.lang || "ar";
  const forWord = !!_ref.forWord;
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

  // Word: نفس المخطط لكن بجداول؛ الطباعة: مخطط flex بالتصغير التلقائي على ورقة A4
  const chartHtml = forWord
    ? renderWordChart(employees, lang, noneLabel, noManagerLabel, structureOnly)
    : renderChart(employees, lang, noneLabel, noManagerLabel, structureOnly);

  const header = brandTable({ isAr, orgName, logoUrl, unified: orgUnified });
  const foot = isAr ? "تم إنشاء هذا المستند عبر نظام جداره للموارد البشرية" : "Generated by Jadara HR System";

  const style =
    "@page { size: A4 portrait; margin: 6mm; }" +
    "body { font-family: 'Tajawal','IBM Plex Sans Arabic','Arial',sans-serif; color:#0f172a; margin:0; }" +
    (forWord ? "" : PRINT_CSS) +
    "@media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }";

  return "<!DOCTYPE html>" +
    "<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\" xmlns=\"http://www.w3.org/TR/REC-html40\" dir=\"" + (isAr ? "rtl" : "ltr") + "\" lang=\"" + (isAr ? "ar" : "en") + "\">" +
    "<head><meta charset=\"utf-8\" /><title>" + escapeHtml(title) + "</title><style>" + style + "</style></head><body>" +
    "<div class=\"doc\" style=\"width:100%;margin:0 auto;\">" +
      header +
      "<div style=\"text-align:center;margin:0 0 8px;\">" +
        "<h1 style=\"font-size:20px;margin:0;\">" + escapeHtml(title) + "</h1>" +
        "<div style=\"font-size:11px;color:#64748b;margin-top:4px;\">" + escapeHtml(dateL) + ": " + escapeHtml(formatDate(lang)) + "</div>" +
        (scopeNote ? "<div style=\"font-size:11px;font-weight:700;color:#7c3aed;margin-top:2px;\">" + escapeHtml(scopeNote) + "</div>" : "") +
      "</div>" +
      "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;border-collapse:collapse;margin:14px 0 18px;\"><tr>" + statsCells + "</tr></table>" +
      chartHtml +
      "<div style=\"margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;\">" + escapeHtml(foot) + "</div>" +
    "</div>" +
    (forWord ? "" : "<script>" + FIT_SCRIPT + "<\/script>") +
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

// تضمين شعار المنشأة داخل ملف Word كـ base64 حتى يظهر دائماً عند فتح الملف
// (Word لا يحمّل الصور من روابط خارجية في بعض الحالات). وعند التعذّر نُبقي الرابط.
async function inlineImage(url) {
  if (!url || !/^https?:/i.test(url)) return "";
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return "";
    const blob = await res.blob();
    if (!/^image\//i.test(blob.type) || blob.size > 3000000) return "";
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : "");
      fr.onerror = () => resolve("");
      fr.readAsDataURL(blob);
    });
  } catch (e) {
    return "";
  }
}

export async function downloadOrgWord(opts) {
  const options = opts || {};
  const logo = options.logoUrl ? await inlineImage(options.logoUrl) : "";
  const html = buildOrgHTML({
    ...options,
    forWord: true,
    logoUrl: logo || options.logoUrl || "",
  });
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = options.structure ? "org-chart-departments.doc" : "org-chart.doc";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
