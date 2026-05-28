console.log('BOOTSTRAP EXECUTING');

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Federation exports
export { default as SmartCRMApp } from './SmartCRMApp';
export type { SmartCRMRemoteProps } from './SmartCRMApp';
export { default } from './SmartCRMApp';

// Mount app
import SmartCRMApp from './SmartCRMApp';

const rootElement = document.getElementById('root');
if (rootElement) {
  // Set up global error handler for initialization errors
  const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
    const error = 'reason' in event ? event.reason : event.error;
    console.error('Global error caught:', error);
    const root = document.getElementById('root');
    if (root && !root.innerHTML.includes('ROOT ERROR')) {
      root.innerHTML = `
        <div style="padding:20px;background:#fef2f2;color:#991b1b;font-family:system-ui;border:2px solid #ef4444;">
          <h2 style="margin:0 0 10px 0;">INITIALIZATION ERROR:</h2>
          <pre style="white-space:pre-wrap;font-size:12px;">${error?.message || error || 'Unknown initialization error'}</pre>
          <p style="margin-top:10px;font-size:12px;">Check console for details. This may be due to missing environment variables.</p>
        </div>
      `;
    }
  };
  
  window.addEventListener('error', handleError as any);
  window.addEventListener('unhandledrejection', handleError as any);

  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <SmartCRMApp 
        sharedData={(window as any).__SMARTCRM_SHARED_DATA__} 
        initialRoute={(window as any).__SMARTCRM_INITIAL_ROUTE__} 
      />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found!');
}