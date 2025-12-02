# Netlify Deployment Guide - RFB Inventory

## ⚠️ Important: Read-Only File System

Netlify (and most serverless platforms) have **read-only file systems**. This means:
- ❌ Cannot write to files on the server
- ❌ Cannot use JSON file as database
- ✅ Must use client-side storage (IndexedDB)
- ✅ Server data is session-only (in-memory)

## How Data Storage Works

### Local Development
```
User → Browser → API → File System (database/rfb-inventory.json)
✓ Data persists across restarts
```

### Netlify Production
```
User → Browser → IndexedDB (client-side storage)
                     ↓
                  API → Memory (session-only)
                  
✓ Data persists in browser
❌ Server data resets on each deployment
```

## Deployment Steps

### 1. Build for Production

```bash
# Clean build
npm run clean
npm run build

# Verify build
ls -la .next
```

### 2. Environment Variables (Netlify Dashboard)

Set these in Netlify → Site settings → Environment variables:

```env
NODE_ENV=production
NETLIFY=true
JWT_SECRET=your-production-secret-key-change-this
```

**Optional**: Pre-populate database
```env
DATABASE_JSON={"users":[{"id":"1","username":"admin","password":"$2a$10$...","role":"admin"}],"raw_materials":[],"purchase_batches":[],"recipes":[],"recipe_ingredients":[],"production_logs":[],"shop_settings":[],"packing_materials":[],"packing_purchases":[],"deleted_items":[]}
```

### 3. Netlify Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 4. Deploy

```bash
# Using Netlify CLI
netlify deploy --prod

# Or push to GitHub
git push origin main
# (Netlify will auto-deploy)
```

## User Experience

### First Time User
1. Visits site
2. Logs in with default credentials (admin/admin123)
3. Data loads from IndexedDB (empty initially)
4. Creates data (materials, recipes, etc.)
5. Data saves to IndexedDB automatically

### Returning User
1. Visits site
2. Logs in
3. Data loads from IndexedDB (their previous data)
4. Continues working
5. Data persists in their browser

### Multiple Devices
- ❌ Data does NOT sync between devices
- Each browser has its own data
- Consider adding cloud database for multi-device sync

## Data Backup & Export

### Manual Backup
1. Go to Settings → Data Backup
2. Click "Download Backup"
3. Save JSON file locally

### Restore Data
1. Go to Settings → Data Backup
2. Click "Upload Backup"
3. Select JSON file
4. Data restores to IndexedDB

## Troubleshooting

### Error: "EROFS: read-only file system"

**Cause**: Code trying to write to server file system

**Solution**: Already fixed! Database uses:
- Memory on server (session-only)
- IndexedDB on client (persistent)

### Error: "Data lost after refresh"

**Cause**: IndexedDB not initialized

**Solution**: 
1. Check browser console for errors
2. Clear browser cache
3. Refresh page
4. Data should persist

### Error: "500 Internal Server Error"

**Cause**: API trying to write to file system

**Solution**: 
1. Check API routes don't use `fs.writeFileSync`
2. All writes should go to memory only
3. Client handles persistence via IndexedDB

## Migration to Real Database (Future)

For production with multiple users, consider:

### Option 1: Supabase (Recommended)
```bash
npm install @supabase/supabase-js
```

### Option 2: MongoDB Atlas
```bash
npm install mongodb
```

### Option 3: PostgreSQL (Neon, Railway)
```bash
npm install pg
```

## Current Limitations

1. **No Multi-Device Sync**
   - Data is per-browser
   - Each device has separate data

2. **No Real-Time Collaboration**
   - Multiple users can't see each other's changes
   - Each user has their own data

3. **Data Loss Risk**
   - If user clears browser data, all data is lost
   - Regular backups recommended

## Best Practices

### For Users
1. **Regular Backups**: Export data weekly
2. **Single Device**: Use one primary device
3. **Don't Clear Browser Data**: Data will be lost

### For Developers
1. **Never use `fs` in API routes** on Netlify
2. **Use memory for server-side data**
3. **Use IndexedDB for client-side persistence**
4. **Add cloud database for production**

## Verification Checklist

After deployment:

- [ ] Site loads without errors
- [ ] Can login with admin/admin123
- [ ] Can create raw materials
- [ ] Can create recipes
- [ ] Can add production logs
- [ ] Data persists after refresh
- [ ] Backup/restore works
- [ ] No "EROFS" errors in console
- [ ] No 500 errors in network tab

## Support

### Common Issues

**Q: Why can't I see data from other devices?**
A: Data is stored in browser. Use backup/restore to transfer.

**Q: Why does server data reset?**
A: Serverless platforms reset on each deployment. Use client storage.

**Q: How to sync between devices?**
A: Add cloud database (Supabase, MongoDB, etc.)

**Q: Is my data safe?**
A: Data is in your browser. Export backups regularly.

---

**Deployment Status**: ✅ Ready for Netlify
**Data Storage**: Client-side (IndexedDB)
**Multi-Device**: ❌ Not supported (use backup/restore)
**Production Ready**: ✅ Yes (with limitations)

**Last Updated**: December 2, 2024

