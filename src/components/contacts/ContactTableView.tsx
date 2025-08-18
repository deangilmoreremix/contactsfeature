import React from 'react';
import { Contact } from '../../types';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { 
  Mail, 
  Phone, 
  Edit, 
  MoreHorizontal,
  Star,
  Target,
  ArrowUp,
  ArrowDown,
  Building,
  Calendar
} from 'lucide-react';

interface ContactTableViewProps {
  contacts: Contact[];
  selectedContacts: string[];
  onContactSelect: (contactId: string) => void;
  onContactClick: (contact: Contact) => void;
  onAnalyze?: (contact: Contact) => Promise<boolean>;
  analyzingContactIds?: string[];
  onSort?: (field: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const interestColors = {
  hot: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  cold: 'bg-gray-400'
};

const statusColors = {
  customer: 'bg-green-100 text-green-800',
  prospect: 'bg-blue-100 text-blue-800',
  lead: 'bg-purple-100 text-purple-800',
  churned: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800'
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export const ContactTableView: React.FC<ContactTableViewProps> = ({
  contacts,
  selectedContacts,
  onContactSelect,
  onContactClick,
  onAnalyze,
  analyzingContactIds = [],
  onSort,
  sortBy,
  sortOrder
}) => {
  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      // Deselect all
      contacts.forEach(contact => {
        if (selectedContacts.includes(contact.id)) {
          onContactSelect(contact.id);
        }
      });
    } else {
      // Select all
      contacts.forEach(contact => {
        if (!selectedContacts.includes(contact.id)) {
          onContactSelect(contact.id);
        }
      });
    }
  };

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => onSort?.(field)}
      className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
    >
      <span>{children}</span>
      {sortBy === field && (
        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      )}
    </button>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                <SortButton field="name">Contact</SortButton>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                <SortButton field="company">Company</SortButton>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Contact Info
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Interest
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                <SortButton field="score">AI Score</SortButton>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                <SortButton field="updated">Last Updated</SortButton>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedContacts.includes(contact.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => onContactClick(contact)}
              >
                {/* Selection */}
                <td className="px-4 py-3">
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
                </td>

                {/* Contact */}
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
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
                    <div>
                      <div className="flex items-center space-x-1">
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        {contact.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-current" />}
                      </div>
                      <p className="text-sm text-gray-600">{contact.title}</p>
                    </div>
                  </div>
                </td>

                {/* Company */}
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{contact.company}</p>
                      {contact.industry && (
                        <p className="text-xs text-gray-500">{contact.industry}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Contact Info */}
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-600">{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Interest Level */}
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${interestColors[contact.interestLevel]}`} />
                    <span className="text-sm text-gray-600 capitalize">{contact.interestLevel}</span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    statusColors[contact.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {contact.status}
                  </span>
                </td>

                {/* AI Score */}
                <td className="px-4 py-3">
                  {contact.aiScore ? (
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg font-bold ${getScoreColor(contact.aiScore)}`}>
                        {contact.aiScore}
                      </span>
                      <span className="text-xs text-gray-400">/100</span>
                    </div>
                  ) : (
                    onAnalyze && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnalyze(contact);
                        }}
                        disabled={analyzingContactIds.includes(contact.id)}
                        className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                        Score
                      </button>
                    )
                  )}
                </td>

                {/* Last Updated */}
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDate(contact.updatedAt)}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    {contact.email && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`mailto:${contact.email}`);
                        }}
                        className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                        title="Send Email"
                      >
                        <Mail className="w-3 h-3" />
                      </button>
                    )}
                    {contact.phone && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${contact.phone}`);
                        }}
                        className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                        title="Call"
                      >
                        <Phone className="w-3 h-3" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle edit
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle more actions
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {contacts.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-500 mb-2">No contacts found</p>
          <p className="text-gray-400">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};