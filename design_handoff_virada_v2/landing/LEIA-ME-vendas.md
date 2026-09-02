> **Neste repositório:** `public/vendas.html` NÃO é copiado deste pacote — é gerado por `node scripts/build-vendas.mjs` a partir de `_design/claude-design/Landing Vendas v2.dc.html`. O bundle `landing/vendas.html` do pacote (1,6 MB, autocontido) fica de fora do git de propósito. Os "tweaks" viram o bloco CONFIG no topo do `vendas.html` gerado (`CHECKOUT_URL`, `WHATSAPP`, `HORAS_OFERTA`); `politica-privacidade.html` e `termos-de-uso.html` já existem em `public/` e os termos também ficam inline no rodapé da landing.

# Handoff: Landing de vendas v2 (`public/vendas.html`)

## Como usar
1. Copie `vendas.html` desta pasta por cima de `public/vendas.html` no repositório APP-VIRADA.
2. **Pendências que só existem depois do cadastro na Kiwify** — estão marcadas no arquivo e listadas abaixo. Enquanto não preencher, os botões de compra só rolam até a caixa de preço e o botão de WhatsApp não abre conversa.

## TODO — preencher quando a Kiwify estiver cadastrada

| Onde | O que colocar | Como achar no arquivo |
| --- | --- | --- |
| Botões "Quero o app", "Quero o controle na mão", "Quero comprar agora", "Começar agora" | URL do checkout Kiwify (`https://pay.kiwify.com.br/...`) | Todos os `href="#comprar"` que apontam para compra. No projeto de design, é o tweak `checkoutUrl`. |
| Botão flutuante "Tirar dúvida" e link "Suporte no WhatsApp" no rodapé | Número com DDI, só dígitos (ex.: `5562999999999`) | Links `href="#comprar"` que deveriam ser `https://wa.me/<numero>?text=...`. Tweak `whatsapp`. |
| Texto "Pagamento seguro via Kiwify" e FAQ "Assim que a Kiwify confirma…" | Confirmar que a plataforma final é Kiwify (ou trocar por Cakto) | Tweak `plataforma`. |
| Preço cheio "R$ 150" (riscado) | Precisa ser o mesmo preço cheio configurado no checkout — CDC exige "de/por" real | Tweak `precoDepois`. |
| Temporizador | Hoje: 24 h por visitante, salvo em `localStorage` (`virada-oferta-fim`). Se quiser data fixa de fim de promoção, trocar a lógica em `deadline()` | Tweak `horasOferta` (0 desliga). |
| Compartilhamento (WhatsApp/Instagram) | Trocar `og:image` por URL absoluta com o domínio final (`https://SEU-DOMINIO/assets/og-image.png`); o arquivo já existe em `public/assets/` | `<meta property="og:image">` no `<head>` |

Preferível: preencher os tweaks no arquivo de design (`Landing Vendas v2.dc.html`) e exportar de novo, em vez de editar o HTML compilado à mão.

## Já resolvido nesta versão
- Termos de uso, privacidade e reembolso dentro da própria página (`#termos`, `#privacidade`, `#reembolso`) — não precisa de páginas separadas.
- Capas dos 4 bônus e a seção "É pra você? / Pra quem não é" vieram da landing antiga (Netlify).
- A landing antiga (aquamarine-crumble-9be5b2.netlify.app) vende só o e-book por R$ 27 e não cita o app: desligar ou redirecionar para `/vendas` quando esta subir.
- Sem menção à Hotmart; sem depoimentos falsos; sem "Bônus 1 planilha de planejamento" (não existia).
- "Pagamento único · sem mensalidade" em todos os pontos de preço.
- Mini-vídeo do hero (celular → Google Planilhas) em loop de 14 s; exportável em MP4 pelo projeto de design.
- Palavra "Planilha" só se refere ao Google Planilhas; sincronização explícita na oferta.
