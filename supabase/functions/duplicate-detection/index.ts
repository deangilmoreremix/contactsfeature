import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface DuplicateMatch {
  id: string;
  name: string;
  email: string;
  company: string;
  matchScore: number;
  matchReasons: string[];
  suggestedAction: 'merge' | 'keep_separate' | 'review';
}

interface DuplicateDetectionResult {
  contactId: string;
  hasDuplicates: boolean;
  duplicates: DuplicateMatch[];
  confidence: number;
  mergeRecommendations: Array<{
    primaryContactId: string;
    duplicateIds: string[];
    confidence: number;
    reasoning: string[];
  }>;
}

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
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const hasAI = !!(openaiApiKey || geminiApiKey);

    if (req.method === 'POST') {
      const { contactId, contact, threshold = 0.8 } = await req.json();
      
      if (!contactId || !contact) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required parameters',
            details: 'contactId and contact data are required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get all contacts for comparison
      const { data: allContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, name, email, phone, company, title')
        .neq('id', contactId);

      if (fetchError) {
        console.error('Error fetching contacts:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch contacts for comparison' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Detect duplicates using multiple algorithms
      const duplicates = await detectDuplicates(contact, allContacts || [], threshold, hasAI, openaiApiKey, geminiApiKey);
      
      // Generate merge recommendations
      const mergeRecommendations = generateMergeRecommendations(contact, duplicates);

      const result: DuplicateDetectionResult = {
        contactId,
        hasDuplicates: duplicates.length > 0,
        duplicates,
        confidence: hasAI ? 90 : 75,
        mergeRecommendations
      };

      return new Response(
        JSON.stringify(result),
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
    console.error('Duplicate detection error:', error);
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

async function detectDuplicates(
  targetContact: any,
  allContacts: any[],
  threshold: number,
  hasAI: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<DuplicateMatch[]> {
  const duplicates: DuplicateMatch[] = [];

  for (const contact of allContacts) {
    const matchResult = await calculateMatchScore(targetContact, contact, hasAI, openaiApiKey, geminiApiKey);
    
    if (matchResult.score >= threshold) {
      duplicates.push({
        id: contact.id,
        name: contact.name || `${contact.first_name} ${contact.last_name}`,
        email: contact.email,
        company: contact.company,
        matchScore: matchResult.score,
        matchReasons: matchResult.reasons,
        suggestedAction: matchResult.score >= 0.95 ? 'merge' : 
                        matchResult.score >= 0.85 ? 'review' : 'keep_separate'
      });
    }
  }

  return duplicates.sort((a, b) => b.matchScore - a.matchScore);
}

async function calculateMatchScore(
  contact1: any,
  contact2: any,
  hasAI: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let score = 0;
  let factors = 0;

  // Email exact match (highest weight)
  if (contact1.email && contact2.email && contact1.email.toLowerCase() === contact2.email.toLowerCase()) {
    score += 0.4;
    factors++;
    reasons.push('Exact email match');
  }

  // Name similarity
  const nameScore = calculateNameSimilarity(contact1, contact2);
  if (nameScore > 0.7) {
    score += nameScore * 0.3;
    factors++;
    reasons.push(`High name similarity (${Math.round(nameScore * 100)}%)`);
  }

  // Company match
  if (contact1.company && contact2.company) {
    const companyScore = calculateStringSimilarity(contact1.company, contact2.company);
    if (companyScore > 0.8) {
      score += companyScore * 0.2;
      factors++;
      reasons.push(`Company match (${Math.round(companyScore * 100)}%)`);
    }
  }

  // Phone number match
  if (contact1.phone && contact2.phone) {
    const phone1 = normalizePhone(contact1.phone);
    const phone2 = normalizePhone(contact2.phone);
    if (phone1 === phone2) {
      score += 0.1;
      factors++;
      reasons.push('Phone number match');
    }
  }

  // Use AI for advanced similarity if available
  if (hasAI && factors > 0 && score > 0.5) {
    try {
      const aiScore = await getAISimilarityScore(contact1, contact2, openaiApiKey, geminiApiKey);
      score = (score + aiScore.score) / 2;
      reasons.push(...aiScore.reasons);
    } catch (error) {
      console.warn('AI similarity scoring failed:', error);
    }
  }

  return { score: factors > 0 ? score / Math.max(factors, 1) : 0, reasons };
}

function calculateNameSimilarity(contact1: any, contact2: any): number {
  const name1 = (contact1.name || `${contact1.first_name || ''} ${contact1.last_name || ''}`).toLowerCase().trim();
  const name2 = (contact2.name || `${contact2.first_name || ''} ${contact2.last_name || ''}`).toLowerCase().trim();
  
  return calculateStringSimilarity(name1, name2);
}

function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

async function getAISimilarityScore(
  contact1: any,
  contact2: any,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<{ score: number; reasons: string[] }> {
  const prompt = `Analyze if these two contacts are the same person:

Contact 1:
${JSON.stringify(contact1, null, 2)}

Contact 2:
${JSON.stringify(contact2, null, 2)}

Return a JSON object with:
- score: number between 0-1 indicating likelihood they are the same person
- reasons: array of strings explaining the match factors

Only return the JSON object.`;

  try {
    if (openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert at detecting duplicate contacts in CRM systems.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return { score: result.score || 0, reasons: result.reasons || [] };
      }
    } else if (geminiApiKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, response_mime_type: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const result = JSON.parse(content);
          return { score: result.score || 0, reasons: result.reasons || [] };
        }
      }
    }
  } catch (error) {
    console.warn('AI similarity scoring failed:', error);
  }

  return { score: 0, reasons: ['AI analysis unavailable'] };
}

function generateMergeRecommendations(
  targetContact: any,
  duplicates: DuplicateMatch[]
): DuplicateDetectionResult['mergeRecommendations'] {
  const recommendations = [];
  
  // Group high-confidence duplicates for merge recommendation
  const highConfidenceDuplicates = duplicates.filter(d => d.matchScore >= 0.9);
  
  if (highConfidenceDuplicates.length > 0) {
    recommendations.push({
      primaryContactId: targetContact.id,
      duplicateIds: highConfidenceDuplicates.map(d => d.id),
      confidence: Math.round(highConfidenceDuplicates.reduce((sum, d) => sum + d.matchScore, 0) / highConfidenceDuplicates.length * 100),
      reasoning: [
        'High similarity scores detected',
        'Exact or near-exact matches found',
        'Automated merge recommended'
      ]
    });
  }
  
  return recommendations;
}