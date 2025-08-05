#!/usr/bin/env node

/**
 * Setup Verification Script
 * Run this to check if your Supabase configuration is correct
 */

const https = require('https');

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function checkConfiguration() {
  log('🔍 Checking Supabase Configuration...', 'blue');
  log('=====================================', 'blue');

  // Check environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    log('❌ VITE_SUPABASE_URL not found in environment', 'red');
    log('   Add this to your .env file', 'yellow');
    return false;
  } else {
    log('✅ VITE_SUPABASE_URL found', 'green');
  }

  if (!supabaseKey) {
    log('❌ VITE_SUPABASE_ANON_KEY not found in environment', 'red');
    log('   Add this to your .env file', 'yellow');
    return false;
  } else {
    log('✅ VITE_SUPABASE_ANON_KEY found', 'green');
  }

  // Test Edge Function connectivity
  log('\n🧪 Testing Edge Function connectivity...', 'blue');
  
  const testEndpoint = `${supabaseUrl}/functions/v1/ai-enrichment`;
  
  try {
    const response = await makeRequest(testEndpoint, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      log('✅ ai-enrichment function is responding', 'green');
    } else {
      log(`❌ ai-enrichment function returned status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Cannot connect to ai-enrichment function', 'red');
    log(`   Error: ${error.message}`, 'yellow');
    log('   Make sure the function is deployed with: npx supabase functions deploy ai-enrichment', 'yellow');
    return false;
  }

  // Test with a simple request
  log('\n🎯 Testing AI function with sample data...', 'blue');
  
  try {
    const testData = {
      contactId: 'test',
      enrichmentRequest: { email: 'test@example.com' },
      type: 'email'
    };
    
    const response = await makeRequest(testEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const responseData = JSON.parse(response.data);
    
    if (response.status === 200 || response.status === 201) {
      log('✅ AI enrichment function is working correctly', 'green');
      if (responseData.confidence) {
        log(`   Confidence level: ${responseData.confidence}%`, 'green');
      }
    } else if (response.status === 503) {
      log('❌ AI provider not configured in Edge Function', 'red');
      log('   You need to set API keys as Supabase secrets:', 'yellow');
      log('   npx supabase secrets set OPENAI_API_KEY=your-key', 'yellow');
      log('   npx supabase secrets set GEMINI_API_KEY=your-key', 'yellow');
      return false;
    } else {
      log(`❌ Function test failed with status: ${response.status}`, 'red');
      log(`   Response: ${response.data}`, 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ Function test failed', 'red');
    log(`   Error: ${error.message}`, 'yellow');
    return false;
  }

  log('\n🎉 Configuration Check Complete!', 'green');
  log('=================================', 'green');
  log('✅ All systems are working correctly', 'green');
  log('✅ AI features should now work in your application', 'green');
  
  return true;
}

// Load environment variables if .env file exists
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, that's okay
}

checkConfiguration().catch(error => {
  log('\n❌ Configuration check failed:', 'red');
  log(error.message, 'red');
  process.exit(1);
});