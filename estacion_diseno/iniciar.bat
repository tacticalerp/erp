@echo off
chcp 65001 >nul
title Estacion de diseno - Tactical Marketing
cd /d "%~dp0"

rem Trae las mejoras mas recientes si esta carpeta es una copia de git (si no, sigue igual)
where git >nul 2>nul && (git -C "%~dp0" rev-parse --is-inside-work-tree >nul 2>nul && (echo Buscando actualizaciones... & git -C "%~dp0" pull --ff-only 2>nul))

rem Busca Python
where py >nul 2>nul && (py -3 servidor.py & goto :fin)
where python >nul 2>nul && (python servidor.py & goto :fin)
echo.
echo No encuentro Python en este computador.
echo Instalalo desde https://www.python.org/downloads/ (marca "Add python.exe to PATH") y vuelve a abrir este archivo.
pause
:fin
