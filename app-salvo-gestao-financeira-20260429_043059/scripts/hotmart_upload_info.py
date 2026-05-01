"""
Completa a tela 'Informações básicas' da Hotmart:
- Faz upload da capa (imagem)
- Seleciona categoria Finanças e Investimentos
- Avança
"""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT       = Path(__file__).resolve().parent.parent
COVER_PATH = ROOT / "public" / "assets"    / "capa-ebook.png"
PDF_PATH   = ROOT / "public" / "downloads" / "ebook-codigo-da-virada.pdf"
OUT        = ROOT / "public" / "marketing"


def s(page, name):
    try:
        page.screenshot(path=str(OUT / f"hm-{name}.png"), full_page=False)
        print(f"  📸 {name} — {page.url[:70]}")
    except Exception:
        pass


def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000)
        ctx = browser.contexts[0]
        page = next(
            (pg for pg in ctx.pages if "hotmart.com" in (pg.url or "")
             and "service_worker" not in pg.url), None,
        )
        page.bring_to_front()
        print("URL:", page.url)
        s(page, "info-inicio")

        # --- Upload da CAPA ---
        print("→ Upload da capa…")
        try:
            # Clicar em "Selecione um arquivo" (botão da capa)
            with page.expect_file_chooser(timeout=10000) as fc_info:
                page.get_by_text("Selecione um arquivo").first.click()
            fc_info.value.set_files(str(COVER_PATH))
            print(f"  ✓ Capa: {COVER_PATH.name}")
            time.sleep(6)
        except Exception as e:
            print(f"  ✗ Capa: {e}")
            # Tenta input direto
            try:
                inputs = page.locator("input[type='file']").all()
                print(f"  Inputs file encontrados: {len(inputs)}")
                for i, inp in enumerate(inputs):
                    try:
                        inp.set_input_files(str(COVER_PATH))
                        print(f"  ✓ Capa via input[{i}]")
                        time.sleep(5)
                        break
                    except Exception as e2:
                        print(f"    input[{i}] falhou: {str(e2)[:60]}")
            except Exception:
                pass

        s(page, "info-apos-capa")

        # --- Selecionar categoria ---
        print("→ Selecionando categoria 'Finanças e Investimentos'…")
        try:
            cat = page.get_by_text("Finanças e Investimentos").first
            cat.wait_for(state="visible", timeout=5000)
            cat.click()
            print("  ✓ Categoria selecionada")
            time.sleep(2)
        except Exception as e:
            print(f"  ✗ Categoria: {e}")

        s(page, "info-categoria")

        # --- Avança ---
        for label in ["Continuar", "Avançar", "Salvar e continuar", "Próximo"]:
            try:
                btn = page.get_by_role("button", name=label).first
                btn.wait_for(state="visible", timeout=4000)
                btn.click()
                print(f"  ✓ Clicou '{label}'")
                time.sleep(5)
                break
            except Exception:
                continue

        print("URL após avançar:", page.url)
        s(page, "info-final")

        # Lista o que aparece na próxima tela
        items = page.evaluate("""
            () => Array.from(document.querySelectorAll(
                    'button, h1, h2, h3, [role=button], input, label'))
                .filter(el => { const r=el.getBoundingClientRect(); return r.width>10&&r.height>10; })
                .map(el => ({
                    tag: el.tagName,
                    text: (el.innerText||el.getAttribute('placeholder')||
                           el.getAttribute('aria-label')||el.value||'')
                          .trim().replace(/\\n+/,' ').slice(0,70)
                }))
                .filter(i => i.text)
                .slice(0, 25)
        """)
        seen = set()
        for it in items:
            if it['text'] not in seen:
                seen.add(it['text'])
                print(f"  [{it['tag']}] {it['text']!r}")

        browser.close()


if __name__ == "__main__":
    main()
