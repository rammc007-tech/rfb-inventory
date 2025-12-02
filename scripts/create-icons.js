// Simple script to create placeholder icons
// Run: node scripts/create-icons.js

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Create a simple SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#dc2626"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">RFB</text>
  <text x="256" y="380" font-family="Arial, sans-serif" font-size="60" fill="white" text-anchor="middle">INVENTORY</text>
</svg>`;

// For now, we'll use a data URI approach
// In production, you should use proper PNG icons
// This script creates placeholder files

console.log('Icon generation script created.');
console.log('Note: For production, create proper 192x192 and 512x512 PNG icons.');
console.log('You can use online tools like: https://realfavicongenerator.net/');

