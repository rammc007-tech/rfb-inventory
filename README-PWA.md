# PWA Setup Guide

## Offline Support & Install Feature

This app now supports:
- ✅ Offline functionality via Service Worker
- ✅ Install as App button
- ✅ PWA Manifest for mobile devices

## Creating Icons

To add proper icons, you need to create:

1. `public/icon-192.png` - 192x192 pixels
2. `public/icon-512.png` - 512x512 pixels

You can:
- Use online tools like https://realfavicongenerator.net/
- Or create simple colored squares with "RFB" text
- Use any image editor to create PNG files

Once icons are added, the "Install App" button will appear in supported browsers.

## Testing Offline Mode

1. Open the app in Chrome/Edge
2. Open DevTools (F12) → Application tab
3. Check "Offline" checkbox
4. The app should still work with cached pages

## Browser Support

- Chrome/Edge: Full PWA support with install prompt
- Safari (iOS): Can "Add to Home Screen"
- Firefox: Basic offline support

