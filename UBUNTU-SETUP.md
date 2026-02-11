# Ubuntu Setup Guide for Gynecology Practice App

## Prerequisites
- Ubuntu terminal must be working (able to type commands)
- Docker Desktop must be running on Windows

## Step-by-Step Setup

### 1. Update System and Install Node.js 20.x

```bash
# Update package lists
sudo apt update

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build essentials
sudo apt install -y build-essential

# Verify installation
node --version
npm --version
```

### 2. Copy Project Files from Windows

```bash
# Create project directory in Ubuntu home
mkdir -p ~/gynecology-practice-app

# Copy all files from Windows
cp -r /mnt/c/Users/sabba/gynecology-practice-app/* ~/gynecology-practice-app/

# Navigate to project
cd ~/gynecology-practice-app
```

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
npx prisma generate

# Install frontend dependencies
cd ../frontend
npm install

# Return to project root
cd ~/gynecology-practice-app
```

### 4. Configure Environment

```bash
# Backend environment is already configured
# Verify .env file exists
cat backend/.env
```

### 5. Start Services

```bash
# Make sure Docker Desktop is running on Windows first!

# Start PostgreSQL database (from project root)
docker-compose up -d

# Wait a few seconds for database to start
sleep 5

# Run database migrations
cd backend
npx prisma migrate dev

# Seed database with initial admin user
npx prisma db seed

# Start backend (in development mode with watch)
npm run start:dev
```

In a new Ubuntu terminal window:

```bash
# Navigate to project
cd ~/gynecology-practice-app/frontend

# Start frontend
npm run dev
```

## Verify Everything Works

1. Backend should be running on: http://localhost:3001
2. Frontend should be running on: http://localhost:3000
3. Swagger docs should be at: http://localhost:3001/api/docs

## Test Authentication

Try logging in via Swagger with:
- Email: admin@example.com
- Password: Admin123!

If login succeeds, the authentication issue is resolved! 🎉

## Troubleshooting

### If Docker commands fail:
Make sure Docker Desktop is running and WSL integration is enabled:
- Open Docker Desktop
- Go to Settings → Resources → WSL Integration
- Enable integration with your Ubuntu distribution

### If Prisma migration fails:
The database might not be ready yet. Wait 10-15 seconds and try again:
```bash
docker ps  # Verify gynecology-practice-db container is running
npx prisma migrate dev
```

### If port 3001 or 3000 is in use:
Stop any running instances from Windows:
```bash
# In Windows PowerShell/CMD, find and kill processes
netstat -ano | findstr :3001
netstat -ano | findstr :3000
# Then use taskkill /PID <process_id> /F
```
