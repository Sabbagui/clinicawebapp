@echo off
echo ========================================
echo   Starting Gynecology Practice App
echo   in Docker Development Environment
echo ========================================
echo.

echo Step 1: Building development containers...
docker-compose build

echo.
echo Step 2: Starting all services...
docker-compose up -d

echo.
echo Step 3: Waiting for database to be ready...
timeout /t 10 /nobreak > nul

echo.
echo Step 4: Running database migrations...
docker-compose exec backend-dev npx prisma migrate dev --name init

echo.
echo Step 5: Seeding database with admin user...
docker-compose exec backend-dev npx prisma db seed

echo.
echo ========================================
echo   Application Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo Swagger:  http://localhost:3001/api/docs
echo PgAdmin:  http://localhost:5050
echo.
echo Login credentials:
echo   Email:    admin@example.com
echo   Password: Admin123!
echo.
echo To view logs:    docker-compose logs -f
echo To stop:         docker-compose down
echo ========================================
pause
