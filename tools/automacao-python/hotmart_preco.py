"""Preenche a tela de precificação da Hotmart e avança."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT  = ROOT / "public" / "marketing"


def s(page, name):
    page.screenshot(path=str(OUT / f"hm-{name}.png"), full_page=False)
    print(f"  📸 {name} — {page.url[:70]}")


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

        if "/pricing" not in page.url:
            page.goto("https://app.hotmart.com/products/add/4/pricing",
                      wait_until="domcontentloaded", timeout=20000)
            time.sleep(4)

        s(page, "preco-inicio")

        # Lista todos os inputs visíveis
        inputs_info = page.evaluate("""
            () => Array.from(document.querySelectorAll('input, select'))
                .filter(el => { const r=el.getBoundingClientRect(); return r.width>10&&r.height>10; })
                .map(el => ({
                    name: el.name||el.id||el.getAttribute('data-testid')||'',
                    placeholder: el.placeholder||'',
                    type: el.type||'',
                    value: el.value||''
                }))
        """)
        print("Inputs na tela:")
        for inp in inputs_info:
            print(f"  {inp}")

        # Tenta preencher o preço
        print("→ Preenchendo preço R$ 47…")
        for sel in [
            "input[name='price']", "input[name='value']",
            "input[placeholder*='0,00']", "input[placeholder*='preço']",
            "input[type='number']", "input[type='text']"
        ]:
            try:
                inp = page.locator(sel).first
                inp.wait_for(state="visible", timeout=4000)
                inp.triple_click()
                inp.fill("47")
                print(f"  ✓ preço preenchido via {sel}")
                time.sleep(1)
                break
            except Exception:
                continue

        s(page, "preco-preenchido")

        # Avança
        for label in ["Salvar e continuar", "Continuar", "Avançar", "Próximo"]:
            try:
                btn = page.get_by_role("button", name=label).first
                btn.wait_for(state="visible", timeout=4000)
                btn.click()
                print(f"  ✓ Clicou '{label}'")
                time.sleep(5)
                break
            except Exception:
                continue

        print("URL após preço:", page.url)
        s(page, "preco-final")

        # O que aparece na próxima tela
        items = page.evaluate("""
            () => Array.from(document.querySelectorAll('button, h1, h2, [role=button], label'))
                .filter(el => { const r=el.getBoundingClientRect(); return r.width>10&&r.height>10; })
                .map(el => (el.innerText||el.getAttribute('aria-label')||'')
                           .trim().replace(/\\n+/,' ').slice(0,70))
                .filter(t=>t).slice(0,20)
        """)
        seen = set()
        for it in items:
            if it not in seen:
                seen.add(it)
                print(f"  · {it!r}")

        browser.close()


if __name__ == "__main__":
    main()
