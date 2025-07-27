import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom']
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Use proper polyfills for Node.js modules
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util'
    }
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    hmr: {
      port: 5173
    },
    watch: {
      ignored: ['**/.env**'],
      usePolling: false
    }
  }
});