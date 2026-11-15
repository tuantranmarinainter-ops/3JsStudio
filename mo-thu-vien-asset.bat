@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Dang bat may chu nhan cho thu vien asset. Dong cua so nay de tat.
start "" "%~dp0dist\thu-vien-asset.html"
node tools\thu-vien-asset.mjs mo
pause
