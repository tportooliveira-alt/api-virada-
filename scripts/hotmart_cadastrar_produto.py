"""
Aceita os termos, preenche e cadastra o e-book na Hotmart.
Passo a passo: nome > categoria > preço > upload PDF > capa > publicar.
"""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH   = ROOT / "public" / "downloads" / "ebook-codigo-da-virada.pdf"
COVER_PATH = ROOT / "public" / "assets"    / "capa-ebook.png"
OUT        = ROOT / "public" / "marketing"

PRODUCT_NAME = "O Código da Virada Financeira"
PRODUCT_DESC = (
    "Um guia prático para organizar seu dinheiro, entender suas dívidas, "
    "cortar desperdícios e encontrar ideias reais de renda extra — começando do zero.\n\n"
    "✅ E-book completo com 7 capítulos práticos\n"
    "✅ Bônus 1 — Planilha de Controle Financeiro\n"
    "✅ Bônus 2 — 50 Ideias de Renda Extra\n"
    "✅ Bônus 3 — Roteiro para Negociar Dívidas\n"
    "✅ Bônus 4 — Plano de 7 Dias\n"
    "✅ Bônus 5 — Checklist Mensal\n\n"
    "Sem promessas de dinheiro fácil. Clareza, organização, plano e direção."
)
PRICE = "47"  # Hotmart — R$47 para caber comissão de afiliado


def shoot(page, name):
    try:
        page.screenshot(path=str(OUT / f"hotmart-prod-{name}.png"), full_page=False)
        print(f"  📸 {name} | {page.url[:80]}")
    except Exception:
        pass


def click_text(page, *labels, timeout=5000):
    for label in labels:
        for selector in [
            f"button:has-text('{label}')",
            f"[role=button]:has-text('{label}')",
            f"text={label}",
        ]:
            try:
                el = page.locator(selector).first
                el.wait_for(state="visible", timeout=timeout)
                el.click()
                print(f"  → Clicou '{label}'")
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

        # Garante que está em /products/new
        if "/products/new" not in page.url and "/product/new" not in page.url:
            page.goto("https://app.hotmart.com/products/new",
                      wait_until="domcontentloaded", timeout=25000)
            time.sleep(4)

        shoot(page, "00-inicio")

        # PASSO 0 — Aceitar termos se aparecer
        if click_text(page, "Aceitar", timeout=4000):
            time.sleep(3)
            shoot(page, "01-termos-aceitos")

        # PASSO 1 — Tipo de produto: ebook / material digital
        print("→ Selecionando tipo de produto…")
        for label in ["E-book", "Ebook", "Livro digital", "Material", "Digital", "eBook"]:
            try:
                el = page.locator(f"text={label}").first
                el.wait_for(state="visible", timeout=3000)
                el.click()
                print(f"  → Tipo: {label}")
                time.sleep(2)
                break
            except Exception:
                continue
        shoot(page, "02-tipo")

        # Avança
        click_text(page, "Avançar", "Próximo", "Continuar", "Next")
        time.sleep(3)
        shoot(page, "03-apos-tipo")

        # PASSO 2 — Nome do produto
        print("→ Preenchendo nome do produto…")
        for sel in ["input[name='name']", "input[placeholder*='nome']",
                    "input[placeholder*='Name']", "input[id*='name']",
                    "input[type='text']"]:
            try:
                inp = page.locator(sel).first
                inp.wait_for(state="visible", timeout=4000)
                inp.click()
                inp.fill(PRODUCT_NAME)
                print(f"  → Nome preenchido: {PRODUCT_NAME}")
                break
            except Exception:
                continue
        shoot(page, "04-nome")

        # PASSO 3 — Descrição
        for sel in ["textarea[name='description']", "textarea",
                    "[contenteditable='true']"]:
            try:
                txt = page.locator(sel).first
                txt.wait_for(state="visible", timeout=4000)
                txt.click()
                txt.fill(PRODUCT_DESC)
                print("  → Descrição preenchida")
                break
            except Exception:
                continue

        # Avança
        click_text(page, "Avançar", "Próximo", "Continuar", "Salvar e continuar")
        time.sleep(3)
        shoot(page, "05-apos-nome-desc")
        print("URL:", page.url)

        # PASSO 4 — Preço
        print("→ Preenchendo preço R$ 47…")
        for sel in ["input[name='price']", "input[name='value']",
                    "input[placeholder*='preço']", "input[placeholder*='valor']",
                    "input[type='number']"]:
            try:
                inp = page.locator(sel).first
                inp.wait_for(state="visible", timeout=4000)
                inp.triple_click()
                inp.fill(PRICE)
                print(f"  → Preço: R$ {PRICE}")
                break
            except Exception:
                continue
        shoot(page, "06-preco")

        # Avança
        click_text(page, "Avançar", "Próximo", "Continuar", "Salvar e continuar")
        time.sleep(3)
        shoot(page, "07-apos-preco")
        print("URL:", page.url)

        # PASSO 5 — Upload do arquivo PDF
        print("→ Procurando input de arquivo para upload do PDF…")
        for sel in ["input[type='file']", "input[accept*='pdf']",
                    "input[accept*='application']"]:
            try:
                fi = page.locator(sel).first
                fi.wait_for(state="attached", timeout=8000)
                with page.expect_file_chooser(timeout=8000) as fc_info:
                    fi.click()
                chooser = fc_info.value
                chooser.set_files(str(PDF_PATH))
                print(f"  → PDF enviado: {PDF_PATH.name}")
                break
            except Exception:
                # Tenta via expect_file_chooser no botão de upload
                for btn_label in ["Fazer upload", "Upload", "Enviar arquivo",
                                  "Selecionar arquivo", "Adicionar arquivo"]:
                    try:
                        with page.expect_file_chooser(timeout=5000) as fc_info:
                            page.get_by_text(btn_label).first.click()
                        chooser = fc_info.value
                        chooser.set_files(str(PDF_PATH))
                        print(f"  → PDF enviado via botão '{btn_label}'")
                        break
                    except Exception:
                        continue
                break

        time.sleep(10)  # aguarda upload
        shoot(page, "08-upload-pdf")

        # PASSO 6 — Capa do produto
        print("→ Fazendo upload da capa…")
        try:
            for sel in ["input[accept*='image']", "input[accept*='jpg']",
                        "input[accept*='png']"]:
                try:
                    fi2 = page.locator(sel).first
                    fi2.wait_for(state="attached", timeout=6000)
                    with page.expect_file_chooser(timeout=8000) as fc2_info:
                        fi2.click()
                    chooser2 = fc2_info.value
                    chooser2.set_files(str(COVER_PATH))
                    print(f"  → Capa enviada: {COVER_PATH.name}")
                    break
                except Exception:
                    continue
        except Exception as e:
            print(f"  ✗ Capa: {e}")

        time.sleep(8)
        shoot(page, "09-capa")

        # Avança / Salva
        click_text(page, "Avançar", "Próximo", "Continuar", "Salvar",
                   "Salvar e continuar", "Publicar", "Criar produto")
        time.sleep(5)
        shoot(page, "10-final")
        print("URL final:", page.url)

        # Exibe elementos clicáveis pra próximo passo
        items = page.evaluate("""
            () => Array.from(document.querySelectorAll('button, h1, h2, [role=button]'))
                .filter(el => { const r = el.getBoundingClientRect(); return r.width>10&&r.height>10; })
                .map(el => (el.innerText||'').trim().replace(/\\n+/,' '))
                .filter(t => t && t.length < 80)
                .slice(0, 25)
        """)
        seen = set()
        for it in items:
            if it and it not in seen:
                seen.add(it)
                print(f"  · {it!r}")

        browser.close()


if __name__ == "__main__":
    main()
