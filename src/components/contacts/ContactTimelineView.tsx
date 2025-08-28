import React from 'react';
import { Contact } from '../../types';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { 
  Clock, 
  Mail, 
  Phone, 
  Calendar, 
  Edit, 
  MoreHorizontal,
  Star,
  Building,
  Target
} from 'lucide-react';

interface ContactTimelineViewProps {
  contacts: Contact[];
  selectedContacts: string[];
  onContactSelect: (contactId: string) => void;
  onContactClick: (contact: Contact) => void;
  onAnalyze?: (contact: Contact) => Promise<boolean>;
  analyzingContactIds?: string[];
}

const interestColors = {
  hot: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  cold: 'bg-gray-400'
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

const groupByTime = (contacts: Contact[]) => {
  const now = new Date();
  const groups = {
    today: [] as Contact[],
    yesterday: [] as Contact[],
    thisWeek: [] as Contact[],
    thisMonth: [] as Contact[],
    older: [] as Contact[]
  };

  contacts.forEach(contact => {
    const lastActivity = contact.lastConnected || contact.updatedAt;
    const activityDate = new Date(lastActivity);
    const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      groups.today.push(contact);
    } else if (diffDays === 1) {
      groups.yesterday.push(contact);
    } else if (diffDays <= 7) {
      groups.thisWeek.push(contact);
    } else if (diffDays <= 30) {
      groups.thisMonth.push(contact);
    } else {
      groups.older.push(contact);
    }
  });

  return groups;
};

export const ContactTimelineView: React.FC<ContactTimelineViewProps> = ({
  contacts,
  selectedContacts,
  onContactSelect,
  onContactClick,
  onAnalyze,
  analyzingContactIds = []
}) => {
  const groupedContacts = groupByTime(contacts);

  const TimelineGroup = ({ title, contacts: groupContacts, icon: Icon }: { 
    title: string; 
    contacts: Contact[]; 
    icon: React.ComponentType<any>;
  }) => {
    if (groupContacts.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Icon className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">({groupContacts.length})</span>
        </div>
        <div className="space-y-3">
          {groupContacts.map((contact) => (
            <div
              key={contact.id}
              className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border ${
                selectedContacts.includes(contact.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onContactClick(contact)}
            >
              <div className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onContactSelect(contact.id);
                    }}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Avatar */}
                  <div className="relative">
                    <AvatarWithStatus
                      src={contact.avatarSrc}
                      alt={contact.name}
                      size="md"
                      status="active"
                    />
                    {analyzingContactIds.includes(contact.id) && (
                      <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900 truncate">{contact.name}</h4>
                      {contact.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />}
                      <div className={`w-2 h-2 rounded-full ${interestColors[contact.interestLevel]} flex-shrink-0`} />
                    </div>
                    <p className="text-sm text-gray-600 truncate">{contact.title} at {contact.company}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">{contact.email}</span>
                      {contact.industry && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                          {contact.industry}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-gray-500 mb-1">
                      {contact.lastConnected ? formatTimeAgo(contact.lastConnected) : 'No activity'}
                    </div>
                    {contact.aiScore && (
                      <div className={`text-lg font-bold ${getScoreColor(contact.aiScore)}`}>
                        {contact.aiScore}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {contact.email && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`mailto:${contact.email}`);
                        }}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Send Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    )}
                    {contact.phone && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${contact.phone}`);
                        }}
                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                    {onAnalyze && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnalyze(contact);
                        }}
                        disabled={analyzingContactIds.includes(contact.id)}
                        className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                        title="AI Analysis"
                      >
                        <Target className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <TimelineGroup title="Today" contacts={groupedContacts.today} icon={Clock} />
      <TimelineGroup title="Yesterday" contacts={groupedContacts.yesterday} icon={Clock} />
      <TimelineGroup title="This Week" contacts={groupedContacts.thisWeek} icon={Calendar} />
      <TimelineGroup title="This Month" contacts={groupedContacts.thisMonth} icon={Calendar} />
      <TimelineGroup title="Older" contacts={groupedContacts.older} icon={Clock} />
    </div>
  );
};