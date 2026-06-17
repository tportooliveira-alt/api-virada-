"""Navega o Chrome controlado para a Cakto e captura o estado da sessão."""

import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "public" / "marketing"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        ctx = browser.contexts[0]
        page = next(
            (pg for pg in ctx.pages
             if "service_worker" not in pg.url),
            None,
        ) or ctx.new_page()
        page.bring_to_front()

        print("→ Abrindo Cakto…")
        page.goto("https://app.cakto.com.br/", wait_until="domcontentloaded",
                  timeout=30000)
        time.sleep(5)

        print("URL final:", page.url)
        try:
            print("Título:", page.title())
        except Exception:
            pass

        out = SHOTS / "cakto-status.png"
        page.screenshot(path=str(out))
        print(f"Screenshot: {out}")

        # Detecta se está logado ou na tela de login
        html = page.content().lower()
        if "/login" in page.url or "entrar" in html[:5000] or "senha" in html[:3000]:
            print("STATUS: NÃO logado — você precisa logar nessa janela.")
        else:
            print("STATUS: parece logado ou em onboarding.")

        browser.close()


if __name__ == "__main__":
    main()
