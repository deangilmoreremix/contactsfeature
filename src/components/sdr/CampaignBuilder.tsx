import React, { useState, useRef } from 'react';
import { SDRCampaignTemplate, SDRUserPreferences } from '../../types/sdr-preferences';
import { SDRPreferencesService } from '../../services/sdrPreferencesService';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import {
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  Save,
  Eye,
  Copy,
  Settings
} from 'lucide-react';

interface CampaignBuilderProps {
  agentId: string;
  agentName: string;
  initialSequence?: SDRCampaignTemplate['sequence'];
  preferences?: Partial<SDRUserPreferences>;
  onSave?: (template: SDRCampaignTemplate) => void;
  onPreview?: (sequence: SDRCampaignTemplate['sequence']) => void;
  onClose?: () => void;
}

interface CampaignStep {
  id: string;
  day: number;
  type: 'email' | 'linkedin' | 'whatsapp' | 'phone' | 'social';
  template: string;
  subject: string;
  delay: number;
  conditions: string[];
}

const STEP_TYPES = [
  { key: 'email', label: 'Email', icon: Mail, color: '#3b82f6' },
  { key: 'linkedin', label: 'LinkedIn', icon: MessageSquare, color: '#0077b5' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: '#25d366' },
  { key: 'phone', label: 'Phone Call', icon: Phone, color: '#10b981' },
  { key: 'social', label: 'Social Post', icon: Calendar, color: '#8b5cf6' }
];

const EMAIL_TEMPLATES = [
  'introduction',
  'value-proposition',
  'case-study',
  'follow-up',
  'objection-handling',
  'closing-attempt',
  'relationship-building'
];

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  agentId,
  agentName,
  initialSequence = [],
  preferences,
  onSave,
  onPreview,
  onClose
}) => {
  const [sequence, setSequence] = useState<CampaignStep[]>(
    initialSequence.length > 0 ? initialSequence.map((step, index) => ({
      id: (step as any).id || `step-${index}`,
      day: step.day,
      type: step.type,
      template: step.template,
      subject: step.subject || '',
      delay: step.delay || 3,
      conditions: step.conditions || []
    })) : [
      {
        id: 'step-0',
        day: 0,
        type: 'email',
        template: 'introduction',
        subject: 'Introduction to SmartCRM',
        delay: 3,
        conditions: []
      }
    ]
  );

  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  const addStep = () => {
    const newStep: CampaignStep = {
      id: `step-${Date.now()}`,
      day: sequence.length > 0 ? sequence[sequence.length - 1]!.day + 3 : 0,
      type: 'email',
      template: 'follow-up',
      subject: '',
      delay: 3,
      conditions: []
    };
    setSequence([...sequence, newStep]);
  };

  const removeStep = (stepId: string) => {
    setSequence(sequence.filter(step => step.id !== stepId));
  };

  const updateStep = (stepId: string, updates: Partial<CampaignStep>) => {
    setSequence(sequence.map(step =>
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const handleDragStart = (e: React.DragEvent, stepId: string) => {
    setDraggedStep(stepId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedStep) return;

    const draggedIndex = sequence.findIndex(step => step.id === draggedStep);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    const newSequence = [...sequence];
    const removed = newSequence.splice(draggedIndex, 1)[0];
    if (removed) {
      newSequence.splice(targetIndex, 0, removed);

      // Recalculate days based on new order
      let currentDay = 0;
      newSequence.forEach((step, index) => {
        if (index === 0) {
          step.day = 0;
        } else {
          const prevStep = newSequence[index - 1];
          const prevDelay = prevStep ? prevStep.delay : 3;
          currentDay += prevDelay;
          step.day = currentDay;
        }
      });

      setSequence(newSequence);
    }
    setDraggedStep(null);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      const template: Omit<SDRCampaignTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> = {
        userId: 'demo-user', // In real app, get from auth
        name: templateName,
        description: templateDescription,
        agentId,
        sequence,
        settings: preferences || {},
        isPublic,
        tags: []
      };

      const savedTemplate = await SDRPreferencesService.saveCampaignTemplate('demo-user', template);
      onSave?.(savedTemplate);
      alert('Campaign template saved successfully!');
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStepIcon = (type: string) => {
    const stepType = STEP_TYPES.find(st => st.key === type);
    return stepType ? stepType.icon : Mail;
  };

  const getStepColor = (type: string) => {
    const stepType = STEP_TYPES.find(st => st.key === type);
    return stepType ? stepType.color : '#6b7280';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <GlassCard className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Campaign Builder - {agentName}
              </h3>
              <p className="text-sm text-gray-600">
                Design your personalized SDR campaign sequence
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {onPreview && (
              <ModernButton
                variant="outline"
                onClick={() => onPreview(sequence)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </ModernButton>
            )}
            <ModernButton
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </ModernButton>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Campaign Sequence Builder */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Campaign Sequence</h4>

              {/* Step List */}
              <div className="space-y-3" ref={dragRef}>
                {sequence.map((step, index) => {
                  const IconComponent = getStepIcon(step.type);
                  return (
                    <div
                      key={step.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, step.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-all ${
                        draggedStep === step.id ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Drag Handle */}
                      <div className="cursor-move text-gray-400 hover:text-gray-600">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {/* Step Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: getStepColor(step.type) }}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              Day {step.day}
                            </span>
                            <span className="text-sm text-gray-500">
                              {STEP_TYPES.find(st => st.key === step.type)?.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <select
                              value={step.type}
                              onChange={(e) => updateStep(step.id, { type: e.target.value as any })}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              {STEP_TYPES.map(type => (
                                <option key={type.key} value={type.key}>
                                  {type.label}
                                </option>
                              ))}
                            </select>

                            <select
                              value={step.template}
                              onChange={(e) => updateStep(step.id, { template: e.target.value })}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              {EMAIL_TEMPLATES.map(template => (
                                <option key={template} value={template}>
                                  {template.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </option>
                              ))}
                            </select>

                            {step.type === 'email' && (
                              <input
                                type="text"
                                placeholder="Email subject"
                                value={step.subject || ''}
                                onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                                className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                              />
                            )}

                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={step.delay || 3}
                                onChange={(e) => updateStep(step.id, { delay: parseInt(e.target.value) })}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                              <span className="text-xs text-gray-500">days</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => removeStep(step.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        disabled={sequence.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Step Button */}
              <ModernButton
                variant="outline"
                onClick={addStep}
                className="w-full mt-4 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Campaign Step
              </ModernButton>
            </div>
          </div>

          {/* Template Save Panel */}
          <div className="w-80 border-l border-gray-200 p-6 bg-gray-50">
            <h4 className="text-md font-medium text-gray-900 mb-4">Save as Template</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="My Custom Campaign"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe your campaign strategy..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">
                  Make template public (shareable with team)
                </label>
              </div>

              <ModernButton
                variant="primary"
                onClick={handleSaveTemplate}
                loading={saving}
                className="w-full flex items-center justify-center gap-2"
                disabled={!templateName.trim()}
              >
                <Save className="w-4 h-4" />
                Save Template
              </ModernButton>
            </div>

            {/* Campaign Stats */}
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Campaign Overview</h5>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Total Steps: {sequence.length}</div>
                <div>Duration: {sequence.length > 0 ? sequence[sequence.length - 1]!.day : 0} days</div>
                <div>Channels Used: {new Set(sequence.map(s => s.type)).size}</div>
                <div>Avg Delay: {sequence.length > 1 ?
                  Math.round(sequence.slice(1).reduce((sum, step) => sum + (step.delay || 3), 0) / (sequence.length - 1)) : 0
                } days</div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};