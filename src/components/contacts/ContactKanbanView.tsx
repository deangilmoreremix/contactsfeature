import React from 'react';
import { Contact } from '../../types';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { 
  Mail, 
  Phone, 
  Target, 
  Edit, 
  MoreHorizontal,
  Star,
  Building,
  User,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ContactKanbanViewProps {
  contacts: Contact[];
  selectedContacts: string[];
  onContactSelect: (contactId: string) => void;
  onContactClick: (contact: Contact) => void;
  onAnalyze?: (contact: Contact) => Promise<boolean>;
  analyzingContactIds?: string[];
  groupBy?: 'interestLevel' | 'status';
}

const interestColumns = [
  { id: 'hot', label: 'Hot Clients', color: 'bg-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  { id: 'medium', label: 'Medium Interest', color: 'bg-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { id: 'low', label: 'Low Interest', color: 'bg-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'cold', label: 'Non Interest', color: 'bg-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
];

const statusColumns = [
  { id: 'lead', label: 'Leads', color: 'bg-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'prospect', label: 'Prospects', color: 'bg-purple-500', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'customer', label: 'Customers', color: 'bg-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { id: 'churned', label: 'Churned', color: 'bg-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
];

export const ContactKanbanView: React.FC<ContactKanbanViewProps> = ({
  contacts,
  selectedContacts,
  onContactSelect,
  onContactClick,
  onAnalyze,
  analyzingContactIds = [],
  groupBy = 'interestLevel'
}) => {
  const columns = groupBy === 'interestLevel' ? interestColumns : statusColumns;
  
  const groupContacts = () => {
    const grouped: Record<string, Contact[]> = {};
    
    columns.forEach(column => {
      grouped[column.id] = contacts.filter(contact => 
        groupBy === 'interestLevel' 
          ? contact.interestLevel === column.id
          : contact.status === column.id
      );
    });
    
    return grouped;
  };

  const groupedContacts = groupContacts();

  const ContactCard = ({ contact }: { contact: Contact }) => (
    <div
      className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border group ${
        selectedContacts.includes(contact.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onContactClick(contact)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
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
            <div className="relative">
              <AvatarWithStatus
                src={contact.avatarSrc}
                alt={contact.name}
                size="sm"
                status="active"
              />
              {analyzingContactIds.includes(contact.id) && (
                <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <h4 className="font-semibold text-gray-900 text-sm truncate">{contact.name}</h4>
                {contact.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-600 truncate">{contact.title}</p>
            </div>
          </div>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Company */}
        <div className="flex items-center space-x-2 mb-3">
          <Building className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-600 truncate">{contact.company}</span>
        </div>

        {/* AI Score */}
        {contact.aiScore && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">AI Score</span>
            <span className={`text-sm font-bold ${
              contact.aiScore >= 80 ? 'text-green-600' : 
              contact.aiScore >= 60 ? 'text-blue-600' : 
              contact.aiScore >= 40 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {contact.aiScore}/100
            </span>
          </div>
        )}

        {/* Last Activity */}
        <div className="flex items-center space-x-2 mb-3">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">
            {contact.lastConnected ? formatTimeAgo(contact.lastConnected) : 'No recent activity'}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center space-x-2 pt-2 border-t border-gray-100">
          {contact.email && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(`mailto:${contact.email}`);
              }}
              className="flex-1 p-2 bg-blue-100 text-blue-600 rounded text-xs font-medium hover:bg-blue-200 transition-colors flex items-center justify-center space-x-1"
              title="Send Email"
            >
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </button>
          )}
          {contact.phone && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${contact.phone}`);
              }}
              className="flex-1 p-2 bg-green-100 text-green-600 rounded text-xs font-medium hover:bg-green-200 transition-colors flex items-center justify-center space-x-1"
              title="Call"
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </button>
          )}
          {onAnalyze && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(contact);
              }}
              disabled={analyzingContactIds.includes(contact.id)}
              className="flex-1 p-2 bg-purple-100 text-purple-600 rounded text-xs font-medium hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
              title="AI Analysis"
            >
              <Target className="w-3 h-3" />
              <span>AI</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map((column) => (
        <div key={column.id} className={`${column.bgColor} ${column.borderColor} border rounded-xl p-4`}>
          {/* Column Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold text-gray-900">{column.label}</h3>
            </div>
            <span className="text-sm text-gray-500 bg-white rounded-full px-2 py-1">
              {groupedContacts[column.id]?.length || 0}
            </span>
          </div>

          {/* Contacts in Column */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {groupedContacts[column.id]?.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
            {(!groupedContacts[column.id] || groupedContacts[column.id].length === 0) && (
              <div className="text-center py-8">
                <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No contacts</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};