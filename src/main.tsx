import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Export for Module Federation
export { default } from './App';

// Register service worker for caching and performance
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service worker registered:', registration);
      })
      .catch((error) => {
        console.error('[SW] Service worker registration failed:', error);
      });
  });
}

// Render for standalone use
console.log('main.tsx: Rendering App component');
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
