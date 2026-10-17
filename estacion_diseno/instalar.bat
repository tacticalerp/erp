@echo off
chcp 65001 >nul
title Instalar estacion de diseno - Tactical Marketing
cd /d "%~dp0"
echo ============================================================
echo  INSTALAR LA ESTACION DE DISENO (se hace una sola vez)
echo ============================================================
echo.
set PY=
where py >nul 2>nul && set PY=py -3
if "%PY%"=="" where python >nul 2>nul && set PY=python
if "%PY%"=="" (
  echo No encuentro Python. Instalalo desde https://www.python.org/downloads/
  echo y marca la casilla "Add python.exe to PATH". Despues vuelve a abrir este archivo.
  pause
  exit /b 1
)
echo Python encontrado: %PY%
echo.
echo Instalando las librerias para archivos pesados (PyMuPDF y Pillow)...
%PY% -m pip install --upgrade pymupdf pillow
echo.
echo Creando acceso directo "Estacion de diseno" en el escritorio...
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Estacion de diseno.lnk'); $s.TargetPath='%~dp0iniciar.bat'; $s.WorkingDirectory='%~dp0'; $s.Save()"
echo.
echo Listo. Abre "Estacion de diseno" en el escritorio cada vez que vayas a trabajar con las herramientas del ERP.
pause
