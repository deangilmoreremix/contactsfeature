import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CalendarApp from './CalendarApp';
import './index.css';

// Export for Module Federation
export { default } from './CalendarApp';

// Render for standalone use
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <CalendarApp />
  </StrictMode>
);
