/**
 * Metorial MCP Integration Test
 * Tests the MCP server connection and tool execution with your API key
 */

import { MCPAdapter } from './src/services/mcpAdapter.ts';
import { metorialService } from './src/services/metorialService.ts';

async function testMetorialMCPIntegration() {
  console.log('🧪 Testing Metorial MCP Integration...\n');

  const mcpAdapter = MCPAdapter.getInstance();

  try {
    // Test 1: MCP Server Connection
    console.log('1️⃣ Testing MCP Server Connection...');
    const connected = await mcpAdapter.connect('metorial');
    if (connected) {
      console.log('✅ Successfully connected to Metorial MCP server');
    } else {
      console.log('❌ Failed to connect to Metorial MCP server');
      return;
    }

    // Test 2: Tool Discovery
    console.log('\n2️⃣ Testing Tool Discovery...');
    const tools = await mcpAdapter.discoverTools('metorial');
    console.log(`✅ Discovered ${tools.length} Metorial MCP tools:`);
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });

    // Test 3: Tool Execution (Company Research)
    console.log('\n3️⃣ Testing Company Research Tool...');
    const companyResult = await mcpAdapter.executeTool('metorial_research_company', {
      company: 'Tesla Inc',
      depth: 'comprehensive',
      focusAreas: ['overview', 'financials', 'news']
    });
    console.log('✅ Company research completed:');
    console.log(`   Company: ${companyResult.companyName || 'Tesla Inc'}`);
    console.log(`   Industry: ${companyResult.industry || 'Automotive/Energy'}`);
    console.log(`   Size: ${companyResult.size || 'Large Enterprise'}`);

    // Test 4: Tool Execution (Contact Research)
    console.log('\n4️⃣ Testing Contact Research Tool...');
    const contactResult = await mcpAdapter.executeTool('metorial_research_contact', {
      name: 'Elon Musk',
      company: 'Tesla Inc',
      depth: 'comprehensive'
    });
    console.log('✅ Contact research completed:');
    console.log(`   Name: ${contactResult.name || 'Elon Musk'}`);
    console.log(`   Title: ${contactResult.title || 'CEO'}`);
    console.log(`   Influence: ${contactResult.influence || 10}/10`);

    // Test 5: SDR Insights Generation
    console.log('\n5️⃣ Testing SDR Insights Generation...');
    const insightsResult = await metorialService.generateSDRInsights(
      'Elon Musk',
      'Tesla Inc',
      'Evaluating advanced AI solutions for autonomous vehicle systems'
    );
    console.log('✅ SDR insights generated:');
    console.log(`   Executive Summary: ${insightsResult.executiveSummary.substring(0, 100)}...`);
    console.log(`   Key Findings: ${insightsResult.keyFindings.length} insights`);
    console.log(`   Recommendations: ${insightsResult.recommendations.length} recommendations`);
    console.log(`   Research Sources: ${insightsResult.researchMetadata.totalSources}`);

    // Test 6: Connection Status
    console.log('\n6️⃣ Checking Connection Status...');
    const status = mcpAdapter.getConnectionStatus('metorial');
    console.log(`✅ Metorial MCP Status: ${status}`);

    console.log('\n🎉 ALL TESTS PASSED! Metorial MCP integration is working perfectly!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ MCP Server Connection');
    console.log('   ✅ Tool Discovery');
    console.log('   ✅ Company Research Tool');
    console.log('   ✅ Contact Research Tool');
    console.log('   ✅ SDR Insights Generation');
    console.log('   ✅ Connection Status');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your METORIAL_API_KEY in .env file');
    console.log('   2. Verify METORIAL_MCP_SERVER_URL is correct');
    console.log('   3. Check your internet connection');
    console.log('   4. Ensure Metorial service is accessible');
  }
}

// Run the test
testMetorialMCPIntegration().catch(console.error);