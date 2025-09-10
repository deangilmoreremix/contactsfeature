import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      // 👇 unique name for this remote
      name: "contacts",
      filename: "remoteEntry.js",

      // 👇 expose components/modules the host will consume
      exposes: {
        "./ContactsApp": "./src/ContactsApp.tsx",
        "./ContactsWidget": "./src/components/ContactsWidget.tsx",
      },

      // 👇 ensure React/Supabase are shared
      shared: {
        react: { singleton: true, eager: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true, eager: true, requiredVersion: "^18.0.0" },
        "@supabase/supabase-js": { singleton: true, eager: true },
      },
    }),
  ],

  optimizeDeps: {
    include: ["react", "react-dom", "@supabase/supabase-js"],
  },

  define: {
    global: "globalThis",
  },

  server: {
    host: true,
    port: 5173, // 👈 each remote should ideally use a different port in dev
  },

  build: {
    target: "esnext",
    modulePreload: false,
    cssCodeSplit: true,
  },
});
