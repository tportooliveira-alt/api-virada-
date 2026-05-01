"""
Cria o produto na Hotmart clicando em 'Criar produto' e preenchendo o wizard.
"""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

ROOT       = Path(__file__).resolve().parent.parent
PDF_PATH   = ROOT / "public" / "downloads" / "ebook-codigo-da-virada.pdf"
COVER_PATH = ROOT / "public" / "assets"    / "capa-ebook.png"
OUT        = ROOT / "public" / "marketing"

PRODUCT_NAME = "O Código da Virada Financeira"
PRODUCT_DESC = (
    "Um guia prático para organizar seu dinheiro, entender suas dívidas, "
    "cortar desperdícios e encontrar ideias reais de renda extra — começando do zero.\n\n"
    "Você recebe:\n"
    "E-book completo com 7 capítulos práticos + Planilha de Controle + "
    "50 Ideias de Renda Extra + Roteiro para Negociar Dívidas + "
    "Plano de 7 Dias + Checklist Mensal.\n\n"
    "Sem promessas de dinheiro fácil. Clareza, plano, organização e direção."
)
PRICE = "47,00"


def s(page, name):
    try:
        page.screenshot(path=str(OUT / f"hm-{name}.png"), full_page=False)
        print(f"  📸 {name} — {page.url[:70]}")
    except Exception:
        pass


def try_click(page, *labels, timeout=5000):
    for label in labels:
        for sel in [f"button:has-text('{label}')", f"text={label}",
                    f"[role=button]:has-text('{label}')"]:
            try:
                el = page.locator(sel).first
                el.wait_for(state="visible", timeout=timeout)
                el.click()
                print(f"  ✓ clicou '{label}'")
                return True
            except Exception:
                continue
    return False


def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000)
        ctx = browser.contexts[0]
        page = next(
            (pg for pg in ctx.pages
             if "hotmart.com" in (pg.url or "") and "service_worker" not in pg.url),
            ctx.new_page(),
        )
        page.bring_to_front()

        # Garante estar em /products
        if "/products" not in page.url:
            page.goto("https://app.hotmart.com/products",
                      wait_until="domcontentloaded", timeout=25000)

        # Espera carregar completamente
        try:
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass
        time.sleep(4)
        s(page, "00-products-list")

        # Clica em "Criar produto"
        print("→ Clicando em 'Criar produto'…")
        if not try_click(page, "Criar produto", "Novo produto", "Create product"):
            print("  Botão não encontrado, tentando URL direta…")
            for url in [
                "https://app.hotmart.com/products/create",
                "https://app.hotmart.com/product/new",
                "https://app.hotmart.com/products/new?type=ebook",
            ]:
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
                time.sleep(3)
                if "not-found" not in page.url:
                    print(f"  ✓ URL válida: {page.url}")
                    break

        time.sleep(5)
        s(page, "01-criar-produto")
        print("URL:", page.url)

        # Verifica o que aparece na tela
        items = page.evaluate("""
            () => Array.from(document.querySelectorAll(
                    'button, a, [role=button], h1, h2, h3, label, input, select'))
                .filter(el => { const r=el.getBoundingClientRect(); return r.width>10&&r.height>10; })
                .map(el => ({
                    tag: el.tagName,
                    text: (el.innerText||el.value||el.getAttribute('placeholder')||
                           el.getAttribute('aria-label')||'').trim().replace(/\\n+/,' ').slice(0,70)
                }))
                .filter(i => i.text)
                .slice(0, 40)
        """)
        seen = set()
        for it in items:
            key = it['text']
            if key not in seen:
                seen.add(key)
                print(f"  [{it['tag']}] {key!r}")

        # Aceita termos se aparecer
        try_click(page, "Aceitar", timeout=3000)
        time.sleep(2)

        # Tenta selecionar tipo "E-book" / "Material digital"
        for label in ["E-book", "Ebook", "eBook", "Material digital",
                      "Arquivo digital", "PDF", "Digital"]:
            try:
                el = page.get_by_text(label, exact=True).first
                el.wait_for(state="visible", timeout=2000)
                el.click()
                print(f"  ✓ tipo selecionado: {label}")
                time.sleep(2)
                break
            except Exception:
                continue

        s(page, "02-tipo-selecionado")
        try_click(page, "Avançar", "Continuar", "Próximo", "Next")
        time.sleep(4)
        s(page, "03-apos-tipo")
        print("URL:", page.url)

        # Tenta preencher nome
        for sel in ["input[name='name']", "input[name='productName']",
                    "input[placeholder*='ome']", "input[placeholder*='itle']",
                    "input[type='text']"]:
            try:
                inp = page.locator(sel).first
                inp.wait_for(state="visible", timeout=5000)
                inp.click()
                inp.fill(PRODUCT_NAME)
                print(f"  ✓ nome: {PRODUCT_NAME}")
                break
            except Exception:
                continue

        # Tenta preencher descrição
        for sel in ["textarea", "[contenteditable='true']",
                    "textarea[name='description']"]:
            try:
                txt = page.locator(sel).first
                txt.wait_for(state="visible", timeout=4000)
                txt.click()
                txt.fill(PRODUCT_DESC)
                print("  ✓ descrição preenchida")
                break
            except Exception:
                continue

        s(page, "04-nome-desc")
        try_click(page, "Avançar", "Salvar e continuar", "Continuar", "Próximo")
        time.sleep(4)
        s(page, "05-apos-nome")
        print("URL:", page.url)

        # Tenta upload do PDF
        print("→ Upload PDF…")
        for sel in ["input[type='file']", "input[accept*='pdf']"]:
            try:
                fi = page.locator(sel).first
                fi.wait_for(state="attached", timeout=8000)
                with page.expect_file_chooser(timeout=8000) as fc_info:
                    fi.click()
                fc_info.value.set_files(str(PDF_PATH))
                print(f"  ✓ PDF enviado")
                time.sleep(12)
                break
            except Exception:
                pass

        # Tenta capa
        print("→ Upload capa…")
        for sel in ["input[accept*='image']", "input[accept*='png']",
                    "input[accept*='jpg']"]:
            try:
                fi2 = page.locator(sel).first
                fi2.wait_for(state="attached", timeout=5000)
                with page.expect_file_chooser(timeout=6000) as fc2_info:
                    fi2.click()
                fc2_info.value.set_files(str(COVER_PATH))
                print("  ✓ Capa enviada")
                time.sleep(8)
                break
            except Exception:
                pass

        s(page, "06-uploads")
        try_click(page, "Avançar", "Salvar", "Continuar", "Próximo")
        time.sleep(5)
        s(page, "07-final")
        print("URL final:", page.url)

        # Estado final
        items2 = page.evaluate("""
            () => Array.from(document.querySelectorAll('button, h1, h2, [role=button]'))
                .filter(el => { const r=el.getBoundingClientRect(); return r.width>10&&r.height>10; })
                .map(el => (el.innerText||'').trim().replace(/\\n+/,' ').slice(0,70))
                .filter(t => t).slice(0, 20)
        """)
        seen = set()
        for it in items2:
            if it not in seen:
                seen.add(it)
                print(f"  · {it!r}")

        browser.close()


if __name__ == "__main__":
    main()
