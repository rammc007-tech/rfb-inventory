# Netlify Deployment Guide - RFB Inventory

## ✅ Build Status: READY FOR DEPLOYMENT

The project has been successfully built and is ready for Netlify deployment.

## Quick Deployment Steps

### Option 1: Deploy via Netlify Dashboard (Recommended)

1. **Go to Netlify**: https://app.netlify.com
2. **Add New Site** → **Import an existing project**
3. **Connect to Git** (GitHub/GitLab/Bitbucket)
4. **Build Settings** (Auto-detected):
   - Build command: `npm run build`
   - Publish directory: `.next` (handled by @netlify/plugin-nextjs)
5. **Deploy Site**

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
cd "/Users/ramelumalai/RFB inventory"
netlify init
netlify deploy --prod
```

## Important Notes

### ⚠️ Database Storage
This project uses a **JSON file-based database** (`database/rfb-inventory.json`). 

**For Netlify Serverless Functions:**
- The database file will be included in the deployment (configured in `netlify.toml`)
- Data will persist across function invocations within the same deployment
- **Important**: For production use, consider migrating to a cloud database (PostgreSQL, MongoDB, etc.)

### Environment Variables (Optional)
If you need environment variables, add them in Netlify Dashboard:
- Go to **Site settings** → **Environment variables**
- Add variables like:
  - `JWT_SECRET` (if not already set in code)
  - Any other required variables

## Configuration Files

### ✅ `netlify.toml` (Already Configured)
```toml
[build]
  command = "npm run build"
  
[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  node_bundler = "esbuild"
  included_files = ["database/**"]
```

### ✅ `next.config.js` (Updated for Netlify)
- Removed `output: 'standalone'` (Docker-specific)
- Ready for Netlify deployment

## Post-Deployment Checklist

- [ ] Site is accessible
- [ ] Login functionality works
- [ ] Database file is accessible
- [ ] All pages load correctly
- [ ] API routes are working

## Troubleshooting

### Build Fails
- Check Node version (should be 20)
- Verify all dependencies are in `package.json`
- Check build logs in Netlify dashboard

### Database Issues
- Verify `database/` folder is included in deployment
- Check file permissions
- Ensure database file exists

### API Routes Not Working
- Check Netlify function logs
- Verify `@netlify/plugin-nextjs` is installed
- Check function timeout settings

## Support

If you encounter issues:
1. Check Netlify build logs
2. Check Netlify function logs
3. Verify environment variables
4. Test locally with `npm run build && npm start`

---

**Status**: ✅ Ready for deployment
**Build**: ✅ Successful
**Configuration**: ✅ Complete

