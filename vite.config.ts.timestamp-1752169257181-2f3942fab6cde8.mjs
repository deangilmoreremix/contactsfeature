// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  resolve: {
    alias: {
      // Disable Node.js built-in module polyfills
      timers: false,
      "timers/promises": false,
      buffer: false,
      crypto: false,
      stream: false,
      os: false,
      fs: false,
      path: false,
      util: false
    }
  },
  server: {
    host: true,
    port: 5173,
    hmr: {
      protocol: "ws",
      host: "localhost",
      clientPort: 5173
    },
    watch: {
      ignored: ["**/.env**"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXVxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIC8vIERpc2FibGUgTm9kZS5qcyBidWlsdC1pbiBtb2R1bGUgcG9seWZpbGxzXG4gICAgICB0aW1lcnM6IGZhbHNlLFxuICAgICAgJ3RpbWVycy9wcm9taXNlcyc6IGZhbHNlLFxuICAgICAgYnVmZmVyOiBmYWxzZSxcbiAgICAgIGNyeXB0bzogZmFsc2UsXG4gICAgICBzdHJlYW06IGZhbHNlLFxuICAgICAgb3M6IGZhbHNlLFxuICAgICAgZnM6IGZhbHNlLFxuICAgICAgcGF0aDogZmFsc2UsXG4gICAgICB1dGlsOiBmYWxzZVxuICAgIH1cbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogdHJ1ZSxcbiAgICBwb3J0OiA1MTczLFxuICAgIGhtcjoge1xuICAgICAgcHJvdG9jb2w6ICd3cycsXG4gICAgICBob3N0OiAnbG9jYWxob3N0JyxcbiAgICAgIGNsaWVudFBvcnQ6IDUxNzMsXG4gICAgfSxcbiAgICB3YXRjaDoge1xuICAgICAgaWdub3JlZDogWycqKi8uZW52KionXVxuICAgIH1cbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQTtBQUFBLE1BRUwsUUFBUTtBQUFBLE1BQ1IsbUJBQW1CO0FBQUEsTUFDbkIsUUFBUTtBQUFBLE1BQ1IsUUFBUTtBQUFBLE1BQ1IsUUFBUTtBQUFBLE1BQ1IsSUFBSTtBQUFBLE1BQ0osSUFBSTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxVQUFVO0FBQUEsTUFDVixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsSUFDZDtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsU0FBUyxDQUFDLFdBQVc7QUFBQSxJQUN2QjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
