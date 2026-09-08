@echo off
chcp 65001 >nul
title MURAL - instalacao
echo ==============================================
echo   MURAL - instalacao (pode demorar alguns minutos)
echo ==============================================

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js nao encontrado. Instale a versao LTS em:
  echo https://nodejs.org  ^(next, next, finish^)
  echo Depois rode este arquivo de novo.
  pause
  exit /b 1
)

rem O banco de dados do Mural vem dentro do Node. Se esta versao do Node
rem for antiga demais, avisamos na hora, sem erro tecnico na tela.
node -e "try{require('node:sqlite')}catch(e){process.exit(1)}" >nul 2>nul
if errorlevel 1 (
  echo.
  echo Esta versao do Node.js e antiga demais para o Mural.
  echo Instale a versao LTS mais nova em https://nodejs.org
  echo ^(pode instalar por cima, nao precisa desinstalar nada^)
  echo e depois rode este arquivo novamente.
  pause
  exit /b 1
)

echo Limpando instalacoes anteriores, se houver...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json

echo Baixando os componentes do Mural...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo Nao foi possivel baixar os componentes. Verifique a internet e rode de novo.
  pause
  exit /b 1
)

echo.
echo Agora vamos criar o seu usuario mestre.
node scripts\criar-mestre.js
if errorlevel 1 (
  echo.
  echo O usuario mestre nao foi criado. Rode o INSTALAR-MURAL.bat de novo.
  pause
  exit /b 1
)

echo.
echo ==============================================
echo   Tudo pronto! Para ligar o sistema, use
echo   INICIAR-MURAL.bat
echo ==============================================
pause