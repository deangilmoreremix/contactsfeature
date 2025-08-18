import React from 'react';
import { Contact } from '../../types';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { 
  Mail, 
  Phone, 
  Building, 
  Star, 
  Edit, 
  MoreHorizontal,
  Target,
  CheckCircle
} from 'lucide-react';

interface ContactGalleryViewProps {
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

export const ContactGalleryView: React.FC<ContactGalleryViewProps> = ({
  contacts,
  selectedContacts,
  onContactSelect,
  onContactClick,
  onAnalyze,
  analyzingContactIds = []
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative border ${
            selectedContacts.includes(contact.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onContactClick(contact)}
        >
          {/* Selection Checkbox */}
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={selectedContacts.includes(contact.id)}
              onChange={(e) => {
                e.stopPropagation();
                onContactSelect(contact.id);
              }}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-white border-gray-300"
            />
          </div>

          {/* Actions */}
          <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                // Handle edit
              }}
              className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
            >
              <Edit className="w-3 h-3 text-gray-600" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                // Handle more actions
              }}
              className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
            >
              <MoreHorizontal className="w-3 h-3 text-gray-600" />
            </button>
          </div>

          <div className="p-6 text-center">
            {/* Large Avatar */}
            <div className="relative inline-block mb-4">
              <AvatarWithStatus
                src={contact.avatarSrc}
                alt={contact.name}
                size="xl"
                status="active"
              />
              
              {/* AI Score Badge */}
              {contact.aiScore && (
                <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-xs font-bold ${getScoreColor(contact.aiScore)}`}>
                  {contact.aiScore}
                </div>
              )}
              
              {/* Analyzing indicator */}
              {analyzingContactIds.includes(contact.id) && (
                <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <h3 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors truncate">
              {contact.name}
            </h3>
            <p className="text-gray-600 text-sm mb-1 truncate">{contact.title}</p>
            <p className="text-gray-500 text-xs mb-3 truncate">{contact.company}</p>

            {/* Interest Level */}
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${interestColors[contact.interestLevel]}`} />
              <span className="text-xs text-gray-600 capitalize">{contact.interestLevel}</span>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-center space-x-2">
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

            {/* Favorite */}
            {contact.isFavorite && (
              <div className="absolute top-16 right-3">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};