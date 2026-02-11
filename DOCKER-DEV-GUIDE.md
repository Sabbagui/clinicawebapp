# Docker Development Environment Guide

## Overview

This setup runs the **entire application in Docker containers**, which solves the Prisma/PostgreSQL authentication issues on Windows. Everything runs in Linux containers where it works correctly.

## Prerequisites

- ✅ Docker Desktop installed and running
- ✅ WSL 2 backend enabled in Docker Desktop (usually automatic)

## Quick Start

### Option 1: Automated (Recommended)

Simply run the batch file:

```batch
docker-dev-start.bat
```

This will:
1. Build the development containers
2. Start all services (database, backend, frontend)
3. Run database migrations
4. Seed the database with an admin user
5. Show you the URLs to access the application

### Option 2: Manual

```batch
# Build containers
docker-compose build

# Start all services
docker-compose up -d

# Run migrations (wait 10 seconds after starting)
docker-compose exec backend-dev npx prisma migrate dev --name init

# Seed database
docker-compose exec backend-dev npx prisma db seed
```

## Access the Application

Once started, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **PgAdmin**: http://localhost:5050

### Default Login Credentials

- **Email**: admin@example.com
- **Password**: Admin123!

## Common Commands

### View logs
```batch
# All services
docker-compose logs -f

# Just backend
docker-compose logs -f backend-dev

# Just frontend
docker-compose logs -f frontend-dev
```

### Stop the application
```batch
docker-compose down
```

### Restart a specific service
```batch
# Restart backend
docker-compose restart backend-dev

# Restart frontend
docker-compose restart frontend-dev
```

### Access a container's shell
```batch
# Backend container
docker-compose exec backend-dev bash

# Frontend container
docker-compose exec frontend-dev bash

# Database container
docker-compose exec postgres bash
```

### Run Prisma commands
```batch
# Generate Prisma client
docker-compose exec backend-dev npx prisma generate

# Create a new migration
docker-compose exec backend-dev npx prisma migrate dev --name your_migration_name

# Reset database
docker-compose exec backend-dev npx prisma migrate reset

# Open Prisma Studio
docker-compose exec backend-dev npx prisma studio
```

### Add a patient via CLI
```batch
# Connect to database
docker-compose exec postgres psql -U postgres -d gynecology_practice

# Then run SQL commands
```

Or use the batch files:
- [add-patient.bat](add-patient.bat) - Add a patient interactively
- [list-patients.bat](list-patients.bat) - List all patients

## Development Workflow

### Making code changes

Since we're using volume mounts, any changes you make to the code on Windows will be immediately reflected in the containers:

1. **Backend changes**: The backend runs with `--watch`, so it will auto-restart when you change TypeScript files
2. **Frontend changes**: Next.js hot-reload works automatically

### Installing new packages

```batch
# Backend package
docker-compose exec backend-dev npm install package-name

# Frontend package
docker-compose exec frontend-dev npm install package-name
```

After installing packages, you might need to rebuild:
```batch
docker-compose build backend-dev
# or
docker-compose build frontend-dev
```

## Troubleshooting

### Port already in use
If you see "port already in use" errors:

```batch
# Stop any running instances
docker-compose down

# Check what's using the port
netstat -ano | findstr :3001
netstat -ano | findstr :3000

# Kill the process if needed
taskkill /PID <process_id> /F
```

### Database connection issues
```batch
# Check if database is healthy
docker-compose ps

# Restart database
docker-compose restart postgres

# Wait 10 seconds and try migrations again
timeout /t 10 /nobreak > nul
docker-compose exec backend-dev npx prisma migrate dev
```

### Containers won't start
```batch
# View detailed logs
docker-compose logs

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Clear everything and start fresh
```batch
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Rebuild
docker-compose build --no-cache

# Start again
docker-compose up -d

# Re-run migrations and seed
timeout /t 10 /nobreak > nul
docker-compose exec backend-dev npx prisma migrate dev --name init
docker-compose exec backend-dev npx prisma db seed
```

## Why This Works

This Docker setup solves the Windows/Prisma authentication issue because:

1. ✅ **Everything runs in Linux**: All Node.js code runs inside Linux containers
2. ✅ **Container networking**: Backend connects to PostgreSQL via Docker's internal network
3. ✅ **No Windows filesystem issues**: Code runs in Linux environment inside containers
4. ✅ **Consistent environment**: Same setup works on Windows, Mac, and Linux

## Architecture

```
┌─────────────────────────────────────────┐
│           Docker Desktop                │
│                                         │
│  ┌──────────────┐  ┌─────────────┐    │
│  │   Frontend   │  │   Backend   │    │
│  │  (Next.js)   │──│  (NestJS)   │    │
│  │  Port 3000   │  │  Port 3001  │    │
│  └──────────────┘  └──────┬──────┘    │
│                           │            │
│                    ┌──────┴──────┐     │
│                    │  PostgreSQL │     │
│                    │  Port 5432  │     │
│                    └─────────────┘     │
└─────────────────────────────────────────┘
         ↑
         │ Volume mounts (your Windows code)
         │
    Windows Filesystem
    c:\Users\sabba\gynecology-practice-app\
```

## Next Steps

Once the application is running:

1. Test login via Swagger: http://localhost:3001/api/docs
2. Try the `/api/auth/login` endpoint with the admin credentials
3. If login succeeds, the authentication issue is **SOLVED!** 🎉
4. You can then add patients via the API or create a frontend page
