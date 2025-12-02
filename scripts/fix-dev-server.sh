#!/bin/bash
# Fix Next.js dev server 404 errors

echo "🔧 Fixing Next.js dev server issues..."

# Kill any existing dev server
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Clear all caches
echo "Clearing caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache

# Rebuild
echo "Rebuilding..."
npm run build

# Start dev server
echo "Starting dev server..."
npm run dev

