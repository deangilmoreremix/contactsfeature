import React, { memo } from 'react';

interface EmailData {
  to: string;
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface EmailFormProps {
  emailData: EmailData;
  onEmailDataChange: (field: keyof EmailData, value: string) => void;
}

export const EmailForm: React.FC<EmailFormProps> = memo(({
  emailData,
  onEmailDataChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
        <input
          type="email"
          value={emailData.to}
          onChange={(e) => onEmailDataChange('to', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="recipient@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input
          type="text"
          value={emailData.subject}
          onChange={(e) => onEmailDataChange('subject', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Email subject"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea
          value={emailData.body}
          onChange={(e) => onEmailDataChange('body', e.target.value)}
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Write your message here..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
        <select
          value={emailData.priority}
          onChange={(e) => onEmailDataChange('priority', e.target.value as EmailData['priority'])}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>
  );
});