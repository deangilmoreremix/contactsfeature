import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

console.log("\n=== BUILD (STANDALONE MODE - NO FEDERATION) ===");
console.log("Publishing as standalone SPA for Netlify");
console.log("=== BUILD END ===\n");

export default defineConfig({
  base: '/',
  plugins: [react()],
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
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
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
  },
});
