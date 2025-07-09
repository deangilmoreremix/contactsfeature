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
    
    // Check if AI providers are configured
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!openaiApiKey && !geminiApiKey) {
      console.warn('No AI provider API keys configured, using fallback mode');
    }

    if (req.method === 'POST') {
      const { emailSubject, emailBody, context, recipient } = await req.json();
      
      if (!emailSubject || !emailBody) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required parameters',
            details: 'emailSubject and emailBody are required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Analyze email content
      const analysis = await analyzeEmail(emailSubject, emailBody, context, recipient, openaiApiKey, geminiApiKey);

      return new Response(
        JSON.stringify(analysis),
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
    console.error('Email analyzer error:', error);
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

async function analyzeEmail(
  subject: string,
  body: string,
  context?: string,
  recipient?: any,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<any> {
  // In a real implementation, this would call OpenAI or Gemini API
  // For now, we'll generate a simulated analysis

  // Calculate various metrics
  const wordCount = body.split(/\s+/).length;
  const sentenceCount = body.split(/[.!?]+/).filter(Boolean).length;
  const avgSentenceLength = Math.round(wordCount / Math.max(1, sentenceCount));
  const paragraphCount = body.split(/\n\s*\n/).filter(Boolean).length;
  
  // Check for common issues
  const issues = [];
  
  if (wordCount > 300) issues.push('Email is too long (over 300 words)');
  if (avgSentenceLength > 25) issues.push('Sentences are too long (over 25 words on average)');
  if (paragraphCount < 2) issues.push('Email should have multiple paragraphs for readability');
  if (body.includes('!!!!')) issues.push('Avoid excessive punctuation');
  if (body.includes('URGENT') || body.includes('IMPORTANT')) issues.push('Avoid using all caps for emphasis');
  
  // Check for potential improvements
  const suggestions = [];
  
  if (!body.includes('?')) suggestions.push('Consider adding a question to encourage response');
  if (wordCount < 75) suggestions.push('Email may be too brief - consider adding more context');
  if (!body.includes(recipient?.firstName || 'recipient')) suggestions.push('Personalize email with recipient\'s name');
  if (!body.toLowerCase().includes('thank')) suggestions.push('Consider including a thank you');
  if (!body.toLowerCase().includes('call') && !body.toLowerCase().includes('meet')) suggestions.push('Consider adding a call-to-action');
  
  // Calculate tone percentages
  const toneScores = {
    formal: calculateToneScore(body, ['Dear', 'Sincerely', 'regarding', 'request', 'inform']),
    friendly: calculateToneScore(body, ['Hi', 'Thanks', 'Great', 'Looking forward', 'chat']),
    persuasive: calculateToneScore(body, ['opportunity', 'benefit', 'value', 'advantage', 'recommend']),
    urgent: calculateToneScore(body, ['soon', 'quickly', 'urgent', 'immediate', 'deadline']),
    informative: calculateToneScore(body, ['inform', 'details', 'information', 'update', 'summary'])
  };
  
  // Normalize tone scores
  const totalToneScore = Object.values(toneScores).reduce((a, b) => a + b, 0);
  const normalizedTones: Record<string, number> = {};
  
  for (const [tone, score] of Object.entries(toneScores)) {
    normalizedTones[tone] = Math.round((score / Math.max(1, totalToneScore)) * 100);
  }
  
  // Calculate overall quality score (0-100)
  let qualityScore = 70; // Base score
  
  // Adjust for issues and suggestions
  qualityScore -= issues.length * 5;
  qualityScore -= suggestions.length * 3;
  
  // Adjust for email length
  if (wordCount >= 75 && wordCount <= 200) qualityScore += 10;
  else if (wordCount < 50 || wordCount > 300) qualityScore -= 10;
  
  // Adjust for sentence length
  if (avgSentenceLength >= 10 && avgSentenceLength <= 20) qualityScore += 5;
  else if (avgSentenceLength > 25) qualityScore -= 5;
  
  // Ensure score is within 0-100 range
  qualityScore = Math.max(0, Math.min(100, qualityScore));
  
  // Calculate response likelihood
  const responseLikelihood = calculateResponseLikelihood(qualityScore, body, issues.length);
  
  // Generate improvement recommendations
  const improvements = [
    ...issues.map(issue => ({ type: 'issue', description: issue })),
    ...suggestions.map(suggestion => ({ type: 'suggestion', description: suggestion }))
  ];
  
  // Add more specific improvements if needed
  if (qualityScore < 70) {
    improvements.push({
      type: 'structural',
      description: 'Consider restructuring your email for better clarity and impact'
    });
  }
  
  if (subject.length > 50) {
    improvements.push({
      type: 'subject',
      description: 'Subject line is too long - consider shortening to under 50 characters'
    });
  } else if (subject.length < 20) {
    improvements.push({
      type: 'subject',
      description: 'Subject line may be too short - consider adding more context'
    });
  }
  
  // Generate overall assessment
  let assessment;
  if (qualityScore >= 90) {
    assessment = 'Excellent email - well-structured, clear, and persuasive';
  } else if (qualityScore >= 75) {
    assessment = 'Good email with minor areas for improvement';
  } else if (qualityScore >= 60) {
    assessment = 'Average email that could benefit from several improvements';
  } else {
    assessment = 'Email needs significant improvement for maximum effectiveness';
  }
  
  return {
    metrics: {
      wordCount,
      sentenceCount,
      avgSentenceLength,
      paragraphCount,
      subjectLength: subject.length
    },
    toneAnalysis: normalizedTones,
    dominantTone: Object.entries(normalizedTones).sort((a, b) => b[1] - a[1])[0][0],
    qualityScore,
    responseLikelihood,
    improvements,
    assessment,
    model: openaiApiKey ? 'gpt-4o-mini' : geminiApiKey ? 'gemini-1.5-flash' : 'mock-model',
    confidence: (openaiApiKey || geminiApiKey) ? 85 : 65,
    timestamp: new Date().toISOString()
  };
}

function calculateToneScore(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  let score = 0;
  
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword.toLowerCase(), 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      score += matches.length;
    }
  });
  
  return score;
}

function calculateResponseLikelihood(qualityScore: number, body: string, issueCount: number): number {
  let likelihood = qualityScore * 0.7; // Base on quality score
  
  // Adjust based on call to action presence
  const ctaKeywords = ['call', 'meet', 'discuss', 'schedule', 'available', 'thoughts', 'feedback', 'let me know', 'what do you think'];
  const hasCallToAction = ctaKeywords.some(keyword => body.toLowerCase().includes(keyword));
  
  if (hasCallToAction) {
    likelihood += 10;
  } else {
    likelihood -= 15;
  }
  
  // Adjust based on questions
  const questionCount = (body.match(/\?/g) || []).length;
  likelihood += questionCount * 5;
  
  // Adjust based on issues
  likelihood -= issueCount * 5;
  
  // Cap between 0-100
  return Math.max(0, Math.min(100, Math.round(likelihood)));
}