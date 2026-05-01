"""
Sobe o site no Netlify Drop (sem precisar de login).
1. Zipa codigo-da-virada-html/
2. Abre Chrome controlado em app.netlify.com/drop
3. Faz upload via input[type=file]
4. Espera URL final aparecer
5. Salva URL e screenshot
"""

import os
import shutil
import subprocess
import time
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = ROOT.parent / "codigo-da-virada-html"
SHOTS = ROOT / "public" / "marketing"
ZIP_PATH = ROOT.parent / "codigo-da-virada-html.zip"

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PROFILE_DIR = str(Path.home() / "AppData/Local/PlaywrightChromeProfile")
DEBUG_PORT = 9222


def make_zip() -> Path:
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in SITE_DIR.rglob("*"):
            if p.is_file():
                arc = p.relative_to(SITE_DIR)
                zf.write(p, arc)
    print(f"✓ ZIP criado: {ZIP_PATH} ({ZIP_PATH.stat().st_size//1024} KB)")
    return ZIP_PATH


def launch_chrome() -> subprocess.Popen:
    Path(PROFILE_DIR).mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(
        [
            CHROME_EXE,
            f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={PROFILE_DIR}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-features=ChromeWhatsNewUI,SigninInterceptBubbleV2",
            "--start-maximized",
            "https://app.netlify.com/drop",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"✓ Chrome iniciado (PID {proc.pid})")
    return proc


def main() -> None:
    zip_path = make_zip()
    proc = launch_chrome()
    time.sleep(8)

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(
            f"http://127.0.0.1:{DEBUG_PORT}", timeout=20000
        )
        ctx = browser.contexts[0]
        page = next(
            (pg for pg in ctx.pages
             if "netlify.com" in pg.url and "service_worker" not in pg.url),
            None,
        ) or ctx.pages[0]

        page.bring_to_front()
        try:
            page.wait_for_load_state("domcontentloaded", timeout=20000)
        except Exception:
            pass
        time.sleep(5)
        print("URL:", page.url)
        page.screenshot(path=str(SHOTS / "netlify-drop-1.png"))

        # Procura input file (Netlify Drop tem um escondido)
        print("→ Procurando input de upload…")
        try:
            file_input = page.locator('input[type="file"]').first
            file_input.wait_for(state="attached", timeout=15000)
        except Exception as e:
            print("✗ Input não achado:", e)
            page.screenshot(path=str(SHOTS / "netlify-drop-fail.png"))
            return

        print("✓ Input encontrado.")
        # Netlify Drop aceita apenas 1 arquivo .zip
        print(f"→ Subindo ZIP: {zip_path.name}")
        file_input.set_input_files(str(zip_path))

        print("→ Aguardando deploy concluir (até 90s)…")
        deploy_url = None
        for i in range(45):
            time.sleep(2)
            cur = page.url
            if "/sites/" in cur and "drop" not in cur:
                deploy_url = cur
                print(f"✓ Deploy! URL admin: {deploy_url}")
                break
            try:
                # Procura link da URL pública (ex: foo-bar-123.netlify.app)
                links = page.evaluate("""
                    () => Array.from(document.querySelectorAll('a'))
                        .map(a => a.href)
                        .filter(h => h && h.includes('.netlify.app'))
                        .slice(0,5)
                """)
                if links:
                    deploy_url = links[0]
                    print(f"✓ Deploy! URL pública: {deploy_url}")
                    break
            except Exception:
                pass
            if i % 5 == 0:
                print(f"  …{(i+1)*2}s")

        page.screenshot(path=str(SHOTS / "netlify-drop-final.png"))
        if deploy_url:
            (ROOT / "DEPLOY_URL.txt").write_text(deploy_url, encoding="utf-8")
            print(f"\n🚀 SITE NO AR: {deploy_url}")
        else:
            print("\n⚠ Não detectei URL ainda — verifique a janela do Chrome.")
        browser.close()


if __name__ == "__main__":
    main()
