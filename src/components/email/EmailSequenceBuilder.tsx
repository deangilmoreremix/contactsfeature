import React, { useState, useCallback } from 'react';
import { Contact } from '../../types/contact';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { useToast } from '../ui/Toast';
import {
  Target,
  Plus,
  Trash2,
  Clock,
  Mail,
  ArrowRight,
  Settings,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';

interface EmailSequenceStep {
  id: string;
  name: string;
  delay: number; // days
  subject: string;
  body: string;
  condition?: 'no_response' | 'opened' | 'clicked' | 'always';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  templateId?: string;
}

interface EmailSequence {
  id: string;
  name: string;
  description: string;
  steps: EmailSequenceStep[];
  isActive: boolean;
  targetContacts: string[]; // contact IDs
  createdAt: Date;
  updatedAt: Date;
}

interface EmailSequenceBuilderProps {
  contact: Contact;
  onSequenceCreate?: (sequence: EmailSequence) => void;
  onSequenceUpdate?: (sequenceId: string, sequence: EmailSequence) => void;
  existingSequences?: EmailSequence[];
  className?: string;
}

export const EmailSequenceBuilder: React.FC<EmailSequenceBuilderProps> = ({
  contact,
  onSequenceCreate,
  onSequenceUpdate,
  existingSequences = [],
  className = ''
}) => {
  const { showToast } = useToast();

  const [sequences, setSequences] = useState<EmailSequence[]>(existingSequences);
  const [activeSequence, setActiveSequence] = useState<EmailSequence | null>(null);
  const [showSequenceBuilder, setShowSequenceBuilder] = useState(false);
  const [newSequenceName, setNewSequenceName] = useState('');
  const [newSequenceDescription, setNewSequenceDescription] = useState('');

  const createNewSequence = useCallback(() => {
    if (!newSequenceName.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a sequence name'
      });
      return;
    }

    const newSequence: EmailSequence = {
      id: Date.now().toString(),
      name: newSequenceName,
      description: newSequenceDescription,
      steps: [],
      isActive: false,
      targetContacts: [contact.id],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSequences(prev => [...prev, newSequence]);
    setActiveSequence(newSequence);
    setShowSequenceBuilder(true);
    setNewSequenceName('');
    setNewSequenceDescription('');

    onSequenceCreate?.(newSequence);

    showToast({
      type: 'success',
      title: 'Sequence Created',
      message: `Email sequence "${newSequence.name}" created successfully`
    });
  }, [newSequenceName, newSequenceDescription, contact.id, onSequenceCreate, showToast]);

  const addSequenceStep = useCallback(() => {
    if (!activeSequence) return;

    const newStep: EmailSequenceStep = {
      id: Date.now().toString(),
      name: `Step ${activeSequence.steps.length + 1}`,
      delay: activeSequence.steps.length * 3, // Default 3 days between steps
      subject: `Follow-up ${activeSequence.steps.length + 1}: ${contact.firstName}`,
      body: `Hi ${contact.firstName},\n\nI wanted to follow up on my previous email...`,
      condition: 'no_response',
      priority: 'normal'
    };

    const updatedSequence = {
      ...activeSequence,
      steps: [...activeSequence.steps, newStep],
      updatedAt: new Date()
    };

    setActiveSequence(updatedSequence);
    setSequences(prev => prev.map(seq =>
      seq.id === activeSequence.id ? updatedSequence : seq
    ));

    onSequenceUpdate?.(activeSequence.id, updatedSequence);
  }, [activeSequence, contact.firstName, onSequenceUpdate]);

  const updateSequenceStep = useCallback((stepId: string, updates: Partial<EmailSequenceStep>) => {
    if (!activeSequence) return;

    const updatedSequence = {
      ...activeSequence,
      steps: activeSequence.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
      updatedAt: new Date()
    };

    setActiveSequence(updatedSequence);
    setSequences(prev => prev.map(seq =>
      seq.id === activeSequence.id ? updatedSequence : seq
    ));

    onSequenceUpdate?.(activeSequence.id, updatedSequence);
  }, [activeSequence, onSequenceUpdate]);

  const removeSequenceStep = useCallback((stepId: string) => {
    if (!activeSequence) return;

    const updatedSequence = {
      ...activeSequence,
      steps: activeSequence.steps.filter(step => step.id !== stepId),
      updatedAt: new Date()
    };

    setActiveSequence(updatedSequence);
    setSequences(prev => prev.map(seq =>
      seq.id === activeSequence.id ? updatedSequence : seq
    ));

    onSequenceUpdate?.(activeSequence.id, updatedSequence);
  }, [activeSequence, onSequenceUpdate]);

  const toggleSequenceActive = useCallback((sequenceId: string) => {
    const updatedSequences = sequences.map(seq => {
      if (seq.id === sequenceId) {
        const updatedSeq = { ...seq, isActive: !seq.isActive, updatedAt: new Date() };
        if (seq.id === activeSequence?.id) {
          setActiveSequence(updatedSeq);
        }
        onSequenceUpdate?.(seq.id, updatedSeq);
        return updatedSeq;
      }
      return seq;
    });

    setSequences(updatedSequences);

    const targetSequence = updatedSequences.find(seq => seq.id === sequenceId);
    showToast({
      type: 'success',
      title: targetSequence?.isActive ? 'Sequence Activated' : 'Sequence Paused',
      message: `Email sequence "${targetSequence?.name}" is now ${targetSequence?.isActive ? 'active' : 'paused'}`
    });
  }, [sequences, activeSequence, onSequenceUpdate, showToast]);

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'no_response': return 'text-orange-600 bg-orange-100';
      case 'opened': return 'text-blue-600 bg-blue-100';
      case 'clicked': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-500" />
          Email Sequences
        </h3>
        <ModernButton
          variant="primary"
          size="sm"
          onClick={() => setShowSequenceBuilder(!showSequenceBuilder)}
          className="flex items-center space-x-1"
        >
          <Plus className="w-4 h-4" />
          <span>New Sequence</span>
        </ModernButton>
      </div>

      {/* Create New Sequence */}
      {showSequenceBuilder && !activeSequence && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-900 mb-3">Create New Sequence</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">
                Sequence Name
              </label>
              <input
                type="text"
                value={newSequenceName}
                onChange={(e) => setNewSequenceName(e.target.value)}
                placeholder="e.g., Initial Outreach Follow-up"
                className="w-full p-2 text-sm border border-blue-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={newSequenceDescription}
                onChange={(e) => setNewSequenceDescription(e.target.value)}
                placeholder="Describe the purpose of this sequence..."
                rows={2}
                className="w-full p-2 text-sm border border-blue-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <ModernButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSequenceBuilder(false);
                  setNewSequenceName('');
                  setNewSequenceDescription('');
                }}
              >
                Cancel
              </ModernButton>
              <ModernButton
                variant="primary"
                size="sm"
                onClick={createNewSequence}
                disabled={!newSequenceName.trim()}
              >
                Create Sequence
              </ModernButton>
            </div>
          </div>
        </div>
      )}

      {/* Existing Sequences */}
      <div className="space-y-4">
        {sequences.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No email sequences created yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create automated follow-up sequences to nurture your contacts
            </p>
          </div>
        ) : (
          sequences.map((sequence) => (
            <div key={sequence.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${sequence.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <h4 className="font-medium text-gray-900">{sequence.name}</h4>
                    {sequence.description && (
                      <p className="text-sm text-gray-600">{sequence.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {sequence.steps.length} steps
                  </span>
                  <ModernButton
                    variant={sequence.isActive ? "outline" : "primary"}
                    size="sm"
                    onClick={() => toggleSequenceActive(sequence.id)}
                    className="flex items-center space-x-1"
                  >
                    {sequence.isActive ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Start</span>
                      </>
                    )}
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveSequence(sequence)}
                    className="flex items-center space-x-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Edit</span>
                  </ModernButton>
                </div>
              </div>

              {/* Sequence Steps Preview */}
              {sequence.steps.length > 0 && (
                <div className="flex items-center space-x-2 mt-3">
                  {sequence.steps.slice(0, 5).map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div className="flex items-center space-x-1 bg-gray-100 rounded px-2 py-1">
                        <Mail className="w-3 h-3 text-gray-600" />
                        <span className="text-xs text-gray-700">{step.delay}d</span>
                      </div>
                      {index < sequence.steps.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-gray-400 mx-1" />
                      )}
                    </div>
                  ))}
                  {sequence.steps.length > 5 && (
                    <span className="text-xs text-gray-500">
                      +{sequence.steps.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Sequence Builder Modal */}
      {activeSequence && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Sequence: {activeSequence.name}
              </h3>
              <button
                onClick={() => setActiveSequence(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-600">
                    {activeSequence.steps.length} steps • Target: {contact.firstName} {contact.lastName}
                  </p>
                </div>
                <ModernButton
                  variant="primary"
                  size="sm"
                  onClick={addSequenceStep}
                  className="flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Step</span>
                </ModernButton>
              </div>

              {/* Sequence Steps */}
              <div className="space-y-4">
                {activeSequence.steps.map((step, index) => (
                  <div key={step.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{step.name}</h4>
                          <p className="text-sm text-gray-600">Send {step.delay} days after previous step</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeSequenceStep(step.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Delay (days)
                        </label>
                        <input
                          type="number"
                          value={step.delay}
                          onChange={(e) => updateSequenceStep(step.id, { delay: parseInt(e.target.value) || 0 })}
                          min="0"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Condition
                        </label>
                        <select
                          value={step.condition || 'no_response'}
                          onChange={(e) => updateSequenceStep(step.id, { condition: e.target.value as any })}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="always">Always send</option>
                          <option value="no_response">If no response</option>
                          <option value="opened">If opened</option>
                          <option value="clicked">If clicked</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          value={step.priority || 'normal'}
                          onChange={(e) => updateSequenceStep(step.id, { priority: e.target.value as any })}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Step Name
                        </label>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateSequenceStep(step.id, { name: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={step.subject}
                        onChange={(e) => updateSequenceStep(step.id, { subject: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Body
                      </label>
                      <textarea
                        value={step.body}
                        onChange={(e) => updateSequenceStep(step.id, { body: e.target.value })}
                        rows={4}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Step Conditions Display */}
                    <div className="flex items-center space-x-2 mt-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(step.condition || 'no_response')}`}>
                        {step.condition === 'no_response' ? 'No Response' :
                         step.condition === 'opened' ? 'If Opened' :
                         step.condition === 'clicked' ? 'If Clicked' : 'Always'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(step.priority || 'normal')}`}>
                        {step.priority || 'Normal'} Priority
                      </span>
                    </div>
                  </div>
                ))}

                {activeSequence.steps.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No steps in this sequence yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click "Add Step" to create your first follow-up email
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <ModernButton
                variant="outline"
                onClick={() => setActiveSequence(null)}
              >
                Close
              </ModernButton>
              <ModernButton
                variant="primary"
                onClick={() => setActiveSequence(null)}
                disabled={activeSequence.steps.length === 0}
              >
                Save Sequence
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};