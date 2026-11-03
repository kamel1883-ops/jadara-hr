# -*- coding: utf-8 -*-
"""Render the Jadara employee-portal screenshot guides to A4 PDF (AR + EN).

Design: one screenshot per page with a single short caption underneath, exactly
as requested — pictures from the real portal, minimal text.

Usage: python guide/build_visual_guide.py
Reads  guide/content.json, writes  guide/Jadara-Employee-Guide-AR.pdf / -EN.pdf
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(BASE, "shots")
FONTS = os.path.join(BASE, "fonts")

DATE = "نوفمبر 2026"

CSS = """
@font-face { font-family: 'PlexAr'; src: url('file://%(fonts)s/IBMPlexSansArabic-Regular.ttf'); font-weight: 400; }
@font-face { font-family: 'PlexAr'; src: url('file://%(fonts)s/IBMPlexSansArabic-Medium.ttf'); font-weight: 500; }
@font-face { font-family: 'PlexAr'; src: url('file://%(fonts)s/IBMPlexSansArabic-SemiBold.ttf'); font-weight: 600; }
@font-face { font-family: 'PlexAr'; src: url('file://%(fonts)s/IBMPlexSansArabic-Bold.ttf'); font-weight: 700; }

@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; }
body { font-family: 'PlexAr', sans-serif; color: #2A2340; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

.page { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; }
.page:last-child { page-break-after: auto; }

/* ---------- cover ---------- */
.cover { background: linear-gradient(150deg, #4C1D95 0%%, #7C5CE6 52%%, #A78BFA 100%%); color: #fff; padding: 26mm 20mm; display: flex; flex-direction: column; }
.cover .brand { display: flex; align-items: center; gap: 4mm; font-size: 15pt; font-weight: 700; letter-spacing: .3pt; }
.cover .crown { width: 12mm; height: 12mm; border-radius: 50%%; background: #0B2545; display: flex; align-items: center; justify-content: center; }
.cover .crown svg { width: 7mm; height: 7mm; }
.cover .spacer { flex: 1; }
.cover h1 { font-size: 34pt; line-height: 1.25; font-weight: 700; }
.cover .lead { font-size: 14pt; line-height: 1.9; margin-top: 6mm; color: #EDE7FF; max-width: 150mm; }
.cover .meta { margin-top: 14mm; font-size: 11pt; color: #EDE7FF; display: flex; gap: 8mm; }
.cover .rule { width: 42mm; height: 2.2mm; background: #F4C95D; border-radius: 2mm; margin-bottom: 8mm; }
.cover .card { background: rgba(255,255,255,.14); border: .4mm solid rgba(255,255,255,.32); border-radius: 5mm; padding: 6mm 7mm; font-size: 10.5pt; line-height: 1.85; color: #F6F2FF; }

/* ---------- table of contents ---------- */
.toc { padding: 24mm 20mm; }
.toc h2 { font-size: 22pt; margin-bottom: 3mm; }
.toc .sub { color: #6B6483; font-size: 10.5pt; margin-bottom: 9mm; }
.toc ol { list-style: none; column-count: 2; column-gap: 12mm; }
.toc li { display: flex; align-items: baseline; gap: 3mm; padding: 2.2mm 0; border-bottom: .25mm dashed #E4DDF5; font-size: 10.5pt; break-inside: avoid; }
.toc li b { color: #7C5CE6; font-size: 9.5pt; min-width: 8mm; }

/* ---------- chapter page ---------- */
.chapter { padding: 0; display: flex; flex-direction: column; }
.band { background: linear-gradient(120deg, #7C5CE6, #A78BFA); color: #fff; padding: 9mm 16mm 8mm; }
.band .step { font-size: 8.5pt; letter-spacing: 1.2pt; opacity: .9; font-weight: 500; }
.band h2 { font-size: 17pt; font-weight: 700; margin-top: 1.5mm; }
.stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 8mm 16mm 0; }
.shot { border: .4mm solid #E8DEF7; border-radius: 6mm; overflow: hidden; box-shadow: 0 3mm 8mm rgba(76,29,149,.10); background: #FBF9FF; }
.shot img { display: block; }
.cap { margin-top: 6mm; font-size: 11.5pt; line-height: 1.85; color: #2A2340; text-align: center; max-width: 150mm; }
.cap .note { display: block; margin-top: 2mm; font-size: 9.5pt; color: #6B6483; }
.foot { position: absolute; bottom: 9mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; font-size: 8.5pt; color: #9A93AF; }
"""


def img_size(path):
    from PIL import Image

    with Image.open(path) as im:
        return im.size


def page_cover(c, lang):
    if lang == "ar":
        return f"""
<section class="page cover" dir="rtl">
  <div class="brand"><span class="crown"><svg viewBox="0 0 24 24" fill="#F4C95D"><path d="M3 7l3.5 3L12 5l5.5 5L21 7l-1.5 10h-15L3 7zm1.8 12h14.4v1.6H4.8V19z"/></svg></span> جداره <span style="opacity:.8;font-weight:400;font-size:11pt">لإدارة الموارد البشرية</span></div>
  <div class="spacer"></div>
  <div class="rule"></div>
  <h1>{c['title']}</h1>
  <p class="lead">{c['lead']}</p>
  <div class="meta"><span>الإصدار 1.0</span><span>{DATE}</span><span>{len(c['chapters'])} خطوة مصوّرة</span></div>
  <div class="spacer"></div>
  <div class="card">{c['cover_note']}</div>
</section>"""
    return f"""
<section class="page cover" dir="ltr">
  <div class="brand"><span class="crown"><svg viewBox="0 0 24 24" fill="#F4C95D"><path d="M3 7l3.5 3L12 5l5.5 5L21 7l-1.5 10h-15L3 7zm1.8 12h14.4v1.6H4.8V19z"/></svg></span> Jadara <span style="opacity:.8;font-weight:400;font-size:11pt">Human Resources</span></div>
  <div class="spacer"></div>
  <div class="rule"></div>
  <h1>{c['title']}</h1>
  <p class="lead">{c['lead']}</p>
  <div class="meta"><span>Version 1.0</span><span>{DATE}</span><span>{len(c['chapters'])} pictured steps</span></div>
  <div class="spacer"></div>
  <div class="card">{c['cover_note']}</div>
</section>"""


def page_toc(c, lang):
    items = "".join(
        f"<li><b>{ch['n']}</b><span>{ch['title']}</span></li>" for ch in c["chapters"]
    )
    title = "المحتويات" if lang == "ar" else "Contents"
    sub = (
        "كل خطوة بصورة حقيقية من البوابة، والشرح سطر واحد تحتها."
        if lang == "ar"
        else "Every step is a real screenshot from the portal, with a one-line caption."
    )
    return f"""
<section class="page toc" dir="{'rtl' if lang == 'ar' else 'ltr'}">
  <h2>{title}</h2>
  <p class="sub">{sub}</p>
  <ol>{items}</ol>
</section>"""


def shot_block(shot_paths, max_w=118.0, max_h=196.0):
    """One or several stacked screenshots fitted into the stage box."""
    from PIL import Image

    sizes = []
    for path in shot_paths:
        with Image.open(path) as im:
            sizes.append((im.size[0], im.size[1]))
    scale = min(max_w / w for w, _ in sizes)
    if sum(h * scale for _, h in sizes) > max_h:
        scale = max_h / sum(h for _, h in sizes)
    blocks = []
    for (w, h), path in zip(sizes, shot_paths):
        blocks.append(
            f'<div class="shot" style="width:{w*scale:.1f}mm">'
            f'<img src="file://{path}" style="width:{w*scale:.1f}mm;height:{h*scale:.1f}mm"></div>'
        )
    return "".join(blocks)


def page_chapter(ch, idx, total, lang):
    shot = ch.get(lang) or ch.get("ar")
    names = shot["shot"] if isinstance(shot["shot"], list) else [shot["shot"]]
    paths = [os.path.join(SHOTS, n) for n in names]
    for path in paths:
        if not os.path.exists(path):
            raise SystemExit(f"missing screenshot: {path}")
    blocks = shot_block(paths)
    foot_brand = "جداره · دليل بوابة الموظف" if lang == "ar" else "Jadara · Employee Portal Guide"
    note = shot.get("note")
    note_html = f'<span class="note">{note}</span>' if note else ""
    return f"""
<section class="page chapter" dir="{'rtl' if lang == 'ar' else 'ltr'}">
  <div class="band">
    <div class="step" dir="ltr">{ch['n']} / {total:02d}</div>
    <h2>{ch['title']}</h2>
  </div>
  <div class="stage">
    {blocks}
    <p class="cap">{shot['cap']}{note_html}</p>
  </div>
  <div class="foot"><span>{foot_brand}</span><span dir="ltr">{idx + 2} / {total + 2}</span></div>
</section>"""


def build(lang, content):
    c = content[lang]
    def _has(ch):
        s = ch[lang]["shot"]
        names = s if isinstance(s, list) else [s]
        return all(os.path.exists(os.path.join(SHOTS, n)) for n in names)
    missing = [ch["n"] for ch in c["chapters"] if not _has(ch)]
    if missing:
        print(f"{lang}: skipping chapters without screenshots: {', '.join(missing)}")
        c = {**c, "chapters": [ch for ch in c["chapters"] if ch["n"] not in missing]}
    total = len(c["chapters"])
    html = "".join(
        [page_cover(c, lang), page_toc(c, lang)]
        + [page_chapter(ch, i, total, lang) for i, ch in enumerate(c["chapters"])]
    )
    doc = f"""<!doctype html><html lang="{lang}" dir="{'rtl' if lang == 'ar' else 'ltr'}">
<head><meta charset="utf-8"><style>{CSS % {'fonts': FONTS}}</style></head>
<body>{html}</body></html>"""
    tmp = os.path.join(BASE, f"_build_{lang}.html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(doc)
    out = os.path.join(BASE, f"Jadara-Employee-Guide-{lang.upper()}.pdf")
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto("file://" + tmp, wait_until="load")
        pg.wait_for_timeout(1200)
        pg.pdf(path=out, format="A4", print_background=True, prefer_css_page_size=True)
        b.close()
    print(f"{lang}: {out} ({total + 2} pages)")
    return out


if __name__ == "__main__":
    with open(os.path.join(BASE, "content.json"), encoding="utf-8") as f:
        content = json.load(f)
    langs = sys.argv[1:] or ["ar", "en"]
    for lang in langs:
        build(lang, content)
