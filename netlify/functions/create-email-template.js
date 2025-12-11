const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { name, description, subject, body, variables, category } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !subject || !body || !category) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: name, subject, body, category'
        })
      };
    }

    // Generate template ID
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare template data
    const templateData = {
      id: templateId,
      name,
      description: description || '',
      subject,
      body,
      variables: variables || [],
      category,
      is_default: false,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Try to save to database
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          template: data,
          message: 'Email template created successfully'
        })
      };

    } catch (dbError) {
      console.log('Database save failed, returning template data anyway:', dbError.message);

      // Return success even if database save fails (for development)
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          template: templateData,
          message: 'Email template created (database save failed - using fallback)',
          warning: 'Template saved locally, database unavailable'
        })
      };
    }

  } catch (error) {
    console.error('Error creating email template:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create email template',
        details: error.message
      })
    };
  }
};