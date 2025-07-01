import React from 'react';
import { LeadCard } from './LeadCard';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Search, Filter, UserPlus } from 'lucide-react';

const leadsData = [
  {
    id: 1,
    avatarSrc: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    name: 'Jane Doe',
    title: 'Marketing Director',
    company: 'Microsoft',
    sources: ['LinkedIn', 'Email'],
    interestLevel: 'hot' as const,
    status: 'active' as const
  },
  {
    id: 2,
    avatarSrc: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    name: 'Darlene Robertson',
    title: 'Financial Manager',
    company: 'Ford',
    sources: ['LinkedIn', 'Facebook'],
    interestLevel: 'medium' as const,
    status: 'active' as const
  },
  {
    id: 3,
    avatarSrc: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    name: 'Wade Warren',
    title: 'Operations Manager',
    company: 'Zenith',
    sources: ['Website'],
    interestLevel: 'low' as const,
    status: 'pending' as const
  },
  {
    id: 4,
    avatarSrc: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    name: 'Jonah Jude',
    title: 'Web Developer',
    company: 'Binary Bytes',
    sources: ['Referral'],
    interestLevel: 'hot' as const,
    status: 'active' as const
  }
];

const filterButtons = [
  { label: 'All', active: true },
  { label: 'Hot Client', active: false },
  { label: 'Great Interest', active: false },
  { label: 'Medium Interest', active: false },
  { label: 'Low Interest', active: false },
  { label: 'Non Interest', active: false }
];

export const NewLeadsSection: React.FC = () => {
  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">New Leads</h2>
          <p className="text-sm text-gray-600">{leadsData.length} Leads</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <ModernButton variant="outline" size="sm" className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
          </ModernButton>
          <ModernButton variant="outline" size="sm" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
          </ModernButton>
          <ModernButton variant="primary" size="sm" className="flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>New Lead</span>
          </ModernButton>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterButtons.map((filter, index) => (
          <button
            key={index}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${filter.active 
                ? 'bg-white text-gray-900 shadow-md border border-gray-200' 
                : 'text-gray-600 hover:bg-white/50'
              }
            `}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {leadsData.map((lead) => (
          <LeadCard
            key={lead.id}
            avatarSrc={lead.avatarSrc}
            name={lead.name}
            title={lead.title}
            company={lead.company}
            sources={lead.sources}
            interestLevel={lead.interestLevel}
            status={lead.status}
          />
        ))}
      </div>
    </div>
  );
};