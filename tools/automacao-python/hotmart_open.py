"""Abre Hotmart cadastro de produtor em nova aba e captura tela."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / "public" / "marketing"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000)
    ctx = browser.contexts[0]
    page = ctx.new_page()
    page.bring_to_front()
    page.goto("https://app.hotmart.com/start",
              wait_until="domcontentloaded", timeout=45000)
    time.sleep(6)
    print("URL:", page.url)
    print("Título:", page.title())
    page.screenshot(path=str(OUT / "hotmart-1.png"), full_page=False)
    print("Screenshot salvo.")
    browser.close()
