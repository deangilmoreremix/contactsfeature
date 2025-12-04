/**
 * Test script for AgentMail webhook
 * Run this to test the webhook endpoint with mock data
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NETLIFY_URL || 'http://localhost:8888';

async function testAgentMailWebhook() {
  console.log('🧪 Testing AgentMail Webhook...');

  const testPayload = {
    event_type: "message.received",
    message: {
      message_id: "test-123",
      inbox_id: "authority@yourbrand.agentmail.to",
      from_: "John Doe <john@example.com>",
      from: "john@example.com",
      subject: "Question about your product",
      text: "Hi, I saw your product at the conference last week. Does your solution integrate with Salesforce?",
      body: "Hi, I saw your product at the conference last week. Does your solution integrate with Salesforce?",
      thread_id: "thread-123"
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/agentmail-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.text();

    if (response.ok) {
      console.log('✅ Webhook test successful');
      console.log('Response:', result);
    } else {
      console.log('❌ Webhook test failed');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
  } catch (error) {
    console.log('❌ Webhook test error');
    console.log('Message:', error.message);
  }
}

// Test with sent message (should be ignored)
async function testSentMessageWebhook() {
  console.log('🧪 Testing Sent Message Webhook (should be ignored)...');

  const testPayload = {
    event_type: "message.sent",
    message: {
      message_id: "sent-123",
      inbox_id: "authority@yourbrand.agentmail.to",
      to: "john@example.com",
      subject: "Re: Question about your product",
      text: "Yes, we have native Salesforce integration...",
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/agentmail-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.text();

    if (response.ok) {
      console.log('✅ Sent message ignored (expected)');
      console.log('Response:', result);
    } else {
      console.log('❌ Unexpected response for sent message');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
  } catch (error) {
    console.log('❌ Sent message test error');
    console.log('Message:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting AgentMail Webhook Tests...\n');

  await testSentMessageWebhook();
  console.log('');

  await testAgentMailWebhook();
  console.log('');

  console.log('🏁 Tests completed!');
  console.log('\n📝 Note: For full testing, ensure:');
  console.log('   1. Environment variables are set');
  console.log('   2. Database table exists and is seeded');
  console.log('   3. Netlify functions are deployed');
  console.log('   4. OpenAI API key is valid');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testAgentMailWebhook,
  testSentMessageWebhook,
  runTests
};