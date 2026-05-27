// Application entry point - renders App for standalone access
// Also exports for Module Federation consumption

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // legacy minimal shell
import './index.css';

// Federation exports - these must be at top level for correct module resolution
export { default as SmartCRMApp } from './SmartCRMApp';
export type { SmartCRMRemoteProps } from './SmartCRMApp';

// Default export for hosts that reference ./App
export { default } from './App';

// Render the legacy App for standalone mode (more resilient pattern)
console.log('[MAIN] Starting application bootstrap...');
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('[MAIN] Root element found, rendering App...');
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('[MAIN] App rendered successfully');
} else {
  console.error('[MAIN] Root element not found!');
}