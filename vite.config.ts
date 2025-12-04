import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'contacts',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx'
      },
      shared: ['react', 'react-dom']
    })
  ],

  optimizeDeps: {
    include: ["react", "react-dom", "@supabase/supabase-js"],
  },

  define: {
    global: "globalThis",
  },

  server: {
    host: true,
    port: 5174,
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: false,
    },
  },

  build: {
    target: "esnext",
    modulePreload: false,
    cssCodeSplit: true,
  },
});
