import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createRoot } from "react-dom/client";
import { base44 } from "@/api/base44Client";

function waitForImages(node) {
  const imgs = Array.from(node.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((res) => {
            img.onload = res;
            img.onerror = res;
            setTimeout(res, 2000);
          })
    )
  );
}

// يرسم ختم "PAID" كبير شبه شفاف ومائل أسفل محتوى الصفحة مع هامش معقول من الأسفل
// يُدار النص حول نقطة الأساس، لذا يُزاح مركز البيضاوي ليطابق المركز البصري الفعلي للنص بعد الدوران
function drawPaidStamp(pdf, pageW, pageH) {
  const cx = pageW / 2, cy = pageH - 55;
  const angle = 24;
  const fontSize = 92;
  try { pdf.setGState(new pdf.GState({ opacity: 0.15 })); } catch (e) {}
  pdf.setTextColor(5, 150, 105);
  try { pdf.setFont("helvetica", "bold"); pdf.setFontSize(fontSize); } catch (e) {}
  // النص يدور حول نقطة الأساس (cx, cy)
  try { pdf.text("PAID", cx, cy, { align: "center", angle }); } catch (e) {}
  try { pdf.setGState(new pdf.GState({ opacity: 1 })); } catch (e) {}
}

// يزيل كل علامات الأقواس/الأقواس المربعة من نصوص العنصر المُطبوع نهائياً
// لأنها تظهر معكوسة/غير مرتبة في ملفات PDF العربية (RTL). يُطبَّق على كل التقارير.
function normalizeArabicParenthesis(root) {
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    // أنواع الأقواس: ( ) [ ] （ ）［ ］【 】〚 〛⟦ ⟧⟨ ⟩⟪ ⟫
    for (const tn of texts) {
      const v = tn.nodeValue;
      if (!v) continue;
      const cleaned = v.replace(/[()[\]（）［］【】〚〛⟦⟧⟨⟩⟪⟫]/g, "");
      if (cleaned !== v) tn.nodeValue = cleaned;
    }
  } catch (e) {}
}

// نسبة "الحبر" (الأجزاء الداكنة) في كل صف من نسخة مصغَّرة من الصورة،
// لاختيار نقاط قطع الصفحات داخل الفراغات بين السطور بدل حدود ثابتة.
function rowInkProfile(canvas) {
  const W = 420;
  const H = Math.max(2, Math.round((canvas.height / canvas.width) * W));
  const sc = document.createElement("canvas");
  sc.width = W;
  sc.height = H;
  const c = sc.getContext("2d", { willReadFrequently: true });
  c.drawImage(canvas, 0, 0, W, H);
  const { data } = c.getImageData(0, 0, W, H);
  const ink = new Float32Array(H);
  for (let r = 0; r < H; r++) {
    let n = 0;
    const base = r * W * 4;
    for (let x = 0; x < W; x++) {
      const i = base + x * 4;
      if ((data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000 < 245) n++;
    }
    ink[r] = n / W;
  }
  return { ink, rows: H };
}

// يقسّم الصورة إلى شرائح بارتفاع صفحة A4 كحدّ أقصى، ويؤجّل حدّ كل صفحة قليلاً حتى يقع
// داخل فراغ واضح بين السطور (ضمن نافذة 16% من ارتفاع الصفحة)، فتبقى آخر كلمة/سطر كاملة
// على صفحته بدل قصّه نصف قصّ، وتنتهي كل صفحة بمساحة بيضاء بدل محتوى لاصق بالحافة.
function sliceIntoPages(canvas, pageW, pageH) {
  const totalH = canvas.height;
  const pagePx = Math.round((canvas.width * pageH) / pageW);
  const { ink, rows } = rowInkProfile(canvas);
  const per = totalH / rows;              // بيكسل أصلي لكل صف مصغّر
  const tol = Math.round(pagePx * 0.16);  // نافذة البحث قبل حدّ الصفحة
  const QUIET = 0.02;                     // أقل من 2% حبراً في الصف = فراغ
  const NEIGHBOR = 0.35;                  // جارّا الصف لا يكونان داخل سطر طويل

  const slices = [];
  let start = 0;
  let guard = 0;
  while (totalH - start > pagePx && guard++ < 5000) {
    const ideal = start + pagePx;
    const rMax = Math.min(rows - 1, Math.floor(ideal / per));
    const rMin = Math.max(0, Math.floor((ideal - tol) / per));
    let anchor = -1;
    let minR = -1, minV = 1;
    for (let r = rMax; r >= rMin; r--) {
      const v = ink[r];
      if (v < minV) { minV = v; minR = r; }
      if (v < QUIET && Math.max(r > 0 ? ink[r - 1] : 0, r + 1 < rows ? ink[r + 1] : 0) < NEIGHBOR) {
        anchor = r;
        break;
      }
    }
    let cut = -1;
    if (anchor >= 0) cut = Math.round((anchor + 1) * per);
    else if (minR >= 0 && minV < 0.12) cut = Math.round((minR + 1) * per);
    if (!(cut > start && cut <= ideal)) cut = ideal;
    slices.push([start, cut]);
    start = cut;
  }
  slices.push([start, totalH]);
  return slices;
}

// يحوّل عنصر DOM إلى Blob PDF (A4، عربي RTL عبر html2canvas)
// options.stamp = true يضع ختم "تم الدفع / PAID" كبير على كل صفحة
// options.landscape = true يجعل الصفحة أفقية (A4 landscape) للجداول العريضة ككشوف الرواتب
export async function elementToPdfBlob(node, options = {}) {
  await waitForImages(node);
  normalizeArabicParenthesis(node);
  // html2canvas يفكّك أحرف العربية (أشكال معزولة) عند أي letter-spacing غير صفري،
  // لذا نصفّر المسافة لكل العناصر داخل العنصر المُلتقط (يُصلح عناوين <h3> ... إلخ)
  // كما نضمن خطاً عربياً مدعوماً ليُطبَّق التشكيل/الوصل بصورة صحيحة.
  try {
    node.querySelectorAll("*").forEach((el) => {
      if (!el.style) return;
      if (el.style.letterSpacing !== "normal") el.style.letterSpacing = "normal";
      if (el.tagName === "TEXT" || el.tagName === "TSPAN") {
        el.setAttribute("letter-spacing", "normal");
      }
    });
  } catch (e) {}
  const landscape = !!options.landscape;
  const pageW = landscape ? 297 : 210, pageH = landscape ? 210 : 297;
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });

  // تقسيم واعٍ لحدود الصفحات (يمنع قصّ سطر نصيّ على حدّ الصفحة) — وكل صفحة تُطبع
  // أعلى مساحتها ثم تبقى مساحة بيضاء أسفلها، فلا يبقى بند أو كلمة مكسورين عند نهاية الصفحة.
  const slices = sliceIntoPages(canvas, pageW, pageH);
  const pdf = new jsPDF(landscape ? "l" : "p", "mm", "a4");
  const pagePx = Math.round((canvas.width * pageH) / pageW);
  for (let i = 0; i < slices.length; i++) {
    const [s, e] = slices[i];
    const h = Math.min(pagePx, e - s);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pagePx;
    const ctx = pageCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, s, canvas.width, h, 0, 0, canvas.width, h);
    if (i > 0) pdf.addPage();
    pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pageW, pageH);
    if (options.stamp) drawPaidStamp(pdf, pageW, pageH);
  }
  return pdf.output("blob");
}

export async function uploadPdfBlob(blob, filename) {
  const file = new File([blob], filename, { type: "application/pdf" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

// يعرض مكوّن React خارج الشاشة، يلتقطه PDF، ثم ينظّف
export async function renderToPdfBlob(component) {
  const host = document.createElement("div");
  host.dir = "rtl";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.right = "-99999px";
  host.style.width = "794px";
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  document.body.appendChild(host);
  const root = createRoot(host);
  await new Promise((resolve) => {
    root.render(component);
    setTimeout(resolve, 350);
  });
  let blob;
  try {
    blob = await elementToPdfBlob(host);
  } finally {
    setTimeout(() => {
      try { root.unmount(); } catch (e) {}
      host.remove();
    }, 200);
  }
  return blob;
}