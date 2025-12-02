# RFB Inventory - Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Common Issues & Solutions

### 1. Hydration Errors
**Problem**: "Hydration failed because the initial UI does not match"

**Solution**: Already fixed with `mounted` state pattern
- All client-only components check `mounted` state
- Server renders placeholders
- Client renders actual content after mount

**Prevention**: Always use `mounted` pattern for:
- localStorage access
- window/document APIs
- Browser-only features

### 2. 404 Errors
**Problem**: Missing favicon, static files not found

**Solution**: 
- ✅ favicon.ico created in `/public`
- ✅ Proper caching headers in `next.config.js`
- ✅ robots.txt added

**Prevention**: 
- Keep all static files in `/public` folder
- Never delete `.next` folder manually during development

### 3. Console Warnings
**Problem**: Service Worker logs, React DevTools suggestions

**Solution**:
- ✅ Service Worker only registers in production
- ✅ Console logs suppressed in development
- ✅ Webpack noise reduced

**Prevention**:
- Use `process.env.NODE_ENV` checks
- Keep console.log only for errors/warnings

### 4. Build Errors
**Problem**: "Cannot find module" or permission errors

**Solution**:
```bash
# Clean everything
rm -rf .next node_modules/.cache

# Reinstall if needed
npm install

# Build again
npm run build
```

**Prevention**:
- Run `npm run dev:clean` if you see build issues
- Don't modify `node_modules` manually

## Development Commands

```bash
# Clean development (removes cache)
npm run dev:clean

# Fix issues (clean + rebuild)
npm run fix

# Test production build locally
npm run build && npm start
```

## File Structure

```
RFB inventory/
├── app/                    # Next.js pages
├── components/             # React components
├── contexts/              # React contexts
├── lib/                   # Utilities
├── public/                # Static files
├── database/              # JSON database
├── .env.development       # Dev environment
├── .env.production        # Prod environment
└── next.config.js         # Next.js config
```

## Important Files

### next.config.js
- Webpack configuration
- Caching headers
- Console suppression

### components/DashboardLayout.tsx
- Uses `mounted` state
- Prevents hydration errors
- Client-only rendering

### contexts/AuthContext.tsx
- Authentication state
- localStorage handling
- Mounted state pattern

### components/ServiceWorkerRegistration.tsx
- PWA support
- Production-only registration
- Silent operation

## Best Practices

### 1. Always Check `mounted` State
```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

return mounted ? <ActualContent /> : <Placeholder />
```

### 2. Handle localStorage Safely
```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('key')
    // Use data
  }
}, [])
```

### 3. Suppress Unnecessary Logs
```typescript
// Development only
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info')
}
```

### 4. Clean Build Before Deployment
```bash
rm -rf .next node_modules/.cache
npm run build
```

## Troubleshooting

### Server Won't Start
```bash
# Kill existing process
lsof -ti:3001 | xargs kill -9

# Start fresh
npm run dev
```

### Hydration Errors Persist
1. Check all components use `mounted` state
2. Verify no direct localStorage access in render
3. Clear browser cache and hard refresh

### Build Fails
1. Check for TypeScript errors: `npm run lint`
2. Clean and rebuild: `npm run fix`
3. Check file permissions

### Console Still Shows Errors
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check `.env.development` is loaded

## Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] No console errors in browser
- [ ] Test all pages work
- [ ] Check mobile responsiveness
- [ ] Verify authentication works
- [ ] Test PWA install (production only)
- [ ] Update `.env.production` with real secrets
- [ ] Push to GitHub
- [ ] Deploy to Netlify

## Environment Variables

### Development (.env.development)
- NODE_ENV=development
- NEXT_TELEMETRY_DISABLED=1
- DATABASE_URL=file:./database/rfb-inventory.json
- JWT_SECRET=dev-secret-key

### Production (.env.production)
- NODE_ENV=production
- NEXT_TELEMETRY_DISABLED=1
- DATABASE_URL=file:./database/rfb-inventory.json
- JWT_SECRET=**CHANGE THIS**
- GENERATE_SOURCEMAP=false

## Support

If you encounter issues not covered here:
1. Check browser console for specific errors
2. Review `HYDRATION_FIX_SUMMARY.md`
3. Check Next.js documentation
4. Clear all caches and rebuild

## Last Updated
December 2, 2024

