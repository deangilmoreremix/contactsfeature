import React, { memo } from 'react';
import { ModernButton } from '../ui/ModernButton';
import { FileText } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: string[];
}

interface EmailTemplateSelectorProps {
  templates: EmailTemplate[];
  selectedTemplate: EmailTemplate | null;
  showTemplates: boolean;
  onToggleTemplates: () => void;
  onSelectTemplate: (template: EmailTemplate) => void;
}

export const EmailTemplateSelector: React.FC<EmailTemplateSelectorProps> = memo(({
  templates,
  selectedTemplate,
  showTemplates,
  onToggleTemplates,
  onSelectTemplate
}) => {
  return (
    <div>
      <button
        onClick={onToggleTemplates}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <FileText className="w-4 h-4" />
        <span>{selectedTemplate ? `Using: ${selectedTemplate.name}` : 'Choose Template'}</span>
      </button>

      {showTemplates && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="font-medium text-gray-900">{template.name}</div>
              <div className="text-sm text-gray-600 mt-1">{template.category}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});