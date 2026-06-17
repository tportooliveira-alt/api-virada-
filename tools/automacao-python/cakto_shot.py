"""Tira screenshot da Cakto agora."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / "public" / "marketing" / "cakto-now.png"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=10000)
    ctx = browser.contexts[0]
    page = next(
        (pg for pg in ctx.pages
         if "cakto" in pg.url and "service_worker" not in pg.url),
        None,
    ) or ctx.pages[0]
    print("URL:", page.url)
    print("Título:", page.title())
    page.screenshot(path=str(OUT))
    print("Screenshot:", OUT)
    browser.close()
