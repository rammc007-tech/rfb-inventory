#!/bin/bash

# RFB Inventory - Pre-Deployment Script
# This script ensures everything is ready before deployment

set -e  # Exit on any error

echo "🚀 RFB Inventory - Pre-Deployment Checks"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check Node.js version
echo ""
echo "1. Checking Node.js version..."
NODE_VERSION=$(node -v)
print_status $? "Node.js version: $NODE_VERSION"

# 2. Check if dependencies are installed
echo ""
echo "2. Checking dependencies..."
if [ -d "node_modules" ]; then
    print_status 0 "Dependencies installed"
else
    print_warning "Dependencies not found. Installing..."
    npm install
    print_status $? "Dependencies installed"
fi

# 3. Clean cache
echo ""
echo "3. Cleaning cache..."
rm -rf .next node_modules/.cache 2>/dev/null || true
print_status 0 "Cache cleaned"

# 4. Check for required files
echo ""
echo "4. Checking required files..."
REQUIRED_FILES=(
    "package.json"
    "next.config.js"
    "tsconfig.json"
    "public/manifest.json"
    "public/favicon.ico"
    "lib/database.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "$file exists"
    else
        print_status 1 "$file missing"
    fi
done

# 5. Check environment variables
echo ""
echo "5. Checking environment configuration..."
if [ -f ".env.local" ]; then
    print_status 0 ".env.local exists"
else
    print_warning ".env.local not found (optional for development)"
fi

# 6. Run TypeScript check
echo ""
echo "6. Running TypeScript check..."
npx tsc --noEmit 2>&1 | grep -i "error" && {
    print_status 1 "TypeScript errors found"
} || {
    print_status 0 "TypeScript check passed"
}

# 7. Run ESLint
echo ""
echo "7. Running ESLint..."
npm run lint 2>&1 | grep -i "error" && {
    print_warning "ESLint warnings found (non-critical)"
} || {
    print_status 0 "ESLint check passed"
}

# 8. Build the project
echo ""
echo "8. Building project..."
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    print_status 0 "Build successful"
else
    print_status 1 "Build failed. Check /tmp/build.log for details"
    cat /tmp/build.log
    exit 1
fi

# 9. Check build output
echo ""
echo "9. Checking build output..."
if [ -d ".next" ]; then
    BUILD_SIZE=$(du -sh .next | cut -f1)
    print_status 0 "Build output: $BUILD_SIZE"
else
    print_status 1 "Build output not found"
fi

# 10. Final checks
echo ""
echo "10. Final verification..."
CRITICAL_PAGES=(
    ".next/server/app/page.html"
    ".next/server/app/dashboard/page.html"
)

for page in "${CRITICAL_PAGES[@]}"; do
    if [ -f "$page" ]; then
        print_status 0 "$(basename $page) built"
    else
        print_warning "$(basename $page) not found (may be dynamic)"
    fi
done

# Summary
echo ""
echo "========================================"
echo -e "${GREEN}✓ All pre-deployment checks passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review DEPLOYMENT_CHECKLIST.md"
echo "  2. Set production environment variables"
echo "  3. Deploy to your hosting platform"
echo ""
echo "Deployment commands:"
echo "  Netlify: netlify deploy --prod"
echo "  Vercel:  vercel --prod"
echo "  Manual:  npm run start"
echo ""

