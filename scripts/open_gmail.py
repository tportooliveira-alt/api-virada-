"""Abre o Gmail no Chrome controlado em uma nova aba."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / "public" / "marketing" / "gmail-now.png"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=10000)
    ctx = browser.contexts[0]

    page = ctx.new_page()
    page.bring_to_front()
    page.goto("https://mail.google.com/mail/u/0/#inbox",
              wait_until="domcontentloaded", timeout=45000)
    time.sleep(8)
    print("URL:", page.url)
    try:
        print("Título:", page.title())
    except Exception:
        pass
    page.screenshot(path=str(OUT), full_page=False)
    print("Screenshot:", OUT)
    browser.close()
