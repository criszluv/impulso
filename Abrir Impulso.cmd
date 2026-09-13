@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js. Instala la version LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  echo Preparando Impulso por primera vez...
  call npm ci
  if errorlevel 1 (
    echo No se pudo completar la preparacion. Revisa tu conexion e intentalo de nuevo.
    pause
    exit /b 1
  )
)
node scripts\abrir-local.cjs
if errorlevel 1 pause
