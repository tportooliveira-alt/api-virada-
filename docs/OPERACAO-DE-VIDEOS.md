# Operacao de Videos

Guia pratico para produzir videos promocionais do Codigo da Virada Financeira com VS Code, Codex e IA, sem misturar essa operacao com o app principal.

## Direcao

- Usar o VS Code como central de producao.
- Nao usar o VS Code como editor final de video.
- Manter promessa prudente: nao e dinheiro facil; e clareza, organizacao, plano, ideias praticas e direcao.
- Priorizar velocidade comercial antes de acabamento cinematografico.

## Stack Recomendado

- VS Code para briefing, roteiro, prompts, legenda, scripts e automacao
- Codex no editor e no terminal para gerar variacoes e arquivos
- CapCut para edicao rapida
- DaVinci Resolve para acabamento superior quando a oferta provar tracao
- FFmpeg para export, variacoes de formato e legenda
- ElevenLabs ou voz propria para narracao
- YouTube como hospedagem do criativo para Google Ads
- Vercel para landing page
- Supabase para leads e eventos

## Regras de Oferta

- Nao prometer riqueza rapida.
- Nao prometer quitacao garantida.
- Nao sugerir recuperacao financeira automatica.
- Falar de metodo, organizacao, priorizacao, respiracao financeira e renda extra possivel.
- Usar linguagem simples e brasileira.

## Formatos Prioritarios

- `9:16` como formato mestre
- `45s` para explicacao principal
- `30s` para argumento direto
- `15s` para corte curto
- `6s` para bumper e remarketing

## Pacote Inicial Recomendado

- 2 videos de `45s`
- 2 videos de `30s`
- 1 video de `15s`

Todos em vertical, com CTA para landing page com UTM.

## Pipeline

`briefing -> roteiro -> storyboard -> narracao -> assets -> edicao -> legenda -> export -> upload -> trafego -> conversao`

## Estrutura Sugerida

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

## Fluxo Operacional

1. Escrever briefing comercial em Markdown.
2. Gerar tres angulos: dor, esperanca realista e prova plausivel.
3. Escolher um roteiro mestre de `30s` ou `45s`.
4. Derivar cortes de `15s` e `6s`.
5. Gerar narracao.
6. Montar primeiro em `9:16`.
7. Exportar com legenda embutida e `.srt`.
8. Subir no YouTube.
9. Publicar landing page.
10. Medir clique, lead e compra.

## Prompts Base

### Briefing para anuncio

```text
Leia briefs/ads-01.md e crie 3 roteiros de anuncio em pt-BR:
1) dor imediata
2) esperanca realista
3) prova social plausivel
Cada um com 45s, 30s, 15s e 6s.
Salve em scripts/ads-01-variacoes.md
```

### Storyboard

```text
Pegue scripts/ads-01-variacoes.md e gere para cada versao:
- lista de cenas
- texto na tela
- sugestoes de stock footage
- SFX
- CTA final
Salve em scripts/ads-01-storyboard.md
```

### Narracao para TTS

```text
Pegue a versao de 30s e reescreva o texto para narracao com pausas naturais,
frases curtas e diccao clara em portugues brasileiro.
Nao use frases milagrosas. Mantenha tom humano e firme.
Salve em voice/ads-01-30s-tts.txt
```

### Legendas

```text
Crie um arquivo .srt baseado em voice/ads-01-30s-tts.txt com blocos curtos,
no maximo 2 linhas por legenda, timing aproximado para 30 segundos.
Salve em subtitles/ads-01-30s.srt
```

### Landing page

```text
Com base no roteiro de 30s, crie uma landing page HTML simples com:
headline, subheadline, bullets, prova, CTA e FAQ.
Salvar em landing/index.html
```

## Ferramentas de VS Code

- `openai.chatgpt`
- `esbenp.prettier-vscode`
- `eamodio.gitlens`
- `yzhang.markdown-all-in-one`
- `DavidAnson.vscode-markdownlint`
- `streetsidesoftware.code-spell-checker`
- `streetsidesoftware.code-spell-checker-portuguese-brazilian`
- `usernamehw.errorlens`
- `christian-kohler.path-intellisense`
- `Gruntfuggly.todo-tree`

## Workspace Minimo

```json
{
  "editor.formatOnSave": true,
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "markdown.preview.breaks": true,
  "todo-tree.tree.showScanModeButton": true,
  "cSpell.language": "pt,en"
}
```

## Codex de Projeto

```toml
model = "gpt-5.5"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
web_search = "cached"
```

## Comandos Base

```powershell
npm i -g @openai/codex
npm i -g vercel
mkdir briefs,prompts,scripts,voice,stock,subtitles,edits,thumbnails,landing,exports
npm init -y
npm i @vercel/analytics @supabase/supabase-js
```

## Tasks Uteis

- gerar `.srt`
- render `9:16` com FFmpeg
- gerar thumbnail
- deploy da landing com `vercel --prod`

## Medicao

- landing page na Vercel
- leads no Supabase
- UTM por video e angulo
- Google tag para conversao
- pixel e webhook da Hotmart se o checkout estiver la

## Recomendacao Objetiva

No inicio:

- validar oferta
- validar angulo de criativo
- usar CapCut + FFmpeg + VS Code
- manter landing simples
- medir lead e clique antes de sofisticar edicao

Depois da primeira tracao:

- subir acabamento
- testar UGC contra motion
- ampliar biblioteca de assets
- automatizar upload, legenda e variacoes

## Nota de Confiabilidade

Usar este documento como guia operacional, nao como fonte juridica final.

Sempre confirmar:

- licenca comercial de voz e musica
- politicas atuais do Google Ads e YouTube
- requisitos de disclosure para conteudo sintetico
