#!/bin/bash
set -e

echo "========================================="
echo "  Setting up Gynecology Practice App"
echo "  in Ubuntu WSL"
echo "========================================="
echo ""

# Update system
echo "📦 Updating package lists..."
sudo apt update -qq

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install build essentials if needed
echo "📦 Installing build essentials..."
sudo apt install -y build-essential

# Create project directory in WSL home
PROJECT_DIR=~/gynecology-practice-app
echo ""
echo "📁 Setting up project at: $PROJECT_DIR"

# Copy project files from Windows to WSL
echo "📋 Copying project files from Windows..."
mkdir -p "$PROJECT_DIR"
cp -r /mnt/c/Users/sabba/gynecology-practice-app/* "$PROJECT_DIR/" 2>/dev/null || true

cd "$PROJECT_DIR"

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
npx prisma generate

# Back to root
cd "$PROJECT_DIR"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

cd "$PROJECT_DIR"

echo ""
echo "========================================="
echo "✅ Setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Make sure Docker Desktop is running"
echo "2. Start the database: docker-compose up -d"
echo "3. Run migrations: cd backend && npx prisma migrate dev"
echo "4. Start backend: cd backend && npm run start:dev"
echo "5. Start frontend: cd frontend && npm run dev"
echo ""
echo "Project location: $PROJECT_DIR"
