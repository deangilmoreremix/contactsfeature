import React, { useState } from 'react';
import { Contact } from '../../../types/contact';
import { GlassCard } from '../../ui/GlassCard';
import { ModernButton } from '../../ui/ModernButton';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Mail,
  Phone,
  Video,
  MessageSquare,
  Plus
} from 'lucide-react';

interface CalendarViewProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
}

interface CalendarEvent {
  id: string;
  contactId: string;
  contact: Contact;
  type: 'email' | 'call' | 'meeting' | 'note';
  date: Date;
  title: string;
}

const eventTypeIcons = {
  email: Mail,
  call: Phone,
  meeting: Video,
  note: MessageSquare
};

const eventTypeColors = {
  email: 'bg-blue-100 text-blue-700 border-blue-300',
  call: 'bg-green-100 text-green-700 border-green-300',
  meeting: 'bg-purple-100 text-purple-700 border-purple-300',
  note: 'bg-yellow-100 text-yellow-700 border-yellow-300'
};

export function CalendarView({ contacts, onContactClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const generateMockEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    contacts.forEach((contact, index) => {
      if (contact.lastConnected) {
        const date = new Date();
        date.setDate(date.getDate() - (index % 30));

        events.push({
          id: `${contact.id}-last`,
          contactId: contact.id,
          contact,
          type: ['email', 'call', 'meeting', 'note'][index % 4] as any,
          date,
          title: `Last contact with ${contact.name}`
        });
      }

      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + (index % 14));
      events.push({
        id: `${contact.id}-followup`,
        contactId: contact.id,
        contact,
        type: 'meeting',
        date: followUpDate,
        title: `Follow-up with ${contact.name}`
      });
    });
    return events;
  };

  const events = generateMockEvents();

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, firstDay, lastDay };
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event =>
      event.date.toDateString() === date.toDateString()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const renderMonthView = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - startingDayOfWeek + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
      const dayEvents = isValidDay ? getEventsForDate(date) : [];
      const isToday = isValidDay && date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={i}
          className={`min-h-[120px] p-2 border border-gray-200 dark:border-gray-700 ${
            isValidDay ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
          } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
        >
          {isValidDay && (
            <>
              <div className={`text-sm font-semibold mb-2 ${
                isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {dayNumber}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => {
                  const Icon = eventTypeIcons[event.type];
                  return (
                    <button
                      key={event.id}
                      onClick={() => onContactClick(event.contact)}
                      className={`w-full text-left px-2 py-1 rounded text-xs truncate border ${eventTypeColors[event.type]} hover:shadow-md transition-shadow`}
                    >
                      <Icon className="w-3 h-3 inline mr-1" />
                      {event.contact.name}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {monthName}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <ModernButton variant="secondary" onClick={navigateToToday} className="text-sm">
              Today
            </ModernButton>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModernButton variant="primary" icon={Plus} className="text-sm">
            Schedule Activity
          </ModernButton>
        </div>
      </div>

      <GlassCard className="flex-1 overflow-hidden">
        <div className="grid grid-cols-7 gap-0 h-full">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="bg-gray-100 dark:bg-gray-800 p-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
            >
              {day}
            </div>
          ))}
          {renderMonthView()}
        </div>
      </GlassCard>

      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
          <span className="text-gray-600 dark:text-gray-400">Email</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
          <span className="text-gray-600 dark:text-gray-400">Call</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></div>
          <span className="text-gray-600 dark:text-gray-400">Meeting</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
          <span className="text-gray-600 dark:text-gray-400">Note</span>
        </div>
      </div>
    </div>
  );
}
