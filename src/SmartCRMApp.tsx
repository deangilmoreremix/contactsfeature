import React, { useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { AIProvider } from './contexts/AIContext';
import { ViewProvider } from './contexts/ViewContext';

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Contacts App] Uncaught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Application Error</h2>
          <p className="text-sm text-gray-600 mb-4">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

import Contacts from './pages/Contacts';

export interface SmartCRMRemoteProps {
  sharedData?: {
    user?: any;
    isAuthenticated?: boolean;
    session?: any;
    tenant?: any;
    theme?: 'light' | 'dark';
  };
  initialRoute?: string;
  onEvent?: (event: { type: string; payload?: any }) => void;
  onDataUpdate?: (data: any) => void;
}

const ContactsApp: React.FC<SmartCRMRemoteProps> = ({
  sharedData,
  initialRoute,
}) => {
  const theme = sharedData?.theme || 'light';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.classList.toggle('dark', theme === 'dark');
      document.body.style.backgroundColor = theme === 'dark' ? '#111827' : '#f3f4f6';
    }
  }, [theme]);

  return (
    <AIProvider>
      <ViewProvider>
        <RootErrorBoundary>
          <Contacts />
        </RootErrorBoundary>
      </ViewProvider>
    </AIProvider>
  );
};

export default ContactsApp;