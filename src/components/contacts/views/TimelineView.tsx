import React, { useState } from 'react';
import { Contact } from '../../../types/contact';
import { GlassCard } from '../../ui/GlassCard';
import { ModernButton } from '../../ui/ModernButton';
import {
  Mail,
  Phone,
  Video,
  MessageSquare,
  UserPlus,
  TrendingUp,
  Calendar,
  Filter
} from 'lucide-react';

interface TimelineViewProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
}

interface TimelineEvent {
  id: string;
  contactId: string;
  contact: Contact;
  type: 'email' | 'call' | 'meeting' | 'note' | 'status_change' | 'created';
  title: string;
  description: string;
  timestamp: Date;
}

const eventTypeConfig = {
  email: { icon: Mail, color: 'bg-blue-500', label: 'Email' },
  call: { icon: Phone, color: 'bg-green-500', label: 'Call' },
  meeting: { icon: Video, color: 'bg-purple-500', label: 'Meeting' },
  note: { icon: MessageSquare, color: 'bg-yellow-500', label: 'Note' },
  status_change: { icon: TrendingUp, color: 'bg-orange-500', label: 'Status Change' },
  created: { icon: UserPlus, color: 'bg-indigo-500', label: 'Created' }
};

export function TimelineView({ contacts, onContactClick }: TimelineViewProps) {
  const [selectedEventTypes, setSelectedEventTypes] = useState<Set<string>>(
    new Set(['email', 'call', 'meeting', 'note', 'status_change', 'created'])
  );
  const [showFilters, setShowFilters] = useState(false);

  const generateTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    contacts.forEach((contact, index) => {
      const createdDate = new Date(contact.createdAt);
      events.push({
        id: `${contact.id}-created`,
        contactId: contact.id,
        contact,
        type: 'created',
        title: 'Contact Added',
        description: `${contact.name} was added to the system`,
        timestamp: createdDate
      });

      if (contact.lastConnected) {
        const lastContactDate = new Date();
        lastContactDate.setDate(lastContactDate.getDate() - (index % 15));

        const eventTypes = ['email', 'call', 'meeting', 'note'] as const;
        const randomType = eventTypes[index % eventTypes.length];

        events.push({
          id: `${contact.id}-last-contact`,
          contactId: contact.id,
          contact,
          type: randomType,
          title: `${eventTypeConfig[randomType].label} with ${contact.name}`,
          description: `Had a productive ${randomType} discussion about ${contact.company}'s needs`,
          timestamp: lastContactDate
        });
      }

      if (contact.status) {
        const statusChangeDate = new Date();
        statusChangeDate.setDate(statusChangeDate.getDate() - (index % 20));

        events.push({
          id: `${contact.id}-status`,
          contactId: contact.id,
          contact,
          type: 'status_change',
          title: 'Status Updated',
          description: `Contact status changed to ${contact.status}`,
          timestamp: statusChangeDate
        });
      }
    });

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const events = generateTimelineEvents();

  const filteredEvents = events.filter(event => selectedEventTypes.has(event.type));

  const toggleEventType = (type: string) => {
    const newSelected = new Set(selectedEventTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedEventTypes(newSelected);
  };

  const groupEventsByDate = () => {
    const grouped: Record<string, TimelineEvent[]> = {};

    filteredEvents.forEach(event => {
      const dateKey = event.timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  };

  const groupedEvents = groupEventsByDate();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activity Timeline
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({filteredEvents.length} events)
          </span>
        </div>

        <ModernButton
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          icon={Filter}
          className="text-sm"
        >
          Filter Events
        </ModernButton>
      </div>

      {showFilters && (
        <GlassCard className="mb-4 p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Event Types</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(eventTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              const isSelected = selectedEventTypes.has(type);

              return (
                <button
                  key={type}
                  onClick={() => toggleEventType(type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{config.label}</span>
                </button>
              );
            })}
          </div>
        </GlassCard>
      )}

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date} className="mb-8">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg mb-4 shadow-lg z-10 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-semibold">{date}</span>
            </div>

            <div className="relative pl-8 space-y-4">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-600"></div>

              {dateEvents.map((event, index) => {
                const config = eventTypeConfig[event.type];
                const Icon = config.icon;

                return (
                  <div key={event.id} className="relative">
                    <div className={`absolute left-[-28px] w-8 h-8 rounded-full ${config.color} flex items-center justify-center shadow-lg z-10`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>

                    <GlassCard
                      className="ml-6 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={() => onContactClick(event.contact)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <img
                            src={event.contact.avatarSrc}
                            alt={event.contact.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {event.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {event.description}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {event.timestamp.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {event.contact.company}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {event.contact.title}
                        </span>
                      </div>
                    </GlassCard>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No events found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Try adjusting your event type filters to see more activity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
