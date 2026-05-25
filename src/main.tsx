import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SmartCRMApp from './SmartCRMApp';
import App from './App'; // legacy minimal shell still available
import './index.css';

// === FULL APPLICATION EXPORTS FOR MODULE FEDERATION ===
// Primary: the complete SmartCRM experience (recommended for host)
export { default as SmartCRMApp } from './SmartCRMApp';
export { SmartCRMRemoteProps } from './SmartCRMApp';

// Legacy / compatibility export (still works)
export { default } from './App';

// Service worker disabled for module federation compatibility
// The host application should manage service workers

// === RUNTIME MF DIAGNOSTIC (FULL APP BOOTSTRAP) ===
console.log('%c[MF DIAGNOSTIC] main.tsx loaded — FULL APPLICATION MODE. Federation plugin ACTIVE (Vite 8 patched).', 'color:#16a34a;font-weight:bold');
console.log('[MF DIAGNOSTIC] Host: import remoteEntry → render <SmartCRMApp sharedData={...} initialRoute="..." onEvent={...} />');
console.log('[MF DIAGNOSTIC] Standalone dev: full shell with Dashboard, Contacts, Pipeline, AI Studio, etc. is rendered.');

// Render for standalone use — now the COMPLETE application
console.log('main.tsx: Rendering FULL SmartCRMApp (complete application shell)');
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <SmartCRMApp />
  </StrictMode>
);
