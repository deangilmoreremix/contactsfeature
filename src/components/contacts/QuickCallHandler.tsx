import React, { useState, useCallback } from 'react';
import { Contact } from '../../types';
import { ModernButton } from '../ui/ModernButton';
import { GlassCard } from '../ui/GlassCard';
import { callTrackingService } from '../../services/callTrackingService';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Clock,
  MessageSquare,
  Calendar,
  FileText,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface QuickCallHandlerProps {
   contact: Contact;
   isOpen: boolean;
   onClose: () => void;
   onCallComplete?: (callData: CallData) => Promise<void>;
   callConfig?: {
     ringingDelay?: number; // milliseconds
     maxCallDuration?: number; // seconds
   };
 }

interface CallData {
  contactId: string;
  duration: number;
  outcome: 'completed' | 'no_answer' | 'busy' | 'voicemail' | 'cancelled';
  notes: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  callType: 'outbound' | 'inbound';
}

interface CallScript {
  id: string;
  name: string;
  purpose: string;
  steps: string[];
  talkingPoints: string[];
}

const callScripts: CallScript[] = [
  {
    id: 'introduction',
    name: 'Introduction Call',
    purpose: 'Introduce yourself and company, qualify interest',
    steps: [
      'Greet and confirm you\'re speaking with the right person',
      'Introduce yourself and your company',
      'Explain the purpose of your call',
      'Ask about their current situation/challenges',
      'Share a brief value proposition',
      'Schedule next steps or follow-up'
    ],
    talkingPoints: [
      'Current industry trends affecting their business',
      'Common challenges we help solve',
      'Success stories from similar companies',
      'Next steps for moving forward'
    ]
  },
  {
    id: 'follow-up',
    name: 'Follow-up Call',
    purpose: 'Follow up on previous conversation or email',
    steps: [
      'Reference previous conversation/email',
      'Ask about their thoughts on the discussion',
      'Address any questions or concerns',
      'Provide additional information if needed',
      'Move towards next action step'
    ],
    talkingPoints: [
      'Specific points from previous conversation',
      'Answers to questions they had',
      'Additional resources or information',
      'Proposed timeline for next steps'
    ]
  },
  {
    id: 'qualification',
    name: 'Qualification Call',
    purpose: 'Deep dive into needs, budget, and timeline',
    steps: [
      'Confirm their role and decision-making authority',
      'Explore their specific pain points',
      'Discuss budget range and approval process',
      'Understand timeline and urgency',
      'Identify key stakeholders and influencers'
    ],
    talkingPoints: [
      'Budget considerations and ROI expectations',
      'Current vs. desired state analysis',
      'Competitive landscape and differentiation',
      'Implementation timeline and resources needed'
    ]
  }
];

export const QuickCallHandler: React.FC<QuickCallHandlerProps> = ({
   contact,
   isOpen,
   onClose,
   onCallComplete,
   callConfig = { ringingDelay: 2000, maxCallDuration: 3600 }
 }) => {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'completed'>('idle');
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedScript, setSelectedScript] = useState<CallScript | null>(null);
  const [showScripts, setShowScripts] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState<CallData['outcome']>('completed');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Timer for call duration
  React.useEffect(() => {
    let interval: NodeJS.Timeout;

    if (callState === 'connected' && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime.getTime()) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState, callStartTime]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const initiateCall = useCallback(async () => {
    if (!contact.phone) {
      alert('No phone number available for this contact');
      return;
    }

    setCallState('calling');
    setCallStartTime(new Date());

    try {
      // Track call initiation
      callTrackingService.trackCallEvent({
        contactId: contact.id,
        eventType: 'initiated',
        phoneNumber: contact.phone,
        callType: 'outbound'
      });

      // In a real implementation, this would integrate with VoIP services
      // For demo purposes, we'll simulate the call flow
      setTimeout(() => {
         setCallState('connected');
       }, callConfig.ringingDelay); // Configurable ringing delay

    } catch (error) {
      console.error('Failed to initiate call:', error);
      setCallState('idle');
      alert('Failed to initiate call. Please try again.');
    }
  }, [contact]);

  const endCall = useCallback(async () => {
    if (callState !== 'connected') return;

    const endTime = new Date();
    const duration = callStartTime ? Math.floor((endTime.getTime() - callStartTime.getTime()) / 1000) : 0;

    setCallState('completed');

    // Track call completion
    callTrackingService.trackCallEvent({
      contactId: contact.id,
      eventType: 'completed',
      phoneNumber: contact.phone || '',
      callType: 'outbound',
      duration,
      outcome: callOutcome,
      notes: callNotes
    });

    // Call completion callback
    if (onCallComplete) {
      const callData: CallData = {
        contactId: contact.id,
        duration,
        outcome: callOutcome,
        notes: callNotes,
        followUpRequired,
        callType: 'outbound'
      };

      if (followUpDate) {
        callData.followUpDate = new Date(followUpDate);
      }

      await onCallComplete(callData);
    }
  }, [callState, callStartTime, contact, callOutcome, callNotes, followUpRequired, followUpDate, onCallComplete]);

  const handleOutcomeSelect = useCallback((outcome: CallData['outcome']) => {
    setCallOutcome(outcome);

    // Auto-set follow-up based on outcome
    if (outcome === 'no_answer' || outcome === 'busy' || outcome === 'voicemail') {
      setFollowUpRequired(true);
    }
  }, []);

  const scheduleFollowUp = useCallback(() => {
    if (!followUpDate) return;

    // In a real implementation, this would create a calendar event or task
    alert(`Follow-up scheduled for ${new Date(followUpDate).toLocaleString()}`);
  }, [followUpDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {callState === 'idle' ? 'Call' : callState === 'calling' ? 'Calling...' : 'On Call with'}
              </h2>
              <p className="text-sm text-gray-600">{contact.name} at {contact.company}</p>
              {callState === 'connected' && (
                <p className="text-sm font-medium text-green-600">
                  Duration: {formatDuration(callDuration)}
                </p>
              )}
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
          {/* Call State Display */}
          <div className="text-center">
            {callState === 'idle' && (
              <div className="space-y-4">
                <div className="text-6xl text-gray-300">
                  <Phone className="mx-auto" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">{contact.phone || 'No phone number'}</p>
                  <p className="text-sm text-gray-600">Tap to call</p>
                </div>
              </div>
            )}

            {callState === 'calling' && (
              <div className="space-y-4">
                <div className="text-6xl text-blue-500 animate-pulse">
                  <PhoneCall className="mx-auto" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">Calling...</p>
                  <p className="text-sm text-gray-600">Please wait</p>
                </div>
              </div>
            )}

            {callState === 'connected' && (
              <div className="space-y-4">
                <div className="text-6xl text-green-500">
                  <PhoneCall className="mx-auto" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">Connected</p>
                  <p className="text-sm text-gray-600">{formatDuration(callDuration)}</p>
                </div>
              </div>
            )}

            {callState === 'completed' && (
              <div className="space-y-4">
                <div className="text-6xl text-gray-400">
                  <CheckCircle className="mx-auto" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">Call Completed</p>
                  <p className="text-sm text-gray-600">Duration: {formatDuration(callDuration)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Call Scripts */}
          {callState === 'idle' && (
            <div>
              <button
                onClick={() => setShowScripts(!showScripts)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>{selectedScript ? `Using: ${selectedScript.name}` : 'Choose Call Script'}</span>
              </button>

              {showScripts && (
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {callScripts.map((script) => (
                    <button
                      key={script.id}
                      onClick={() => {
                        setSelectedScript(script);
                        setShowScripts(false);
                      }}
                      className={`p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left ${
                        selectedScript?.id === script.id ? 'border-blue-300 bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{script.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{script.purpose}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Script Display */}
          {selectedScript && callState === 'connected' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">{selectedScript.name}</h4>

              <div className="space-y-3">
                <div>
                  <h5 className="text-sm font-medium text-blue-800 mb-2">Call Steps:</h5>
                  <ol className="text-sm text-blue-700 space-y-1">
                    {selectedScript.steps.map((step, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-blue-800 mb-2">Key Talking Points:</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {selectedScript.talkingPoints.map((point, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Call Controls */}
          {callState === 'connected' && (
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-full transition-colors ${
                  isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`p-3 rounded-full transition-colors ${
                  !isSpeakerOn ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          )}

          {/* Call Completion Form */}
          {callState === 'completed' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Call Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'completed', label: 'Completed', icon: CheckCircle },
                    { value: 'no_answer', label: 'No Answer', icon: PhoneOff },
                    { value: 'busy', label: 'Busy', icon: AlertCircle },
                    { value: 'voicemail', label: 'Voicemail', icon: MessageSquare }
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleOutcomeSelect(value as CallData['outcome'])}
                      className={`p-3 border rounded-lg transition-colors ${
                        callOutcome === value
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Call Notes</label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="What was discussed? Key takeaways..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="followUp"
                  checked={followUpRequired}
                  onChange={(e) => setFollowUpRequired(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="followUp" className="text-sm font-medium text-gray-700">
                  Follow-up required
                </label>
              </div>

              {followUpRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date</label>
                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {callState === 'idle' && (
              <ModernButton
                variant="outline"
                onClick={() => window.open(`tel:${contact.phone}`, '_blank')}
                className="flex items-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>Direct Dial</span>
              </ModernButton>
            )}

            {callState === 'completed' && followUpRequired && followUpDate && (
              <ModernButton
                variant="outline"
                onClick={scheduleFollowUp}
                className="flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule Follow-up</span>
              </ModernButton>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {callState === 'idle' && (
              <ModernButton
                onClick={initiateCall}
                disabled={!contact.phone}
                className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Start Call</span>
              </ModernButton>
            )}

            {callState === 'connected' && (
              <ModernButton
                onClick={endCall}
                className="bg-red-600 hover:bg-red-700 flex items-center space-x-2"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </ModernButton>
            )}

            {callState === 'completed' && (
              <ModernButton
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Done
              </ModernButton>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};