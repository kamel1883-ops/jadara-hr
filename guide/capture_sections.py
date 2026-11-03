# -*- coding: utf-8 -*-
"""Capture the logged-in portal sections as one image per guide chapter.

Usage: EMP_ID/EMP_PWD not needed — reuses guide/.state_ar.json saved by the
login step.  python guide/capture_sections.py ar|en
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "https://jadarahr.base44.app"
OUT = "/workspace/chats/9dfc39cf3de879041d5c0fb2/guide/shots"
STATE = "/workspace/chats/9dfc39cf3de879041d5c0fb2/guide/.state_ar.json"

LANG = sys.argv[1] if len(sys.argv) > 1 else "ar"

# (chapter file, h3 index in page order) — index mapping is language-independent
CARDS = [
    ("06_clock", 0),
    ("07_details", 1),
    ("08_attendance", 2),
    ("09_leaves", 3),
    ("11_loans", 4),
    ("13_trips", 5),
    ("14_equipment", 6),
    ("15_complaints", 7),
    ("16_performance", 8),
    ("17_training", 9),
    ("18_documents", 10),
    ("19_warnings", 11),
    ("20_jobdesc", 12),
    ("21_eos", 13),
    ("22_decisions", 14),
    ("23_incentives", 15),
]

JS_CARD = """(idx) => {
  const heads = Array.from(document.querySelectorAll('#root h3'));
  const h = heads[idx];
  if (!h) return null;
  let el = h.parentElement;
  // Section cards: the white card is either an ancestor or the h3's next sibling
  while (el && !(el.className && /rounded-(2xl|3xl)/.test(el.className))) el = el.parentElement;
  if (!el) el = h.parentElement; // wrapper div holding h3 + card (Section component)
  return { y: el.getBoundingClientRect().top + window.scrollY, h: el.offsetHeight };
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(
        viewport={"width": 390, "height": 844}, device_scale_factor=2,
        storage_state=STATE,
    )
    ctx.add_init_script(f"localStorage.setItem('jadara_portal_lang','{LANG}')")
    pg = ctx.new_page()
    pg.goto(f"{BASE}/portal", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(9000)
    n = pg.evaluate("() => document.querySelectorAll('#root h3').length")
    print("h3 count:", n)
    # hide the floating assistant widget for clean section shots
    pg.add_style_tag(content="button.fixed.z-40{display:none!important}")

    # 05 — home: hero + quick actions + the four summary cards
    pg.evaluate("window.scrollTo(0, 250)")
    pg.wait_for_timeout(800)
    pg.screenshot(path=f"{OUT}/05_home_{LANG}.png")
    print("05_home ok")

    for name, idx in CARDS:
        box = pg.evaluate(JS_CARD, idx)
        if not box:
            print(f"!! {name}: heading {idx} not found")
            continue
        el = pg.evaluate_handle(
            """(idx) => {
              const h = Array.from(document.querySelectorAll('#root h3'))[idx];
              let el = h.parentElement;
              while (el && !(el.className && /rounded-(2xl|3xl)/.test(el.className))) el = el.parentElement;
              return el || h.parentElement;
            }""",
            idx,
        ).as_element()
        el.scroll_into_view_if_needed()
        pg.wait_for_timeout(600)
        el.screenshot(path=f"{OUT}/{name}_{LANG}.png")
        print(f"{name} ok ({box['h']}px)")

    # 10 — leave request form dialog
    btn = "طلب إجازة" if LANG == "ar" else "Leave request"
    pg.evaluate("window.scrollTo(0, 250)")
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name=btn, exact=False).first.click(timeout=8000)
    pg.wait_for_timeout(2000)
    pg.locator('[role="dialog"]').first.screenshot(path=f"{OUT}/10_leave_form_{LANG}.png")
    print("10_leave_form ok")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(800)

    # 12 — loan request form dialog
    btn = "طلب سلفة" if LANG == "ar" else "Loan request"
    pg.get_by_role("button", name=btn, exact=False).first.click(timeout=8000)
    pg.wait_for_timeout(2000)
    pg.locator('[role="dialog"]').first.screenshot(path=f"{OUT}/12_loan_form_{LANG}.png")
    print("12_loan_form ok")

    # 24 — notifications tab
    pg.goto(f"{BASE}/portal/notifications", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(6000)
    pg.screenshot(path=f"{OUT}/24_notifications_{LANG}.png")
    print("24_notifications ok")

    b.close()
print("done")
