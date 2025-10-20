import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'CalendarApp',
      filename: 'remoteEntry.js',
      exposes: {
        './CalendarApp': './src/CalendarApp.tsx'
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
    port: 5174, // 👈 each remote should ideally use a different port in dev
  },

  build: {
    target: "esnext",
    modulePreload: false,
    cssCodeSplit: true,
  },
});
