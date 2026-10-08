// هوية الطباعة الموحّدة: شعار المنشأة + اسمها أعلى اليمين، وشعار جداره (التاج الذهبي) أعلى اليسار.
// تستخدمها جميع أدوات الطباعة (employeePrint / sectionPrint ...) لإدراج ترويسة هوية واحدة على كل مستند.
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";

const AMP = String.fromCharCode(38);
const SEMI = String.fromCharCode(59);
const ENT = { 38: AMP + "amp" + SEMI, 60: AMP + "lt" + SEMI, 62: AMP + "gt" + SEMI, 34: AMP + "quot" + SEMI, 39: AMP + "#39" + SEMI };
function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ENT[c.charCodeAt(0)]); }

let _orgCache = null;
let _orgFetched = false;

// يخزّن رابط الشعار مسبقًا في ذاكرة المتصفح ليظهر فورًا في المستندات المطبوعة.
export function preloadLogo(url) {
  if (!url) return;
  try { const pre = new Image(); pre.crossOrigin = "anonymous"; pre.src = url; } catch (e) {}
}

export async function fetchOrg() {
  if (_orgFetched) return _orgCache;
  _orgFetched = true;
  try {
    const r = await listCurrentOrg();
    _orgCache = (r && r[0]) || null;
  } catch (e) { _orgCache = null; }
  // تخزين الشعار مسبقًا في ذاكرة المتصفح ليظهر فورًا في كل المستندات دون تأخير.
  if (_orgCache && _orgCache.logo_url) {
    try { const pre = new Image(); pre.crossOrigin = "anonymous"; pre.src = _orgCache.logo_url; } catch (e) {}
  }
  return _orgCache;
}

// تاج ذهبي داخل مربع كحلي — مطابق لهوية جداره في باقي المستندات.
const CROWN_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>';

// أنماط CSS الخاصة بترويسة الهوية — تُضاف مرة واحدة لكل مستند.
export const brandHeaderCss = [
  ".print-report .brand-head{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #0b1120;padding-bottom:10px;margin-bottom:10px;}",
  ".print-report .brand-right{display:flex;flex-direction:column;align-items:flex-end;max-width:260px;}",
  ".print-report .brand-right img{max-width:150px;max-height:56px;object-fit:contain;}",
  ".print-report .brand-name{font-weight:700;font-size:12pt;color:#0b1120;margin-top:6px;text-align:right;}",
  ".print-report .brand-unified{font-size:9pt;color:#666;}",
  ".print-report .brand-left{display:flex;align-items:center;gap:10px;}",
  ".print-report .brand-badge{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#0b0f19,#2e2448);box-shadow:0 0 0 1px rgba(252,211,77,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;}",
  ".print-report .brand-jt{font-weight:800;font-size:15px;color:#0b1120;line-height:1;}",
  ".print-report .brand-js{font-size:10px;color:#666;margin-top:1px;}",
].join("");

export function brandHeaderHtml(org, isAr) {
  const name = org && org.name ? org.name : (isAr ? "جداره — الموارد البشرية" : "Jadara HR");
  const logo = org && org.logo_url
    ? "<img src=\"" + esc(org.logo_url) + "\" crossOrigin=\"anonymous\" alt=\"\">"
    : "";
  const unified = org && org.unified_number
    ? "<div class=\"brand-unified\">" + (isAr ? "الرقم الموحد: " : "Unified No: ") + esc(org.unified_number) + "</div>"
    : "";
  return "<div class=\"brand-head\">"
    + "<div class=\"brand-right\">" + logo
    + "<div class=\"brand-name\">" + esc(name) + "</div>"
    + unified
    + "</div>"
    + "<div class=\"brand-left\">"
    + "<div class=\"brand-badge\">" + CROWN_SVG + "</div>"
    + "<div><div class=\"brand-jt\">جداره</div><div class=\"brand-js\">لإدارة الموارد البشرية</div></div>"
    + "</div>"
    + "</div>";
}