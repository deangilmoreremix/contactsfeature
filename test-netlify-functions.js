/**
 * Test script for Netlify Functions
 * Run this to verify your AI functions are working correctly
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.NETLIFY_URL || 'http://localhost:8888';

async function testOpenAIContactAnalysis() {
  console.log('🧪 Testing OpenAI Contact Analysis...');

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/openai-contact-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact: {
          name: 'John Doe',
          company: 'Acme Corp',
          title: 'CEO',
          email: 'john@acme.com'
        },
        analysisType: 'quick'
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ OpenAI Contact Analysis: SUCCESS');
      console.log('   Score:', result.score);
      console.log('   Provider:', result.provider);
    } else {
      console.log('❌ OpenAI Contact Analysis: FAILED');
      console.log('   Error:', result.error || result);
    }
  } catch (error) {
    console.log('❌ OpenAI Contact Analysis: ERROR');
    console.log('   Message:', error.message);
  }
}

async function testGeminiContactResearch() {
  console.log('🧪 Testing Gemini Contact Research...');

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/gemini-contact-research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: 'Jane',
        lastName: 'Smith',
        company: 'Tech Solutions Inc',
        researchType: 'basic'
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Gemini Contact Research: SUCCESS');
      console.log('   Name:', result.name);
      console.log('   Confidence:', result.confidence);
      console.log('   Provider:', result.provider);
    } else {
      console.log('❌ Gemini Contact Research: FAILED');
      console.log('   Error:', result.error || result);
    }
  } catch (error) {
    console.log('❌ Gemini Contact Research: ERROR');
    console.log('   Message:', error.message);
  }
}

async function testOpenAIEmailTemplate() {
  console.log('🧪 Testing OpenAI Email Template...');

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/openai-email-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact: {
          name: 'Sarah Johnson',
          company: 'InnovateLabs',
          title: 'VP of Engineering',
          firstName: 'Sarah'
        },
        purpose: 'product demo',
        templateType: 'professional'
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ OpenAI Email Template: SUCCESS');
      console.log('   Subject:', result.subject);
      console.log('   Provider:', result.provider);
    } else {
      console.log('❌ OpenAI Email Template: FAILED');
      console.log('   Error:', result.error || result);
    }
  } catch (error) {
    console.log('❌ OpenAI Email Template: ERROR');
    console.log('   Message:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Netlify Functions Tests...\n');

  await testOpenAIContactAnalysis();
  console.log('');

  await testGeminiContactResearch();
  console.log('');

  await testOpenAIEmailTemplate();
  console.log('');

  console.log('🏁 Tests completed!');
  console.log('\n📝 Note: If tests fail, check:');
  console.log('   1. Environment variables are set in Netlify');
  console.log('   2. Functions are deployed');
  console.log('   3. API keys are valid');
  console.log('   4. CORS is properly configured');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export {
  testOpenAIContactAnalysis,
  testGeminiContactResearch,
  testOpenAIEmailTemplate,
  runTests
};