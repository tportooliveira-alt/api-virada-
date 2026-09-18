#!/usr/bin/env bash
# Prova do porteiro do material pago, pelo HTTP — que e como o atacante chega.
#
# Por que este arquivo existe (cicatriz de 2026-09-17): havia um teste que dava
# 15/15 validando a assinatura HMAC, e o produto inteiro vazava trocando "/" por
# "%2f" na URL. Teste de funcao nao ve o matcher do middleware. Este ve.
#
#   ./scripts/test-porteiro.sh                          # contra localhost:3011
#   ./scripts/test-porteiro.sh https://codigodavirada.net.br
#
# Sem cookie, TUDO que for material pago tem que dar 307. Se algum der 200, o
# e-book de R$ 47 esta saindo de graca.

BASE="${1:-http://localhost:3011}"
falhou=0
passou=0

checa() {
  local descricao="$1" caminho="$2" esperado="$3"
  local codigo
  codigo=$(curl -sS --path-as-is -o /dev/null -w "%{http_code}" -m 25 "${BASE}${caminho}" 2>/dev/null)
  if [ "$codigo" = "$esperado" ]; then
    passou=$((passou + 1))
    printf "  ok    %-44s %s\n" "$descricao" "$codigo"
  else
    falhou=$((falhou + 1))
    printf "  FALHA %-44s %s (esperado %s)\n" "$descricao" "$codigo" "$esperado"
  fi
}

echo
echo "Porteiro do material pago — ${BASE}"
echo
echo "[1] Material pago sem cookie: tem que barrar (307)"
checa "caminho normal"            "/api/material/downloads/ebook-codigo-da-virada.pdf"      307
checa "barra como %2f"            "/api/material/downloads%2febook-codigo-da-virada.pdf"    307
checa "barra como %2F maiusculo"  "/api/material/downloads%2Febook-codigo-da-virada.pdf"    307
checa "dupla codificacao %252f"   "/api/material/downloads%252febook-codigo-da-virada.pdf"  307
# Barra dupla: o Next normaliza a URL (308) e a cadeia termina no /app. Nao vaza.
checa "barra dupla (normaliza)"   "//api/material/downloads/ebook-codigo-da-virada.pdf"     308
checa "extensao maiuscula"        "/api/material/downloads/EBOOK-CODIGO-DA-VIRADA.PDF"      307
checa "com query string"          "/api/material/downloads/plano-7-dias.pdf?x=1"            307
checa "bonus fora da oferta"      "/api/material/downloads/bonus-50-ideias.pdf"             307
checa "biblioteca normal"         "/api/material/biblioteca/negociacao/index.html"          307
checa "biblioteca com %2f"        "/api/material/biblioteca%2fnegociacao%2findex.html"      307
checa "biblioteca indice"         "/api/material/biblioteca/index.html"        307

echo
echo "[1b] Caminho ANTIGO (public/) tem que ter sumido: 404"
checa "downloads antigo"          "/downloads/ebook-codigo-da-virada.pdf"      404
checa "downloads antigo com %2f"  "/downloads%2febook-codigo-da-virada.pdf"    404
checa "biblioteca antiga"         "/biblioteca/negociacao/index.html"          404

echo
echo "[2] O que NAO pode ser barrado: tem que abrir (200)"
checa "landing"                   "/"                                          200
checa "landing /vendas"           "/vendas"                                    200
checa "app"                       "/app"                                       200
checa "pagina de obrigado"        "/obrigado"                                  200
checa "api de versao"             "/api/version"                               200
checa "manifest do PWA"           "/manifest.webmanifest"                      200
checa "icone"                     "/icons/icon-192.png"                        200

echo
echo "------------------------------------------------------------------"
printf "RESULTADO: %d passou, %d falhou\n" "$passou" "$falhou"
echo "------------------------------------------------------------------"
echo
[ "$falhou" -eq 0 ] || exit 1
