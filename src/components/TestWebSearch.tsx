import React, { useState, useRef, useCallback } from 'react';
import { webSearchService } from '../services/webSearchService';
import { CitationBadge } from './ui/CitationBadge';
import { ModernButton } from './ui/ModernButton';
import { GlassCard } from './ui/GlassCard';
import { Loader2, Zap, Search, Clock, CheckCircle, XCircle } from 'lucide-react';

interface StreamingUpdate {
  type: 'progress' | 'citation' | 'content' | 'complete' | 'error';
  progress?: number;
  citation?: any;
  content?: string;
  error?: string;
}

interface SearchMetrics {
  startTime: number;
  endTime?: number;
  citationsFound: number;
  contentChunks: number;
  apiCalls: number;
}

export const TestWebSearch: React.FC = () => {
  const [query, setQuery] = useState('OpenAI GPT-5 features and capabilities');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Streaming features
  const [isStreamingMode, setIsStreamingMode] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<any[]>([]);
  const [searchMetrics, setSearchMetrics] = useState<SearchMetrics | null>(null);
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set());

  const streamingControllerRef = useRef<AbortController | null>(null);

  const stopStreaming = useCallback(() => {
    streamingControllerRef.current?.abort();
    setActiveStreams(new Set());
    setStreamingProgress(0);
  }, []);

  const handleTestSearch = useCallback(async (onProgress?: (update: StreamingUpdate) => void) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setStreamingProgress(0);
    setStreamingContent('');
    setStreamingCitations([]);
    setActiveStreams(new Set());

    const metrics: SearchMetrics = {
      startTime: Date.now(),
      citationsFound: 0,
      contentChunks: 0,
      apiCalls: 0
    };
    setSearchMetrics(metrics);

    streamingControllerRef.current = new AbortController();

    try {
      console.log('Testing web search with query:', query);

      if (isStreamingMode) {
        // Streaming search with progress updates
        const streamId = `search-${Date.now()}`;
        setActiveStreams(prev => new Set([...prev, streamId]));

        // Simulate streaming progress
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress > 90) progress = 90;
          setStreamingProgress(progress);
          onProgress?.({ type: 'progress', progress });
        }, 300);

        const searchResults = await webSearchService.searchWithAI(
          query,
          'You are a helpful research assistant. Provide comprehensive information about the query.',
          `Please research and provide detailed information about: ${query}`,
          {
            includeSources: true,
            searchContextSize: 'high'
          }
        );

        clearInterval(progressInterval);
        setStreamingProgress(100);

        // Stream citations
        if (searchResults.citations) {
          for (let i = 0; i < searchResults.citations.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Simulate streaming delay
            setStreamingCitations(prev => [...prev, searchResults.citations[i]]);
            onProgress?.({ type: 'citation', citation: searchResults.citations[i] });
          }
        }

        // Stream content in chunks
        if (searchResults.content) {
          const words = searchResults.content.split(' ');
          let currentContent = '';
          for (let i = 0; i < words.length; i += 3) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming delay
            currentContent += words.slice(i, i + 3).join(' ') + ' ';
            setStreamingContent(currentContent);
            onProgress?.({ type: 'content', content: currentContent });
          }
        }

        setActiveStreams(prev => {
          const newSet = new Set(prev);
          newSet.delete(streamId);
          return newSet;
        });

        // Update metrics
        metrics.endTime = Date.now();
        metrics.citationsFound = searchResults.citations?.length || 0;
        metrics.contentChunks = Math.ceil((searchResults.content?.length || 0) / 100);
        metrics.apiCalls = 1;
        setSearchMetrics(metrics);

        console.log('Search results:', searchResults);
        setResults(searchResults);
        onProgress?.({ type: 'complete' });

      } else {
        // Regular search
        const searchResults = await webSearchService.searchWithAI(
          query,
          'You are a helpful research assistant. Provide comprehensive information about the query.',
          `Please research and provide detailed information about: ${query}`,
          {
            includeSources: true,
            searchContextSize: 'high'
          }
        );

        // Update metrics
        metrics.endTime = Date.now();
        metrics.citationsFound = searchResults.citations?.length || 0;
        metrics.contentChunks = 1;
        metrics.apiCalls = 1;
        setSearchMetrics(metrics);

        console.log('Search results:', searchResults);
        setResults(searchResults);
      }

    } catch (err) {
      console.error('Search failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      onProgress?.({ type: 'error', error: errorMessage });
    } finally {
      setLoading(false);
      setStreamingProgress(0);
      streamingControllerRef.current = null;
    }
  }, [query, isStreamingMode]);

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Web Search with Citations Test</h2>
            <p className="text-gray-600">Test the OpenAI Responses API integration with web search and citations</p>
          </div>

          {/* Streaming Mode Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isStreamingMode}
                onChange={(e) => setIsStreamingMode(e.target.checked)}
                className="rounded"
              />
              <Zap className="w-4 h-4" />
              Streaming Mode
            </label>
          </div>
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
        <div className="space-y-3">
          <div className="flex gap-2">
            <ModernButton
              onClick={() => handleTestSearch()}
              loading={loading}
              className="flex-1 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isStreamingMode ? 'Streaming Search...' : 'Searching...'}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Test Web Search with Citations
                </>
              )}
            </ModernButton>

            {loading && activeStreams.size > 0 && (
              <ModernButton
                onClick={stopStreaming}
                variant="outline"
                className="px-4"
              >
                Stop
              </ModernButton>
            )}
          </div>

          {/* Streaming Progress */}
          {isStreamingMode && (loading || streamingProgress > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Search Progress
                </span>
                <span className="text-sm text-blue-600">{Math.round(streamingProgress)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${streamingProgress}%` }}
                ></div>
              </div>
              {activeStreams.size > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Active streams: {activeStreams.size}
                </p>
              )}
            </div>
          )}

          {/* Search Metrics */}
          {searchMetrics && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">
                    {searchMetrics.endTime ? `${searchMetrics.endTime - searchMetrics.startTime}ms` : 'In progress'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">{searchMetrics.citationsFound} citations</span>
                </div>
                <div className="flex items-center gap-1">
                  <Search className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">{searchMetrics.contentChunks} chunks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">{searchMetrics.apiCalls} API calls</span>
                </div>
              </div>
            </div>
          )}
        </div>

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

            {/* Streaming Citations */}
            {isStreamingMode && streamingCitations.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-green-800 font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Citations ({streamingCitations.length})
                </h3>
                <CitationBadge
                  sources={results?.sources || []}
                  size="md"
                  maxDisplay={streamingCitations.length}
                />
              </div>
            )}

            {/* Regular Citations */}
            {!isStreamingMode && results.citations && results.citations.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-green-800 font-medium mb-3">Citations ({results.citations.length})</h3>
                <CitationBadge
                  sources={results.sources}
                  size="md"
                  maxDisplay={10}
                />
              </div>
            )}

            {/* Streaming Content */}
            {isStreamingMode && streamingContent && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-gray-800 font-medium mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  AI Response Content (Streaming)
                </h3>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {streamingContent}
                    {loading && <span className="animate-pulse">▊</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Regular Content */}
            {(!isStreamingMode || !streamingContent) && results?.content && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-gray-800 font-medium mb-3">AI Response Content</h3>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {results.content}
                  </div>
                </div>
              </div>
            )}

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