# UI kit — Virada App (Início v2)

Recriação da tela **Início** no layout v2 (aprovado em 01/09/2026), usando só os tokens de `styles.css`.

- `index.html` — tela completa: sidebar (desktop) ou menu inferior (celular), hero escuro com saldo, análise de gastos com donut, últimos lançamentos, cartão da planilha.
- `telas.html` — Lançar, Relatórios e Conta em três celulares lado a lado, clicáveis (valor em centavos, "Quando?", voz, abas com nome, cadastrar dívida/meta, diálogo padrão). Arquivo autocontido gerado a partir do protótipo; edite o protótipo de origem, não este.
- Layout: coluna única até 1023px (menu inferior); a partir de 1024px sidebar de 248px + conteúdo em grade 2 colunas (minmax 400px).
- Fonte do design: `Virada App - Inicio v2.dc.html` no projeto de origem; código original em `app/app/inicio/page.tsx` do repositório APP-VIRADA.

Telas ainda não recriadas neste kit: Lançar, Relatórios (ex-Planilha), Conta, Entrar. Use os componentes de `components/core` e as regras do readme para desenhá-las.
