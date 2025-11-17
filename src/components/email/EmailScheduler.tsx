import React, { useState, useEffect } from 'react';
import { Contact } from '../../types/contact';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { useToast } from '../ui/Toast';
import {
  Calendar,
  Clock,
  Send,
  Zap,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface EmailSchedulerProps {
  contact: Contact;
  emailSubject: string;
  emailBody: string;
  onSchedule?: (scheduleData: EmailSchedule) => void;
  onSendNow?: () => void;
  className?: string;
}

interface EmailSchedule {
  scheduledDate: Date;
  timezone: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  followUpSequence?: FollowUpStep[] | undefined;
  trackingEnabled: boolean;
  optimalTime?: boolean;
}

interface FollowUpStep {
  id: string;
  delay: number; // days
  subject: string;
  body: string;
  condition?: 'no_response' | 'opened' | 'clicked';
}

interface OptimalTime {
  time: string;
  score: number;
  reason: string;
}

export const EmailScheduler: React.FC<EmailSchedulerProps> = ({
  contact,
  emailSubject,
  emailBody,
  onSchedule,
  onSendNow,
  className = ''
}) => {
  const { showToast } = useToast();

  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [useOptimalTime, setUseOptimalTime] = useState(false);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTime[]>([]);
  const [isCalculatingOptimal, setIsCalculatingOptimal] = useState(false);
  const [followUpSteps, setFollowUpSteps] = useState<FollowUpStep[]>([]);
  const [showFollowUpBuilder, setShowFollowUpBuilder] = useState(false);

  // Calculate optimal send times based on contact data
  const calculateOptimalTimes = async () => {
    setIsCalculatingOptimal(true);

    try {
      // Simulate AI calculation of optimal send times
      // In real implementation, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockOptimalTimes: OptimalTime[] = [
        { time: '09:00', score: 85, reason: 'High open rates in morning' },
        { time: '14:30', score: 78, reason: 'Good afternoon engagement' },
        { time: '11:15', score: 72, reason: 'Mid-morning productivity peak' },
        { time: '16:00', score: 65, reason: 'End of workday focus' }
      ];

      setOptimalTimes(mockOptimalTimes);
    } catch (error) {
      console.error('Failed to calculate optimal times:', error);
      showToast({
        type: 'error',
        title: 'Calculation Failed',
        message: 'Could not calculate optimal send times'
      });
    } finally {
      setIsCalculatingOptimal(false);
    }
  };

  useEffect(() => {
    if (useOptimalTime) {
      calculateOptimalTimes();
    }
  }, [useOptimalTime]);

  const handleScheduleEmail = () => {
    if (!scheduledDate || !scheduledTime) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select both date and time for scheduling'
      });
      return;
    }

    const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

    if (scheduleDateTime <= new Date()) {
      showToast({
        type: 'error',
        title: 'Invalid Time',
        message: 'Scheduled time must be in the future'
      });
      return;
    }

    const scheduleData: EmailSchedule = {
      scheduledDate: scheduleDateTime,
      timezone,
      priority,
      followUpSequence: followUpSteps.length > 0 ? followUpSteps : undefined,
      trackingEnabled,
      optimalTime: useOptimalTime
    };

    onSchedule?.(scheduleData);

    showToast({
      type: 'success',
      title: 'Email Scheduled',
      message: `Email scheduled for ${scheduleDateTime.toLocaleString()}`
    });
  };

  const handleSendImmediately = () => {
    onSendNow?.();
  };

  const addFollowUpStep = () => {
    const newStep: FollowUpStep = {
      id: Date.now().toString(),
      delay: 3,
      subject: `Follow-up: ${emailSubject}`,
      body: `Hi ${contact.firstName},\n\nI wanted to follow up on my previous email...`,
      condition: 'no_response'
    };
    setFollowUpSteps([...followUpSteps, newStep]);
  };

  const removeFollowUpStep = (id: string) => {
    setFollowUpSteps(followUpSteps.filter(step => step.id !== id));
  };

  const updateFollowUpStep = (id: string, updates: Partial<FollowUpStep>) => {
    setFollowUpSteps(steps =>
      steps.map(step =>
        step.id === id ? { ...step, ...updates } : step
      )
    );
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
          <Calendar className="w-5 h-5 mr-2 text-blue-500" />
          Email Scheduler
        </h3>
        <div className="flex items-center space-x-2">
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => setShowFollowUpBuilder(!showFollowUpBuilder)}
            className="flex items-center space-x-1"
          >
            <Target className="w-4 h-4" />
            <span>Follow-ups</span>
          </ModernButton>
        </div>
      </div>

      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          <ModernButton
            variant="primary"
            onClick={handleSendImmediately}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4" />
            <span>Send Now</span>
          </ModernButton>

          <div className="text-gray-400">or</div>

          <ModernButton
            variant="outline"
            onClick={handleScheduleEmail}
            disabled={!scheduledDate || !scheduledTime}
            className="flex items-center space-x-2"
          >
            <Clock className="w-4 h-4" />
            <span>Schedule</span>
          </ModernButton>
        </div>

        {/* Scheduling Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send Time
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
          </select>
        </div>

        {/* Priority and Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="flex space-x-2">
              {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                    priority === p
                      ? getPriorityColor(p)
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={trackingEnabled}
                onChange={(e) => setTrackingEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable tracking</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useOptimalTime}
                onChange={(e) => setUseOptimalTime(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Use optimal send time</span>
            </label>
          </div>
        </div>

        {/* Optimal Time Suggestions */}
        {useOptimalTime && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-blue-900 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Optimal Send Times
              </h4>
              {isCalculatingOptimal && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>

            {optimalTimes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {optimalTimes.map((time, index) => (
                  <button
                    key={index}
                    onClick={() => setScheduledTime(time.time)}
                    className="flex items-center justify-between p-2 bg-white rounded border hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span className="text-sm font-medium">{time.time}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-600">{time.score}%</span>
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-blue-700">
                Calculating optimal send times based on contact's timezone and engagement patterns...
              </p>
            )}
          </div>
        )}

        {/* Follow-up Sequence Builder */}
        {showFollowUpBuilder && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-purple-900 flex items-center">
                <Target className="w-4 h-4 mr-1" />
                Follow-up Sequence
              </h4>
              <ModernButton
                variant="outline"
                size="sm"
                onClick={addFollowUpStep}
                className="text-purple-700 border-purple-300 hover:bg-purple-100"
              >
                Add Step
              </ModernButton>
            </div>

            <div className="space-y-3">
              {followUpSteps.map((step, index) => (
                <div key={step.id} className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Step {index + 1} - {step.delay} days later
                    </span>
                    <button
                      onClick={() => removeFollowUpStep(step.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Delay (days)
                      </label>
                      <input
                        type="number"
                        value={step.delay}
                        onChange={(e) => updateFollowUpStep(step.id, { delay: parseInt(e.target.value) })}
                        min="1"
                        className="w-full p-1 text-sm border border-gray-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Condition
                      </label>
                      <select
                        value={step.condition || 'no_response'}
                        onChange={(e) => updateFollowUpStep(step.id, { condition: e.target.value as any })}
                        className="w-full p-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="no_response">If no response</option>
                        <option value="opened">If opened</option>
                        <option value="clicked">If clicked</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={step.subject}
                      onChange={(e) => updateFollowUpStep(step.id, { subject: e.target.value })}
                      className="w-full p-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              ))}

              {followUpSteps.length === 0 && (
                <p className="text-sm text-purple-700 text-center py-4">
                  No follow-up steps added yet. Click "Add Step" to create an automated sequence.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Schedule Summary */}
        {(scheduledDate && scheduledTime) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Schedule Summary</span>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              <p><strong>Date:</strong> {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleTimeString()}</p>
              <p><strong>Timezone:</strong> {timezone}</p>
              <p><strong>Priority:</strong> {priority}</p>
              {followUpSteps.length > 0 && (
                <p><strong>Follow-ups:</strong> {followUpSteps.length} automated steps</p>
              )}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};