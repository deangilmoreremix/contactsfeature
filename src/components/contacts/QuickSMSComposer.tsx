import React, { useState, useCallback } from 'react';
import { Contact } from '../../types';
import { ModernButton } from '../ui/ModernButton';
import { smsService, SMSData, SMSResult } from '../../services/smsService';
import { callTrackingService } from '../../services/callTrackingService';
import {
  X,
  Send,
  MessageSquare,
  Phone,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface QuickSMSComposerProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onSend?: (smsData: SMSData, result: SMSResult) => Promise<void>;
}

export const QuickSMSComposer: React.FC<QuickSMSComposerProps> = ({
  contact,
  isOpen,
  onClose,
  onSend
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<SMSResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxLength = 160;
  const messageLength = message.length;
  const segments = Math.ceil(messageLength / 160);
  const costEstimate = smsService.estimateCost(message);

  const handleSendSMS = useCallback(async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!contact.phone) {
      setError('No phone number available for this contact');
      return;
    }

    // Validate phone number
    const phoneValidation = smsService.validatePhoneNumber(contact.phone);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || 'Invalid phone number');
      return;
    }

    setIsSending(true);
    setError(null);
    setLastResult(null);

    try {
      const smsData: SMSData = {
        to: phoneValidation.formatted!,
        message: message.trim(),
        metadata: {
          contactId: contact.id,
          composer: 'quick-sms'
        }
      };

      const result = await smsService.sendSMS(smsData);

      setLastResult(result);

      if (result.success) {
        // Track SMS event
        callTrackingService.trackCallEvent({
          contactId: contact.id,
          eventType: 'sms_sent',
          phoneNumber: smsData.to,
          callType: 'sms',
          metadata: {
            messageLength: message.length,
            segments,
            cost: result.cost,
            messageId: result.messageId
          }
        });

        // Call onSend callback if provided
        if (onSend) {
          await onSend(smsData, result);
        }

        // Clear message on success
        setMessage('');

        // Auto-close after successful send
        setTimeout(() => {
          onClose();
        }, 2000);

      } else {
        setError(result.error || 'Failed to send SMS');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send SMS';
      setError(errorMessage);
      console.error('SMS send error:', err);
    } finally {
      setIsSending(false);
    }
  }, [message, contact, segments, onSend, onClose]);

  const handleClose = useCallback(() => {
    if (!isSending) {
      setMessage('');
      setError(null);
      setLastResult(null);
      onClose();
    }
  }, [isSending, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Send SMS
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                to {contact.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSending}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Phone Number Display */}
          <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {contact.phone || 'No phone number'}
            </span>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your SMS message..."
              rows={4}
              maxLength={maxLength * 5} // Allow up to 5 segments
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white resize-none"
              disabled={isSending}
            />

            {/* Character Count & Cost */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {messageLength}/{maxLength} characters
                {segments > 1 && ` (${segments} segments)`}
              </span>
              <div className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3" />
                <span>${costEstimate.totalCost.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Success Display */}
          {lastResult?.success && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-green-700 dark:text-green-300">
                SMS sent successfully!
                {lastResult.cost && ` Cost: $${lastResult.cost.toFixed(4)}`}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <ModernButton
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
            className="px-4 py-2"
          >
            Cancel
          </ModernButton>

          <ModernButton
            variant="primary"
            onClick={handleSendSMS}
            disabled={!message.trim() || isSending || !contact.phone}
            loading={isSending}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send SMS
              </>
            )}
          </ModernButton>
        </div>
      </div>
    </div>
  );
};