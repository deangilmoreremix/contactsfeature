exports.handler = async (event, context) => {
  const fetch = (await import('node-fetch')).default;
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { firstName, lastName, company, linkedinUrl, researchType = 'basic' } = JSON.parse(event.body);

    if (!firstName && !lastName && !linkedinUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Name or LinkedIn URL is required' })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    const model = 'gemini-1.5-flash:generateContent';

    let prompt;
    if (linkedinUrl) {
      // Research by LinkedIn URL
      prompt = `Research a professional from this LinkedIn URL: ${linkedinUrl}.

Return a JSON object with the following structure:
{
  "firstName": "first name",
  "lastName": "last name",
  "name": "full name",
  "email": "likely email based on name and company",
  "title": "job title",
  "company": "company name",
  "industry": "industry",
  "location": {
    "city": "city",
    "state": "state",
    "country": "country"
  },
  "socialProfiles": {
    "linkedin": "${linkedinUrl}",
    "twitter": "likely Twitter URL if available",
    "website": "likely company website"
  },
  "bio": "professional summary",
  "confidence": "number between 50 and 90 indicating confidence level"
}`;
    } else {
      // Research by name and company
      prompt = `Research information about a professional named ${firstName} ${lastName}${company ? ` who works at ${company}` : ''}.

Return a JSON object with the following structure:
{
  "firstName": "${firstName}",
  "lastName": "${lastName}",
  "name": "${firstName} ${lastName}",
  "email": "likely email",
  "phone": "likely phone if available",
  "title": "likely job title",
  "company": "${company || 'company name if known'}",
  "industry": "likely industry",
  "location": {
    "city": "likely city",
    "state": "likely state",
    "country": "likely country"
  },
  "socialProfiles": {
    "linkedin": "likely LinkedIn URL",
    "twitter": "likely Twitter URL if available",
    "website": "likely company website"
  },
  "bio": "brief professional bio",
  "confidence": "number between 40 and 85 indicating confidence level"
}`;
    }

    const response = await fetch(`${apiUrl}/${model}?key=${apiKey}`, {
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
          maxOutputTokens: researchType === 'detailed' ? 1024 : 512
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Invalid response from Gemini');
    }

    // Extract JSON from the response text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    const result = {
      ...parsedData,
      confidence: parsedData.confidence || 60,
      researchType,
      timestamp: new Date().toISOString(),
      provider: 'gemini'
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Gemini contact research error:', error);

    // Return fallback data to prevent UI breakage
    let fallbackData;
    if (linkedinUrl) {
      const username = linkedinUrl.split('/in/')[1]?.replace('/', '') || 'unknown';
      const nameParts = username.split('-');

      fallbackData = {
        firstName: nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || 'Unknown',
        lastName: nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || '',
        name: `${nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || 'Unknown'} ${nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || ''}`,
        socialProfiles: {
          linkedin: linkedinUrl
        },
        confidence: 40,
        notes: 'API research failed, showing basic information derived from URL'
      };
    } else {
      fallbackData = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        company: company || '',
        confidence: 30,
        notes: 'API research failed, showing basic information'
      };
    }

    const result = {
      ...fallbackData,
      researchType,
      timestamp: new Date().toISOString(),
      provider: 'fallback',
      error: error.message
    };

    return {
      statusCode: 200, // Return 200 even on error to prevent UI breakage
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  }
}

export { handler };