import React from 'react';
import { Settings, X } from 'lucide-react';
import { MessagingProvidersPanel } from '../settings/MessagingProvidersPanel';

interface APIConfigurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Email & SMS provider setup (bring-your-own Resend / SendGrid / Postmark / Mailgun / Twilio). */
export const APIConfigurationPanel: React.FC<APIConfigurationPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email &amp; SMS providers</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connect the accounts used to send messages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-10 w-10 inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <MessagingProvidersPanel />
        </div>
      </div>
    </div>
  );
};
