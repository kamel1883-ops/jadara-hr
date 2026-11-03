"""Log into the real employee portal and capture its internal screens.

Credentials come from the environment: EMP_ID (national id / iqama) and EMP_PWD.
Run with --probe to verify the sign-in path works using a throwaway id
(expected answer: the "invalid credentials" message, not a captcha error).
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("PORTAL_BASE", "http://127.0.0.1:5173")
OUT = "/workspace/chats/9dfc39cf3de879041d5c0fb2/guide/shots"
EMP_ID = os.environ.get("EMP_ID", "")
EMP_PWD = os.environ.get("EMP_PWD", "")
PROBE = "--probe" in sys.argv


def login(page):
    page.goto(f"{BASE}/portal", wait_until="networkidle", timeout=60000)
    # Turnstile gives up after 7s and hands the backend its native fallback token.
    page.wait_for_timeout(9000)
    page.locator('input[type="text"], input:not([type])').first.fill(EMP_ID)
    page.locator('input[type="password"]').first.fill(EMP_PWD)
    page.get_by_role("button", name="تسجيل الدخول").first.click()
    page.wait_for_timeout(6000)
    return page.inner_text("body")


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.add_init_script("localStorage.setItem('jadara_portal_lang','ar')")
    text = login(pg)
    if PROBE:
        print("PROBE RESULT >>>", json.dumps(text[-500:], ensure_ascii=False))
        pg.screenshot(path=f"{OUT}/probe_login.png", full_page=True)
    else:
        print("(login capture not implemented yet — probe mode only)")
    b.close()
