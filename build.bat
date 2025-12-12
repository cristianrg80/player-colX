@echo off
echo ========================================
echo    COMPILACION CCH PLAYER PARA WINDOWS
echo ========================================
echo.

echo [1/4] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo ERROR: No se pudieron instalar las dependencias
        pause
        exit /b 1
    )
) else (
    echo Dependencias encontradas ✓
)

echo.
echo [2/4] Verificando iconos...
if not exist "assets\icon.ico" (
    echo ERROR: No se encontro assets\icon.ico
    echo Por favor crea el icono antes de compilar
    echo Ver assets\README_ICON.md para instrucciones
    pause
    exit /b 1
) else (
    echo Icono encontrado ✓
)

echo.
echo [3/4] Limpiando compilaciones anteriores...
if exist "dist" rmdir /s /q "dist"
echo Directorio dist limpiado ✓

echo.
echo [4/4] Compilando aplicacion...
echo Esto puede tomar varios minutos...
echo.

npm run build-win

if errorlevel 1 (
    echo.
    echo ERROR: La compilacion fallo
    echo Revisa los mensajes de error arriba
    pause
    exit /b 1
) else (
    echo.
    echo ========================================
    echo    COMPILACION COMPLETADA EXITOSAMENTE
    echo ========================================
    echo.
    echo Archivos generados en la carpeta 'dist':
    dir dist
    echo.
    echo - Instalador: CCH Player Setup 1.1.0.exe
    echo - Portable: CCH Player 1.1.0.exe
    echo.
    pause
)
