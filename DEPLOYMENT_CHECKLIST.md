# RFB Inventory - Deployment Checklist

## Pre-Deployment Checks

### 1. Clean Build Test
```bash
# Always run before deployment
rm -rf .next node_modules/.cache
npm run build
```

### 2. Environment Variables
- [ ] `.env.local` configured for development
- [ ] Production environment variables set on hosting platform
- [ ] `JWT_SECRET` changed from default
- [ ] `DATABASE_URL` configured correctly

### 3. Console Errors Check
- [ ] No hydration errors in browser console
- [ ] No 404 errors for static files
- [ ] No React warnings
- [ ] Service Worker only in production

### 4. Performance Check
- [ ] All pages load without errors
- [ ] Images optimized
- [ ] No unnecessary console logs
- [ ] Webpack noise minimized

### 5. Security Check
- [ ] No sensitive data in client-side code
- [ ] API routes properly secured
- [ ] User authentication working
- [ ] Role-based access control tested

## Common Issues & Solutions

### Issue: Hydration Errors
**Solution**: All client-only code wrapped with `mounted` state
```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
{mounted && <ClientOnlyComponent />}
```

### Issue: 404 Favicon
**Solution**: Favicon exists at `/public/favicon.ico` with proper metadata

### Issue: Service Worker Logs
**Solution**: Service Worker only registers in production mode

### Issue: Console Noise
**Solution**: `next.config.js` has `infrastructureLogging: { level: 'error' }`

## Deployment Commands

### Netlify
```bash
# Build command
npm run build

# Publish directory
.next

# Environment variables (set in Netlify dashboard)
NODE_ENV=production
JWT_SECRET=your-production-secret
```

### Vercel
```bash
# Vercel will auto-detect Next.js
vercel --prod
```

### Manual Server
```bash
npm run build
npm run start
```

## Post-Deployment Verification

- [ ] Visit production URL
- [ ] Check browser console (should be clean)
- [ ] Test login functionality
- [ ] Test all CRUD operations
- [ ] Verify PWA install prompt works
- [ ] Test on mobile devices
- [ ] Check all navigation links
- [ ] Verify print functionality
- [ ] Test backup/restore features

## Maintenance

### Regular Tasks
1. Check error logs weekly
2. Update dependencies monthly
3. Backup database regularly
4. Monitor performance metrics
5. Review user feedback

### Emergency Rollback
```bash
# If deployment fails, rollback to previous version
git revert HEAD
git push origin main
```

## Support

For issues, check:
1. `HYDRATION_FIX_SUMMARY.md` - Hydration error solutions
2. Browser console - Error messages
3. Build logs - Compilation errors
4. Network tab - API failures

---

**Last Updated**: December 2, 2024
**Version**: 1.0.0
**Status**: Production Ready ✅

