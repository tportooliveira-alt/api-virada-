"""Tira screenshot da tela atual e lista todos os frames/inputs."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT  = ROOT / "public" / "marketing" / "hotmart-pricing-tela.png"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000)
    ctx = browser.contexts[0]
    page = next(
        (pg for pg in ctx.pages if "hotmart.com" in (pg.url or "")
         and "service_worker" not in pg.url), None,
    )
    page.bring_to_front()
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        pass
    time.sleep(3)
    page.screenshot(path=str(OUT), full_page=False)
    print("URL:", page.url)
    print("Screenshot:", OUT)

    # Verifica frames (iframes)
    frames = page.frames
    print(f"\nFrames na página: {len(frames)}")
    for i, frame in enumerate(frames):
        print(f"  frame[{i}]: {frame.url[:80]}")
        inputs = frame.evaluate("""
            () => Array.from(document.querySelectorAll('input, select, textarea'))
                .filter(el => { try { const r=el.getBoundingClientRect(); return r.width>5&&r.height>5; } catch{return false;} })
                .map(el => ({type: el.type, name: el.name, placeholder: el.placeholder, value: el.value}))
        """)
        if inputs:
            print(f"    inputs: {inputs}")

    browser.close()
