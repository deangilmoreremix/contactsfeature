const fs = require('fs');
const path = require('path');

(async function() {
  try {
    const buildId = Date.now().toString();
    const distDir = path.resolve(__dirname, '..', 'dist');

    // 1) Write force-new-deploy file
    const touchPath = path.join(distDir, `force-new-deploy-${buildId}.txt`);
    fs.writeFileSync(touchPath, new Date().toISOString());
    console.log('[postbuild] wrote', touchPath);

    // 2) Inject build-id meta into index.html
    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      let indexHtml = fs.readFileSync(indexPath, 'utf8');
      // Remove any existing x-build-id meta
      indexHtml = indexHtml.replace(/<meta name="x-build-id" content="[^"]*">/g, '');
      // Insert meta just before </head>
      indexHtml = indexHtml.replace('</head>', `  <meta name="x-build-id" content="${buildId}">\n</head>`);
      fs.writeFileSync(indexPath, indexHtml, 'utf8');
      console.log('[postbuild] injected x-build-id into index.html', buildId);
    } else {
      console.warn('[postbuild] index.html not found at', indexPath);
    }

    // 3) Update sw.js cache names to include build id
    const swPath = path.join(distDir, 'sw.js');
    if (fs.existsSync(swPath)) {
      let sw = fs.readFileSync(swPath, 'utf8');
      // Replace CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE occurrences
      sw = sw.replace(/const CACHE_NAME = 'contacts-app-[^']*';/g, `const CACHE_NAME = 'contacts-app-${buildId}';`);
      sw = sw.replace(/const STATIC_CACHE = 'contacts-static-[^']*';/g, `const STATIC_CACHE = 'contacts-static-${buildId}';`);
      sw = sw.replace(/const DYNAMIC_CACHE = 'contacts-dynamic-[^']*';/g, `const DYNAMIC_CACHE = 'contacts-dynamic-${buildId}';`);
      // Fallback: if original constants are without -<id>, replace those too
      sw = sw.replace(/const CACHE_NAME = 'contacts-app-v1';/g, `const CACHE_NAME = 'contacts-app-${buildId}';`);
      sw = sw.replace(/const STATIC_CACHE = 'contacts-static-v1';/g, `const STATIC_CACHE = 'contacts-static-${buildId}';`);
      sw = sw.replace(/const DYNAMIC_CACHE = 'contacts-dynamic-v1';/g, `const DYNAMIC_CACHE = 'contacts-dynamic-${buildId}';`);

      fs.writeFileSync(swPath, sw, 'utf8');
      console.log('[postbuild] updated sw.js cache names with buildId', buildId);
    } else {
      console.warn('[postbuild] sw.js not found at', swPath);
    }

    // 4) Write build environment diagnostics (presence of VITE/SUPABASE env vars)
    try {
      const envReport = {
        VITE_SUPABASE_URL_present: !!process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY_present: !!process.env.VITE_SUPABASE_ANON_KEY,
        SUPABASE_URL_present: !!process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY_present: !!process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        TIMESTAMP: new Date().toISOString(),
      };
      const envReportPath = path.join(distDir, `build-env-report-${buildId}.json`);
      fs.writeFileSync(envReportPath, JSON.stringify(envReport, null, 2));
      console.log('[postbuild] wrote env report', envReportPath, envReport);
    } catch (e) {
      console.warn('[postbuild] failed to write env report', e);
    }

    // 5) Copy dist -> public_dist so Netlify publish dir has the built files
    try {
      const publicDir = path.resolve(__dirname, '..', 'public_dist');
      if (fs.existsSync(publicDir)) {
        fs.rmSync(publicDir, { recursive: true, force: true });
      }
      fs.mkdirSync(publicDir, { recursive: true });

      function copyDir(src, dest) {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }

      copyDir(distDir, publicDir);
      console.log('[postbuild] copied dist to public_dist');
    } catch (e) {
      console.warn('[postbuild] failed to copy dist to public_dist', e);
    }

    // 6) Fix index.html script paths for Netlify hosting
    // Vite's base: '/assets/' puts JS at /assets/main-xxx.js, but Netlify serves from root
    const publicIndexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(publicIndexPath)) {
      let publicIndexHtml = fs.readFileSync(publicIndexPath, 'utf8');
      // Change /assets/ to assets/ (relative path)
      publicIndexHtml = publicIndexHtml.replace(/src="\/assets\//g, 'src="assets/');
      fs.writeFileSync(publicIndexPath, publicIndexHtml, 'utf8');
      console.log('[postbuild] fixed index.html paths for Netlify');
    }

    console.log('[postbuild] done');
  } catch (err) {
    console.error('[postbuild] error', err);
    process.exit(1);
  }
})();
