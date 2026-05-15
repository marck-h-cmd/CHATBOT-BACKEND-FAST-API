@echo off
echo ==============================================
echo  Sylia AI - Initial Setup (Docker)
echo ==============================================

echo [1/3] Preparando variables de entorno del backend...
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo - Archivo backend\.env creado desde el ejemplo.
    ) else (
        echo - ADVERTENCIA: No se encontro backend\.env.example
    )
) else (
    echo - backend\.env ya existe.
)

echo [2/3] Preparando variables de entorno del frontend...
if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        copy "frontend\.env.example" "frontend\.env" >nul
        echo - Archivo frontend\.env creado desde el ejemplo.
    ) else (
        echo - ADVERTENCIA: No se encontro frontend\.env.example
    )
) else (
    echo - frontend\.env ya existe.
)

echo [3/3] Levantando contenedores con Docker Compose...
docker-compose up -d --build

echo ==============================================
echo SETUP COMPLETADO EXITOSAMENTE
echo ==============================================
echo.
echo La aplicacion ahora esta corriendo en Docker:
echo - Frontend (App): http://localhost:5173
echo - Backend (API): http://localhost:8000
echo - Documentacion API: http://localhost:8000/docs
echo - Base de datos (PgAdmin): http://localhost:5050
echo.
echo Nota: Si quieres ver los logs en vivo, ejecuta: docker-compose logs -f
pause
