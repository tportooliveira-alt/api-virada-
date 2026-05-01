"""Navega para o dashboard logado da Cakto e captura tela."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / "public" / "marketing" / "cakto-dashboard.png"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000)
    ctx = browser.contexts[0]

    # Pega a aba que está em /dashboard
    target = None
    for pg in ctx.pages:
        try:
            if "app.cakto.com.br" in pg.url and "service_worker" not in pg.url:
                target = pg
                break
        except Exception:
            continue
    if target is None:
        target = ctx.new_page()

    target.bring_to_front()
    target.goto("https://app.cakto.com.br/dashboard",
                wait_until="domcontentloaded", timeout=30000)
    time.sleep(6)
    print("URL:", target.url)
    print("Título:", target.title())
    target.screenshot(path=str(OUT), full_page=False)
    print("Screenshot:", OUT)
    browser.close()
