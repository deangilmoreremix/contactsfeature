import React, { useState, useMemo } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { 
  Search, 
  Filter, 
  Users, 
  ChevronDown,
  Target,
  Building,
  Mail,
  Star,
  Sparkles,
  Award
} from 'lucide-react';

const sampleContacts = [
  {
    id: '1',
    name: 'Jane Smith',
    title: 'Marketing Director',
    company: 'TechCorp Inc.',
    email: 'jane.smith@techcorp.com',
    industry: 'Technology',
    interestLevel: 'hot',
    status: 'prospect',
    aiScore: 92,
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
  },
  {
    id: '2',
    name: 'Mike Johnson',
    title: 'Sales Manager',
    company: 'InnovateCorp',
    email: 'mike.j@innovate.com',
    industry: 'SaaS',
    interestLevel: 'medium',
    status: 'lead',
    aiScore: 78,
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
  },
  {
    id: '3',
    name: 'Sarah Wilson',
    title: 'CEO',
    company: 'StartupXYZ',
    email: 'sarah@startupxyz.io',
    industry: 'Technology',
    interestLevel: 'hot',
    status: 'customer',
    aiScore: 96,
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
  },
  {
    id: '4',
    name: 'Robert Chen',
    title: 'Operations Manager',
    company: 'ManufacturingCo',
    email: 'r.chen@mfg.com',
    industry: 'Manufacturing',
    interestLevel: 'low',
    status: 'lead',
    aiScore: 45,
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
  },
  {
    id: '5',
    name: 'Emily Rodriguez',
    title: 'VP Finance',
    company: 'FinanceGroup',
    email: 'emily@fingroup.com',
    industry: 'Finance',
    interestLevel: 'medium',
    status: 'prospect',
    aiScore: 73,
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
  },
  {
    id: '6',
    name: 'David Kim',
    title: 'CTO',
    company: 'TechStart',
    email: 'david.kim@techstart.com',
    industry: 'Technology',
    interestLevel: 'hot',
    status: 'prospect',
    aiScore: 89,
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
  }
];

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

export const InteractiveFilterDemo: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [interestFilter, setInterestFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aiScoreFilter, setAiScoreFilter] = useState('all');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const filteredContacts = useMemo(() => {
    return sampleContacts.filter(contact => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = contact.name.toLowerCase().includes(searchLower) ||
                            contact.company.toLowerCase().includes(searchLower) ||
                            contact.title.toLowerCase().includes(searchLower) ||
                            contact.email.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Interest level filter
      if (interestFilter !== 'all' && contact.interestLevel !== interestFilter) {
        return false;
      }

      // Industry filter
      if (industryFilter !== 'all' && contact.industry !== industryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && contact.status !== statusFilter) {
        return false;
      }

      // AI Score filter
      if (aiScoreFilter !== 'all') {
        if (aiScoreFilter === 'high' && contact.aiScore < 80) return false;
        if (aiScoreFilter === 'medium' && (contact.aiScore < 60 || contact.aiScore >= 80)) return false;
        if (aiScoreFilter === 'low' && contact.aiScore >= 60) return false;
      }

      return true;
    });
  }, [searchTerm, interestFilter, industryFilter, statusFilter, aiScoreFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setInterestFilter('all');
    setIndustryFilter('all');
    setStatusFilter('all');
    setAiScoreFilter('all');
    setSelectedContacts([]);
  };

  const hasActiveFilters = searchTerm || interestFilter !== 'all' || industryFilter !== 'all' || statusFilter !== 'all' || aiScoreFilter !== 'all';

  const handleContactSelect = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  return (
    <GlassCard className="p-8">
      <div className="flex items-center justify-center mb-6">
        <div className="bg-gradient-to-r from-green-500 to-blue-500 p-3 rounded-xl mr-3">
          <Search className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Interactive Smart Filter Demo</h3>
          <p className="text-gray-600">Experience powerful search and filtering capabilities</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="space-y-4 mb-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search contacts by name, company, title, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Interest Level Filter */}
          <select
            value={interestFilter}
            onChange={(e) => setInterestFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Interest Levels</option>
            <option value="hot">Hot</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="cold">Cold</option>
          </select>

          {/* Industry Filter */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Industries</option>
            <option value="Technology">Technology</option>
            <option value="SaaS">SaaS</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Finance">Finance</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
          </select>

          {/* AI Score Filter */}
          <select
            value={aiScoreFilter}
            onChange={(e) => setAiScoreFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All AI Scores</option>
            <option value="high">High Score (80+)</option>
            <option value="medium">Medium Score (60-79)</option>
            <option value="low">Low Score (&lt;60)</option>
          </select>
          {/* Clear Filters */}
          {hasActiveFilters && (
            <ModernButton
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Clear Filters
            </ModernButton>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredContacts.length} of {sampleContacts.length} contacts
            {hasActiveFilters && ' (filtered)'}
            {selectedContacts.length > 0 && ` • ${selectedContacts.length} selected`}
          </p>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedContacts.length === filteredContacts.length ? 'Deselect All' : 'Select All'}
            </button>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600">
                {filteredContacts.filter(c => c.aiScore >= 80).length} high-priority
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contacts List */}
      <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-500 mb-2">No contacts found</h4>
            <p className="text-gray-400 text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div key={contact.id} className={`flex items-center space-x-4 p-4 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${
              selectedContacts.includes(contact.id) ? 'bg-blue-50 border-blue-200' : ''
            }`}
            onClick={() => handleContactSelect(contact.id)}
            >
              {/* Selection Checkbox */}
              <input
                type="checkbox"
                checked={selectedContacts.includes(contact.id)}
                onChange={() => handleContactSelect(contact.id)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Avatar */}
              <AvatarWithStatus
                src={contact.avatar}
                alt={contact.name}
                size="md"
                status="active"
              />

              {/* Contact Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                  {contact.aiScore >= 80 && <Star className="w-4 h-4 text-yellow-500" />}
                </div>
                <p className="text-sm text-gray-600">{contact.title} at {contact.company}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-gray-500">{contact.email}</span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                    {contact.industry}
                  </span>
                </div>
              </div>

              {/* Interest Level */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${interestColors[contact.interestLevel as keyof typeof interestColors]}`}></div>
                <span className="text-sm text-gray-600 capitalize">{contact.interestLevel}</span>
              </div>

              {/* AI Score */}
              <div className="text-center">
                <div className={`text-lg font-bold ${getScoreColor(contact.aiScore)}`}>
                  {contact.aiScore}
                </div>
                <div className="text-xs text-gray-500">AI Score</div>
              </div>

              {/* Status */}
              <div className="text-center">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                  contact.status === 'customer' ? 'bg-green-100 text-green-800' :
                  contact.status === 'prospect' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {contact.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Filter Chips */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setInterestFilter('hot')}
          className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium hover:bg-red-200 transition-colors flex items-center space-x-1"
        >
          <Target className="w-3 h-3" />
          <span>Hot Leads ({sampleContacts.filter(c => c.interestLevel === 'hot').length})</span>
        </button>
        <button
          onClick={() => setIndustryFilter('Technology')}
          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors flex items-center space-x-1"
        >
          <Building className="w-3 h-3" />
          <span>Technology ({sampleContacts.filter(c => c.industry === 'Technology').length})</span>
        </button>
        <button
          onClick={() => {
            setSearchTerm('');
            setInterestFilter('all');
            setIndustryFilter('all');
            setStatusFilter('prospect');
          }}
          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors flex items-center space-x-1"
        >
          <Users className="w-3 h-3" />
          <span>Prospects Only ({sampleContacts.filter(c => c.status === 'prospect').length})</span>
        </button>
        <button
          onClick={() => setAiScoreFilter('high')}
          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:bg-green-200 transition-colors flex items-center space-x-1"
        >
          <Star className="w-3 h-3" />
          <span>High AI Score ({sampleContacts.filter(c => c.aiScore >= 80).length})</span>
        </button>
        <button
          onClick={() => {
            setSearchTerm('');
            setInterestFilter('all');
            setIndustryFilter('all');
            setStatusFilter('all');
            setAiScoreFilter('all');
            setSearchTerm('CEO');
          }}
          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors flex items-center space-x-1"
        >
          <Award className="w-3 h-3" />
          <span>Decision Makers ({sampleContacts.filter(c => c.title.includes('CEO') || c.title.includes('VP') || c.title.includes('CTO')).length})</span>
        </button>
      </div>

      {/* Bulk Actions Demo */}
      {selectedContacts.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">{selectedContacts.length} contacts selected</span>
            </div>
            <div className="flex space-x-2">
              <ModernButton variant="outline" size="sm" className="text-blue-700 border-blue-300">
                Export Selected
              </ModernButton>
              <ModernButton variant="primary" size="sm" className="bg-blue-600">
                AI Analyze Selected
              </ModernButton>
            </div>
          </div>
        </div>
      )}

      {/* Demo Notice */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Interactive Demo</span>
        </div>
        <p className="text-sm text-blue-800 mt-1">
          This demo showcases our search, filtering, and selection capabilities. The real application includes advanced filters, saved searches, fuzzy search, bulk operations, and much more.
        </p>
      </div>
    </GlassCard>
  );
};