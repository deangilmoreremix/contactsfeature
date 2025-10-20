/**
 * Complete Netlify Functions Test Suite
 * Tests all 20 Netlify functions with real API calls
 */

const API_KEY = 'your_openai_api_key_here';
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your_supabase_anon_key_here';

const BASE_URL = 'http://localhost:9999'; // Local Netlify dev server

// Test data
const testContact = {
  id: 'test_contact_123',
  name: 'John Smith',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@techcorp.com',
  title: 'CTO',
  company: 'TechCorp Industries',
  industry: 'Technology',
  interestLevel: 'hot',
  status: 'prospect'
};

async function testNetlifyFunction(functionName, payload) {
  console.log(`\n🧪 Testing ${functionName}...`);

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`✅ ${functionName} - SUCCESS`);
      console.log(`   Response:`, result);
      return { success: true, data: result };
    } else {
      console.log(`❌ ${functionName} - FAILED`);
      console.log(`   Error:`, result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.log(`❌ ${functionName} - ERROR`);
    console.log(`   Exception:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Complete Netlify Functions Test Suite...');
  console.log('=' .repeat(60));

  const results = [];

  // Test Core AI Functions
  console.log('\n🎯 CORE AI FUNCTIONS:');

  // 1. AI Enrichment (Contact Scoring)
  results.push(await testNetlifyFunction('ai-enrichment', {
    contact: testContact,
    aiProvider: 'openai'
  }));

  // 2. Email Composer
  results.push(await testNetlifyFunction('email-composer', {
    contact: testContact,
    type: 'introduction',
    tone: 'professional',
    aiProvider: 'openai'
  }));

  // 3. Email Analyzer
  results.push(await testNetlifyFunction('email-analyzer', {
    content: {
      subject: 'Introduction and Partnership Opportunity',
      body: 'Hi John, I wanted to reach out about potential collaboration opportunities...'
    },
    recipient: testContact,
    analysisType: 'comprehensive',
    aiProvider: 'openai'
  }));

  // 4. AI Insights
  results.push(await testNetlifyFunction('ai-insights', {
    contact: testContact,
    insightTypes: ['opportunity', 'recommendation'],
    aiProvider: 'openai'
  }));

  // 5. Communication Optimization
  results.push(await testNetlifyFunction('communication-optimization', {
    contact: testContact,
    interactionHistory: [],
    timeframe: '30d',
    optimizationType: 'comprehensive',
    aiProvider: 'openai'
  }));

  // 6. Adaptive Playbook
  results.push(await testNetlifyFunction('adaptive-playbook', {
    contact: testContact,
    currentStage: 'prospect',
    businessGoals: ['increase_revenue', 'expand_market'],
    automationType: 'comprehensive',
    aiProvider: 'openai'
  }));

  // 7. Sales Forecasting
  results.push(await testNetlifyFunction('sales-forecasting', {
    contact: testContact,
    interactionHistory: [],
    timeframe: '90d',
    predictionType: 'conversion',
    businessContext: 'Enterprise software sales',
    aiProvider: 'openai'
  }));

  // Test Advanced Sales Intelligence Functions
  console.log('\n🎯 ADVANCED SALES INTELLIGENCE:');

  // 8. Discovery Questions
  results.push(await testNetlifyFunction('discovery-questions', {
    contact: testContact,
    meetingContext: {
      type: 'discovery',
      duration: 30,
      objective: 'Understand needs and qualify opportunity'
    },
    questionType: 'comprehensive',
    aiProvider: 'openai'
  }));

  // 9. Lead Nurturing
  results.push(await testNetlifyFunction('lead-nurturing', {
    contact: testContact,
    nurtureStrategy: 'comprehensive',
    timeframe: '90d',
    businessGoals: ['build_relationship', 'demonstrate_value'],
    aiProvider: 'openai'
  }));

  // 10. Feature Analysis
  results.push(await testNetlifyFunction('feature-analysis', {
    contact: testContact,
    productFeatures: ['AI-powered analytics', 'Real-time reporting', 'Custom integrations'],
    analysisType: 'comprehensive',
    competitiveContext: 'Enterprise software market',
    aiProvider: 'openai'
  }));

  // 11. Deal Health Analysis
  results.push(await testNetlifyFunction('deal-health-analysis', {
    deal: {
      id: testContact.id,
      name: testContact.name,
      value: 50000,
      company: testContact.company,
      stage: testContact.status,
      industry: testContact.industry
    },
    healthMetrics: ['engagement', 'budget_fit', 'timeline'],
    analysisDepth: 'comprehensive',
    riskFactors: ['competition', 'budget_constraints'],
    aiProvider: 'openai'
  }));

  // Test Specialized Functions
  console.log('\n🎯 SPECIALIZED FUNCTIONS:');

  // 12. Social Media Enrichment
  results.push(await testNetlifyFunction('social-media-enrichment', {
    contact: testContact,
    enrichmentType: 'comprehensive',
    aiProvider: 'openai'
  }));

  // 13. Geographic Territory Assignment
  results.push(await testNetlifyFunction('geographic-territory-assignment', {
    contact: {
      ...testContact,
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105'
    }
  }));

  // 14. OpenAI Contact Analysis
  results.push(await testNetlifyFunction('openai-contact-analysis', {
    contact: testContact,
    analysisType: 'full',
    aiProvider: 'openai'
  }));

  // 15. OpenAI Email Template
  results.push(await testNetlifyFunction('openai-email-template', {
    contact: testContact,
    purpose: 'introduction',
    templateType: 'professional',
    aiProvider: 'openai'
  }));

  // 16. Competitor Alert
  results.push(await testNetlifyFunction('competitor-alert', {
    contact: testContact
  }));

  // 17. Contact Automation
  results.push(await testNetlifyFunction('contact-automation', {
    contact: testContact,
    automation: {
      type: 'scoring',
      id: 'auto_123'
    },
    trigger: 'contact_created'
  }));

  // 18. Email Engagement Scoring
  results.push(await testNetlifyFunction('email-engagement-scoring', {
    contact: testContact,
    emailMetrics: {
      openRate: 0.85,
      clickRate: 0.12,
      responseRate: 0.08,
      lastActivity: new Date().toISOString()
    }
  }));

  // 19. VIP Contact Escalation
  results.push(await testNetlifyFunction('vip-contact-escalation', {
    contact: {
      ...testContact,
      title: 'CEO',
      companySize: 1500,
      dealValue: 75000
    }
  }));

  // 20. Citation Manager
  results.push(await testNetlifyFunction('citation-manager', {
    action: 'store',
    contactId: testContact.id,
    citations: [
      {
        url: 'https://example.com',
        title: 'Test Citation',
        domain: 'example.com',
        type: 'web_search',
        confidence: 85,
        snippet: 'This is a test citation for validation'
      }
    ],
    aiProvider: 'openai'
  }));

  // Test Results Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY:');
  console.log('=' .repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}/20`);
  console.log(`❌ Failed: ${failed}/20`);
  console.log(`📈 Success Rate: ${Math.round((successful / 20) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! All Netlify functions are working correctly.');
  } else {
    console.log(`\n⚠️  ${failed} function(s) failed. Check the errors above.`);
  }

  return {
    total: 20,
    successful,
    failed,
    results
  };
}

// Environment setup
console.log('🔧 Setting up environment...');
console.log(`OpenAI API Key: ${API_KEY.substring(0, 20)}...`);
console.log(`Supabase URL: ${SUPABASE_URL}`);

// Run tests
runAllTests().then(summary => {
  console.log('\n🏁 Test suite completed!');
  process.exit(summary.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});