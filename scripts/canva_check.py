"""Verifica estado do Canva e captura screenshot."""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = browser.contexts[0]
    page = next((pg for pg in ctx.pages if "canva.com" in pg.url and "service_worker" not in pg.url), None)
    if not page:
        print("Não achei aba do Canva")
    else:
        print("URL atual:", page.url)
        print("Título:", page.title())
        # Tira screenshot
        out = r"C:\Users\Thiago Porto\vendas e book\codigo-da-virada\public\marketing\canva-status.png"
        page.screenshot(path=out, full_page=False)
        print("Screenshot salvo em:", out)
        # Tenta detectar se está logado checando elementos típicos
        html = page.content()
        if "Sair" in html or "Logout" in html or "Conta" in html or '"isLoggedIn":true' in html:
            print("✓ LOGADO")
        else:
            # Procura por texto característico de página não logada
            if "Faça login" in html or "Inscreva-se" in html:
                print("✗ NÃO LOGADO")
            else:
                print("? Status incerto — confira o screenshot")
    browser.close()
