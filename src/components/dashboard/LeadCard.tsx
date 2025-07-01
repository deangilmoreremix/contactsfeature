import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { Edit, MoreHorizontal } from 'lucide-react';

interface LeadCardProps {
  avatarSrc: string;
  name: string;
  title: string;
  company: string;
  sources: string[];
  interestLevel: 'hot' | 'medium' | 'low' | 'cold';
  status?: 'active' | 'pending' | 'inactive';
}

const interestColors = {
  hot: 'bg-red-500',
  medium: 'bg-yellow-500', 
  low: 'bg-blue-500',
  cold: 'bg-gray-400'
};

const interestLabels = {
  hot: 'Hot Client',
  medium: 'Medium Interest',
  low: 'Low Interest', 
  cold: 'Non Interest'
};

const sourceColors: { [key: string]: string } = {
  'LinkedIn': 'bg-blue-600',
  'Facebook': 'bg-blue-500',
  'Email': 'bg-green-500',
  'Website': 'bg-purple-500',
  'Referral': 'bg-orange-500',
  'Cold Call': 'bg-gray-600'
};

export const LeadCard: React.FC<LeadCardProps> = ({
  avatarSrc,
  name,
  title,
  company,
  sources,
  interestLevel,
  status = 'active'
}) => {
  return (
    <GlassCard className="p-4 hover:shadow-xl transition-all duration-300 relative">
      {/* Header with Avatar and Actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <AvatarWithStatus
            src={avatarSrc}
            alt={name}
            size="md"
            status={status}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">{name}</h3>
            <p className="text-xs text-gray-600">{title}</p>
            <p className="text-xs text-gray-500">{company}</p>
          </div>
        </div>
        
        <div className="flex space-x-1">
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Edit className="w-3 h-3" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Interest Level Indicator */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${interestColors[interestLevel]}`} />
          <span className="text-xs font-medium text-gray-700">
            {interestLabels[interestLevel]}
          </span>
        </div>
      </div>

      {/* Sources */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700">Source</p>
        <div className="flex flex-wrap gap-1">
          {sources.map((source, index) => (
            <span 
              key={index}
              className={`
                ${sourceColors[source] || 'bg-gray-500'} 
                text-white text-xs px-2 py-1 rounded-md font-medium
              `}
            >
              {source}
            </span>
          ))}
        </div>
      </div>

      {/* Interest Level Dots */}
      <div className="flex items-center space-x-1 mt-3">
        {Array.from({ length: 5 }, (_, i) => {
          const isActive = 
            (interestLevel === 'hot' && i < 5) ||
            (interestLevel === 'medium' && i < 3) ||
            (interestLevel === 'low' && i < 2) ||
            (interestLevel === 'cold' && i < 1);
          
          return (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? interestColors[interestLevel] : 'bg-gray-300'
              }`}
            />
          );
        })}
      </div>
    </GlassCard>
  );
};