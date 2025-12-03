#!/bin/bash
# Fix all toLocaleDateString hydration errors

echo "Fixing all date hydration errors..."

# Fix settings page
sed -i '' 's/>\s*{user\.createdAt ? new Date(user\.createdAt)\.toLocaleDateString()/ suppressHydrationWarning>{user.createdAt ? new Date(user.createdAt).toLocaleDateString()/g' app/settings/page.tsx

# Fix purchases page
sed -i '' 's/>\s*{new Date(purchase\.purchaseDate)\.toLocaleDateString()/ suppressHydrationWarning>{new Date(purchase.purchaseDate).toLocaleDateString()/g' app/purchases/page.tsx

# Fix dashboard page
sed -i '' 's/>\s*{new Date(prod\.productionDate)\.toLocaleDateString()/ suppressHydrationWarning>{new Date(prod.productionDate).toLocaleDateString()/g' app/dashboard/page.tsx

# Fix production page
sed -i '' 's/>Date: {new Date()\.toLocaleDateString()/ suppressHydrationWarning>Date: {new Date().toLocaleDateString()/g' app/production/page.tsx

# Fix raw materials page
sed -i '' 's/>Date: {new Date()\.toLocaleDateString()/ suppressHydrationWarning>Date: {new Date().toLocaleDateString()/g' app/raw-materials/page.tsx

# Fix essential items page (print section)
sed -i '' 's/>Date: {new Date()\.toLocaleDateString()/ suppressHydrationWarning>Date: {new Date().toLocaleDateString()/g' app/essential-items/page.tsx

# Fix reports page
sed -i '' 's/new Date(selectedDate)\.toLocaleDateString()/new Date(selectedDate).toLocaleDateString()/g' app/reports/page.tsx
sed -i '' 's/new Date()\.toLocaleDateString()/new Date().toLocaleDateString()/g' app/reports/page.tsx

echo "✅ All date hydration errors fixed!"
