import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ContactEnrichmentData {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  industry?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    website?: string;
  };
  avatar?: string;
  bio?: string;
  notes?: string;
  confidence?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Validate required environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
    return new Response(
      JSON.stringify({ 
        error: 'Server configuration error: Missing required environment variables',
        details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be configured'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Check if AI providers are configured
  const hasOpenAI = !!openaiApiKey;
  const hasGemini = !!geminiApiKey;
  const hasAiProvider = hasOpenAI || hasGemini;

  // Log environment variables for debugging (without revealing full keys)
  console.log('Function environment variables:');
  console.log('- SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
  console.log('- SUPABASE_ANON_KEY:', supabaseKey ? 'present (length: ' + supabaseKey.length + ')' : 'missing');
  console.log('- OPENAI_API_KEY:', openaiApiKey ? `present (starts with: ${openaiApiKey.substring(0, 3)}...)` : 'missing');
  console.log('- GEMINI_API_KEY:', geminiApiKey ? `present (starts with: ${geminiApiKey.substring(0, 3)}...)` : 'missing');

  try {
    if (req.method === 'POST') {
      const requestData = await req.json();
      const { contactId, enrichmentRequest, type } = requestData;
      
      if (!enrichmentRequest) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing enrichment request data',
            details: 'enrichmentRequest field is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // If no AI providers are configured, return mock data
      if (!hasAiProvider) {
        console.warn('No AI providers configured, using mock data');
        const mockData = generateMockEnrichment(enrichmentRequest);
        return new Response(
          JSON.stringify(mockData),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      let enrichedData: ContactEnrichmentData;
      
      // Determine which type of enrichment to perform
      switch (type) {
        case 'email':
          enrichedData = await enrichContactByEmail(
            enrichmentRequest.email, 
            hasOpenAI ? openaiApiKey : undefined,
            hasGemini ? geminiApiKey : undefined
          );
          break;
        case 'name':
          enrichedData = await enrichContactByName(
            enrichmentRequest.firstName,
            enrichmentRequest.lastName,
            enrichmentRequest.company,
            hasOpenAI ? openaiApiKey : undefined,
            hasGemini ? geminiApiKey : undefined
          );
          break;
        case 'linkedin':
          enrichedData = await enrichContactByLinkedIn(
            enrichmentRequest.linkedinUrl,
            hasOpenAI ? openaiApiKey : undefined,
            hasGemini ? geminiApiKey : undefined
          );
          break;
        case 'image':
          const imageUrl = await findContactImage(
            enrichmentRequest.name,
            enrichmentRequest.company,
            hasOpenAI ? openaiApiKey : undefined,
            hasGemini ? geminiApiKey : undefined
          );
          return new Response(
            JSON.stringify({ imageUrl }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        case 'bulk':
          // Not implementing bulk enrichment with real APIs for now
          // This would require careful rate limiting and parallel processing
          const mockBulkResults = enrichmentRequest.contacts.map((contact: any) => 
            generateMockEnrichment(contact)
          );
          return new Response(
            JSON.stringify(mockBulkResults),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        default:
          return new Response(
            JSON.stringify({ 
              error: 'Invalid enrichment type',
              details: `Unsupported type: ${type}`
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
      }
      
      return new Response(
        JSON.stringify(enrichedData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Endpoint not found
    return new Response(
      JSON.stringify({ 
        error: 'Not found',
        details: `Endpoint not found: ${req.method} ${new URL(req.url).pathname}`
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Unhandled error in ai-enrichment function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to generate mock enrichment data for fallback
function generateMockEnrichment(request: any): ContactEnrichmentData {
  const { email, firstName, lastName, company, linkedinUrl } = request;
  
  let mockData: ContactEnrichmentData = {
    confidence: 30,
    notes: 'API enrichment unavailable. Using estimated data. To enable AI features, please set up API keys for OpenAI or Gemini.'
  };
  
  if (email) {
    // Extract data from email
    const [username, domain] = email.split('@');
    const nameParts = username.split('.');
    
    mockData = {
      ...mockData,
      firstName: nameParts[0] ? capitalize(nameParts[0]) : '',
      lastName: nameParts[1] ? capitalize(nameParts[1]) : '',
      email: email,
      company: domain && domain.split('.')[0] ? capitalize(domain.split('.')[0]) : '',
      socialProfiles: {
        linkedin: linkedinUrl || `https://linkedin.com/in/${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        website: `https://${domain}`
      }
    };
  } else if (firstName || lastName) {
    // Use provided name data
    mockData = {
      ...mockData,
      firstName: firstName || '',
      lastName: lastName || '',
      name: `${firstName || ''} ${lastName || ''}`.trim(),
      company: company || 'Unknown Company',
      email: email || generateMockEmail(firstName, lastName, company),
      socialProfiles: {
        linkedin: linkedinUrl || `https://linkedin.com/in/${(firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}${
          lastName ? `-${(lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}` : ''}`,
      }
    };
  } else if (linkedinUrl) {
    // Extract name from LinkedIn URL if possible
    const urlPath = linkedinUrl.split('/in/')[1] || '';
    const nameParts = urlPath.split('-');
    
    mockData = {
      ...mockData,
      firstName: nameParts[0] ? capitalize(nameParts[0]) : 'Unknown',
      lastName: nameParts[1] ? capitalize(nameParts[1]) : '',
      socialProfiles: {
        linkedin: linkedinUrl
      }
    };
  }
  
  return mockData;
}

// OpenAI API call for contact enrichment by email
async function enrichContactByEmail(
  email: string,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ContactEnrichmentData> {
  console.log(`Enriching contact by email: ${email}`);
  
  try {
    // Prefer OpenAI if available, otherwise use Gemini
    if (openaiApiKey) {
      return await enrichContactByEmailWithOpenAI(email, openaiApiKey);
    } else if (geminiApiKey) {
      return await enrichContactByEmailWithGemini(email, geminiApiKey);
    } else {
      throw new Error('No AI provider API key available');
    }
  } catch (error) {
    console.error('Error enriching contact by email:', error);
    // Return minimal data in case of error
    return {
      email,
      confidence: 20,
      notes: `AI enrichment attempt failed: ${error.message}. Using minimal data.`
    };
  }
}

async function enrichContactByEmailWithOpenAI(email: string, apiKey: string): Promise<ContactEnrichmentData> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a contact enrichment assistant that can infer information about a person from their email address.
          Extract and infer as much information as possible about the user, but do NOT make up specific details that aren't reasonably inferable.
          When you're uncertain, indicate lower confidence rather than inventing details.
          Analyze email format, domain, and any patterns to infer role, company, industry, and contact details.`
        },
        {
          role: 'user',
          content: `Enrich this email address with contact information: ${email}
          
          Return a JSON object with these fields:
          - firstName: first name if identifiable from email
          - lastName: last name if identifiable from email 
          - email: the provided email
          - company: company name based on email domain
          - title: likely job title based on the domain and naming patterns
          - industry: likely industry based on the company domain
          - socialProfiles: likely social profile URLs including linkedin and website
          - confidence: number from 1-100 indicating confidence level in these inferences
          - notes: any notes about the enrichment process
          
          ONLY return the JSON object, nothing else.`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

async function enrichContactByEmailWithGemini(email: string, apiKey: string): Promise<ContactEnrichmentData> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Analyze this email address and infer as much contact information as possible: ${email}
          
          Return a JSON object with these fields:
          - firstName: first name if identifiable from email
          - lastName: last name if identifiable from email 
          - email: the provided email
          - company: company name based on email domain
          - title: likely job title based on the domain and naming patterns
          - industry: likely industry based on the company domain
          - socialProfiles: likely social profile URLs including linkedin and website
          - confidence: number from 1-100 indicating confidence level in these inferences
          - notes: any notes about the enrichment process
          
          ONLY return the JSON object, nothing else.`
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 1024
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Gemini API');
  }
  
  try {
    // Extract JSON from text (Gemini might return markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${error.message}`);
  }
}

// OpenAI API call for contact enrichment by name
async function enrichContactByName(
  firstName: string,
  lastName: string,
  company?: string,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ContactEnrichmentData> {
  console.log(`Enriching contact by name: ${firstName} ${lastName} ${company ? `at ${company}` : ''}`);
  
  try {
    // Prefer OpenAI if available, otherwise use Gemini
    if (openaiApiKey) {
      return await enrichContactByNameWithOpenAI(firstName, lastName, company, openaiApiKey);
    } else if (geminiApiKey) {
      return await enrichContactByNameWithGemini(firstName, lastName, company, geminiApiKey);
    } else {
      throw new Error('No AI provider API key available');
    }
  } catch (error) {
    console.error('Error enriching contact by name:', error);
    // Return minimal data in case of error
    return {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      company: company || '',
      confidence: 20,
      notes: `AI enrichment attempt failed: ${error.message}. Using minimal data.`
    };
  }
}

async function enrichContactByNameWithOpenAI(firstName: string, lastName: string, company?: string, apiKey?: string): Promise<ContactEnrichmentData> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a contact enrichment assistant that can infer professional information about a person from their name and company.
          Your job is to provide the most likely professional details for this person without inventing specific facts.
          Focus on likely title, industry, location based on the company, and professional social media profiles.
          When you're uncertain, indicate lower confidence rather than inventing details.`
        },
        {
          role: 'user',
          content: `Enrich this contact with professional information: 
          Name: ${firstName} ${lastName}
          ${company ? `Company: ${company}` : ''}
          
          Return a JSON object with these fields:
          - firstName: "${firstName}"
          - lastName: "${lastName}" 
          - name: full name
          - title: likely job title
          - company: "${company || ''}"
          - industry: likely industry
          - location: object with city, state, country
          - socialProfiles: likely social profile URLs
          - bio: brief professional bio
          - confidence: number from 1-100 indicating confidence level
          - notes: any notes about the enrichment process
          
          ONLY return the JSON object, nothing else.`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

async function enrichContactByNameWithGemini(firstName: string, lastName: string, company?: string, apiKey?: string): Promise<ContactEnrichmentData> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Research information about a professional named ${firstName} ${lastName}${company ? ` who works at ${company}` : ''}.
          
          Return a JSON object with these fields:
          - firstName: "${firstName}"
          - lastName: "${lastName}" 
          - name: full name
          - title: likely job title
          - company: "${company || ''}"
          - industry: likely industry
          - location: object with city, state, country
          - socialProfiles: likely social profile URLs
          - bio: brief professional bio
          - confidence: number from 1-100 indicating confidence level
          - notes: any notes about the enrichment process
          
          ONLY return the JSON object, nothing else.`
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 1024
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Gemini API');
  }
  
  try {
    // Extract JSON from text (Gemini might return markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${error.message}`);
  }
}

// OpenAI API call for contact enrichment by LinkedIn URL
async function enrichContactByLinkedIn(
  linkedinUrl: string,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<ContactEnrichmentData> {
  console.log(`Enriching contact by LinkedIn URL: ${linkedinUrl}`);
  
  try {
    // Prefer OpenAI if available, otherwise use Gemini
    if (openaiApiKey) {
      return await enrichContactByLinkedInWithOpenAI(linkedinUrl, openaiApiKey);
    } else if (geminiApiKey) {
      return await enrichContactByLinkedInWithGemini(linkedinUrl, geminiApiKey);
    } else {
      throw new Error('No AI provider API key available');
    }
  } catch (error) {
    console.error('Error enriching contact by LinkedIn URL:', error);
    // Return minimal data in case of error
    // Extract username from LinkedIn URL
    const username = linkedinUrl.split('/in/')[1]?.replace('/', '') || 'unknown';
    const nameParts = username.split('-');
    
    return {
      firstName: nameParts[0] ? capitalize(nameParts[0]) : 'Unknown',
      lastName: nameParts[1] ? capitalize(nameParts[1]) : '',
      socialProfiles: {
        linkedin: linkedinUrl
      },
      confidence: 20,
      notes: `AI enrichment attempt failed: ${error.message}. Using minimal data extracted from URL.`
    };
  }
}

async function enrichContactByLinkedInWithOpenAI(linkedinUrl: string, apiKey: string): Promise<ContactEnrichmentData> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a contact enrichment assistant that can infer professional information about a person from their LinkedIn URL.
          Your job is to provide the most likely professional details for this person based on patterns in the URL.
          Focus on extracting the name from the URL and inferring title, company, and industry.
          When you're uncertain, indicate lower confidence rather than inventing details.`
        },
        {
          role: 'user',
          content: `Enrich this contact based on their LinkedIn URL: ${linkedinUrl}
          
          Return a JSON object with these fields:
          - firstName: first name extracted from URL
          - lastName: last name extracted from URL
          - name: full name
          - title: likely job title
          - company: likely company name
          - industry: likely industry
          - socialProfiles: include the linkedin URL
          - confidence: number from 1-100 indicating confidence level
          - notes: any notes about the enrichment process
          
          ONLY return the JSON object, nothing else.`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

async function enrichContactByLinkedInWithGemini(linkedinUrl: string, apiKey: string): Promise<ContactEnrichmentData> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Extract professional information from this LinkedIn URL: ${linkedinUrl}
          
          Return a JSON object with these fields:
          - firstName: first name extracted from URL
          - lastName: last name extracted from URL
          - name: full name
          - title: likely job title
          - company: likely company name
          - industry: likely industry
          - socialProfiles: include the linkedin URL
          - confidence: number from 1-100 indicating confidence level
          - notes: any notes about the enrichment process
          
          ONLY return the JSON object, nothing else.`
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 1024
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Gemini API');
  }
  
  try {
    // Extract JSON from text (Gemini might return markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const result = JSON.parse(jsonMatch[0]);
    
    // Ensure LinkedIn URL is in the social profiles
    if (!result.socialProfiles) {
      result.socialProfiles = {};
    }
    result.socialProfiles.linkedin = linkedinUrl;
    
    return result;
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${error.message}`);
  }
}

// Function to find contact image using AI
async function findContactImage(
  name: string,
  company?: string,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<string> {
  console.log(`Finding contact image for: ${name}${company ? ` at ${company}` : ''}`);
  
  try {
    // For image search, we'll generate a description that could be used with an image API
    // But for now, return a default image from Pexels based on a consistent hash
    const nameHash = hashString(name + (company || ''));
    const gender = nameHash % 2 === 0 ? 'men' : 'women';
    const imageId = (nameHash % 10) + 1;
    
    // Use different professional headshot images from Pexels
    const imageUrls = [
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
      'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg',
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
      'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
      'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
      'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
      'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg',
      'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg',
      'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg'
    ];
    
    const imageUrl = `${imageUrls[nameHash % imageUrls.length]}?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2`;
    
    return imageUrl;
  } catch (error) {
    console.error('Finding contact image failed:', error);
    // Return a default avatar as fallback
    return 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
  }
}

// Utility functions for mock data generation
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function generateMockEmail(firstName?: string, lastName?: string, company?: string): string {
  const first = firstName || 'contact';
  const last = lastName || 'person';
  const domain = company ? `${company.toLowerCase().replace(/\s+/g, '')}.com` : 'company.com';
  return `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
}

function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}