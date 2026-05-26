// Application entry point - renders SmartCRMApp for standalone access
// Also exports for Module Federation consumption

import React from 'react';
import { createRoot } from 'react-dom/client';
import SmartCRMApp from './SmartCRMApp';
import './index.css';

// Federation exports - these must be at top level for correct module resolution
export { default as SmartCRMApp } from './SmartCRMApp';
export type { SmartCRMRemoteProps } from './SmartCRMApp';

// Default export for hosts that reference ./App
export { default as App } from './SmartCRMApp';

// Render the full SmartCRMApp for standalone mode
console.log('[MAIN] Starting application bootstrap...');
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('[MAIN] Root element found, rendering SmartCRMApp...');
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <SmartCRMApp />
    </React.StrictMode>
  );
  console.log('[MAIN] SmartCRMApp rendered successfully');
} else {
  console.error('[MAIN] Root element not found!');
}