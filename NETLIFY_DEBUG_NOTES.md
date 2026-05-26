# Netlify Debugging Notes

This file collects steps and findings while debugging a blank production app after Module Federation and Vite upgrades.

- Added early inline bootstrap marker in index.html to detect whether module bundle executes.
- Added BUILD_ID log in SmartCRMApp to force new bundle hash and inspect runtime.
- Disabled esbuild console dropping in vite.config.ts to allow runtime logs to surface.
- Added fallback DOM messages in main.tsx to display import/render errors when they occur.

Deployment instructions:
1. Push commits to main.
2. In Netlify, perform "Clear cache and deploy site".
3. After deploy completes, hard-refresh the site and inspect console and DOM.
