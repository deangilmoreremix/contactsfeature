import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Export for Module Federation
export { default } from './App';

// Service worker disabled for module federation compatibility
// The host application should manage service workers

// === RUNTIME MF DIAGNOSTIC ===
console.log('%c[MF DIAGNOSTIC] main.tsx loaded. Federation plugin ACTIVE in vite config (Vite8-patched). This remote can be dynamically imported by host as full app root via remoteEntry.js', 'color:green;font-weight:bold');
console.log('[MF DIAGNOSTIC] Host consumption: import("http://.../remoteEntry.js").then(...) then render the exposed ./App with SmartCRMRemoteProps. Standalone dev mode also supported.');

// Render for standalone use
console.log('main.tsx: Rendering App component');
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
