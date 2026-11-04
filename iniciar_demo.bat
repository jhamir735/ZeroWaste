@echo off
chcp 65001 >nul
title ZeroWaste – Modo Demo (sin PostgreSQL)
color 0B

echo ================================================================
echo            🧪  ZEROWASTE – MODO DEMO SIN POSTGRESQL  🧪
echo ================================================================
echo.
echo  Este modo NO necesita Neon ni PostgreSQL.
echo  Los datos se guardan localmente en backend\demo-data.json
echo.
echo  - Aplicacion web:  http://localhost:3000/01-bienvenida/index.html
echo  - Usuario demo:    maria@correo.com  (o "maria")
echo  - Contrasena:      zerowaste123
echo.
echo  Para reiniciar los datos demo:  npm run demo:reset
echo ================================================================
echo  Presiona Ctrl+C para detener el servidor cuando termines.
echo ================================================================
echo.

cd /d "%~dp0backend"
node demo-server.js

pause
