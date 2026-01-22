import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import federation from "@originjs/vite-plugin-federation";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Temporarily disabled federation for production build
    // federation({
    //   name: 'contacts',
    //   filename: 'remoteEntry.js',
    //   exposes: {
    //     './App': './src/App.tsx'
    //   },
    //   shared: ['react', 'react-dom']
    // })
  ],

  optimizeDeps: {
    include: ["react", "react-dom", "@supabase/supabase-js"],
  },

  define: {
    global: "globalThis",
  },

  server: {
    host: 'localhost',
    port: 5175,
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },

  build: {
    target: "esnext",
    modulePreload: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'react-avatar', 'react-select'],
          'ai-vendor': ['@google/generative-ai', '@supabase/supabase-js'],
          'utils-vendor': ['fuse.js', 'crypto-js', 'xlsx'],
        },
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Performance optimizations - using esbuild for faster builds
    minify: 'esbuild',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: false,
  },

  // Performance optimizations
  esbuild: {
    // Remove console.log in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
