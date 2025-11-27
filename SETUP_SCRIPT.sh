#!/bin/bash

# RFB Inventory - Deployment Setup Script
# This script will help set up everything for deployment

echo "🚀 RFB Inventory - Deployment Setup"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the project root."
    exit 1
fi

echo "✅ Found project files"
echo ""

# Check Git status
echo "📦 Checking Git status..."
if [ -d ".git" ]; then
    echo "✅ Git repository already initialized"
    git status --short
else
    echo "❌ Git repository not initialized"
    exit 1
fi

echo ""
echo "📝 Current Git Configuration:"
echo "User Name: $(git config user.name || echo 'Not set')"
echo "User Email: $(git config user.email || echo 'Not set')"
echo ""

# Check for GitHub remote
if git remote -v | grep -q "origin"; then
    echo "✅ GitHub remote already configured:"
    git remote -v
else
    echo "⚠️  GitHub remote not configured yet"
    echo ""
    echo "To add GitHub remote, run:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/rfb-inventory.git"
fi

echo ""
echo "===================================="
echo "✅ Setup check complete!"
echo ""
echo "Next steps:"
echo "1. Create repository on GitHub (https://github.com/new)"
echo "2. Add remote: git remote add origin YOUR_REPO_URL"
echo "3. Push: git push -u origin main"
echo ""

