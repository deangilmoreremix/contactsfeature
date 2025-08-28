import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Contact } from '../../types';
import {
  Mail,
  Phone,
  MessageSquare,
  Video,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  User,
  Building
} from 'lucide-react';

interface JourneyEvent {
  id: string;
  type: 'interaction' | 'milestone' | 'status_change' | 'ai_insight';
  title: string;
  description: string;
  timestamp: string;
  status?: 'completed' | 'pending' | 'in_progress';
  metadata?: {
    channel?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    score?: number;
  };
}

interface ContactJourneyTimelineProps {
  contact: Contact;
}

const eventIcons = {
  interaction: Mail,
  milestone: CheckCircle,
  status_change: TrendingUp,
  ai_insight: AlertCircle
};

const statusColors = {
  completed: 'text-green-600 bg-green-50',
  pending: 'text-yellow-600 bg-yellow-50',
  in_progress: 'text-blue-600 bg-blue-50'
};

const sentimentColors = {
  positive: 'text-green-600',
  neutral: 'text-gray-600',
  negative: 'text-red-600'
};

// Sample journey data - in a real app, this would come from your backend
const sampleJourneyEvents: JourneyEvent[] = [
  {
    id: '1',
    type: 'interaction',
    title: 'Initial Contact',
    description: 'First outreach email sent introducing our services',
    timestamp: '2024-01-15T10:30:00Z',
    status: 'completed',
    metadata: {
      channel: 'email',
      sentiment: 'neutral'
    }
  },
  {
    id: '2',
    type: 'interaction',
    title: 'Discovery Call',
    description: 'Scheduled 30-minute discovery call to understand requirements',
    timestamp: '2024-01-18T14:00:00Z',
    status: 'completed',
    metadata: {
      channel: 'phone',
      sentiment: 'positive'
    }
  },
  {
    id: '3',
    type: 'milestone',
    title: 'Demo Completed',
    description: 'Product demo delivered, feedback collected',
    timestamp: '2024-01-22T11:00:00Z',
    status: 'completed'
  },
  {
    id: '4',
    type: 'ai_insight',
    title: 'AI Score Update',
    description: 'Lead score increased to 85/100 based on engagement patterns',
    timestamp: '2024-01-23T09:15:00Z',
    status: 'completed',
    metadata: {
      score: 85
    }
  },
  {
    id: '5',
    type: 'interaction',
    title: 'Follow-up Email',
    description: 'Sent personalized proposal based on discovery call insights',
    timestamp: '2024-01-25T16:30:00Z',
    status: 'completed',
    metadata: {
      channel: 'email',
      sentiment: 'positive'
    }
  },
  {
    id: '6',
    type: 'status_change',
    title: 'Status Changed',
    description: 'Contact moved from "Prospect" to "Qualified Lead"',
    timestamp: '2024-01-26T10:00:00Z',
    status: 'completed'
  }
];

export const ContactJourneyTimeline: React.FC<ContactJourneyTimelineProps> = ({ contact }) => {
  // In a real implementation, you would fetch this data based on the contact
  const journeyEvents = sampleJourneyEvents;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getEventIcon = (type: JourneyEvent['type']) => {
    const Icon = eventIcons[type];
    return Icon;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Contact Journey</h3>
          <p className="text-sm text-gray-600">Timeline of interactions and milestones for {contact.name}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{contact.name}</span>
          </div>
          {contact.company && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Building className="w-4 h-4" />
              <span>{contact.company}</span>
            </div>
          )}
        </div>
      </div>

      {/* Journey Timeline */}
      <GlassCard className="p-6">
        <div className="space-y-6">
          {journeyEvents.map((event, index) => {
            const Icon = getEventIcon(event.type);
            const isLast = index === journeyEvents.length - 1;

            return (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                )}

                <div className="flex items-start space-x-4">
                  {/* Event icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    event.status === 'completed' ? 'bg-green-100 text-green-600' :
                    event.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">{event.title}</h4>
                          {event.status && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[event.status]}`}>
                              {event.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>

                        {/* Metadata */}
                        {event.metadata && (
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {event.metadata.channel && (
                              <span className="flex items-center space-x-1">
                                <span>Channel: {event.metadata.channel}</span>
                              </span>
                            )}
                            {event.metadata.sentiment && (
                              <span className={`flex items-center space-x-1 ${sentimentColors[event.metadata.sentiment]}`}>
                                <span>Sentiment: {event.metadata.sentiment}</span>
                              </span>
                            )}
                            {event.metadata.score && (
                              <span className="flex items-center space-x-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>Score: {event.metadata.score}/100</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(event.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Journey Summary */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{journeyEvents.length}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {journeyEvents.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {journeyEvents.filter(e => e.type === 'interaction').length}
              </div>
              <div className="text-sm text-gray-600">Interactions</div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};