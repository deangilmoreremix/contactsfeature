```tsx
import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Search, User, Building, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export const InteractiveSmartSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleData = [
    { id: 'c1', type: 'contact', name: 'Jane Smith', company: 'TechCorp Inc.', email: 'jane.s@techcorp.com', snippet: 'Discussed AI integration for marketing automation.' },
    { id: 'c2', type: 'contact', name: 'Mike Johnson', company: 'Innovate Solutions', email: 'mike.j@innovate.com', snippet: 'Followed up on proposal for cloud migration.' },
    { id: 'co1', type: 'company', name: 'Global Dynamics', industry: 'Manufacturing', snippet: 'Leading manufacturer exploring digital transformation.' },
    { id: 'd1', type: 'document', name: 'Q3 Sales Report', type_detail: 'PDF', snippet: 'Report detailing sales performance and pipeline for Q3.' },
    { id: 'c3', type: 'contact', name: 'Sarah Connor', company: 'Cyberdyne Systems', email: 'sarah.c@cyberdyne.com', snippet: 'Inquired about advanced AI security protocols.' },
  ];

  const handleSearch = () => {
    setIsSearching(true);
    setResults(null);
    setError(null);

    setTimeout(() => {
      if (searchTerm.toLowerCase().includes('ai') || searchTerm.toLowerCase().includes('automation')) {
        setResults(sampleData.filter(item =>
          item.snippet.toLowerCase().includes('ai') || item.snippet.toLowerCase().includes('automation') ||
          item.name.toLowerCase().includes('ai') || item.name.toLowerCase().includes('automation')
        ));
      } else if (searchTerm.toLowerCase().includes('report') || searchTerm.toLowerCase().includes('sales')) {
        setResults(sampleData.filter(item => item.type === 'document' || item.snippet.toLowerCase().includes('sales')));
      } else if (searchTerm.toLowerCase().includes('tech') || searchTerm.toLowerCase().includes('innovate')) {
        setResults(sampleData.filter(item => item.company.toLowerCase().includes('tech') || item.company.toLowerCase().includes('innovate')));
      } else if (searchTerm.toLowerCase().includes('jane')) {
        setResults(sampleData.filter(item => item.name.toLowerCase().includes('jane')));
      } else if (searchTerm.trim() === '') {
        setResults(sampleData); // Show all if search is empty
      } else {
        setResults([]); // No results
      }
      setIsSearching(false);
    }, 1500);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'contact': return User;
      case 'company': return Building;
      case 'document': return Mail; // Using Mail for document as a generic icon
      default: return Search;
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Query
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g., AI integration, Q3 sales report, TechCorp"
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              disabled={isSearching}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
        </div>

        <ModernButton
          variant="primary"
          onClick={handleSearch}
          loading={isSearching}
          disabled={isSearching}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Smart Search</span>
            </>
          )}
        </ModernButton>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {results && (
          <div className="mt-4 space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Search Results ({results.length})
            </h4>
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((item, index) => {
                  const Icon = getIcon(item.type);
                  return (
                    <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg flex items-start space-x-3">
                      <Icon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{\`${item.name}${item.company ? ` (${item.company})` : ''}`}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{item.snippet}</p>
                        <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                No results found for your query. Try "AI integration" or "sales report".
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
```