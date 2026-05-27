import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import path from "path";
import fs from "fs";

// === MODULE FEDERATION CONFIG (Vite 8 + Rolldown compatible) ===
// Re-enabled + patched to support loading inside SmartCRM host (app.smartcrm.vip)
// Workaround for https://github.com/originjs/vite-plugin-federation/issues/740

/**
 * Post-process remoteEntry.js after build to replace broken __v__css__ virtual module
 * references (from Rolldown in Vite 8) with empty arrays so dynamicLoadingCss doesn't crash.
 * This allows the remote to successfully bootstrap when imported by the host MF container.
 */
function fixFederationCssForVite8(): Plugin {
  return {
    name: "fix-federation-css-vite8",
    apply: "build",
    closeBundle() {
      const candidates = [
        path.resolve("dist", "remoteEntry.js"),
        path.resolve("dist", "assets", "remoteEntry.js"),
        path.resolve("dist", "assets", "remoteEntry-remoteEntry.js"),
      ];
      // Find the first existing remoteEntry file produced by various build configs
      const found = candidates.find((p) => fs.existsSync(p));
      if (!found) {
        console.warn('[MF] No remoteEntry.js found in dist to patch (tried: ' + candidates.join(', ') + ')');
        return;
      }
      let code = fs.readFileSync(found, "utf8");
      // Replace any `__v__css__...` template literal passed to dynamicLoadingCss with []
      code = code.replace(/`__v__css__[^`]*`/g, "[]");

      // Ensure final artifact is available at dist/remoteEntry.js (hosts expect root path)
      const target = path.resolve("dist", "remoteEntry.js");
      fs.writeFileSync(target, code);
      console.log(`[MF] Patched remoteEntry (${found}) and wrote normalized copy to ${target}`);
    },
  };
}

console.log("\n=== MF DIAGNOSTIC (ACTIVE) ===");
console.log("MF STATUS: ENABLED with Vite 8 workaround");
console.log("This remote will emit dist/remoteEntry.js and register as federated module.");
console.log("Name: 'smartcrm', exposes: { './SmartCRMApp': './src/SmartCRMApp.tsx' (FULL APP), './App' (legacy) }");
console.log("=== MF DIAGNOSTIC END ===\n");

export default defineConfig({
  base: '/',
  // Enable verbose build logging for MF diagnostics
  plugins: [
    react(),
    federation({
      name: "smartcrm",
      filename: "remoteEntry.js",
    exposes: {
         // Primary full-application root (per host bootstrap spec)
         "./SmartCRMApp": "./src/SmartCRMApp.tsx",
         // Expose the legacy minimal app as './App' for host compatibility
         "./App": "./src/App.tsx",
         // Mount API for host-controlled mounting/unmounting
         "./mount": "./src/mount.tsx",
       },
      shared: {
          react: { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
          'react-router-dom': { singleton: true, requiredVersion: false },
          zustand: { singleton: true }
        },
    }),
    fixFederationCssForVite8(),
  ],
  optimizeDeps: {
    include: ["react", "react-dom", "@supabase/supabase-js"],
  },
  ssr: {
    external: ["@google/generative-ai"],
  },
  define: {
    global: "globalThis",
    DEFAULT_SCORE_WEIGHTS: JSON.stringify({
      engagement: 0.2,
      momentum: 0.25,
      competition: 0.15,
      stakeholder: 0.2,
      qualification: 0.1,
      risk: 0.1
    })
  },
  server: {
    host: 'localhost',
    port: 5175,
    hmr: { overlay: false },
    watch: { usePolling: true, interval: 1000 },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: "esnext",
    modulePreload: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('lucide-react') || id.includes('react-avatar') || id.includes('react-select')) return 'ui-vendor';
            if (id.includes('@google/generative-ai') || id.includes('@supabase/supabase-js')) return 'ai-vendor';
            if (id.includes('fuse.js') || id.includes('crypto-js') || id.includes('xlsx')) return 'utils-vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  esbuild: {
    // Temporarily disabled for debugging blank page issue (no console output on Netlify)
    // drop: ['console', 'debugger'],
  },
});
