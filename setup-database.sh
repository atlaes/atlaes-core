#!/bin/bash

# Database Setup Script for VBL System
echo "🗄️ Setting up VBL Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

print_status "Starting PostgreSQL database with Docker Compose..."
docker-compose up -d

print_status "Waiting for database to be ready..."
sleep 10

# Check if database is accessible
print_status "Testing database connection..."
if docker exec -it atlaes-postgres-1 psql -U vbl_user -d vbl_development -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database is ready!"
else
    print_warning "Database might not be ready yet. Waiting a bit more..."
    sleep 5
fi

print_status "Running database migrations..."
cd packages/functions
npx drizzle-kit push:pg

if [ $? -eq 0 ]; then
    print_success "Database migrations completed successfully!"
else
    print_error "Database migrations failed. Please check the logs."
    exit 1
fi

print_status "Verifying database schema..."
docker exec -it atlaes-postgres-1 psql -U vbl_user -d vbl_development -c "
SELECT 
    schemaname, 
    tablename, 
    tableowner 
FROM pg_tables 
WHERE schemaname IN ('shared', 'vbl') 
ORDER BY schemaname, tablename;
"

print_success "Database setup completed! 🎉"
print_status "You can now run the VBL system tests with: ./test-vbl-system.sh"
