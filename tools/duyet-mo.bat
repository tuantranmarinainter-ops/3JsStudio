@echo off
rem Mo trang duyet va nhan ket qua thang vao repo. Dung: duyet-mo.bat [ep] (mac dinh ep002)
set EP=%1
if "%EP%"=="" set EP=ep002
cd /d "%~dp0.."
echo Trang duyet dang mo trong trinh duyet. Duyet xong bam "Gui toi Claude".
echo Mo bang file dist\ep_duyet.html (bam dup) cung gui duoc khi cua so nay con mo.
echo De cua so nay mo trong luc duyet; dong lai khi da gui xong.
node tools/duyet.mjs %EP% mo
pause
