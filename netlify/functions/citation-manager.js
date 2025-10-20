const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      action,
      contactId,
      citations = [],
      citationId,
      searchQuery,
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Citation management request:', {
      action,
      contactId,
      citationCount: citations.length,
      aiProvider
    });

    let result;

    switch (action) {
      case 'store':
        result = await storeCitations(contactId, citations, aiProvider);
        break;
      case 'retrieve':
        result = await retrieveCitations(contactId, searchQuery);
        break;
      case 'validate':
        result = await validateCitation(citationId);
        break;
      case 'update':
        result = await updateCitation(citationId, citations[0]);
        break;
      case 'delete':
        result = await deleteCitation(citationId);
        break;
      case 'search':
        result = await searchCitations(searchQuery, contactId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: result,
        action,
        provider: aiProvider,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Citation management failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Citation management failed',
        details: error.message
      })
    };
  }
};

async function storeCitations(contactId, citations, aiProvider) {
  try {
    // Validate citations before storing
    const validatedCitations = citations.map(citation => ({
      contact_id: contactId,
      url: citation.url,
      title: citation.title,
      domain: citation.domain,
      type: citation.type || 'web_search',
      confidence: citation.confidence || 75,
      snippet: citation.snippet,
      metadata: {
        aiProvider,
        searchQuery: citation.searchQuery,
        foundAt: citation.foundAt || new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      is_active: true
    }));

    // Store in database
    const { data, error } = await supabase
      .from('contact_citations')
      .insert(validatedCitations)
      .select();

    if (error) throw error;

    // Update contact with citation count
    await supabase
      .from('contacts')
      .update({
        citationCount: citations.length,
        lastCitationUpdate: new Date().toISOString()
      })
      .eq('id', contactId);

    return {
      stored: data.length,
      citations: data,
      contactId
    };
  } catch (error) {
    console.error('Citation storage failed:', error);
    throw error;
  }
}

async function retrieveCitations(contactId, searchQuery) {
  try {
    let query = supabase
      .from('contact_citations')
      .select('*')
      .eq('contact_id', contactId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Filter by search query if provided
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%,domain.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      citations: data,
      count: data.length,
      contactId,
      searchQuery: searchQuery || null
    };
  } catch (error) {
    console.error('Citation retrieval failed:', error);
    throw error;
  }
}

async function validateCitation(citationId) {
  try {
    // Get citation details
    const { data: citation, error: fetchError } = await supabase
      .from('contact_citations')
      .select('*')
      .eq('id', citationId)
      .single();

    if (fetchError) throw fetchError;

    // Check if URL is still accessible and content is relevant
    const isValid = await validateUrlAccessibility(citation.url);
    const isRelevant = await validateContentRelevance(citation);

    // Update citation with validation results
    const { data, error } = await supabase
      .from('contact_citations')
      .update({
        is_valid: isValid && isRelevant,
        last_validated: new Date().toISOString(),
        validation_metadata: {
          urlAccessible: isValid,
          contentRelevant: isRelevant,
          validationDate: new Date().toISOString()
        }
      })
      .eq('id', citationId)
      .select()
      .single();

    if (error) throw error;

    return {
      citation: data,
      isValid: isValid && isRelevant,
      validationDetails: {
        urlAccessible: isValid,
        contentRelevant: isRelevant
      }
    };
  } catch (error) {
    console.error('Citation validation failed:', error);
    throw error;
  }
}

async function updateCitation(citationId, updates) {
  try {
    const { data, error } = await supabase
      .from('contact_citations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', citationId)
      .select()
      .single();

    if (error) throw error;

    return {
      citation: data,
      updated: true
    };
  } catch (error) {
    console.error('Citation update failed:', error);
    throw error;
  }
}

async function deleteCitation(citationId) {
  try {
    const { data, error } = await supabase
      .from('contact_citations')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', citationId)
      .select()
      .single();

    if (error) throw error;

    return {
      citation: data,
      deleted: true
    };
  } catch (error) {
    console.error('Citation deletion failed:', error);
    throw error;
  }
}

async function searchCitations(searchQuery, contactId = null) {
  try {
    let query = supabase
      .from('contact_citations')
      .select('*, contacts(name, company)')
      .eq('is_active', true)
      .or(`title.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%,domain.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by domain and contact for better organization
    const groupedResults = data.reduce((acc, citation) => {
      const domain = citation.domain;
      if (!acc[domain]) {
        acc[domain] = {
          domain,
          citations: [],
          totalCitations: 0
        };
      }
      acc[domain].citations.push(citation);
      acc[domain].totalCitations++;
      return acc;
    }, {});

    return {
      citations: data,
      groupedByDomain: groupedResults,
      totalResults: data.length,
      searchQuery,
      contactId
    };
  } catch (error) {
    console.error('Citation search failed:', error);
    throw error;
  }
}

async function validateUrlAccessibility(url) {
  try {
    // Simple URL validation - in production, you might want to make actual HTTP requests
    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

    if (!urlPattern.test(url)) {
      return false;
    }

    // Check if domain is still registered (basic check)
    const domain = new URL(url).hostname;

    // For now, assume URL is valid if it matches the pattern
    // In production, you could use services like:
    // - HTTP HEAD request to check if page exists
    // - DNS lookup to verify domain
    // - Content analysis to verify relevance

    return true;
  } catch (error) {
    console.error('URL validation failed:', error);
    return false;
  }
}

async function validateContentRelevance(citation) {
  try {
    // Basic relevance check based on content matching
    const searchTerms = ['contact', 'profile', 'company', 'business', 'professional'];
    const content = `${citation.title} ${citation.snippet}`.toLowerCase();

    const relevanceScore = searchTerms.reduce((score, term) => {
      return content.includes(term) ? score + 1 : score;
    }, 0);

    return relevanceScore >= 1; // At least one relevant term
  } catch (error) {
    console.error('Content relevance validation failed:', error);
    return false;
  }
}