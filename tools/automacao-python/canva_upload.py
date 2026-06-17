"""
Faz upload de todos os PNGs gerados para a biblioteca de Uploads do Canva.
Conecta no Chrome via CDP (já aberto pelo chrome_new_profile.py).
"""

import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
MKT = ROOT / "public" / "marketing"

# Coleta arquivos a subir (PNGs grandes — pula favicons minúsculos)
def collect_files() -> list[Path]:
    files: list[Path] = []
    for d in (ASSETS, MKT):
        for p in sorted(d.glob("*.png")):
            if p.stat().st_size < 4000:  # pula favicons 16/32 que são minúsculos
                continue
            if p.name == "canva-status.png":
                continue
            files.append(p)
    return files


def main() -> None:
    files = collect_files()
    print(f"Arquivos a enviar ({len(files)}):")
    for f in files:
        kb = f.stat().st_size / 1024
        print(f"  - {f.name}  ({kb:.0f} KB)")

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        ctx = browser.contexts[0]
        page = next(
            (pg for pg in ctx.pages
             if "canva.com" in pg.url and "service_worker" not in pg.url),
            None,
        )
        if not page:
            page = ctx.new_page()

        print("\n→ Navegando para a área de Uploads…")
        page.goto("https://www.canva.com/folders/uploads",
                  wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)

        print("→ Procurando input de upload…")

        # Estratégia: o Canva tem input file oculto. Procuramos
        # qualquer input[type=file] que aceite imagens.
        try:
            file_input = page.locator('input[type="file"]').first
            file_input.wait_for(state="attached", timeout=15000)
        except PWTimeout:
            print("✗ Não achei input de upload na primeira tentativa.")
            print("→ Tentando clicar no botão 'Fazer upload de arquivo' primeiro…")
            try:
                page.get_by_role("button",
                                 name=lambda n: n and "upload" in n.lower()).first.click(
                    timeout=5000
                )
            except Exception:
                pass
            time.sleep(3)
            file_input = page.locator('input[type="file"]').first
            file_input.wait_for(state="attached", timeout=15000)

        print("✓ Input encontrado.")
        print("→ Enviando arquivos em lote…")

        # Envia todos de uma vez
        file_input.set_input_files([str(f) for f in files])

        print("→ Aguardando upload concluir…")
        # Espera pra rede acalmar (uploads em andamento)
        for i in range(30):
            time.sleep(2)
            print(f"  …{(i+1)*2}s")
            # Heurística simples: verifica se algum dos nomes apareceu na página
            try:
                content = page.content()
                if any(f.stem in content for f in files[:3]):
                    print("✓ Detectei arquivos na biblioteca.")
                    break
            except Exception:
                pass

        out = ROOT / "public" / "marketing" / "canva-uploaded.png"
        page.screenshot(path=str(out))
        print(f"\nScreenshot final: {out}")
        print("✓ Upload concluído.")
        browser.close()


if __name__ == "__main__":
    main()
