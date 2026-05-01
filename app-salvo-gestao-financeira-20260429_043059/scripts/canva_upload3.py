"""
Upload v3: clica no botão Fazer upload, captura o que aparece,
e tenta achar a opção que dispara o file chooser real.
"""

import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


def collect_files() -> list[str]:
    files = []
    for d in (ROOT / "public" / "assets", ROOT / "public" / "marketing"):
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
        if "/login" in page.url or "canva.com" not in page.url:
            page.goto("https://www.canva.com/", wait_until="domcontentloaded")
            time.sleep(4)

        print("→ Clicando em 'Fazer upload'…")
        page.locator("button:has-text('Fazer upload')").first.click()
        time.sleep(2)

        # Captura screenshot pra ver o menu
        page.screenshot(
            path=str(ROOT / "public" / "marketing" / "canva-after-click.png")
        )
        print("✓ Screenshot pós-clique salvo.")

        # Lista todas as opções clicáveis novas (após o clique)
        labels = page.evaluate("""
            () => Array.from(document.querySelectorAll(
                'button, [role=menuitem], a, [role=button], li'
            ))
            .filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            })
            .map(el => (el.innerText || el.getAttribute('aria-label') || '').trim())
            .filter(t => t && t.length < 80)
            .slice(0, 60)
        """)
        print("Itens visíveis após clique:")
        seen = set()
        for lbl in labels:
            if lbl and lbl not in seen:
                seen.add(lbl)
                print(f"  · {lbl!r}")

        # Tenta clicar em "Arquivos" / "Imagens" / "Selecione arquivos"
        candidates = [
            "text=Selecione arquivos",
            "text=Selecione um arquivo",
            "text=Arquivos",
            "text=Imagens",
            "text=Browse files",
            "text=Adicionar do dispositivo",
            "[aria-label='Selecione arquivos']",
        ]
        for sel in candidates:
            try:
                el = page.locator(sel).first
                el.wait_for(state="visible", timeout=2000)
                print(f"→ Tentando file chooser via: {sel}")
                with page.expect_file_chooser(timeout=8000) as fc_info:
                    el.click()
                chooser = fc_info.value
                print(f"✓ File chooser aberto via {sel}")
                chooser.set_files(files)
                print("✓ Arquivos enviados.")
                break
            except Exception as e:
                print(f"  ✗ {sel}: {str(e)[:80]}")
                continue
        else:
            # Plano B: input file diretamente
            print("→ Plano B: procurando input[type=file] no DOM…")
            inputs = page.locator("input[type=file]")
            count = inputs.count()
            print(f"  encontrados: {count}")
            if count > 0:
                inputs.first.set_input_files(files)
                print("✓ Enviado via input direto.")
            else:
                print("✗ Não consegui upload automático.")
                print("→ Mas a janela do Canva está aberta — você pode arrastar e soltar.")
                browser.close()
                return

        print("→ Aguardando upload (60s)…")
        for i in range(15):
            time.sleep(4)
            print(f"  …{(i+1)*4}s")

        page.screenshot(
            path=str(ROOT / "public" / "marketing" / "canva-uploaded.png")
        )
        print("✓ Concluído.")
        browser.close()


if __name__ == "__main__":
    main()
