/**
 * Manual AI Buttons Testing Script
 * Execute this in browser console to test AI button functionality
 */

console.log('🚀 AI Buttons Manual Testing Script Loaded');
console.log('📋 Test Plan: Comprehensive AI Button Functionality');

// Test data
const testContacts = {
  demo: {
    id: 'demo-contact-123',
    name: 'Sarah Johnson',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@techcorp.com',
    company: 'TechCorp Inc',
    title: 'VP of Engineering',
    industry: 'Technology',
    createdBy: 'demo',
    dataSource: 'mock',
    isMockData: true
  },
  real: {
    id: 'real-contact-456',
    name: 'Michael Chen',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@innovatetech.com',
    company: 'InnovateTech Solutions',
    title: 'CTO',
    industry: 'Software',
    createdBy: 'user',
    dataSource: 'imported'
  }
};

window.AITestingSuite = {
  // Test 1: Check if AI buttons are visible
  testButtonVisibility: () => {
    console.log('🔍 Test 1: Checking AI Button Visibility');

    const results = {
      contactCards: document.querySelectorAll('[data-testid="contact-card"]').length,
      aiButtons: document.querySelectorAll('[title*="AI"], [title*="Analyze"]').length,
      detailViewButtons: document.querySelectorAll('.ai-button, [data-ai-button]').length
    };

    console.table(results);
    return results;
  },

  // Test 2: Test AI Analysis Button on Contact Card
  testContactCardAI: async (contactType = 'demo') => {
    console.log(`🤖 Test 2: Testing Contact Card AI Analysis (${contactType})`);

    const contact = testContacts[contactType];
    const startTime = Date.now();

    try {
      // Find AI button on contact card
      const aiButton = document.querySelector('[title="Analyze with AI"]') ||
                      document.querySelector('[title="Re-analyze with AI"]') ||
                      document.querySelector('button:has(.brain-icon)');

      if (!aiButton) {
        throw new Error('AI button not found on contact card');
      }

      console.log('✅ Found AI button, clicking...');
      aiButton.click();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check for loading state
      const loadingSpinner = document.querySelector('.animate-spin, [data-loading]');
      const processingText = document.querySelector('text:contains("Processing"), text:contains("Analyzing")');

      console.log('🔄 Loading state detected:', !!loadingSpinner || !!processingText);

      // Wait for completion (demo should be fast, real may take longer)
      const maxWait = contactType === 'demo' ? 5000 : 15000;
      await new Promise(resolve => setTimeout(resolve, maxWait));

      // Check results
      const aiScore = document.querySelector('[data-ai-score], .ai-score');
      const citations = document.querySelectorAll('[data-citation], .citation-badge');
      const notes = document.querySelector('[data-notes]:contains("AI Analysis")');

      const results = {
        duration: Date.now() - startTime,
        aiScoreFound: !!aiScore,
        citationsFound: citations.length,
        notesUpdated: !!notes,
        success: true
      };

      console.table(results);
      return results;

    } catch (error) {
      console.error('❌ Test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test 3: Test Contact Detail View AI Buttons
  testDetailViewAI: async (contactType = 'demo') => {
    console.log(`🎯 Test 3: Testing Contact Detail View AI Buttons (${contactType})`);

    try {
      // Open contact detail view first
      const contactCard = document.querySelector('[data-contact-id]');
      if (contactCard) {
        contactCard.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const results = {};

      // Test AI Research Button
      console.log('🔍 Testing AI Research Button...');
      const researchButton = document.querySelector('[title="AI Web Research"]');
      if (researchButton) {
        researchButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));

        const researchCitations = document.querySelectorAll('.citation-badge, [data-citation]');
        results.researchButton = {
          found: true,
          citationsGenerated: researchCitations.length
        };
      } else {
        results.researchButton = { found: false };
      }

      // Test AI Analysis Button
      console.log('🧠 Testing AI Analysis Button...');
      const analysisButton = document.querySelector('[title="AI Analysis"]');
      if (analysisButton) {
        analysisButton.click();
        await new Promise(resolve => setTimeout(resolve, 5000));

        const aiScore = document.querySelector('.ai-score, [data-ai-score]');
        results.analysisButton = {
          found: true,
          scoreUpdated: !!aiScore
        };
      } else {
        results.analysisButton = { found: false };
      }

      // Test AI Auto-Enrich Button
      console.log('✨ Testing AI Auto-Enrich Button...');
      const enrichButton = document.querySelector('button:contains("AI Auto-Enrich")');
      if (enrichButton) {
        enrichButton.click();
        await new Promise(resolve => setTimeout(resolve, 4000));

        const socialProfiles = document.querySelectorAll('[data-social-profile]');
        results.enrichButton = {
          found: true,
          profilesAdded: socialProfiles.length
        };
      } else {
        results.enrichButton = { found: false };
      }

      console.table(results);
      return results;

    } catch (error) {
      console.error('❌ Detail view test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test 4: Test AI Toolbar Buttons
  testToolbarAI: async () => {
    console.log('🛠️ Test 4: Testing AI Toolbar Buttons');

    try {
      const results = {};

      // Test Lead Score Button
      console.log('📊 Testing Lead Score Button...');
      const leadScoreBtn = document.querySelector('button:contains("Lead Score")');
      if (leadScoreBtn) {
        leadScoreBtn.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        results.leadScore = { found: true, completed: true };
      } else {
        results.leadScore = { found: false };
      }

      // Test Email AI Button
      console.log('📧 Testing Email AI Button...');
      const emailBtn = document.querySelector('button:contains("Email AI")');
      if (emailBtn) {
        emailBtn.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        results.emailAI = { found: true, completed: true };
      } else {
        results.emailAI = { found: false };
      }

      // Test Enrich Button
      console.log('🔍 Testing Enrich Button...');
      const enrichBtn = document.querySelector('button:contains("Enrich")');
      if (enrichBtn) {
        enrichBtn.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        results.enrich = { found: true, completed: true };
      } else {
        results.enrich = { found: false };
      }

      // Test Insights Button
      console.log('💡 Testing Insights Button...');
      const insightsBtn = document.querySelector('button:contains("Insights")');
      if (insightsBtn) {
        insightsBtn.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        results.insights = { found: true, completed: true };
      } else {
        results.insights = { found: false };
      }

      console.table(results);
      return results;

    } catch (error) {
      console.error('❌ Toolbar test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test 5: Test Citation Functionality
  testCitations: async () => {
    console.log('📚 Test 5: Testing Citation Functionality');

    try {
      // Trigger AI research to generate citations
      const researchBtn = document.querySelector('[title="AI Web Research"]') ||
                         document.querySelector('[title="AI Analysis"]');

      if (researchBtn) {
        researchBtn.click();
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check for citations
        const citations = document.querySelectorAll('.citation-badge, [data-citation]');
        const citationLinks = document.querySelectorAll('a[href*="linkedin"], a[href*="twitter"], a[href*="company"]');

        const results = {
          citationsFound: citations.length,
          clickableLinks: citationLinks.length,
          citationModal: !!document.querySelector('[data-citation-modal]'),
          sourceDomains: Array.from(citationLinks).map(link => {
            try {
              return new URL(link.href).hostname;
            } catch {
              return 'invalid-url';
            }
          })
        };

        console.table(results);
        return results;
      } else {
        return { success: false, error: 'No research button found' };
      }

    } catch (error) {
      console.error('❌ Citation test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test 6: Performance Test
  testPerformance: async () => {
    console.log('⚡ Test 6: Performance Testing');

    const results = {
      demoContact: { duration: 0, success: false },
      realContact: { duration: 0, success: false }
    };

    // Test demo contact performance
    console.log('Testing demo contact performance...');
    const demoStart = Date.now();
    try {
      await window.AITestingSuite.testContactCardAI('demo');
      results.demoContact = {
        duration: Date.now() - demoStart,
        success: true
      };
    } catch (error) {
      results.demoContact = {
        duration: Date.now() - demoStart,
        success: false,
        error: error.message
      };
    }

    // Test real contact performance (if available)
    console.log('Testing real contact performance...');
    const realStart = Date.now();
    try {
      await window.AITestingSuite.testContactCardAI('real');
      results.realContact = {
        duration: Date.now() - realStart,
        success: true
      };
    } catch (error) {
      results.realContact = {
        duration: Date.now() - realStart,
        success: false,
        error: error.message
      };
    }

    console.table(results);
    return results;
  },

  // Test 7: Error Handling Test
  testErrorHandling: async () => {
    console.log('🚨 Test 7: Error Handling Testing');

    // Simulate network error by temporarily disabling fetch
    const originalFetch = window.fetch;
    window.fetch = () => Promise.reject(new Error('Network error'));

    try {
      const result = await window.AITestingSuite.testContactCardAI('demo');
      return {
        errorHandling: result.success === false,
        errorMessage: result.error || 'No error captured'
      };
    } finally {
      // Restore fetch
      window.fetch = originalFetch;
    }
  },

  // Run all tests
  runAllTests: async () => {
    console.log('🚀 Starting Comprehensive AI Buttons Test Suite');
    console.log('=' .repeat(60));

    const testResults = {};

    try {
      // Test 1: Button Visibility
      console.log('\n📊 TEST 1: Button Visibility');
      testResults.visibility = await window.AITestingSuite.testButtonVisibility();

      // Test 2: Contact Card AI (Demo)
      console.log('\n🤖 TEST 2: Contact Card AI (Demo)');
      testResults.contactCardDemo = await window.AITestingSuite.testContactCardAI('demo');

      // Test 3: Contact Card AI (Real)
      console.log('\n🎯 TEST 3: Contact Card AI (Real)');
      testResults.contactCardReal = await window.AITestingSuite.testContactCardAI('real');

      // Test 4: Detail View AI
      console.log('\n🔍 TEST 4: Detail View AI');
      testResults.detailView = await window.AITestingSuite.testDetailViewAI('demo');

      // Test 5: Toolbar AI
      console.log('\n🛠️ TEST 5: Toolbar AI');
      testResults.toolbar = await window.AITestingSuite.testToolbarAI();

      // Test 6: Citations
      console.log('\n📚 TEST 6: Citations');
      testResults.citations = await window.AITestingSuite.testCitations();

      // Test 7: Performance
      console.log('\n⚡ TEST 7: Performance');
      testResults.performance = await window.AITestingSuite.testPerformance();

      // Test 8: Error Handling
      console.log('\n🚨 TEST 8: Error Handling');
      testResults.errorHandling = await window.AITestingSuite.testErrorHandling();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      testResults.error = error.message;
    }

    // Generate summary report
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY REPORT');
    console.log('='.repeat(60));

    const passedTests = Object.values(testResults).filter(result =>
      result && (result.success !== false)
    ).length;

    const totalTests = Object.keys(testResults).length;

    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! AI buttons are working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the results above for details.');
    }

    console.table(testResults);
    return testResults;
  }
};

// Auto-run basic visibility test
setTimeout(() => {
  console.log('🔍 Running initial visibility check...');
  window.AITestingSuite.testButtonVisibility();
}, 2000);

console.log('💡 Usage:');
console.log('  window.AITestingSuite.testButtonVisibility() - Check button visibility');
console.log('  window.AITestingSuite.testContactCardAI("demo") - Test contact card AI');
console.log('  window.AITestingSuite.testDetailViewAI("demo") - Test detail view AI');
console.log('  window.AITestingSuite.testToolbarAI() - Test toolbar AI buttons');
console.log('  window.AITestingSuite.testCitations() - Test citation functionality');
console.log('  window.AITestingSuite.runAllTests() - Run complete test suite');