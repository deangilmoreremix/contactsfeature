import React, { useState, useCallback, useEffect } from 'react';
import { Contact } from '../../types';
import { ModernButton } from '../ui/ModernButton';
import { GlassCard } from '../ui/GlassCard';
import { emailTrackingService } from '../../services/emailTrackingService';
import { emailSchedulerService } from '../../services/emailSchedulerService';
import { copyEmailToClipboard } from '../../utils/clipboardUtils';
import { EmailTemplateSelector } from './EmailTemplateSelector';
import { EmailScheduler } from './EmailScheduler';
import { EmailForm } from './EmailForm';
import {
  Mail,
  Send,
  Clock,
  Sparkles,
  X,
  Copy,
  Save,
  Zap,
  Target,
  TrendingUp,
  Loader2,
  FileText,
  Calendar
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
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

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
        template: emailData.template || '',
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

  const handleCopyToClipboard = useCallback(async () => {
    const result = await copyEmailToClipboard(emailData.subject, emailData.body);
    if (!result.success && result.error) {
      alert(result.error);
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
          <EmailForm
            emailData={emailData}
            onEmailDataChange={(field, value) => setEmailData(prev => ({ ...prev, [field]: value }))}
          />

          {/* Template Selector */}
          <EmailTemplateSelector
            templates={emailTemplates}
            selectedTemplate={selectedTemplate}
            showTemplates={showTemplates}
            onToggleTemplates={() => setShowTemplates(!showTemplates)}
            onSelectTemplate={applyTemplate}
          />

          {/* Scheduling Section */}
          <EmailScheduler
            showScheduler={showScheduler}
            onToggleScheduler={() => setShowScheduler(!showScheduler)}
            scheduledDate={scheduledDate}
            onScheduledDateChange={setScheduledDate}
            scheduledTime={scheduledTime}
            onScheduledTimeChange={setScheduledTime}
            onScheduleSend={handleScheduleSend}
            isScheduling={isScheduling}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <ModernButton
              variant="outline"
              onClick={handleCopyToClipboard}
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