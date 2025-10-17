#!/bin/bash

# VBL Platform Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up VBL Unified Platform..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "npm install -g pnpm"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🐳 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🗄️ Running database migrations..."
pnpm db:migrate

echo "✅ Setup complete!"
echo ""
echo "🎉 You can now start development:"
echo "  pnpm dev"
echo ""
echo "📊 Available services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo "  - Database Studio: pnpm db:studio"
echo ""
echo "🛠️ Useful commands:"
echo "  - pnpm dev          # Start all services"
echo "  - pnpm docker:up    # Start Docker services"
echo "  - pnpm docker:down  # Stop Docker services"
echo "  - pnpm db:studio    # Open database GUI"
echo "  - pnpm reset        # Reset development environment"
