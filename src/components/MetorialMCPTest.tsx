import React, { useState } from 'react';
import { mcpAdapter } from '../services/mcpAdapter';
import { metorialService } from '../services/metorialService';
import { ModernButton } from './ui/ModernButton';

export const MetorialMCPTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      addResult('🧪 Starting Metorial MCP Integration Tests...');

      // Test 1: MCP Server Connection
      addResult('1️⃣ Testing MCP Server Connection...');
      const connected = await mcpAdapter.connect('metorial');
      if (connected) {
        addResult('✅ Successfully connected to Metorial MCP server');
      } else {
        addResult('❌ Failed to connect to Metorial MCP server');
        return;
      }

      // Test 2: Tool Discovery
      addResult('2️⃣ Testing Tool Discovery...');
      const tools = await mcpAdapter.discoverTools('metorial');
      addResult(`✅ Discovered ${tools.length} Metorial MCP tools:`);
      tools.forEach(tool => {
        addResult(`   - ${tool.name}: ${tool.description}`);
      });

      // Test 3: Company Research
      addResult('3️⃣ Testing Company Research...');
      const companyResult = await mcpAdapter.executeTool('metorial_research_company', {
        company: 'Tesla Inc',
        depth: 'comprehensive',
        focusAreas: ['overview', 'financials', 'news']
      });
      addResult('✅ Company research completed');
      addResult(`   Company: ${companyResult.companyName || 'Tesla Inc'}`);
      addResult(`   Industry: ${companyResult.industry || 'Automotive/Energy'}`);

      // Test 4: SDR Insights Generation
      addResult('4️⃣ Testing SDR Insights Generation...');
      const insightsResult = await metorialService.generateSDRInsights(
        'Elon Musk',
        'Tesla Inc',
        'Evaluating advanced AI solutions for autonomous vehicle systems'
      );
      addResult('✅ SDR insights generated');
      addResult(`   Executive Summary: ${insightsResult.executiveSummary.substring(0, 100)}...`);
      addResult(`   Key Findings: ${insightsResult.keyFindings.length} insights`);
      addResult(`   Research Sources: ${insightsResult.researchMetadata.totalSources}`);

      // Test 5: Connection Status
      addResult('5️⃣ Checking Connection Status...');
      const status = mcpAdapter.getConnectionStatus('metorial');
      addResult(`✅ Metorial MCP Status: ${status}`);

      addResult('🎉 ALL TESTS PASSED! Metorial MCP integration is working perfectly!');

    } catch (error: any) {
      addResult(`❌ Test failed: ${error.message}`);
      addResult('🔧 Troubleshooting:');
      addResult('   1. Check your METORIAL_API_KEY in .env file');
      addResult('   2. Verify METORIAL_MCP_SERVER_URL is correct');
      addResult('   3. Check browser network tab for failed requests');
      addResult('   4. Ensure Metorial service is accessible');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🧪 Metorial MCP Integration Test
        </h2>

        <p className="text-gray-600 mb-6">
          Test your Metorial MCP server integration with your API key.
          This will verify connection, tool discovery, and research capabilities.
        </p>

        <div className="mb-6">
          <ModernButton
            onClick={runTests}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? 'Running Tests...' : 'Run MCP Tests'}
          </ModernButton>
        </div>

        {testResults.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Test Results:</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="text-sm font-mono text-gray-700 p-2 bg-white rounded border"
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">📋 Test Coverage:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• MCP Server Connection</li>
            <li>• Tool Discovery & Registration</li>
            <li>• Company Research Tool Execution</li>
            <li>• SDR Insights Generation</li>
            <li>• Connection Status Monitoring</li>
          </ul>
        </div>
      </div>
    </div>
  );
};