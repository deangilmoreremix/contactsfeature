import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import SmartCRMApp from './SmartCRMApp';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const RootErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        try {
          const root = document.getElementById('root');
          if (root) {
            root.innerHTML = `
              <div style="padding:20px;background:#fef2f2;color:#991b1b;font-family:system-ui;border:2px solid #ef4444;">
                <h2 style="margin:0 0 10px 0;">ROOT ERROR:</h2>
                <pre style="white-space:pre-wrap;font-size:12px;">${error?.message || 'Unknown error'}<br/>${errorInfo?.componentStack || ''}</pre>
              </div>
            `;
          }
        } catch (e) {}
        console.error('RootErrorBoundary:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// Bootstrap: Entry point for standalone rendering.
console.log('[BOOTSTRAP] Starting bootstrap sequence...');

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('[BOOTSTRAP] Root element found, creating React root...');
  const root = createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <RootErrorBoundary>
        <SmartCRMApp />
      </RootErrorBoundary>
    </React.StrictMode>
  );
  console.log('[BOOTSTRAP] React root rendered successfully');
} else {
  console.error('Root element not found!');
}
