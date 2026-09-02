"""
Aguarda o iframe de precificação carregar, fecha abas extras, preenche o preço.
"""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT  = ROOT / "public" / "marketing"


def s(page, name):
    page.screenshot(path=str(OUT / f"hm-pr-{name}.png"), full_page=False)
    print(f"  📸 {name}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000)
        ctx = browser.contexts[0]

        # Fecha abas desnecessárias
        for pg in ctx.pages:
            try:
                url = pg.url or ""
                if "netlify.com/signup" in url or "about:blank" == url:
                    pg.close()
                    print(f"  Fechou: {url[:60]}")
            except Exception:
                pass

        page = next(
            (pg for pg in ctx.pages if "hotmart.com" in (pg.url or "")
             and "service_worker" not in pg.url), None,
        )
        page.bring_to_front()
        print("URL:", page.url)

        # Aguarda o iframe VLC carregar com inputs
        print("→ Aguardando iframe VLC carregar (até 30s)…")
        vlc_frame = None
        for attempt in range(15):
            time.sleep(2)
            for frame in page.frames:
                if "app-vlc.hotmart.com" in (frame.url or ""):
                    try:
                        inputs = frame.evaluate("""
                            () => Array.from(document.querySelectorAll('input'))
                                .filter(el => {
                                    const r = el.getBoundingClientRect();
                                    return r.width > 5 && r.height > 5;
                                }).length
                        """)
                        if inputs > 0:
                            vlc_frame = frame
                            print(f"  ✓ VLC carregado com {inputs} inputs (tentativa {attempt+1})")
                            break
                    except Exception:
                        pass
            if vlc_frame:
                break

        s(page, "apos-espera")

        if not vlc_frame:
            print("✗ VLC não carregou inputs. Screenshot capturado.")
            # Inspeciona todos os frames na tela
            for i, f in enumerate(page.frames):
                try:
                    inputs = f.evaluate("""
                        () => Array.from(document.querySelectorAll('input'))
                            .map(el => ({type: el.type, name: el.name, ph: el.placeholder, w: Math.round(el.getBoundingClientRect().width)}))
                            .filter(i => i.w > 5)
                    """)
                    if inputs:
                        print(f"  frame[{i}] {f.url[:60]} inputs: {inputs}")
                except Exception:
                    pass
            # Tenta clicar em Salvar mesmo sem preço (ver o que acontece)
            try:
                page.get_by_role("button", name="Salvar e continuar").click(timeout=5000)
                time.sleep(4)
                print("URL após clicar Salvar:", page.url)
                s(page, "apos-salvar-sem-preco")
            except Exception:
                pass
            browser.close()
            return

        # Preenche o preço no VLC frame
        for sel in [
            "input[name*='price']", "input[name*='value']", "input[name*='amount']",
            "input[placeholder*='0,00']", "input[placeholder*='valor']",
            "input[placeholder*='price']", "input[type='number']",
            "input[type='text']:not([readonly])",
        ]:
            try:
                inp = vlc_frame.locator(sel).first
                inp.wait_for(state="visible", timeout=3000)
                inp.triple_click()
                inp.fill("47")
                print(f"  ✓ Preço 47 via {sel}")
                time.sleep(2)
                break
            except Exception:
                continue

        # Lista elementos visíveis no VLC
        items = vlc_frame.evaluate("""
            () => Array.from(document.querySelectorAll('input, button, h1, h2, label'))
                .filter(el => { try { const r=el.getBoundingClientRect(); return r.width>5&&r.height>5; } catch{return false;} })
                .map(el => ({
                    tag: el.tagName,
                    text: (el.innerText||el.placeholder||el.value||el.name||'').trim().slice(0,50)
                }))
                .filter(i => i.text).slice(0, 30)
        """)
        print("Elementos VLC:")
        seen = set()
        for it in items:
            if it['text'] not in seen:
                seen.add(it['text'])
                print(f"  [{it['tag']}] {it['text']!r}")

        s(page, "vlc-preenchido")

        # Clica Salvar na página principal
        try:
            page.get_by_role("button", name="Salvar e continuar").click(timeout=8000)
            time.sleep(6)
            print("URL após Salvar:", page.url)
        except Exception as e:
            print("✗ Salvar:", e)

        s(page, "final")
        browser.close()


if __name__ == "__main__":
    main()
