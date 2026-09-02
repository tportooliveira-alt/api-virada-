@echo off
title App Virada - Iniciar
cd /d "%~dp0"

echo ============================================
echo    APP VIRADA
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js nao encontrado.
  echo     Instale primeiro em: https://nodejs.org  ^(botao LTS^)
  echo     Depois rode este arquivo de novo.
  echo.
  pause
  exit /b
)

if not exist "node_modules" (
  echo Instalando pela primeira vez... isso demora alguns minutos.
  echo NAO feche esta janela.
  call npm install
)

echo.
echo Iniciando o app... quando abrir o navegador, esta pronto.
echo Para parar depois, feche esta janela.
echo.
start "" http://localhost:3000
call npm run dev

pause
