// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import federation from "file:///home/project/node_modules/@originjs/vite-plugin-federation/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    federation({
      // 👇 unique name for this remote
      name: "contacts",
      filename: "remoteEntry.js",
      // 👇 expose components/modules the host will consume
      exposes: {
        "./ContactsApp": "./src/ContactsApp.tsx",
        "./ContactsWidget": "./src/components/ContactsWidget.tsx"
      },
      // 👇 ensure React/Supabase are shared
      shared: {
        react: { singleton: true, eager: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true, eager: true, requiredVersion: "^18.0.0" },
        "@supabase/supabase-js": { singleton: true, eager: true }
      }
    })
  ],
  optimizeDeps: {
    include: ["react", "react-dom", "@supabase/supabase-js"]
  },
  define: {
    global: "globalThis"
  },
  server: {
    host: true,
    port: 5173
    // 👈 each remote should ideally use a different port in dev
  },
  build: {
    target: "esnext",
    modulePreload: false,
    cssCodeSplit: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IGZlZGVyYXRpb24gZnJvbSBcIkBvcmlnaW5qcy92aXRlLXBsdWdpbi1mZWRlcmF0aW9uXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBmZWRlcmF0aW9uKHtcbiAgICAgIC8vIFx1RDgzRFx1REM0NyB1bmlxdWUgbmFtZSBmb3IgdGhpcyByZW1vdGVcbiAgICAgIG5hbWU6IFwiY29udGFjdHNcIixcbiAgICAgIGZpbGVuYW1lOiBcInJlbW90ZUVudHJ5LmpzXCIsXG5cbiAgICAgIC8vIFx1RDgzRFx1REM0NyBleHBvc2UgY29tcG9uZW50cy9tb2R1bGVzIHRoZSBob3N0IHdpbGwgY29uc3VtZVxuICAgICAgZXhwb3Nlczoge1xuICAgICAgICBcIi4vQ29udGFjdHNBcHBcIjogXCIuL3NyYy9Db250YWN0c0FwcC50c3hcIixcbiAgICAgICAgXCIuL0NvbnRhY3RzV2lkZ2V0XCI6IFwiLi9zcmMvY29tcG9uZW50cy9Db250YWN0c1dpZGdldC50c3hcIixcbiAgICAgIH0sXG5cbiAgICAgIC8vIFx1RDgzRFx1REM0NyBlbnN1cmUgUmVhY3QvU3VwYWJhc2UgYXJlIHNoYXJlZFxuICAgICAgc2hhcmVkOiB7XG4gICAgICAgIHJlYWN0OiB7IHNpbmdsZXRvbjogdHJ1ZSwgZWFnZXI6IHRydWUsIHJlcXVpcmVkVmVyc2lvbjogXCJeMTguMC4wXCIgfSxcbiAgICAgICAgXCJyZWFjdC1kb21cIjogeyBzaW5nbGV0b246IHRydWUsIGVhZ2VyOiB0cnVlLCByZXF1aXJlZFZlcnNpb246IFwiXjE4LjAuMFwiIH0sXG4gICAgICAgIFwiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCI6IHsgc2luZ2xldG9uOiB0cnVlLCBlYWdlcjogdHJ1ZSB9LFxuICAgICAgfSxcbiAgICB9KSxcbiAgXSxcblxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiLCBcIkBzdXBhYmFzZS9zdXBhYmFzZS1qc1wiXSxcbiAgfSxcblxuICBkZWZpbmU6IHtcbiAgICBnbG9iYWw6IFwiZ2xvYmFsVGhpc1wiLFxuICB9LFxuXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IHRydWUsXG4gICAgcG9ydDogNTE3MywgLy8gXHVEODNEXHVEQzQ4IGVhY2ggcmVtb3RlIHNob3VsZCBpZGVhbGx5IHVzZSBhIGRpZmZlcmVudCBwb3J0IGluIGRldlxuICB9LFxuXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiBcImVzbmV4dFwiLFxuICAgIG1vZHVsZVByZWxvYWQ6IGZhbHNlLFxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxnQkFBZ0I7QUFHdkIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sV0FBVztBQUFBO0FBQUEsTUFFVCxNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUE7QUFBQSxNQUdWLFNBQVM7QUFBQSxRQUNQLGlCQUFpQjtBQUFBLFFBQ2pCLG9CQUFvQjtBQUFBLE1BQ3RCO0FBQUE7QUFBQSxNQUdBLFFBQVE7QUFBQSxRQUNOLE9BQU8sRUFBRSxXQUFXLE1BQU0sT0FBTyxNQUFNLGlCQUFpQixVQUFVO0FBQUEsUUFDbEUsYUFBYSxFQUFFLFdBQVcsTUFBTSxPQUFPLE1BQU0saUJBQWlCLFVBQVU7QUFBQSxRQUN4RSx5QkFBeUIsRUFBRSxXQUFXLE1BQU0sT0FBTyxLQUFLO0FBQUEsTUFDMUQ7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLHVCQUF1QjtBQUFBLEVBQ3pEO0FBQUEsRUFFQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsRUFDVjtBQUFBLEVBRUEsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsRUFDUjtBQUFBLEVBRUEsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLElBQ2YsY0FBYztBQUFBLEVBQ2hCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
