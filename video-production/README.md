# Video Production

Workspace operacional para produzir anuncios e videos promocionais do Codigo da Virada Financeira sem misturar esse fluxo com o app principal.

## Objetivo

Usar o VS Code como central de producao para:

- escrever briefings
- gerar roteiros e variacoes
- preparar narracao e legendas
- manter prompts e scripts reutilizaveis
- publicar landing page simples para teste

Edicao final de video continua fora daqui, em ferramentas como CapCut ou DaVinci Resolve.

## Estrutura

```text
video-production/
  briefs/
  prompts/
  scripts/
  voice/
  stock/
  subtitles/
  edits/
  thumbnails/
  landing/
  exports/
  .vscode/
  .codex/
```

## Como usar

1. Abra esta pasta como workspace separado no VS Code se quiser usar `video-production/.vscode/tasks.json` diretamente.
2. Preencha ou duplique `briefs/ads-01.md`.
3. Use os prompts em `prompts/ads-workflow.md`.
4. Gere a narracao em `voice/`.
5. Gere a legenda com `scripts/make_srt.py`.
6. Monte o video no CapCut ou DaVinci.
7. Use FFmpeg para variar formato e queimar legenda.
8. Publique o criativo no YouTube e a landing page na Vercel.

## Regras comerciais

- Nao prometer dinheiro facil.
- Nao prometer enriquecimento rapido.
- Nao prometer quitacao automatica de dividas.
- Falar de metodo, clareza, organizacao, plano e direcao.
- Renda extra deve aparecer como possibilidade pratica, nao como garantia.

## Dependencias uteis

Ferramentas locais:

- `ffmpeg`
- `python`
- `vercel`
- `@openai/codex`

Pacotes Python para upload no YouTube:

```powershell
pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
```

## Arquivos-base incluidos

- `briefs/ads-01.md`: briefing comercial inicial
- `prompts/ads-workflow.md`: prompts padrao para Codex
- `scripts/make_srt.py`: gerador simples de legenda `.srt`
- `scripts/upload_youtube.py`: upload basico por API
- `landing/index.html`: landing page estatica inicial
- `.vscode/tasks.json`: tarefas locais para legenda, render, thumbnail e deploy
- `.codex/config.toml`: configuracao local de projeto para o Codex

## Observacao

Este workspace organiza producao. Ele nao substitui revisao manual de:

- licenca comercial de audio e voz
- direitos de imagem e musica
- politica atual do Google Ads
- politica atual do YouTube
