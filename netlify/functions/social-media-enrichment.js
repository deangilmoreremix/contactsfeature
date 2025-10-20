const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed'
    };
  }

  try {
    const { contact, enrichmentType = 'comprehensive' } = JSON.parse(event.body);

    console.log('Processing social media enrichment for contact:', contact.id);

    // Fetch social media profiles
    const socialData = await fetchSocialProfiles(contact);

    // Update contact with enriched data
    const updates = {};

    if (socialData.linkedin && !contact.socialProfiles?.linkedin) {
      updates.socialProfiles = {
        ...contact.socialProfiles,
        linkedin: socialData.linkedin
      };
    }

    if (socialData.twitter && !contact.socialProfiles?.twitter) {
      if (!updates.socialProfiles) updates.socialProfiles = { ...contact.socialProfiles };
      updates.socialProfiles.twitter = socialData.twitter;
    }

    if (socialData.website && !contact.socialProfiles?.website) {
      if (!updates.socialProfiles) updates.socialProfiles = { ...contact.socialProfiles };
      updates.socialProfiles.website = socialData.website;
    }

    // Update additional fields if found
    if (socialData.title && !contact.title) {
      updates.title = socialData.title;
    }

    if (socialData.industry && !contact.industry) {
      updates.industry = socialData.industry;
    }

    if (socialData.company && !contact.company) {
      updates.company = socialData.company;
    }

    if (Object.keys(updates).length > 0) {
      updates.lastEnriched = new Date().toISOString();
      updates.enrichmentSource = 'social_media';

      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', contact.id);

      if (error) throw error;

      console.log(`Enriched contact ${contact.id} with ${Object.keys(updates).length} social fields`);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        enriched: Object.keys(updates),
        socialData,
        confidence: socialData.confidence || 85
      })
    };
  } catch (error) {
    console.error('Social media enrichment failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Social media enrichment failed',
        details: error.message
      })
    };
  }
};

async function fetchSocialProfiles(contact) {
  const socialData = {
    confidence: 0,
    sources: []
  };

  try {
    // Use OpenAI web search for comprehensive social media and company research
    const searchQuery = `${contact.firstName} ${contact.lastName} ${contact.company} ${contact.title || ''} site:linkedin.com OR site:twitter.com OR site:facebook.com OR site:company-website`;

    const enrichmentResult = await enrichWithOpenAIWebSearch(contact, searchQuery);

    if (enrichmentResult) {
      // Apply enriched data
      if (enrichmentResult.linkedin) {
        socialData.linkedin = enrichmentResult.linkedin;
        socialData.sources.push('linkedin');
      }

      if (enrichmentResult.twitter) {
        socialData.twitter = enrichmentResult.twitter;
        socialData.sources.push('twitter');
      }

      if (enrichmentResult.website) {
        socialData.website = enrichmentResult.website;
        socialData.sources.push('company_website');
      }

      if (enrichmentResult.title && !contact.title) {
        socialData.title = enrichmentResult.title;
      }

      if (enrichmentResult.industry && !contact.industry) {
        socialData.industry = enrichmentResult.industry;
      }

      if (enrichmentResult.company && !contact.company) {
        socialData.company = enrichmentResult.company;
      }

      socialData.confidence = enrichmentResult.confidence || 85;
      socialData.aiInsights = enrichmentResult.insights || [];
      socialData.sources.push('openai_web_search');
    }

  } catch (error) {
    console.error('Error fetching social profiles:', error);

    // Fallback to basic URL generation
    if (contact.firstName && contact.lastName) {
      socialData.linkedin = `https://linkedin.com/in/${contact.firstName.toLowerCase()}-${contact.lastName.toLowerCase()}`;
      socialData.twitter = `@${contact.firstName.toLowerCase()}${contact.lastName.toLowerCase()}`;
      socialData.confidence = 60;
      socialData.sources.push('fallback_generation');
    }
  }

  return socialData;
}

async function enrichWithOpenAIWebSearch(contact, searchQuery) {
  try {
    const response = await fetch(`https://api.openai.com/v1/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: 'You are a professional data enrichment specialist with web search capabilities. Research the contact information and return comprehensive social media profiles, company website, and professional details. Use the web_search tool to find current information.',
        input: `Research and find social media profiles and company information for: ${searchQuery}

Contact details provided: ${JSON.stringify(contact)}

Use web search to find:
- LinkedIn profile URL
- Twitter/X handle
- Company website
- Current job title and company
- Industry information
- Recent professional news or updates

Return a JSON object with the exact structure:
{
  "linkedin": "LinkedIn profile URL if found",
  "twitter": "Twitter/X handle if found",
  "website": "Company website URL if found",
  "title": "Current job title if different from provided",
  "industry": "Industry if found",
  "company": "Company name if different from provided",
  "confidence": "Confidence level 0-100 based on information quality",
  "insights": ["Key findings about this person from web search"],
  "searchResults": ["Summary of what was found in web search"]
}`,
        tools: [
          {
            type: 'web_search'
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI Responses API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle Responses API format - check if output exists or fallback to output_text
    let enrichment;
    if (data.output && data.output.length > 0) {
      // Find the message item in output array
      const messageItem = data.output.find(item => item.type === 'message');
      if (messageItem && messageItem.content && messageItem.content.length > 0) {
        enrichment = JSON.parse(messageItem.content[0].text);
      } else {
        throw new Error('No message content found in response output');
      }
    } else if (data.output_text) {
      enrichment = JSON.parse(data.output_text);
    } else {
      throw new Error('No response content found');
    }

    return {
      linkedin: enrichment.linkedin || null,
      twitter: enrichment.twitter || null,
      website: enrichment.website || null,
      title: enrichment.title || null,
      industry: enrichment.industry || null,
      company: enrichment.company || null,
      confidence: enrichment.confidence || 85,
      insights: enrichment.insights || [],
      searchResults: enrichment.searchResults || []
    };

  } catch (error) {
    console.error('OpenAI Responses API web search failed:', error);
    return null;
  }
}

// OpenAI web search enrichment function (replaces individual API calls)