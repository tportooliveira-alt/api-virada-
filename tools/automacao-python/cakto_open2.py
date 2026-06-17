"""Abre Cakto em nova aba dedicada."""

import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "public" / "marketing"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(
            "http://127.0.0.1:9222", timeout=30000
        )
        ctx = browser.contexts[0]
        # Cria aba nova (não interfere com Canva aberto)
        page = ctx.new_page()
        page.bring_to_front()

        print("→ Navegando para a Cakto…")
        try:
            page.goto("https://app.cakto.com.br/login",
                      wait_until="domcontentloaded", timeout=45000)
        except Exception as e:
            print("  goto falhou, tentando home:", str(e)[:100])
            page.goto("https://cakto.com.br/", wait_until="domcontentloaded",
                      timeout=45000)

        time.sleep(6)
        print("URL final:", page.url)
        try:
            print("Título:", page.title())
        except Exception:
            pass

        out = SHOTS / "cakto-status.png"
        page.screenshot(path=str(out))
        print(f"Screenshot: {out}")

        html = (page.content() or "").lower()
        if "/login" in page.url or "entrar" in html[:8000] or "senha" in html[:6000]:
            print("STATUS: NÃO logado — login necessário.")
        elif "dashboard" in page.url or "produtos" in html[:8000]:
            print("STATUS: ✓ Logado.")
        else:
            print("STATUS: incerto — confira o screenshot.")

        # Fecha apenas o WS, mantém Chrome
        browser.close()


if __name__ == "__main__":
    main()
