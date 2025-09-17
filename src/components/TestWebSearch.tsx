import React, { useState } from 'react';
import { webSearchService } from '../services/webSearchService';
import { CitationBadge } from './ui/CitationBadge';
import { ModernButton } from './ui/ModernButton';
import { GlassCard } from './ui/GlassCard';

export const TestWebSearch: React.FC = () => {
  const [query, setQuery] = useState('OpenAI GPT-5 features and capabilities');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('Testing web search with query:', query);

      const searchResults = await webSearchService.searchWithAI(
        query,
        'You are a helpful research assistant. Provide comprehensive information about the query.',
        `Please research and provide detailed information about: ${query}`,
        {
          includeSources: true,
          searchContextSize: 'high'
        }
      );

      console.log('Search results:', searchResults);
      setResults(searchResults);

    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testQueries = [
    'OpenAI GPT-5 features and capabilities',
    'Latest developments in AI technology 2024',
    'React 18 new features and improvements',
    'TypeScript 5.0 release notes',
    'Demo citation test - this should show mock citations'
  ];

  return (
    <GlassCard className="p-6 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Web Search with Citations Test</h2>
          <p className="text-gray-600">Test the OpenAI Responses API integration with web search and citations</p>
        </div>

        {/* Query Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Query
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your search query..."
            />
          </div>

          {/* Quick Test Queries */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Test Queries
            </label>
            <div className="flex flex-wrap gap-2">
              {testQueries.map((testQuery, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(testQuery)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                >
                  {testQuery}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Test Button */}
        <ModernButton
          onClick={handleTestSearch}
          loading={loading}
          className="w-full"
        >
          {loading ? 'Searching...' : '🔍 Test Web Search with Citations'}
        </ModernButton>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium mb-2">Search Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="space-y-6">
            {/* Search Metadata */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-blue-800 font-medium mb-2">Search Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Query:</span>
                  <p className="text-blue-800">{results.searchMetadata.query}</p>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Sources:</span>
                  <p className="text-blue-800">{results.searchMetadata.totalSources}</p>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Search Time:</span>
                  <p className="text-blue-800">{results.searchMetadata.searchTime}ms</p>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Model Used:</span>
                  <p className="text-blue-800">{results.searchMetadata.modelUsed}</p>
                </div>
              </div>
            </div>

            {/* Citations */}
            {results.citations && results.citations.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-green-800 font-medium mb-3">Citations ({results.citations.length})</h3>
                <CitationBadge
                  sources={results.sources}
                  size="md"
                  maxDisplay={10}
                />
              </div>
            )}

            {/* Content */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-gray-800 font-medium mb-3">AI Response Content</h3>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {results.content}
                </div>
              </div>
            </div>

            {/* Raw Data */}
            <details className="bg-gray-50 border border-gray-200 rounded-lg">
              <summary className="p-4 cursor-pointer text-gray-700 font-medium">
                Raw Response Data (Click to expand)
              </summary>
              <div className="p-4 border-t border-gray-200">
                <pre className="text-xs text-gray-600 overflow-auto max-h-96">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium mb-2">Testing Instructions</h3>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• Click "Test Web Search with Citations" to test the OpenAI Responses API</li>
            <li>• Check browser console for detailed logs</li>
            <li>• Verify citations are displayed with proper formatting</li>
            <li>• Test different queries to ensure robustness</li>
            <li>• Check that sources are clickable and open in new tabs</li>
          </ul>
        </div>
      </div>
    </GlassCard>
  );
};