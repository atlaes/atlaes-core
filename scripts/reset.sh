#!/bin/bash

# VBL Platform Reset Script
# This script resets the development environment

set -e

echo "🔄 Resetting VBL Platform development environment..."

echo "🛑 Stopping Docker services..."
docker-compose down -v

echo "🗑️ Cleaning up..."
pnpm clean

echo "📦 Reinstalling dependencies..."
pnpm install

echo "🐳 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🗄️ Running database migrations..."
pnpm db:migrate

echo "✅ Reset complete!"
echo ""
echo "🎉 Development environment has been reset and is ready to use."
