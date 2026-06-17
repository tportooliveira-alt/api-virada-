"""Completa onboarding da Hotmart e navega até criar produto."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "marketing"


def shoot(page, name):
    page.screenshot(path=str(OUT / f"hotmart-{name}.png"), full_page=False)
    print(f"  📸 {name} | {page.url}")


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
        print("URL:", page.url)

        # PASSO 1 — Preenche rede social
        if "welcome" in page.url:
            try:
                inp = page.locator('input[placeholder="Inserir aqui"]').first
                inp.wait_for(state="visible", timeout=8000)
                inp.fill("tportooliveira")
                print("→ Instagram preenchido: tportooliveira")
                time.sleep(1)
                page.get_by_role("button", name="Confirmar rede social").click()
                time.sleep(5)
                shoot(page, "apos-rede-social")
            except Exception as e:
                print("  ✗ Rede social:", e)
                shoot(page, "erro-rede-social")

        # Avança por qualquer tela de onboarding restante
        for step in range(8):
            url = page.url
            print(f"  Passo {step+1} | URL: {url}")
            if "/product" in url or "/dashboard" in url or "/products" in url:
                print("✓ Chegou em área de produto/dashboard")
                break
            # Clica em qualquer botão de "Avançar / Continuar / Próximo / Começar"
            advanced = False
            for label in ["Avançar", "Continuar", "Próximo", "Começar", "Concluir",
                          "Confirmar", "Criar produto", "Ir para o painel"]:
                try:
                    btn = page.get_by_role("button", name=label).first
                    btn.wait_for(state="visible", timeout=3000)
                    btn.click()
                    time.sleep(4)
                    advanced = True
                    print(f"  → Clicou '{label}'")
                    break
                except Exception:
                    continue
            if not advanced:
                print("  Nenhum botão de avanço encontrado nesta tela.")
                shoot(page, f"passo-{step+1}")
                break
            shoot(page, f"passo-{step+1}")

        # Tenta navegar diretamente pra área de criação de produto
        print("→ Navegando direto pra /products/new ou /product/new…")
        for path in [
            "https://app.hotmart.com/products/new",
            "https://app.hotmart.com/product/new",
            "https://app.hotmart.com/products/create",
        ]:
            try:
                page.goto(path, wait_until="domcontentloaded", timeout=20000)
                time.sleep(5)
                if "new" in page.url or "create" in page.url or "product" in page.url:
                    print(f"✓ Chegou em: {page.url}")
                    shoot(page, "produto-new")
                    break
            except Exception:
                continue

        shoot(page, "estado-final")

        # Lista o que aparece na tela
        items = page.evaluate("""
            () => Array.from(document.querySelectorAll('button, a, h1, h2, h3, label, [role=button]'))
                .filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 10 && r.height > 10;
                })
                .map(el => (el.innerText || '').trim().replace(/\\n+/g,' '))
                .filter(t => t && t.length < 100)
                .slice(0, 30)
        """)
        seen = set()
        print("Elementos visíveis:")
        for it in items:
            if it and it not in seen:
                seen.add(it)
                print(f"  · {it!r}")

        browser.close()


if __name__ == "__main__":
    main()
