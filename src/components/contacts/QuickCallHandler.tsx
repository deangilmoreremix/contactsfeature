import React, { useState, useCallback } from 'react';
import { Contact } from '../../types';
import { ModernButton } from '../ui/ModernButton';
import { GlassCard } from '../ui/GlassCard';
import { callTrackingService } from '../../services/callTrackingService';
import { CallStateDisplay } from './CallStateDisplay';
import { CallControls } from './CallControls';
import { CallScripts } from './CallScripts';
import { CallOutcomeLogger } from './CallOutcomeLogger';
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
          <CallStateDisplay
            callState={callState}
            contactName={contact.name}
            contactPhone={contact.phone || ''}
            callDuration={callDuration}
            formatDuration={formatDuration}
          />

          {/* Call Scripts */}
          <CallScripts
            callState={callState}
            scripts={callScripts}
            selectedScript={selectedScript}
            showScripts={showScripts}
            onToggleScripts={() => setShowScripts(!showScripts)}
            onSelectScript={(script) => {
              setSelectedScript(script);
              setShowScripts(false);
            }}
          />

          {/* Call Controls */}
          <CallControls
            isMuted={isMuted}
            isSpeakerOn={isSpeakerOn}
            onToggleMute={() => setIsMuted(!isMuted)}
            onToggleSpeaker={() => setIsSpeakerOn(!isSpeakerOn)}
          />

          {/* Call Completion Form */}
          <CallOutcomeLogger
            callState={callState}
            callOutcome={callOutcome}
            callNotes={callNotes}
            followUpRequired={followUpRequired}
            followUpDate={followUpDate}
            onOutcomeSelect={handleOutcomeSelect}
            onNotesChange={setCallNotes}
            onFollowUpToggle={() => setFollowUpRequired(!followUpRequired)}
            onFollowUpDateChange={setFollowUpDate}
          />
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