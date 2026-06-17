"""
Upload v2: clica em 'Fazer upload' e usa expect_file_chooser para
interceptar o diálogo nativo, enviando os arquivos via Playwright.
"""

import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
MKT = ROOT / "public" / "marketing"


def collect_files() -> list[str]:
    files = []
    for d in (ASSETS, MKT):
        for p in sorted(d.glob("*.png")):
            if p.stat().st_size < 4000:
                continue
            if "canva-" in p.name:
                continue
            files.append(str(p))
    return files


def main() -> None:
    files = collect_files()
    print(f"Vou enviar {len(files)} arquivos.")

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        ctx = browser.contexts[0]
        page = next(
            (pg for pg in ctx.pages
             if "canva.com" in pg.url and "service_worker" not in pg.url),
            None,
        )
        page.bring_to_front()
        # Garante que estamos na home
        if "canva.com" not in page.url or "/login" in page.url:
            page.goto("https://www.canva.com/", wait_until="domcontentloaded")
            time.sleep(4)

        print("→ Procurando botão 'Fazer upload'…")
        # Tenta vários seletores (o Canva muda os labels)
        btn = None
        for selector in [
            "text=Fazer upload",
            "button:has-text('Fazer upload')",
            "[aria-label*='Fazer upload']",
            "[aria-label*='upload']",
        ]:
            try:
                candidate = page.locator(selector).first
                candidate.wait_for(state="visible", timeout=3000)
                btn = candidate
                print(f"  → achei via: {selector}")
                break
            except Exception:
                continue
        if btn is None:
            raise SystemExit("✗ Não achei botão de upload.")

        # Intercepta o diálogo nativo de seleção de arquivo
        with page.expect_file_chooser(timeout=15000) as fc_info:
            btn.click()
        chooser = fc_info.value
        print("✓ Diálogo de upload interceptado.")
        print("→ Enviando arquivos…")
        chooser.set_files(files)

        print("→ Aguardando processamento (60s)…")
        for i in range(30):
            time.sleep(2)
            print(f"  …{(i+1)*2}s")

        out = MKT / "canva-uploaded.png"
        page.screenshot(path=str(out), full_page=False)
        print(f"\n✓ Screenshot final: {out}")
        browser.close()


if __name__ == "__main__":
    main()
