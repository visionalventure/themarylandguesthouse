#!/bin/bash

# ============================================================
# Maryland Guesthouse ERP - Development Setup Script
# ============================================================

set -e

echo "┌─────────────────────────────────────────────────────────┐"
echo "│   Maryland Guesthouse ERP - Development Setup           │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""

# Check prerequisites
check_command() {
  if ! command -v $1 &> /dev/null; then
    echo "❌ $1 is required but not installed."
    exit 1
  fi
  echo "✅ $1 found: $(${1} --version 2>&1 | head -1)"
}

echo "📋 Checking prerequisites..."
check_command node
check_command npm
check_command docker

# Check Node version
NODE_MAJOR=$(node --version | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "❌ Node.js 22+ required. Found: $(node --version)"
  exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env created from .env.example"
  echo "⚠️  Please update .env with your credentials before continuing"
else
  echo "✅ .env already exists"
fi

echo ""
echo "🐳 Starting development infrastructure (PostgreSQL + Redis)..."
docker compose -f docker-compose.dev.yml up -d

echo "⏳ Waiting for database to be ready..."
sleep 5

echo ""
echo "🗄️  Running database migrations..."
cd packages/database
npx prisma generate
npx prisma migrate dev --name init
cd ../..

echo ""
echo "🌱 Seeding database..."
cd packages/database
npx ts-node --transpile-only prisma/seed.ts
cd ../..

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│   ✅ Setup Complete!                                    │"
echo "│                                                         │"
echo "│   Start development:                                    │"
echo "│     npm run dev                                         │"
echo "│                                                         │"
echo "│   Services:                                             │"
echo "│     🌐 Web:  http://localhost:3000                      │"
echo "│     🔌 API:  http://localhost:3001/api                  │"
echo "│     📚 Docs: http://localhost:3001/api/docs             │"
echo "│                                                         │"
echo "│   Login:                                                │"
echo "│     Email:    admin@marylandguesthouse.com              │"
echo "│     Password: Admin@123!                                │"
echo "└─────────────────────────────────────────────────────────┘"
