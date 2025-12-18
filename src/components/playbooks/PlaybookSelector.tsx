import React, { useState } from 'react';
import { Playbook, RECURRING_REVENUE_PLAYBOOKS, getPlaybooksByCategory } from '../../data/playbooks';
import { ModernButton } from '../ui/ModernButton';
import { SmartTooltip } from '../ui/SmartTooltip';
import {
  Search,
  Filter,
  Target,
  TrendingUp,
  Users,
  Building,
  Briefcase,
  Zap,
  Star,
  ChevronDown,
  Play,
  BookOpen
} from 'lucide-react';

interface PlaybookSelectorProps {
  onSelectPlaybook: (playbook: Playbook) => void;
  selectedContact?: any;
}

export const PlaybookSelector: React.FC<PlaybookSelectorProps> = ({
  onSelectPlaybook,
  selectedContact
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { id: 'all', label: 'All Playbooks', icon: BookOpen },
    { id: 'Digital Services', label: 'Digital Services', icon: Zap },
    { id: 'Technology Services', label: 'Technology Services', icon: Target },
    { id: 'Business Services', label: 'Business Services', icon: Briefcase },
    { id: 'Property & Facility Services', label: 'Property Services', icon: Building },
    { id: 'Healthcare & Wellness', label: 'Healthcare', icon: Users },
    { id: 'Education & Training', label: 'Education', icon: Star },
    { id: 'Marketing & Creative', label: 'Marketing', icon: TrendingUp },
    { id: 'Specialized Services', label: 'Specialized', icon: Building }
  ];

  const filteredPlaybooks = RECURRING_REVENUE_PLAYBOOKS.filter(playbook => {
    const matchesSearch = playbook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         playbook.niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         playbook.strategy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || playbook.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || BookOpen;
  };

  const getGrowthColor = (potential: string) => {
    if (potential.includes('$50K-$500K')) return 'text-green-600 bg-green-50';
    if (potential.includes('$5K-$50K')) return 'text-blue-600 bg-blue-50';
    if (potential.includes('$3K-$30K')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Recurring Revenue Playbooks</h2>
        <p className="text-lg text-gray-600">
          Choose the perfect strategy to convert local businesses into high-value, recurring revenue clients
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Find Your Perfect Playbook</h3>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </ModernButton>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search playbooks by name, niche, or strategy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Showing {filteredPlaybooks.length} playbook{filteredPlaybooks.length !== 1 ? 's' : ''}
          {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.label}`}
        </p>
        {selectedContact && (
          <p className="text-sm text-blue-600">
            Personalized for {selectedContact.name}
          </p>
        )}
      </div>

      {/* Playbook Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlaybooks.map((playbook) => {
          const CategoryIcon = getCategoryIcon(playbook.category);

          return (
            <div
              key={playbook.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CategoryIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getGrowthColor(playbook.growthPotential)}`}>
                    {playbook.growthPotential.split(' ')[0]}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {playbook.name}
                </h3>

                <p className="text-sm text-gray-600 mb-3">
                  {playbook.niche}
                </p>

                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Target className="w-3 h-3" />
                  <span>{playbook.strategy}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-3 mb-4">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue Focus</span>
                    <p className="text-sm text-gray-900 mt-1">{playbook.revenueFocus}</p>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Target Customer</span>
                    <p className="text-sm text-gray-900 mt-1">{playbook.targetCustomer}</p>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Process</span>
                    <div className="flex items-center space-x-1 mt-1">
                      {playbook.phases.slice(0, 4).map((phase, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {index < playbook.phases.length - 1 && (
                            <div className="w-3 h-0.5 bg-gray-300 mx-1"></div>
                          )}
                        </div>
                      ))}
                      <span className="text-xs text-gray-600 ml-2">
                        {playbook.phases.length} phases
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <SmartTooltip featureId={`playbook-${playbook.id}`}>
                  <ModernButton
                    onClick={() => onSelectPlaybook(playbook)}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Use This Playbook</span>
                  </ModernButton>
                </SmartTooltip>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPlaybooks.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No playbooks found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search terms or filters to find the perfect playbook for your needs.
          </p>
          <ModernButton
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
          >
            Clear Filters
          </ModernButton>
        </div>
      )}
    </div>
  );
};