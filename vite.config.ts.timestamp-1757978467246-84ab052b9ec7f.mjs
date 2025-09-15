// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import federation from "file:///home/project/node_modules/@originjs/vite-plugin-federation/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    federation({
      name: "ContactsApp",
      filename: "remoteEntry.js",
      exposes: {
        "./ContactsApp": "./src/App.tsx"
      },
      shared: ["react", "react-dom"]
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IGZlZGVyYXRpb24gZnJvbSBcIkBvcmlnaW5qcy92aXRlLXBsdWdpbi1mZWRlcmF0aW9uXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBmZWRlcmF0aW9uKHtcbiAgICAgIG5hbWU6ICdDb250YWN0c0FwcCcsXG4gICAgICBmaWxlbmFtZTogJ3JlbW90ZUVudHJ5LmpzJyxcbiAgICAgIGV4cG9zZXM6IHtcbiAgICAgICAgJy4vQ29udGFjdHNBcHAnOiAnLi9zcmMvQXBwLnRzeCdcbiAgICAgIH0sXG4gICAgICBzaGFyZWQ6IFsncmVhY3QnLCAncmVhY3QtZG9tJ11cbiAgICB9KVxuICBdLFxuXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCIsIFwiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCJdLFxuICB9LFxuXG4gIGRlZmluZToge1xuICAgIGdsb2JhbDogXCJnbG9iYWxUaGlzXCIsXG4gIH0sXG5cbiAgc2VydmVyOiB7XG4gICAgaG9zdDogdHJ1ZSxcbiAgICBwb3J0OiA1MTczLCAvLyBcdUQ4M0RcdURDNDggZWFjaCByZW1vdGUgc2hvdWxkIGlkZWFsbHkgdXNlIGEgZGlmZmVyZW50IHBvcnQgaW4gZGV2XG4gIH0sXG5cbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6IFwiZXNuZXh0XCIsXG4gICAgbW9kdWxlUHJlbG9hZDogZmFsc2UsXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUNsQixPQUFPLGdCQUFnQjtBQUd2QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixXQUFXO0FBQUEsTUFDVCxNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixTQUFTO0FBQUEsUUFDUCxpQkFBaUI7QUFBQSxNQUNuQjtBQUFBLE1BQ0EsUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLElBQy9CLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLHVCQUF1QjtBQUFBLEVBQ3pEO0FBQUEsRUFFQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsRUFDVjtBQUFBLEVBRUEsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsRUFDUjtBQUFBLEVBRUEsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLElBQ2YsY0FBYztBQUFBLEVBQ2hCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
