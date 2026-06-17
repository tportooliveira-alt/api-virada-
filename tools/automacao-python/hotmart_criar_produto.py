"""
Navega pela Hotmart para criar o produto digital e-book.
Preenche todos os campos e faz upload do PDF.
"""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "public" / "downloads" / "ebook-codigo-da-virada.pdf"
COVER_PATH = ROOT / "public" / "assets" / "capa-ebook.png"
OUT = ROOT / "public" / "marketing"

# Dados do produto
PRODUCT = {
    "name": "O Código da Virada Financeira",
    "desc": (
        "Um guia prático para organizar seu dinheiro, entender suas dívidas, "
        "cortar desperdícios e encontrar ideias reais de renda extra — começando do zero.\n\n"
        "O que você recebe:\n"
        "✅ E-book completo com 7 capítulos práticos\n"
        "✅ Bônus 1 — Planilha de Controle Financeiro\n"
        "✅ Bônus 2 — Lista com 50 Ideias de Renda Extra\n"
        "✅ Bônus 3 — Roteiro para Negociar Dívidas (scripts prontos)\n"
        "✅ Bônus 4 — Plano de 7 Dias para começar sua virada\n"
        "✅ Bônus 5 — Checklist Mensal de revisão financeira\n\n"
        "Sem promessas de dinheiro fácil. Sem fórmulas mágicas. "
        "Só clareza, organização, plano e direção."
    ),
    "price": "27",
    "currency": "BRL",
}


def shoot(page, name: str) -> None:
    page.screenshot(path=str(OUT / f"hotmart-{name}.png"), full_page=False)
    print(f"  📸 {name}")


def main() -> None:
    print(f"PDF: {PDF_PATH} ({'OK' if PDF_PATH.exists() else 'FALTANDO'})")
    print(f"Capa: {COVER_PATH} ({'OK' if COVER_PATH.exists() else 'FALTANDO'})")

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000)
        ctx = browser.contexts[0]
        page = next(
            (pg for pg in ctx.pages
             if "hotmart.com" in (pg.url or "") and "service_worker" not in pg.url),
            None,
        )
        if page is None:
            print("Não achei aba Hotmart — criando nova…")
            page = ctx.new_page()
            page.goto("https://app.hotmart.com/welcome",
                      wait_until="domcontentloaded", timeout=30000)
            time.sleep(5)

        page.bring_to_front()
        print("URL atual:", page.url)
        shoot(page, "inicio")

        # Clica em "Criar Produtos"
        if "welcome" in page.url or "onboarding" in page.url:
            print("→ Clicando em 'Criar Produtos'…")
            try:
                page.get_by_text("Criar Produtos").click(timeout=8000)
                time.sleep(4)
                shoot(page, "apos-criar-produtos")
                print("  URL:", page.url)
            except Exception as e:
                print("  ✗ Erro ao clicar:", e)
                shoot(page, "erro-criar-produtos")

        # Aguarda chegar em área de produto
        time.sleep(3)
        shoot(page, "estado-atual")
        print("URL final:", page.url)

        # Lista todos os botões e links visíveis
        items = page.evaluate("""
            () => Array.from(document.querySelectorAll('button, a, [role=button]'))
                .filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 10 && r.height > 10;
                })
                .map(el => (el.innerText || el.getAttribute('aria-label') || '').trim())
                .filter(t => t && t.length < 80)
                .slice(0, 40)
        """)
        print("Elementos clicáveis visíveis:")
        seen = set()
        for it in items:
            if it and it not in seen:
                seen.add(it)
                print(f"  · {it!r}")

        browser.close()


if __name__ == "__main__":
    main()
