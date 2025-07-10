import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Validate environment variables
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

    const supabase = createClient(supabaseUrl, supabaseKey);
    const hasOpenAI = !!openaiApiKey;
    const hasGemini = !!geminiApiKey;
    
    // Check if any AI provider is configured
    const hasAiProvider = hasOpenAI || hasGemini;
    
    if (req.method === 'POST') {
      const { contacts, analysisType, urgency = 'medium', costLimit, timeLimit } = await req.json();
      
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid contacts data',
            details: 'contacts must be an array and cannot be empty'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (!analysisType) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing analysis type',
            details: 'analysisType is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Process contacts in batch
      const startTime = Date.now();
      
      // Simple cost/time estimation
      const estimatedCostPerContact = hasAiProvider ? 0.005 : 0.001; // $0.005 per contact with AI, less without
      const estimatedTimePerContact = hasAiProvider ? 1000 : 200; // 1 sec per contact with AI, faster without
      
      const totalCost = contacts.length * estimatedCostPerContact;
      const totalTime = contacts.length * estimatedTimePerContact;
      
      // Check limits
      if (costLimit && totalCost > costLimit) {
        return new Response(
          JSON.stringify({ 
            error: 'Cost limit exceeded',
            details: `Estimated cost ($${totalCost.toFixed(3)}) exceeds limit ($${costLimit})`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (timeLimit && totalTime > timeLimit) {
        return new Response(
          JSON.stringify({ 
            error: 'Time limit exceeded',
            details: `Estimated time (${totalTime}ms) exceeds limit (${timeLimit}ms)`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Choose the right model based on analysis type, urgency, and provider availability
      let provider = 'mock';
      let model = 'mock-model';
      
      if (hasAiProvider) {
        // Prefer different providers based on task type and urgency
        if (analysisType === 'contact_scoring') {
          // For scoring, prefer Gemini for speed unless high urgency
          provider = (urgency === 'high' && hasOpenAI) ? 'openai' : (hasGemini ? 'gemini' : (hasOpenAI ? 'openai' : 'mock'));
          model = provider === 'openai' 
                  ? (urgency === 'high' ? 'gpt-4o' : 'gpt-4o-mini')
                  : (provider === 'gemini' ? 'gemini-1.5-flash' : 'mock-model');
        } else if (analysisType === 'categorization' || analysisType === 'tagging') {
          // For categorization/tagging, prefer Gemini for cost efficiency
          provider = hasGemini ? 'gemini' : (hasOpenAI ? 'openai' : 'mock');
          model = provider === 'openai' 
                  ? 'gpt-4o-mini'
                  : (provider === 'gemini' ? 'gemma-2-2b-it' : 'mock-model');
        } else if (analysisType === 'lead_qualification') {
          // For qualification, prefer OpenAI for better reasoning
          provider = hasOpenAI ? 'openai' : (hasGemini ? 'gemini' : 'mock');
          model = provider === 'openai' 
                  ? 'gpt-4o-mini'
                  : (provider === 'gemini' ? 'gemini-1.5-flash' : 'mock-model');
        }
      }
      
      // For real bulk processing, we'll use batch size to handle larger volumes
      const batchSize = 5; // Process 5 contacts at a time
      const results = [];
      const failed = [];
      
      // Process contacts in batches
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, Math.min(i + batchSize, contacts.length));
        
        // Process each contact in the batch
        const batchPromises = batch.map(async (contactData) => {
          try {
            const { contactId, contact } = contactData;
            
            if (!contactId || !contact) {
              return {
                success: false,
                contactId: contactData.contactId || 'unknown',
                error: 'Invalid contact data'
              };
            }
            
            let result;
            
            // Process based on analysis type and available providers
            switch (analysisType) {
              case 'contact_scoring':
                if (provider === 'openai' && openaiApiKey) {
                  // Using OpenAI for scoring
                  result = await scoreContactWithOpenAI(contactId, contact, model, openaiApiKey);
                } else if (provider === 'gemini' && geminiApiKey) {
                  // Using Gemini for scoring
                  result = await scoreContactWithGemini(contactId, contact, model, geminiApiKey);
                } else {
                  // Using mock data
                  result = generateMockScore(contactId, contact);
                }
                break;
                
              case 'categorization':
                if (provider === 'openai' && openaiApiKey) {
                  // Using OpenAI for categorization
                  result = await categorizeWithOpenAI(contactId, contact, openaiApiKey);
                } else if (provider === 'gemini' && geminiApiKey) {
                  // Using Gemini for categorization
                  result = await categorizeWithGemini(contactId, contact, geminiApiKey);
                } else {
                  // Using mock data
                  result = generateMockCategories(contactId, contact);
                }
                break;
                
              case 'tagging':
                if (provider === 'openai' && openaiApiKey) {
                  // Using OpenAI for tagging
                  result = await tagWithOpenAI(contactId, contact, openaiApiKey);
                } else if (provider === 'gemini' && geminiApiKey) {
                  // Using Gemini for tagging
                  result = await tagWithGemini(contactId, contact, geminiApiKey);
                } else {
                  // Using mock data
                  result = generateMockTags(contactId, contact);
                }
                break;
                
              case 'lead_qualification':
                if (provider === 'openai' && openaiApiKey) {
                  // Using OpenAI for qualification
                  result = await qualifyLeadWithOpenAI(contactId, contact, undefined, openaiApiKey);
                } else if (provider === 'gemini' && geminiApiKey) {
                  // Using Gemini for qualification
                  result = await qualifyLeadWithGemini(contactId, contact, undefined, geminiApiKey);
                } else {
                  // Using mock data
                  result = generateMockQualification(contactId, contact);
                }
                break;
                
              default:
                return {
                  success: false,
                  contactId,
                  error: `Unknown analysis type: ${analysisType}`
                };
            }
            
            return {
              success: true,
              contactId,
              result
            };
          } catch (error) {
            console.error(`Error processing contact in batch:`, error);
            return {
              success: false,
              contactId: contactData.contactId || 'unknown',
              error: error.message || 'Processing error'
            };
          }
        });
        
        // Wait for all contacts in this batch to be processed
        const batchResults = await Promise.all(batchPromises);
        
        // Add successful results to the results array
        results.push(...batchResults
          .filter(r => r.success)
          .map(r => ({ ...r.result, analysisType })));
        
        // Add failed results to the failed array
        failed.push(...batchResults
          .filter(r => !r.success)
          .map(r => ({ 
            contactId: r.contactId, 
            error: r.error || 'Unknown error'
          })));
        
        // Add a small delay between batches to avoid rate limits
        if (i + batchSize < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      const totalProcessingTime = Date.now() - startTime;
      
      const response = {
        results,
        failed,
        summary: {
          total: contacts.length,
          successful: results.length,
          failed: failed.length,
          analysisType,
          urgency,
          totalCost: results.length * estimatedCostPerContact,
          totalProcessingTime,
          modelUsed: model
        }
      };

      return new Response(
        JSON.stringify(response),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        details: 'This endpoint only supports POST requests'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Smart bulk error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ---- Contact Scoring Functions ----

async function scoreContactWithOpenAI(contactId: string, contact: any, model: string, apiKey: string): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert CRM analyst with deep expertise in sales qualification and lead scoring. 
          Analyze contact data to produce a comprehensive lead score and insights.`
        },
        {
          role: 'user',
          content: `Analyze this contact and provide a detailed lead score assessment:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with:
          - score: numeric score from 0-100
          - confidence: your confidence in the assessment (0-100)
          - insights: array of 2-3 key insights
          - recommendations: array of 2-3 recommendations
          
          Only return the JSON object, nothing else.`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

async function scoreContactWithGemini(contactId: string, contact: any, model: string, apiKey: string): Promise<any> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Analyze this contact and provide a detailed lead score assessment:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with:
          - score: numeric score from 0-100
          - confidence: your confidence in the assessment (0-100)
          - insights: array of 2-3 key insights
          - recommendations: array of 2-3 recommendations
          
          Only return the JSON object, nothing else.`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
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

function generateMockScore(contactId: string, contact: any): any {
  // Generate a score between 60-90 based on contact properties
  let score = 60;
  
  // Adjust score based on title
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('founder')) score += 20;
    else if (title.includes('director') || title.includes('vp')) score += 15;
    else if (title.includes('manager')) score += 10;
  }
  
  // Adjust score based on interest level
  if (contact.interestLevel === 'hot') score += 15;
  else if (contact.interestLevel === 'medium') score += 5;
  else if (contact.interestLevel === 'cold') score -= 10;
  
  // Ensure score is within range
  score = Math.max(40, Math.min(95, score));
  
  return {
    score,
    confidence: 70,
    insights: [
      `Based on role at ${contact.company}`,
      'Shows potential interest in solutions'
    ],
    recommendations: [
      'Follow up with personalized message',
      'Share relevant case studies'
    ]
  };
}

// ---- Categorization Functions ----

async function categorizeWithOpenAI(contactId: string, contact: any, apiKey: string): Promise<any> {
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
          content: 'You are an expert at categorizing sales contacts into appropriate segments and groups.'
        },
        {
          role: 'user',
          content: `Categorize this contact into 2-3 appropriate categories:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with:
          - categories: array of 2-3 categories
          - confidence: your confidence in the categorization (0-100)
          
          Only return the JSON object, nothing else.`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

async function categorizeWithGemini(contactId: string, contact: any, apiKey: string): Promise<any> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-2-2b-it:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Categorize this contact into 2-3 appropriate categories:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with:
          - categories: array of 2-3 categories
          - confidence: your confidence in the categorization (0-100)
          
          Only return the JSON object, nothing else.`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
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

function generateMockCategories(contactId: string, contact: any): any {
  const categories = [];
  
  // Add categories based on title
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('founder')) {
      categories.push('Executive');
    } else if (title.includes('director') || title.includes('vp')) {
      categories.push('Director-Level');
    } else if (title.includes('manager')) {
      categories.push('Manager');
    } else {
      categories.push('Individual Contributor');
    }
  }
  
  // Add categories based on industry
  if (contact.industry) {
    categories.push(contact.industry);
  } else {
    categories.push('General Business');
  }
  
  return {
    categories,
    confidence: 70
  };
}

// ---- Tagging Functions ----

async function tagWithOpenAI(contactId: string, contact: any, apiKey: string): Promise<any> {
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
          content: 'You are an expert at tagging and labeling sales contacts for better organization and searchability.'
        },
        {
          role: 'user',
          content: `Generate 3-5 appropriate tags for this contact:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with:
          - tags: array of 3-5 relevant tags
          - confidence: your confidence in the tags (0-100)
          
          Only return the JSON object, nothing else.`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

async function tagWithGemini(contactId: string, contact: any, apiKey: string): Promise<any> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-2-2b-it:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Generate 3-5 appropriate tags for this contact:
          
          ${JSON.stringify(contact, null, 2)}
          
          Return a JSON object with:
          - tags: array of 3-5 relevant tags
          - confidence: your confidence in the tags (0-100)
          
          Only return the JSON object, nothing else.`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
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

function generateMockTags(contactId: string, contact: any): any {
  const tags = [];
  
  // Add tags based on title
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('founder')) {
      tags.push('executive');
      tags.push('decision-maker');
    } else if (title.includes('sales')) {
      tags.push('sales');
    } else if (title.includes('market')) {
      tags.push('marketing');
    }
  }
  
  // Add tags based on company
  if (contact.company) {
    const company = contact.company.toLowerCase();
    if (company.includes('tech') || company.includes('soft')) {
      tags.push('tech-company');
    }
  }
  
  // Add tags based on interest level
  if (contact.interestLevel) {
    tags.push(`interest-${contact.interestLevel}`);
  }
  
  // Ensure we have at least 3 tags
  if (tags.length < 3) {
    tags.push('needs-follow-up');
    tags.push('new-contact');
  }
  
  return {
    tags,
    confidence: 70
  };
}

// ---- Lead Qualification Functions ----

async function qualifyLeadWithOpenAI(contactId: string, contact: any, businessContext: string | undefined, apiKey: string): Promise<any> {
  let prompt = `Perform a sales qualification analysis on this contact:
  
  ${JSON.stringify(contact, null, 2)}
  `;
  
  if (businessContext) {
    prompt += `\nBusiness Context:\n${businessContext}\n`;
  }
  
  prompt += `\nReturn a JSON object with:
  - qualificationScore: a number from 0-100
  - status: qualification status (Fully Qualified, Partially Qualified, Needs Qualification, or Unqualified)
  - buyingPower: assessment of decision-making power
  - timeframe: estimated buying timeframe
  - budget: estimated budget range
  - insights: array of 2-3 key insights
  - nextSteps: array of 2-3 recommended next steps
  
  Only return the JSON object, nothing else.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert sales qualification consultant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

async function qualifyLeadWithGemini(contactId: string, contact: any, businessContext: string | undefined, apiKey: string): Promise<any> {
  let prompt = `Perform a sales qualification analysis on this contact:
  
  ${JSON.stringify(contact, null, 2)}
  `;
  
  if (businessContext) {
    prompt += `\nBusiness Context:\n${businessContext}\n`;
  }
  
  prompt += `\nReturn a JSON object with:
  - qualificationScore: a number from 0-100
  - status: qualification status (Fully Qualified, Partially Qualified, Needs Qualification, or Unqualified)
  - buyingPower: assessment of decision-making power
  - timeframe: estimated buying timeframe
  - budget: estimated budget range
  - insights: array of 2-3 key insights
  - nextSteps: array of 2-3 recommended next steps
  
  Only return the JSON object, nothing else.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
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

function generateMockQualification(contactId: string, contact: any): any {
  // Calculate a qualification score based on role and interest level
  let score = 60;
  
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('founder')) score += 20;
    else if (title.includes('director') || title.includes('vp')) score += 15;
  }
  
  if (contact.interestLevel === 'hot') score += 15;
  else if (contact.interestLevel === 'medium') score += 5;
  
  score = Math.max(40, Math.min(95, score));
  
  // Determine qualification status
  let status;
  if (score >= 80) status = 'Fully Qualified';
  else if (score >= 60) status = 'Partially Qualified';
  else status = 'Needs Qualification';
  
  return {
    qualificationScore: score,
    status,
    buyingPower: score > 75 ? 'High' : 'Medium',
    timeframe: score > 80 ? '0-30 days' : '30-90 days',
    budget: score > 85 ? '$50K-100K' : 'Under $50K',
    insights: [
      `Based on role as ${contact.title}`,
      'Shows potential interest in solutions'
    ],
    nextSteps: [
      'Schedule discovery call',
      'Share relevant case studies'
    ]
  };
}