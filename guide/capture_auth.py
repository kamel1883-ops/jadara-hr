"""Capture the public employee-portal sign-in screens (no session required)."""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5173"
OUT = "/workspace/chats/9dfc39cf3de879041d5c0fb2/guide/shots"

TABS = {
    "ar": ["دخول", "إنشاء حساب", "نسيت كلمة المرور"],
    "en": ["Sign in", "Create account", "Forgot password"],
}
NAMES = ["login", "register", "forgot"]

with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in ("ar", "en"):
        for label, name in zip(TABS[lang], NAMES):
            pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
            pg.add_init_script(f"localStorage.setItem('jadara_portal_lang','{lang}')")
            pg.goto(f"{BASE}/portal", wait_until="networkidle", timeout=60000)
            pg.wait_for_timeout(3500)
            try:
                pg.get_by_role("button", name=label, exact=True).first.click(timeout=8000)
            except Exception as e:
                print(f"!! {lang}/{label}: {str(e)[:120]}", file=sys.stderr)
            pg.wait_for_timeout(1500)
            pg.screenshot(path=f"{OUT}/{name}_{lang}.png", full_page=True)
            print(f"{name}_{lang}.png  {pg.inner_text('body').count(chr(10))} lines")
            pg.close()
    b.close()
