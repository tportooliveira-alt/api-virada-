"""
Inicia o Chrome com debug port habilitado, apontando para o perfil real do usuário,
e conecta o Playwright via CDP. Os logins do usuário (Canva, Gmail etc.) são preservados.

Uso:
    python scripts/chrome_canva.py
"""

import subprocess
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = str(Path.home() / "AppData/Local/Google/Chrome/User Data")
DEBUG_PORT = 9222
START_URL = "https://www.canva.com/"


def main() -> None:
    print(f"Profile: {USER_DATA_DIR}")
    print(f"Iniciando Chrome com debug port {DEBUG_PORT}…")

    proc = subprocess.Popen(
        [
            CHROME_EXE,
            f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={USER_DATA_DIR}",
            "--profile-directory=Default",
            START_URL,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Aguarda o Chrome iniciar
    print("Aguardando Chrome subir…")
    time.sleep(6)

    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(
                f"http://127.0.0.1:{DEBUG_PORT}", timeout=15000
            )
        except Exception as e:
            print("Falhou ao conectar via CDP:", e)
            return

        print("✓ Conectado.")
        ctx = browser.contexts[0] if browser.contexts else browser.new_context()
        if ctx.pages:
            page = ctx.pages[0]
        else:
            page = ctx.new_page()
            page.goto(START_URL)

        try:
            page.wait_for_load_state("domcontentloaded", timeout=20000)
        except Exception:
            pass

        time.sleep(4)
        try:
            print("URL atual:", page.url)
            print("Título:", page.title())
            # Verifica se está logado no Canva
            html = page.content()[:2000].lower()
            if "logged" in html or "minha conta" in html or "homepage" in page.url:
                print("✓ Provavelmente logado no Canva.")
        except Exception as e:
            print("Erro ao ler página:", e)

        print("\n>>> Chrome ativo. Eu permaneço conectado. <<<")
        print(">>> Você pode fechar a janela do Chrome quando quiser. <<<\n")

        # Mantém vivo até Chrome ser fechado
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

    print("Encerrado.")


if __name__ == "__main__":
    main()
