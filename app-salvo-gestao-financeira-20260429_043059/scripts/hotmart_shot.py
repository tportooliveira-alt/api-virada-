"""Screenshot da aba Hotmart atual."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / "public" / "marketing" / "hotmart-atual.png"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000)
    ctx = browser.contexts[0]
    page = next(
        (pg for pg in ctx.pages
         if "hotmart.com" in (pg.url or "") and "service_worker" not in pg.url),
        None,
    )
    if page:
        page.bring_to_front()
        page.goto("https://app.hotmart.com/products",
                  wait_until="domcontentloaded", timeout=25000)
        time.sleep(5)
        print("URL:", page.url)
        page.screenshot(path=str(OUT), full_page=False)
        print("Screenshot:", OUT)

        # Lista botões visíveis
        items = page.evaluate("""
            () => Array.from(document.querySelectorAll('button, a, [role=button], h1, h2'))
                .filter(el => { const r = el.getBoundingClientRect(); return r.width>10&&r.height>10; })
                .map(el => (el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\\n+/,' '))
                .filter(t => t && t.length < 80)
                .slice(0, 30)
        """)
        seen = set()
        for it in items:
            if it and it not in seen:
                seen.add(it)
                print(f"  · {it!r}")
    browser.close()
