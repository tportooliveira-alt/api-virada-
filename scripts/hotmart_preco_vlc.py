"""
Preenche o preço no frame interno VLC da Hotmart (app-vlc.hotmart.com).
"""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT  = ROOT / "public" / "marketing"


def s(page, name):
    page.screenshot(path=str(OUT / f"hm-vlc-{name}.png"), full_page=False)
    print(f"  📸 {name}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=15000)
        ctx = browser.contexts[0]
        page = next(
            (pg for pg in ctx.pages if "hotmart.com" in (pg.url or "")
             and "service_worker" not in pg.url), None,
        )
        page.bring_to_front()
        print("Página principal:", page.url)

        # Encontra o frame app-vlc.hotmart.com
        vlc_frame = None
        for frame in page.frames:
            if "app-vlc.hotmart.com" in frame.url:
                vlc_frame = frame
                print(f"✓ Frame VLC: {frame.url[:80]}")
                break

        if vlc_frame:
            # Inspeciona o frame VLC
            inputs = vlc_frame.evaluate("""
                () => {
                    const all = Array.from(document.querySelectorAll('input, select, button, h1, h2, h3, label'));
                    return all.map(el => ({
                        tag: el.tagName,
                        type: el.type||'',
                        name: el.name||el.id||el.getAttribute('data-testid')||'',
                        placeholder: el.placeholder||'',
                        value: el.value||'',
                        text: (el.innerText||'').trim().slice(0,60)
                    })).filter(i => i.text||i.placeholder||i.name).slice(0,40);
                }
            """)
            print(f"Elementos no frame VLC ({len(inputs)}):")
            for it in inputs:
                print(f"  [{it['tag']}] name={it['name']!r} ph={it['placeholder']!r} text={it['text']!r} val={it['value']!r}")

            # Tenta preencher o preço
            for sel in ["input[name='value']", "input[name='price']",
                        "input[placeholder*='0,00']", "input[placeholder*='valor']",
                        "input[type='number']", "input[type='text']"]:
                try:
                    inp = vlc_frame.locator(sel).first
                    inp.wait_for(state="visible", timeout=4000)
                    inp.triple_click()
                    inp.fill("47")
                    print(f"  ✓ preço 47 preenchido via {sel}")
                    time.sleep(2)
                    break
                except Exception:
                    continue

            # Scroll down no frame pra ver mais conteúdo
            try:
                vlc_frame.evaluate("window.scrollBy(0, 400)")
                time.sleep(2)
            except Exception:
                pass
            s(page, "vlc-preco")

        else:
            print("Frame VLC não encontrado. Tentando scroll na página principal…")
            page.evaluate("window.scrollBy(0, 500)")
            time.sleep(2)
            s(page, "scroll-down")

            # Re-inspeciona
            all_frames = page.frames
            print(f"Total frames: {len(all_frames)}")
            for i, f in enumerate(all_frames):
                if f.url:
                    print(f"  [{i}] {f.url[:80]}")

        # Tenta clicar "Salvar e continuar" na página principal
        for label in ["Salvar e continuar", "Continuar", "Avançar"]:
            try:
                btn = page.get_by_role("button", name=label).first
                btn.wait_for(state="visible", timeout=4000)
                btn.click()
                print(f"  ✓ Clicou '{label}' na página principal")
                time.sleep(5)
                break
            except Exception:
                continue

        print("URL final:", page.url)
        s(page, "final")
        browser.close()


if __name__ == "__main__":
    main()
