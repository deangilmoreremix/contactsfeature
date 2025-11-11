import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GlassCard } from './ui/GlassCard';
import { ModernButton } from './ui/ModernButton';
import { AIResearchButton } from './ui/AIResearchButton';
import { AIAutoFillButton } from './ui/AIAutoFillButton';
import { CustomizableAIToolbar } from './ui/CustomizableAIToolbar';
import { webSearchService } from '../services/webSearchService';
import { aiEnrichmentService } from '../services/aiEnrichmentService';
import { CitationBadge } from './ui/CitationBadge';
import { useEmailAI } from '../hooks/useEmailAI';
import { useAdvancedAI } from '../hooks/useAdvancedAI';
import {
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  TestTube,
  Mail,
  User,
  Globe,
  Search,
  BarChart3,
  Zap,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  data?: any;
  error?: string | undefined;
  duration?: number | undefined;
  startTime?: number | undefined;
  progress?: number | undefined;
  streamingTokens?: string[] | undefined;
}

interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageDuration: number;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  lastRun: string;
}

interface StreamingUpdate {
  type: 'progress' | 'token' | 'complete' | 'error';
  progress?: number;
  token?: string;
  data?: any;
  error?: string;
}

export const AITestingSuite: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testMetrics, setTestMetrics] = useState<TestMetrics>({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    averageDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    lastRun: ''
  });
  const [isStreamingMode, setIsStreamingMode] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set());

  // Enhanced hooks integration
  const emailAI = useEmailAI();
  const advancedAI = useAdvancedAI();

  // Refs for streaming control
  const streamingControllerRef = useRef<AbortController | null>(null);
  const testStartTimeRef = useRef<number>(0);

  // Sample test data
  const testContact = {
    email: 'john.doe@techcorp.com',
    firstName: 'John',
    lastName: 'Doe',
    company: 'TechCorp Inc',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/johndoe',
      twitter: 'https://twitter.com/johndoe'
    }
  };

  const updateTestResult = useCallback((name: string, status: TestResult['status'], message: string, data?: any, error?: string, progress?: number) => {
    setTestResults(prev => prev.map(test => {
      if (test.name === name) {
        const duration = status === 'success' || status === 'error' ? Date.now() - (test.startTime || 0) : test.duration;
        const updatedTest: TestResult = {
          name: test.name,
          status,
          message,
          data,
          startTime: test.startTime,
          streamingTokens: test.streamingTokens
        };
        if (progress !== undefined || test.progress !== undefined) {
          updatedTest.progress = progress !== undefined ? progress : test.progress;
        }
        if (duration !== undefined) {
          updatedTest.duration = duration;
        }
        if (error !== undefined) {
          updatedTest.error = error;
        }
        return updatedTest;
      }
      return test;
    }));
  }, []);

  const addTestResult = useCallback((name: string) => {
    setTestResults(prev => [...prev, {
      name,
      status: 'pending',
      message: 'Waiting to start...',
      startTime: Date.now()
    }]);
  }, []);

  // Enhanced streaming test execution
  const runTestWithStreaming = useCallback(async (
    testName: string,
    testFunction: () => Promise<any>,
    onProgress?: (update: StreamingUpdate) => void
  ) => {
    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Initializing test...', undefined, undefined, 0);

    try {
      if (isStreamingMode) {
        // Use streaming version if available
        const streamId = `test-${testName}-${Date.now()}`;
        setActiveStreams(prev => new Set([...prev, streamId]));

        // For now, fall back to regular execution with progress simulation
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress > 90) progress = 90;
          updateTestResult(testName, 'running', `Running... ${Math.round(progress)}%`, undefined, undefined, progress);
          onProgress?.({ type: 'progress', progress });
        }, 500);

        const result = await testFunction();

        clearInterval(progressInterval);
        updateTestResult(testName, 'success', 'Test completed successfully!', result, undefined, 100);
        onProgress?.({ type: 'complete', data: result });

        setActiveStreams(prev => {
          const newSet = new Set(prev);
          newSet.delete(streamId);
          return newSet;
        });
      } else {
        // Regular execution
        updateTestResult(testName, 'running', 'Running test...');
        const result = await testFunction();
        updateTestResult(testName, 'success', 'Test completed successfully!', result);
      }
    } catch (error) {
      updateTestResult(testName, 'error', 'Test failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      onProgress?.({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setCurrentTest(null);
    }
  }, [isStreamingMode, updateTestResult]);

  // Individual test functions
  const testWebSearchAPI = async () => {
    const testName = 'Web Search API';
    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Testing OpenAI Responses API with web search...');

    try {
      const result = await webSearchService.searchWithAI(
        'OpenAI GPT-5 features and capabilities',
        'You are a helpful assistant providing information about AI technologies.',
        'What are the key features and capabilities of OpenAI GPT-5?',
        { includeSources: true, searchContextSize: 'high' }
      );

      updateTestResult(testName, 'success', `Web search successful! Found ${result.citations.length} citations and ${result.sources.length} sources`, result);
    } catch (error) {
      updateTestResult(testName, 'error', 'Web search failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCurrentTest(null);
    }
  };

  const testEmailEnrichment = async () => {
    const testName = 'Email Enrichment';
    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Testing contact enrichment by email...');

    try {
      const result = await aiEnrichmentService.enrichContactByEmail(testContact.email);
      updateTestResult(testName, 'success', `Email enrichment successful! Confidence: ${result.confidence}%`, result);
    } catch (error) {
      updateTestResult(testName, 'error', 'Email enrichment failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCurrentTest(null);
    }
  };

  const testNameEnrichment = async () => {
    const testName = 'Name Enrichment';
    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Testing contact enrichment by name...');

    try {
      const result = await aiEnrichmentService.enrichContactByName(
        testContact.firstName,
        testContact.lastName,
        testContact.company
      );
      updateTestResult(testName, 'success', `Name enrichment successful! Confidence: ${result.confidence}%`, result);
    } catch (error) {
      updateTestResult(testName, 'error', 'Name enrichment failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCurrentTest(null);
    }
  };

  const testLinkedInEnrichment = async () => {
    const testName = 'LinkedIn Enrichment';
    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Testing contact enrichment by LinkedIn...');

    try {
      const result = await aiEnrichmentService.enrichContactByLinkedIn(testContact.linkedinUrl);
      updateTestResult(testName, 'success', `LinkedIn enrichment successful! Confidence: ${result.confidence}%`, result);
    } catch (error) {
      updateTestResult(testName, 'error', 'LinkedIn enrichment failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCurrentTest(null);
    }
  };

  const testImageGeneration = async () => {
    const testName = 'Image Generation';
    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Testing AI image generation...');

    try {
      const imageUrl = await aiEnrichmentService.findContactImage(
        `${testContact.firstName} ${testContact.lastName}`,
        testContact.company
      );
      updateTestResult(testName, 'success', 'Image generation successful!', { imageUrl });
    } catch (error) {
      updateTestResult(testName, 'error', 'Image generation failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCurrentTest(null);
    }
  };

  const testBulkEnrichment = async () => {
    const testName = 'Bulk Enrichment';
    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Testing bulk contact enrichment...');

    try {
      const contacts = [
        { email: 'jane.smith@techcorp.com', name: 'Jane Smith' },
        { email: 'bob.wilson@startup.io', name: 'Bob Wilson' }
      ];

      const results = await aiEnrichmentService.bulkEnrichContacts(contacts);
      updateTestResult(testName, 'success', `Bulk enrichment successful! Processed ${results.length} contacts`, results);
    } catch (error) {
      updateTestResult(testName, 'error', 'Bulk enrichment failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCurrentTest(null);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunningAll(true);

    // Initialize test results
    const testNames = [
      'Web Search API',
      'Email Enrichment',
      'Name Enrichment',
      'LinkedIn Enrichment',
      'Image Generation',
      'Bulk Enrichment'
    ];

    testNames.forEach(name => addTestResult(name));

    // Run tests sequentially
    await testWebSearchAPI();
    await testEmailEnrichment();
    await testNameEnrichment();
    await testLinkedInEnrichment();
    await testImageGeneration();
    await testBulkEnrichment();

    setIsRunningAll(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'running': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <TestTube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Testing Suite</h1>
              <p className="text-gray-600">Comprehensive testing of all AI buttons and APIs</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ModernButton
              onClick={runAllTests}
              loading={isRunningAll}
              className="flex items-center space-x-2"
              disabled={isRunningAll}
            >
              <Zap className="w-4 h-4" />
              <span>{isRunningAll ? 'Running Tests...' : 'Run All Tests'}</span>
            </ModernButton>
          </div>
        </div>

        {/* Test Data Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-blue-800 font-medium mb-2">Test Data Used:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="font-medium">Email:</span> {testContact.email}</div>
            <div><span className="font-medium">Name:</span> {testContact.firstName} {testContact.lastName}</div>
            <div><span className="font-medium">Company:</span> {testContact.company}</div>
            <div><span className="font-medium">LinkedIn:</span> Available</div>
          </div>
        </div>
      </GlassCard>

      {/* Test Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Individual Test Results */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Test Results
          </h2>

          <div className="space-y-3">
            {testResults.map((test, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg transition-all duration-200 ${getStatusColor(test.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <span className="font-medium text-gray-900">{test.name}</span>
                    {currentTest === test.name && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Running
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-2">{test.message}</p>

                {test.error && (
                  <div className="text-sm text-red-700 bg-red-100 p-2 rounded">
                    Error: {test.error}
                  </div>
                )}

                {test.data && test.name === 'Web Search API' && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-gray-600">
                      Citations: {test.data.citations?.length || 0} |
                      Sources: {test.data.sources?.length || 0} |
                      Model: {test.data.searchMetadata?.modelUsed}
                    </div>
                    {test.data.sources && test.data.sources.length > 0 && (
                      <CitationBadge
                        sources={test.data.sources.slice(0, 3)}
                        size="xs"
                      />
                    )}
                  </div>
                )}

                {test.data && test.name.includes('Enrichment') && (
                  <div className="mt-3 text-xs text-gray-600">
                    Confidence: {test.data.confidence}% |
                    Fields: {Object.keys(test.data).filter(key => test.data[key] && key !== 'confidence').length}
                  </div>
                )}
              </div>
            ))}

            {testResults.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tests run yet. Click "Run All Tests" to begin.</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* AI Components Testing */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            Component Testing
          </h2>

          <div className="space-y-4">
            {/* AI Research Button Test */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">AI Research Button</h3>
              <AIResearchButton
                searchType="auto"
                searchQuery={{
                  email: testContact.email,
                  firstName: testContact.firstName,
                  lastName: testContact.lastName,
                  company: testContact.company,
                  linkedinUrl: testContact.linkedinUrl
                }}
                onDataFound={(data) => console.log('AI Research result:', data)}
                variant="outline"
                size="sm"
              />
            </div>

            {/* AI Auto-Fill Button Test */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">AI Auto-Fill Button</h3>
              <AIAutoFillButton
                formData={{
                  email: testContact.email,
                  firstName: testContact.firstName,
                  lastName: testContact.lastName,
                  company: testContact.company,
                  socialProfiles: testContact.socialProfiles
                }}
                onAutoFill={(data) => console.log('Auto-fill result:', data)}
                size="sm"
              />
            </div>

            {/* Customizable AI Toolbar Test */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">AI Toolbar</h3>
              <CustomizableAIToolbar
                entityType="contact"
                entityId="test-contact-123"
                entityData={testContact}
                location="test"
                layout="grid"
                size="sm"
                showCustomizeButton={false}
              />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Instructions */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Testing Instructions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Automated Tests</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Web Search API:</strong> Tests OpenAI Responses API with citations</li>
              <li>• <strong>Email Enrichment:</strong> Tests contact research by email</li>
              <li>• <strong>Name Enrichment:</strong> Tests contact research by name</li>
              <li>• <strong>LinkedIn Enrichment:</strong> Tests LinkedIn profile research</li>
              <li>• <strong>Image Generation:</strong> Tests AI avatar generation</li>
              <li>• <strong>Bulk Enrichment:</strong> Tests multiple contact processing</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Manual Component Tests</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>AI Research Button:</strong> Click to test individual research</li>
              <li>• <strong>AI Auto-Fill:</strong> Test form auto-completion</li>
              <li>• <strong>AI Toolbar:</strong> Test various AI operations</li>
              <li>• <strong>Check Console:</strong> Monitor browser console for logs</li>
              <li>• <strong>Verify Citations:</strong> Ensure citations display correctly</li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};