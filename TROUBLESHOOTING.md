# RFB Inventory - Troubleshooting Guide

## Common Issues & Solutions

### 🔴 Hydration Errors

**Problem**: "Hydration failed because the initial UI does not match what was rendered on the server"

**Cause**: Client-side code (localStorage, window, document) running during server render

**Solution**:
```typescript
// ❌ Wrong
export default function Component() {
  const user = localStorage.getItem('user') // Runs on server!
  return <div>{user}</div>
}

// ✅ Correct
export default function Component() {
  const [user, setUser] = useState(null)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    setUser(localStorage.getItem('user'))
  }, [])
  
  if (!mounted) return <div>Loading...</div>
  return <div>{user}</div>
}
```

**Prevention**:
- Always use `mounted` state for client-only code
- Wrap browser APIs in `typeof window !== 'undefined'` checks
- Use `useEffect` for localStorage access

---

### 🔴 404 Errors

**Problem**: "Failed to load resource: 404 (Not Found)" for static files

**Causes & Solutions**:

1. **Missing Favicon**
   - Ensure `/public/favicon.ico` exists
   - Add to metadata in `app/layout.tsx`

2. **Missing Static Files**
   - Check file exists in `/public` folder
   - Verify correct path (no leading `/public` in URL)

3. **Build Cache Issues**
   ```bash
   rm -rf .next node_modules/.cache
   npm run build
   ```

---

### 🔴 Service Worker Issues

**Problem**: Console logs or errors from Service Worker

**Solution**:
```typescript
// Only register in production
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

**Prevention**:
- Service Worker only for production
- Silent error handling in development
- No console logs in production

---

### 🔴 Build Failures

**Problem**: Build fails with webpack errors

**Common Causes**:

1. **TypeScript Errors**
   ```bash
   npx tsc --noEmit  # Check for errors
   ```

2. **Missing Dependencies**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Cache Issues**
   ```bash
   rm -rf .next node_modules/.cache
   npm run build
   ```

4. **Memory Issues**
   ```bash
   NODE_OPTIONS=--max_old_space_size=4096 npm run build
   ```

---

### 🔴 Authentication Issues

**Problem**: Users can't login or session lost

**Solutions**:

1. **Check JWT Secret**
   - Ensure `JWT_SECRET` is set in environment variables
   - Must be same across deployments

2. **Check localStorage**
   ```javascript
   // In browser console
   localStorage.getItem('rfb_token')
   localStorage.getItem('rfb_user')
   ```

3. **Clear Storage**
   ```javascript
   localStorage.clear()
   // Then login again
   ```

---

### 🔴 Database Issues

**Problem**: Data not saving or loading

**Solutions**:

1. **Check Database Path**
   - Ensure `database/rfb-inventory.json` exists
   - Check write permissions

2. **Verify Database Structure**
   ```bash
   cat database/rfb-inventory.json | jq .
   ```

3. **Reset Database**
   ```bash
   # Backup first!
   cp database/rfb-inventory.json database/backup.json
   # Then reset
   npm run seed-data
   ```

---

### 🔴 Performance Issues

**Problem**: App is slow or unresponsive

**Solutions**:

1. **Check Console Errors**
   - Open browser DevTools
   - Look for red errors

2. **Reduce Data Size**
   - Limit API response size
   - Implement pagination

3. **Optimize Images**
   - Use Next.js Image component
   - Compress images

4. **Clear Cache**
   ```bash
   rm -rf .next node_modules/.cache
   npm run dev
   ```

---

### 🔴 Deployment Issues

**Problem**: App works locally but fails in production

**Solutions**:

1. **Environment Variables**
   - Set all required env vars on hosting platform
   - Check `NODE_ENV=production`

2. **Build Locally First**
   ```bash
   npm run build
   npm run start
   # Test on localhost:3000
   ```

3. **Check Build Logs**
   - Review deployment logs
   - Look for missing dependencies

4. **Verify Node Version**
   - Use same Node version as local
   - Check `package.json` engines field

---

## Emergency Fixes

### Quick Reset
```bash
# Stop server
lsof -ti:3001 | xargs kill -9

# Clean everything
rm -rf .next node_modules/.cache

# Rebuild
npm run build

# Restart
npm run dev
```

### Database Backup
```bash
# Backup
cp database/rfb-inventory.json database/backup-$(date +%Y%m%d-%H%M%S).json

# Restore
cp database/backup-YYYYMMDD-HHMMSS.json database/rfb-inventory.json
```

### Force Clean Install
```bash
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

---

## Debug Mode

Enable detailed logging:

```bash
# In .env.local
DEBUG=*
NODE_ENV=development
```

Check specific issues:
```bash
# TypeScript
npx tsc --noEmit

# ESLint
npm run lint

# Build analysis
npm run build -- --debug
```

---

## Getting Help

1. **Check Documentation**
   - `README.md` - Project overview
   - `DEPLOYMENT_CHECKLIST.md` - Deployment guide
   - `HYDRATION_FIX_SUMMARY.md` - Hydration issues

2. **Check Logs**
   - Browser console (F12)
   - Build logs
   - Server logs

3. **Common Commands**
   ```bash
   npm run dev          # Development server
   npm run build        # Production build
   npm run start        # Production server
   npm run lint         # Check code quality
   ```

---

**Last Updated**: December 2, 2024
**Version**: 1.0.0

