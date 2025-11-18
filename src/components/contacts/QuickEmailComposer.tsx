import React, { useState, useCallback, useEffect } from 'react';
import { Contact } from '../../types';
import { ModernButton } from '../ui/ModernButton';
import { GlassCard } from '../ui/GlassCard';
import { emailTrackingService } from '../../services/emailTrackingService';
import { emailSchedulerService } from '../../services/emailSchedulerService';
import {
  Mail,
  Send,
  Clock,
  FileText,
  Sparkles,
  X,
  Copy,
  Save,
  Calendar,
  Zap,
  Target,
  TrendingUp,
  Loader2
} from 'lucide-react';

interface QuickEmailComposerProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onSend?: (emailData: EmailData) => Promise<void>;
}

interface EmailData {
  to: string;
  subject: string;
  body: string;
  scheduledFor?: Date;
  template?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: string[];
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'introduction',
    name: 'Introduction',
    subject: 'Introduction - {firstName} from {company}',
    body: `Hi {firstName},

I hope this email finds you well. My name is {senderName} and I'm reaching out because I came across {company} and was impressed by your work in {industry}.

I'd love to learn more about your current challenges and see if there might be opportunities for us to work together.

Would you be open to a brief call next week?

Best regards,
{senderName}`,
    category: 'outreach',
    variables: ['firstName', 'company', 'industry', 'senderName']
  },
  {
    id: 'follow-up',
    name: 'Follow-up',
    subject: 'Following up on our conversation - {company}',
    body: `Hi {firstName},

I wanted to follow up on our previous conversation about {topic}. I enjoyed learning more about {company}'s goals and challenges.

As discussed, I believe we could help with {valueProposition}. Would you be interested in exploring this further?

I'm available {availability} if you'd like to schedule a call.

Best regards,
{senderName}`,
    category: 'nurture',
    variables: ['firstName', 'company', 'topic', 'valueProposition', 'availability', 'senderName']
  },
  {
    id: 'meeting-request',
    name: 'Meeting Request',
    subject: 'Meeting Request - {topic}',
    body: `Hi {firstName},

Thank you for your time during our previous conversation. As promised, I'd like to schedule a more detailed discussion about {topic}.

I've suggested a few time slots below that work for me. Please let me know which one works best for you, or suggest alternatives:

{timeSlots}

Looking forward to our meeting!

Best regards,
{senderName}`,
    category: 'meeting',
    variables: ['firstName', 'topic', 'timeSlots', 'senderName']
  }
];

export const QuickEmailComposer: React.FC<QuickEmailComposerProps> = ({
  contact,
  isOpen,
  onClose,
  onSend
}) => {
  const [emailData, setEmailData] = useState<EmailData>({
    to: contact.email || '',
    subject: '',
    body: '',
    priority: 'normal'
  });
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Initialize with template if contact has specific context
  useEffect(() => {
    if (isOpen && contact) {
      // Auto-select introduction template for new contacts
      const introTemplate = emailTemplates.find(t => t.id === 'introduction');
      if (introTemplate) {
        applyTemplate(introTemplate);
      }
    }
  }, [isOpen, contact]);

  const applyTemplate = useCallback((template: EmailTemplate) => {
    const variables = {
      firstName: contact.firstName || contact.name.split(' ')[0],
      company: contact.company,
      industry: contact.industry || 'your industry',
      senderName: 'Your Name', // This should come from user settings
      topic: 'our discussion',
      valueProposition: 'our solutions',
      availability: 'next week',
      timeSlots: '• Tuesday 2:00 PM\n• Wednesday 10:00 AM\n• Thursday 3:00 PM'
    };

    let subject = template.subject;
    let body = template.body;

    // Replace variables in subject and body
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== undefined) {
        const regex = new RegExp(`{${key}}`, 'g');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      }
    });

    setEmailData(prev => ({
      ...prev,
      subject,
      body,
      template: template.id
    }));
    setSelectedTemplate(template);
    setShowTemplates(false);
  }, [contact]);

  const handleSendNow = useCallback(async () => {
    if (!emailData.to || !emailData.subject || !emailData.body) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      // Generate unique email ID
      const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Track email send
      const emailEvent = emailTrackingService.trackEvent({
        emailId,
        contactId: contact.id,
        eventType: 'sent',
        metadata: {
          template: emailData.template,
          priority: emailData.priority,
          composer: 'quick'
        }
      });

      // Send email via mailto (enhanced version)
      const mailtoUrl = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
      window.open(mailtoUrl, '_blank');

      // Call onSend callback if provided
      if (onSend) {
        await onSend(emailData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [emailData, contact.id, onSend, onClose]);

  const handleScheduleSend = useCallback(async () => {
    if (!scheduledDate || !scheduledTime) {
      alert('Please select date and time for scheduling');
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

    if (scheduledDateTime <= new Date()) {
      alert('Please select a future date and time');
      return;
    }

    setIsScheduling(true);
    try {
      // Schedule email using email scheduler service
      await emailSchedulerService.scheduleEmail({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        scheduledFor: scheduledDateTime,
        contactId: contact.id,
        template: emailData.template,
        priority: emailData.priority
      });

      alert(`Email scheduled for ${scheduledDateTime.toLocaleString()}`);
      onClose();
    } catch (error) {
      console.error('Failed to schedule email:', error);
      alert('Failed to schedule email. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  }, [emailData, scheduledDate, scheduledTime, contact.id, onClose]);

  const copyToClipboard = useCallback(async () => {
    const emailText = `Subject: ${emailData.subject}\n\n${emailData.body}`;
    try {
      await navigator.clipboard.writeText(emailText);
      // Show success feedback without alert
      console.log('Email copied to clipboard successfully');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers or restricted contexts
      try {
        const textArea = document.createElement('textarea');
        textArea.value = emailText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        // Use modern execCommand as fallback
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          console.log('Email copied to clipboard (fallback method)');
        } else {
          throw new Error('Fallback copy method failed');
        }
      } catch (fallbackError) {
        console.error('All copy methods failed:', fallbackError);
        alert('Unable to copy to clipboard. Please copy manually.');
      }
    }
  }, [emailData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Compose Email</h2>
              <p className="text-sm text-gray-600">to {contact.name} at {contact.company}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Email Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="recipient@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email subject"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={emailData.body}
                onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Write your message here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={emailData.priority}
                onChange={(e) => setEmailData(prev => ({ ...prev, priority: e.target.value as EmailData['priority'] }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Template Selector */}
          <div>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>{selectedTemplate ? `Using: ${selectedTemplate.name}` : 'Choose Template'}</span>
            </button>

            {showTemplates && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {emailTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{template.category}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scheduling Section */}
          <div>
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>Schedule for Later</span>
            </button>

            {showScheduler && (
              <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                <ModernButton
                  onClick={handleScheduleSend}
                  loading={isScheduling}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Email
                </ModernButton>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <ModernButton
              variant="outline"
              onClick={copyToClipboard}
              className="flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </ModernButton>

            <ModernButton
              variant="outline"
              onClick={() => {/* Save as draft */}}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </ModernButton>
          </div>

          <div className="flex items-center space-x-3">
            <ModernButton
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </ModernButton>

            <ModernButton
              onClick={handleSendNow}
              loading={isSending}
              className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send Now</span>
            </ModernButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};