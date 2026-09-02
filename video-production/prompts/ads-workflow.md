# Prompts de Workflow

Use estes prompts em sequencia.

## Prompt 1 - Variacoes de anuncio

```text
Leia briefs/ads-01.md e crie 3 roteiros de anuncio em pt-BR:
1) dor imediata
2) esperanca realista
3) prova social plausivel

Para cada angulo, entregue versoes de:
- 45s
- 30s
- 15s
- 6s

Respeite estas regras:
- nao prometa dinheiro facil
- nao use frases milagrosas
- mantenha linguagem simples e brasileira
- CTA direto para landing page

Salve em scripts/ads-01-variacoes.md
```

## Prompt 2 - Storyboard

```text
Pegue scripts/ads-01-variacoes.md e gere para cada versao:
- lista de cenas
- texto na tela
- sugestoes de stock footage
- SFX
- CTA final

Salve em scripts/ads-01-storyboard.md
```

## Prompt 3 - Narracao para TTS

```text
Pegue a melhor versao de 30s e reescreva o texto para narracao com:
- pausas naturais
- frases curtas
- diccao clara em portugues brasileiro
- tom humano e firme

Nao use frases milagrosas.

Salve em voice/ads-01-30s-tts.txt
```

## Prompt 4 - Legendas

```text
Crie um arquivo .srt baseado em voice/ads-01-30s-tts.txt com:
- blocos curtos
- no maximo 2 linhas por legenda
- timing aproximado para 30 segundos

Salve em subtitles/ads-01-30s.srt
```

## Prompt 5 - Landing page

```text
Com base no roteiro de 30s, crie uma landing page HTML simples com:
- headline
- subheadline
- bullets
- prova
- CTA
- FAQ

Salvar em landing/index.html
```

## Prompt 6 - Teste criativo

```text
Crie 5 ideias de thumbnail em texto para estes angulos:
- medo de continuar igual
- alivio de sair do vermelho
- renda extra sem promessas milagrosas
- anti-inflacao pratico
- metodo passo a passo
```

## Prompt 7 - Descricao do YouTube

```text
Com base no roteiro escolhido, escreva:
- titulo para YouTube
- descricao curta com CTA
- comentario fixado
- tags

Use linguagem prudente e sem promessas irreais.
```
