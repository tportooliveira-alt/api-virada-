"""
Inicia o Chrome com perfil temporário e debug port habilitado.
Como é um perfil novo, não herda os logins — você precisa logar
no Canva uma vez nessa janela. A partir daí, eu opero.

Uso:
    python scripts/chrome_new_profile.py
"""

import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PROFILE_DIR = str(Path.home() / "AppData/Local/PlaywrightChromeProfile")
DEBUG_PORT = 9222
START_URL = "https://www.canva.com/login/"


def main() -> None:
    Path(PROFILE_DIR).mkdir(parents=True, exist_ok=True)
    print(f"Profile temp: {PROFILE_DIR}")

    proc = subprocess.Popen(
        [
            CHROME_EXE,
            f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={PROFILE_DIR}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-features=ChromeWhatsNewUI",
            "--start-maximized",
            START_URL,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"Chrome PID: {proc.pid}")
    print("Aguardando subir…")
    time.sleep(7)

    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(
                f"http://127.0.0.1:{DEBUG_PORT}", timeout=15000
            )
        except Exception as e:
            print("FALHOU CDP:", str(e)[:200])
            return

        print("✓ Conectado via CDP!")
        ctx = browser.contexts[0]
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
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
        print("\n>>> Conexão ativa. Use a janela do Chrome para fazer login no Canva. <<<")
        print(">>> Depois de logar, me avise pra eu seguir. <<<")
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
