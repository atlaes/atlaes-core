#!/bin/bash

# VBL System Test Script
echo "🚀 Starting VBL System Test..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Navigate to the project root
cd "$(dirname "$0")"

print_status "Installing dependencies..."
pnpm install

print_status "Building the project..."
pnpm build

print_status "Starting the development server in the background..."
cd packages/functions
pnpm dev &
SERVER_PID=$!

# Wait for server to start
print_status "Waiting for server to start..."
sleep 10

# Check if server is running
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    print_error "Server failed to start. Please check the logs."
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

print_success "Server is running on http://localhost:3001"

# Run the API tests
print_status "Running VBL API tests..."
cd ../..
node packages/functions/test-vbl-api.js

# Capture test result
TEST_RESULT=$?

# Stop the server
print_status "Stopping the development server..."
kill $SERVER_PID 2>/dev/null

# Check test results
if [ $TEST_RESULT -eq 0 ]; then
    print_success "All tests passed! 🎉"
    exit 0
else
    print_error "Some tests failed. Please check the output above."
    exit 1
fi
