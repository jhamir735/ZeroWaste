@echo off
chcp 65001 >nul
title ZeroWaste – Servidor Backend y Base de Datos Neon
color 0A

echo ================================================================
echo               🌿  ZEROWASTE – SERVIDOR BACKEND  🌿
echo ================================================================
echo.
echo  Conectando con la base de datos PostgreSQL en la nube (Neon)...
echo.
echo  - Aplicacion web:  http://localhost:3000/01-bienvenida/index.html
echo  - Mis alimentos:   http://localhost:3000/03-mis-alimentos/index.html
echo  - Registrar:       http://localhost:3000/04-registrar-alimento/index.html
echo  - API Backend:     http://localhost:3000/api/
echo.
echo ================================================================
echo  Presiona Ctrl+C para detener el servidor cuando termines.
echo ================================================================
echo.

cd /d "%~dp0backend"
node server.js

pause

