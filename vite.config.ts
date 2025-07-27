import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  resolve: {
    alias: {
      // Disable Node.js built-in module polyfills
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
      protocol: 'ws',
      host: 'localhost',
      clientPort: 5173,
    },
    watch: {
      ignored: ['**/.env**']
    }
  }
});