@echo off
chcp 65001 >nul
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo 没有找到 Python。请先安装 Python 3，或在本目录执行：
  echo     npx serve .
  echo.
  pause
  exit /b 1
)

echo.
echo 正在启动本地服务器： http://127.0.0.1:8123/
echo 关闭这个窗口即可停止。浏览器没有自动打开的话，手动访问上面的地址。
echo.
start "" http://127.0.0.1:8123/
python -m http.server 8123 --bind 127.0.0.1
