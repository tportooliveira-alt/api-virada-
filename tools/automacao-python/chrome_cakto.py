"""
Inicia Chrome controlado direto na Cakto.
Profile temporário (sem login do Canva), mas você pode logar nessa janela.
"""

import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PROFILE_DIR = str(Path.home() / "AppData/Local/PlaywrightChromeProfile")
DEBUG_PORT = 9222
START_URL = "https://app.cakto.com.br/sign-up"


def main() -> None:
    Path(PROFILE_DIR).mkdir(parents=True, exist_ok=True)
    print(f"Profile temp: {PROFILE_DIR}")
    print(f"Iniciando Chrome em {START_URL}…")

    proc = subprocess.Popen(
        [
            CHROME_EXE,
            f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={PROFILE_DIR}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-features=ChromeWhatsNewUI,SigninInterceptBubbleV2",
            "--start-maximized",
            START_URL,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"Chrome PID: {proc.pid}")
    time.sleep(7)

    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(
                f"http://127.0.0.1:{DEBUG_PORT}", timeout=20000
            )
        except Exception as e:
            print("FALHOU CDP:", str(e)[:200])
            return

        print("✓ Conectado via CDP")
        ctx = browser.contexts[0]
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.bring_to_front()
        try:
            page.wait_for_load_state("domcontentloaded", timeout=15000)
        except Exception:
            pass
        time.sleep(3)
        print("URL:", page.url)
        try:
            print("Título:", page.title())
        except Exception:
            pass

        out = (Path(__file__).resolve().parent.parent
               / "public" / "marketing" / "cakto-status.png")
        page.screenshot(path=str(out))
        print(f"Screenshot: {out}")
        print("\n>>> Janela do Chrome aberta na Cakto. <<<")
        print(">>> Faça login se ainda não estiver logado e me avise. <<<")

        try:
            while proc.poll() is None:
                time.sleep(3)
        except KeyboardInterrupt:
            pass
        finally:
            try:
                browser.close()
            except Exception:
                pass


if __name__ == "__main__":
    main()
