"""Inspeciona a página de uploads do Canva pra achar o seletor certo."""

import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = browser.contexts[0]
    page = next(
        (pg for pg in ctx.pages
         if "canva.com" in pg.url and "service_worker" not in pg.url),
        None,
    )
    print("URL:", page.url)
    print("Título:", page.title())
    page.screenshot(path=r"C:\Users\Thiago Porto\vendas e book\codigo-da-virada\public\marketing\canva-inspect.png")

    # Conta quantos input[type=file] existem (incluindo escondidos)
    n_inputs = page.evaluate("document.querySelectorAll('input[type=file]').length")
    print(f"Inputs file na página: {n_inputs}")

    # Lista botões com texto contendo 'upload' ou 'enviar'
    btns = page.evaluate("""
        () => Array.from(document.querySelectorAll('button, [role=button]'))
            .map(b => b.innerText.trim())
            .filter(t => t && (
                t.toLowerCase().includes('upload') ||
                t.toLowerCase().includes('enviar') ||
                t.toLowerCase().includes('fazer') ||
                t.toLowerCase().includes('arquivo')
            ))
            .slice(0, 20)
    """)
    print("Botões relacionados:")
    for b in btns:
        print(f"  - {b!r}")

    browser.close()
