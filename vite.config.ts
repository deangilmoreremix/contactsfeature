import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'contacts_remote',
      filename: 'remoteEntry.js',
      exposes: {
        './ContactsApp': './src/ContactsApp.tsx',
        './ContactModal': './src/components/modals/ContactsModal.tsx',
      },
      shared: ['react', 'react-dom']
    })
  ],
  build: {
    target: 'esnext'
  }
})