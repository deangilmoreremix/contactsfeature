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
    const hasOpenAI = !!openaiApiKey;
    const hasGemini = !!geminiApiKey;
    
    if (!hasOpenAI && !hasGemini) {
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

      let analysis;
      
      // Use real AI providers if available
      if (hasOpenAI || hasGemini) {
        try {
          // Prefer OpenAI for email analysis if available (better analysis capability)
          if (hasOpenAI) {
            analysis = await analyzeEmailWithOpenAI(emailSubject, emailBody, context, recipient, openaiApiKey!);
          } else {
            analysis = await analyzeEmailWithGemini(emailSubject, emailBody, context, recipient, geminiApiKey!);
          }
        } catch (error) {
          console.error('AI email analysis failed:', error);
          // Fall back to mock analysis
          analysis = generateMockAnalysis(emailSubject, emailBody);
        }
      } else {
        // Use mock analysis when no AI providers are available
        analysis = generateMockAnalysis(emailSubject, emailBody);
      }

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

// Analyze email using OpenAI API
async function analyzeEmailWithOpenAI(
  subject: string,
  body: string,
  context?: string,
  recipient?: any,
  apiKey?: string
): Promise<any> {
  // Use GPT-4 Mini for analysis
  const model = 'gpt-4o-mini';
  
  // Build the prompt with additional context if provided
  let prompt = `Analyze this email for quality, effectiveness, and likelihood of receiving a response:

Subject: ${subject}

Body:
${body}

`;

  if (context) {
    prompt += `Additional context:
${context}

`;
  }

  if (recipient) {
    prompt += `Recipient information:
${JSON.stringify(recipient, null, 2)}

`;
  }

  prompt += `Provide a comprehensive analysis with the following:
1. Basic metrics (word count, sentence count, average sentence length, paragraph count)
2. Tone analysis (percentage breakdown of formal, friendly, persuasive, urgent, informative)
3. Dominant tone
4. Quality score (0-100)
5. Response likelihood score (0-100)
6. List of improvements needed (issues, suggestions, structural problems)
7. Overall assessment

Return your analysis as a JSON object only, with no additional text.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert email analyst who helps professionals improve their email writing. Provide detailed, actionable feedback.' },
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
    const analysis = JSON.parse(content);
    
    // Ensure the response has the expected structure
    return {
      metrics: analysis.metrics || {
        wordCount: body.split(/\s+/).length,
        sentenceCount: body.split(/[.!?]+/).filter(Boolean).length,
        avgSentenceLength: Math.round(body.split(/\s+/).length / Math.max(1, body.split(/[.!?]+/).filter(Boolean).length)),
        paragraphCount: body.split(/\n\s*\n/).filter(Boolean).length,
        subjectLength: subject.length
      },
      toneAnalysis: analysis.toneAnalysis || {},
      dominantTone: analysis.dominantTone || 'neutral',
      qualityScore: analysis.qualityScore || 70,
      responseLikelihood: analysis.responseLikelihood || 65,
      improvements: analysis.improvements || [],
      assessment: analysis.assessment || 'This is a standard professional email with some room for improvement.',
      model: model,
      confidence: 90,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
}

// Analyze email using Gemini API
async function analyzeEmailWithGemini(
  subject: string,
  body: string,
  context?: string,
  recipient?: any,
  apiKey?: string
): Promise<any> {
  // Build the prompt with additional context if provided
  let prompt = `Analyze this email for quality, effectiveness, and likelihood of receiving a response:

Subject: ${subject}

Body:
${body}

`;

  if (context) {
    prompt += `Additional context:
${context}

`;
  }

  if (recipient) {
    prompt += `Recipient information:
${JSON.stringify(recipient, null, 2)}

`;
  }

  prompt += `Provide a comprehensive analysis with the following:
1. Basic metrics (word count, sentence count, average sentence length, paragraph count)
2. Tone analysis (percentage breakdown of formal, friendly, persuasive, urgent, informative)
3. Dominant tone
4. Quality score (0-100)
5. Response likelihood score (0-100)
6. List of improvements needed (issues, suggestions, structural problems)
7. Overall assessment

Return your analysis as a JSON object with these fields:
- metrics: an object with wordCount, sentenceCount, avgSentenceLength, paragraphCount, subjectLength
- toneAnalysis: an object with percentages for formal, friendly, persuasive, urgent, informative tones
- dominantTone: the predominant tone of the email
- qualityScore: a score from 0-100
- responseLikelihood: a score from 0-100
- improvements: an array of objects with type (issue/suggestion/structural) and description
- assessment: an overall evaluation

Return only the JSON object, nothing else.`;

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
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Ensure the response has the expected structure
    return {
      metrics: analysis.metrics || {
        wordCount: body.split(/\s+/).length,
        sentenceCount: body.split(/[.!?]+/).filter(Boolean).length,
        avgSentenceLength: Math.round(body.split(/\s+/).length / Math.max(1, body.split(/[.!?]+/).filter(Boolean).length)),
        paragraphCount: body.split(/\n\s*\n/).filter(Boolean).length,
        subjectLength: subject.length
      },
      toneAnalysis: analysis.toneAnalysis || {},
      dominantTone: analysis.dominantTone || 'neutral',
      qualityScore: analysis.qualityScore || 70,
      responseLikelihood: analysis.responseLikelihood || 65,
      improvements: analysis.improvements || [],
      assessment: analysis.assessment || 'This is a standard professional email with some room for improvement.',
      model: 'gemini-1.5-flash',
      confidence: 85,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${error.message}`);
  }
}

// Generate mock email analysis when AI APIs are unavailable
function generateMockAnalysis(subject: string, body: string): any {
  // Simple analysis calculations
  const wordCount = body.split(/\s+/).length;
  const sentenceCount = body.split(/[.!?]+/).filter(Boolean).length;
  const avgSentenceLength = Math.round(wordCount / Math.max(1, sentenceCount));
  const paragraphCount = body.split(/\n\s*\n/).filter(Boolean).length;
  
  // Simple tone analysis
  const toneAnalysis = {
    formal: 25,
    friendly: 40,
    persuasive: 20,
    urgent: 5,
    informative: 10
  };
  
  // Basic improvements
  const improvements = [];
  
  if (wordCount > 300) improvements.push({ type: 'issue', description: 'Email is too long (over 300 words)' });
  if (avgSentenceLength > 25) improvements.push({ type: 'issue', description: 'Sentences are too long' });
  if (paragraphCount < 3) improvements.push({ type: 'suggestion', description: 'Consider adding more paragraphs for readability' });
  if (!body.includes('?')) improvements.push({ type: 'suggestion', description: 'Consider adding a question to encourage response' });
  
  // Simple quality score
  let qualityScore = 70; // Base score
  qualityScore -= improvements.length * 5;
  qualityScore = Math.max(0, Math.min(100, qualityScore));
  
  // Response likelihood (simple calculation)
  const responseLikelihood = Math.min(90, Math.max(40, qualityScore + 10));
  
  return {
    metrics: {
      wordCount,
      sentenceCount,
      avgSentenceLength,
      paragraphCount,
      subjectLength: subject.length
    },
    toneAnalysis,
    dominantTone: 'friendly',
    qualityScore,
    responseLikelihood,
    improvements,
    assessment: qualityScore >= 75 
      ? 'Good email with minor areas for improvement' 
      : 'Email could benefit from several improvements for maximum effectiveness',
    model: 'mock-model',
    confidence: 60,
    timestamp: new Date().toISOString()
  };
}