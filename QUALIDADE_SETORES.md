# Qualidade por setor — Código da Virada

Estado do `/super-thi`. Leio antes de cada rodada, atualizo ao fim.
Branch: `superthi/correcoes-auditoria` (saiu do `main` em `a3673cd`).

## Como se prova

- **Rodar:** `npm run test` (typecheck + lint + build) — não há CI, é isso que roda antes de subir
- **Prova da planilha:** `npx tsx scripts/test-sheets-build.ts` (70 asserts) e `scripts/test-auditoria-matematica.ts` (8)
- **Palco:** produção em `codigodavirada.net.br` · deploy por `ssh vps-paperclip` → `/var/www/codigo-da-virada`
- **Prova de tudo:** `npm run test` + os dois scripts + olho no Chrome (~6 min)
- **O real (a régua):** ebook → best-seller BR de finanças (Me Poupe!) · app → Mobills/Organizze ·
  planilha → planilha vendida de R$ 30-90 · carta → material de Serasa/Procon/advogado
- **Régua de acabamento do dono:** enterprise tipo Linear/Stripe, um dourado só, **nada de emoji nem cartoon**

## Corte de aceite (ordem do Thiago, 17/09/2026)

**Alvo 100. Piso 95.** Nota do item = **a menor das 4 lentes**. Abaixo de 95 em qualquer
lente, volta para o executor com a lista do que faltou. Ele não aceita menos.

## Regras desta leva

1. **Ninguém roda git.** Os agentes editam; os commits são meus.
2. **Cada arquivo tem um dono** (tabela abaixo). Encostou em arquivo de outro item: relata, não edita.
3. **Chrome é meu** — recurso único, não vai para paralelo.
4. **Não rodar `scripts/build-vendas.mjs`**: o `vendas.html` no ar já divergiu do gerador; rodar apaga
   o widget da consultora e o rodapé de contato (pegadinha do `CLAUDE.md`).
5. **Não rodar `scripts/build_pdfs.py`** nesta leva — os PDFs são regerados uma vez só, no item 5,
   depois que os itens 1 e 6 terminarem de editar o `content/`.

## Donos de arquivo

| Item | Dono dos arquivos |
|---|---|
| 1 · Carta jurídica | `public/biblioteca/negociacao/index.html` · `content/roteiro-negociacao-dividas.md` |
| 2 · Landing | `public/vendas.html` |
| 3 · App: planilha e socorro | `app/app/inicio/page.tsx` · `components/AuthGate.tsx` |
| 4 · Fechar `/downloads` | `middleware.ts` (novo) — **eu**, tem risco de quebrar a entrega |
| 5 · Capas dos PDFs | `scripts/build_pdfs.py` — **depois** de 1 e 6 |
| 6 · Plano de 7 dias | `content/plano-7-dias.md` |

## Fila

- [ ] **1 · Carta jurídica** — rodada 0 · nota atual **0** (correção 0 · realidade 5 · silêncio 0 · acabamento 50)
      falta: tirar a Súmula 530 usada errada; tirar o Novo Desenrola (MP 1.355/2026 caducou 31/08/2026,
      DOU 08/09/2026); avisar que reconhecer dívida reinicia a prescrição; estender o seletor de atraso
      para "mais de 5 anos"; separar cheque especial de cartão (teto 8%/mês, Res. CMN 4.765/2019);
      respeitar o teto da Lei 14.690/2023 na projeção; trocar os 30 dias pelo prazo legal de 5 dias úteis
- [~] **2 · Landing** — executor fechou a rodada 1, **falta o crítico**
      feito: a peça jurídica inventada (Resolução BACEN 4.549/2017, "DED", "mesa de acordos
      especiais") deu lugar à carta que o comprador recebe de verdade (CDC art. 43 §1º,
      Súmula 548/STJ, Lei 14.181/2021), com a ressalva "não obriga o banco a aceitar";
      bônus padronizados em 1/2/3; "5 scripts" → 6; os 7 valores avulsos reescalados para somar
      exatamente os R$ 150 da ancoragem; as 4 estatísticas sem fonte (BACEN, McKinsey, Stanford,
      SPC) saíram inteiras depois de busca que não confirmou nenhuma.
      Prova: `npm run test` exit 0, 23/23 páginas; grep zerado em "4.549", "DED", "mesa de acordo",
      "5 scripts", "Stanford", "McKinsey"; soma dos avulsos = 150.
      ⚠️ **decisão de conversão para o Thiago:** a FAQ "preciso de internet?" mudou de "não" para
      "sim", porque hoje é a verdade. A saída melhor é o item 9 abaixo, não reescrever de volta.
- [~] **3 · App: planilha e socorro** — executor fechou a rodada 1, **falta o crítico**
      feito: o banner do Início lê `sheet.sheetUrl` e vira "Abrir minha planilha no Google Drive"
      (nova aba) ou "Criar minha planilha agora" → `/app/conta`; a prévia continua como link
      pequeno e honesto; WhatsApp na tela "conta não encontrada" com a mensagem já escrita
      citando o e-mail que a pessoa tentou; kanji 田 → ícone `FileSpreadsheet`; emoji removidos.
      Prova: `npm run test` exit 0, zero warning de lint, e varredura Unicode sem emoji/CJK.
- [~] **4 · Fechar `/downloads`** — rodada 1 feita, falta a prova no palco · **meu**
      feito: `lib/access/member-session.ts` (sessão do comprador, HMAC, Web Crypto porque o
      middleware roda no Edge; 30 dias), `/api/access/check` emite o cookie a quem comprou,
      `middleware.ts` barra `/downloads` e `/biblioteca` e manda entrar em `/app`.
      Prova: `npx tsx scripts/test-member-session.ts` — **15 passou, 0 falhou** (forja de
      assinatura, troca de e-mail, escopo de admin, expirado e fail-closed sem segredo).
      Verificado antes de fechar: `ADMIN_SESSION_SECRET` existe na VPS e o
      `NEXT_PUBLIC_GOOGLE_CLIENT_ID` chega nos chunks de produção — ou seja, dá para logar.
      **Falta:** subir o app local e conferir com o olho que sem cookie redireciona e com
      cookie baixa; e decidir o texto de `/app?precisa-entrar=1`.
- [ ] **5 · Capas dos PDFs** — rodada 0 · bloqueado por 1 e 6
      falta: renumerar 02/03/04/05 → 01/02/03; consertar checkbox virando "• I" e "⚠️" virando "II"
- [~] **6 · Plano de 7 dias** — executor fechou a rodada 1, **falta o crítico**
      feito: Dia 6 deixou de mandar investir devendo e virou "descubra quanto você realmente deve"
      (Serasa, SPC, Registrato — custo zero); Dias 4 e 5 invertidos, negocia com o dinheiro na mão;
      instruções alinhadas ao app que existe; avisos de prescrição, multa de fidelidade e golpe do
      Pix; um "E se eu não tenho isso?" por dia; total de 6h30 declarado na abertura; 3 erros de
      português corrigidos. O executor refez o teste da persona: **7 de 7 dias executáveis** (era 3).
      ⚠️ o PDF em `public/downloads/` ainda tem o texto velho até o item 5 rodar o gerador.

## Próxima leva (achado durante esta)

- [ ] **7 · Ebook principal** (`content/ebook.md`) — nota **15**. O executor do plano de 7 dias
      avisou que o ebook agora **contradiz** o bônus corrigido: cita condomínio no calendário de
      contas (linha ~80), recomenda Tesouro Selic/CDB (linha ~220) e tem uma seção própria
      "Seus primeiros 7 dias com o app" (linha ~246) com a ordem **antiga** dos dias.
      Some-se o que a auditoria já apontou: 2.208 palavras sem uma única conta, e as palavras
      "negativado", "Serasa", "consignado" e "prescrição" não aparecem nenhuma vez.
- [ ] **9 · O app abrir offline de verdade — o de maior retorno da lista.**
      Hoje o app **não** abre sem internet: não existe service worker no projeto. A landing acabou
      de ser corrigida para admitir isso (custo de conversão real), e os **agentes de venda
      continuam prometendo offline em 7 lugares** — `agente-whatsapp/AGENTE.md:52,95,120,230`,
      `CONHECIMENTO-DO-PRODUTO.md:196,208` e `agente-site/AGENTE-SITE.md:46`. Ou seja: o robô que
      conversa com o comprador está contradizendo a página de vendas agora mesmo.
      **A saída não é apagar a promessa, é cumpri-la** — e o service worker já existe pronto e
      testado na PR #2 (`claude/abra-app-fe1urv`): rede-primeiro para navegação, cache-first para
      `/_next/static/*`, nunca cacheia `/api/*`, e se registra só em produção. É exatamente o
      "fatiar a PR #2 e levar só o service worker" que eu já tinha recomendado. Resolve de uma vez
      a landing, os 7 lugares dos agentes e o −15 da auditoria.
- [ ] **8 · `content/roteiro-negociacao-dividas.md`** — o checklist ainda pede a "taxa de juros
      mensal" (dado que o app não guarda) e traz "vou ter que esperar a dívida prescrever" como
      blefe, sem avisar que fechar acordo reinicia esse prazo. Parte é do item 1; conferir o que
      sobrou depois que ele fechar.

## Base estável

_(vazio — nenhum item passou por crítico ainda)_

## Cicatrizes

- **2026-09-17:** o banner "Acessar Planilha" da tela Início nunca apontou para a planilha do Drive
  (`inicio/page.tsx:143` → `/app/planilha-demo`). O conserto da URL sem `/edit` era o sintoma menor.
- **2026-09-17:** a carta jurídica cita norma vencida. Toda afirmação de lei no produto precisa de
  data de validade conferida — MP caduca em 120 dias.
