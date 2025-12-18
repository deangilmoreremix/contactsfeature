const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Context building functions
async function buildDealContext(dealId, workspaceId) {
  try {
    // Fetch deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('workspace_id', workspaceId)
      .single();

    if (dealError) throw dealError;

    // Fetch associated contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('deal_id', dealId)
      .eq('workspace_id', workspaceId);

    if (contactsError) throw contactsError;

    // Fetch account
    let account = null;
    if (deal.account_id) {
      const { data: acc, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', deal.account_id)
        .eq('workspace_id', workspaceId)
        .single();

      if (!accError) account = acc;
    }

    // Fetch last activities
    const { data: lastActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('deal_id', dealId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) throw activitiesError;

    // Fetch pipeline data
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', deal.pipeline_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (pipelineError) throw pipelineError;

    return {
      deal,
      contacts: contacts || [],
      account,
      lastActivities: lastActivities || [],
      pipeline,
      analytics: {}
    };
  } catch (error) {
    console.error('Error building deal context:', error);
    throw error;
  }
}

async function buildContactContext(contact, workspaceId) {
  try {
    // Create a mock deal from contact data
    const mockDeal = {
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`.trim() || contact.name,
      value: contact.aiScore ? contact.aiScore * 1000 : 0,
      company: contact.company,
      stage: contact.status || 'prospect',
      account_id: null,
      pipeline_id: 'default',
      workspace_id: workspaceId,
      created_at: contact.createdAt,
      updated_at: contact.updatedAt
    };

    // Fetch account if company exists
    let account = null;
    if (contact.company) {
      const { data: acc, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('name', contact.company)
        .eq('workspace_id', workspaceId)
        .single();

      if (!accError) account = acc;
    }

    // Fetch last activities for this contact
    const { data: lastActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) throw activitiesError;

    // Mock pipeline
    const pipeline = {
      id: 'default',
      name: 'Default Pipeline',
      workspace_id: workspaceId
    };

    return {
      deal: mockDeal,
      contacts: [contact],
      account,
      lastActivities: lastActivities || [],
      pipeline,
      analytics: {}
    };
  } catch (error) {
    console.error('Error building contact context:', error);
    throw error;
  }
}

function getModelForTask(task) {
  if (task.startsWith('email_') || task === 'deal_share_summary' || task === 'sidebar_find_new_image') {
    return 'gpt-4o';
  }
  if (task.startsWith('sdr_') || task.startsWith('agent_') || task.startsWith('deal_') || task.startsWith('sidebar_') || task.startsWith('tab_') || task.startsWith('automation_')) {
    return 'gpt-4o';
  }
  if (task.startsWith('intel_')) {
    return 'gpt-4o';
  }
  return 'gpt-4o'; // default
}

function buildPromptForTask(task, context, options) {
  const { deal, contacts, account, lastActivities, pipeline, analytics } = context;

  // SDR Tasks - Generate multi-step sequences
  if (task.startsWith('sdr_')) {
    const sdrType = task.replace('sdr_', '').replace('_', ' ');
    let specificInstructions = '';

    switch (task) {
      case 'sdr_enrich_contact':
        specificInstructions = 'Focus on identifying missing contact information and suggesting enrichment sources.';
        break;
      case 'sdr_competitor':
        specificInstructions = `Differentiate from competitors: ${options.competitors?.join(', ') || 'unknown'}.`;
        break;
      case 'sdr_objection_handler':
        specificInstructions = `Address the objection: "${options['objection'] || 'recent objection'}" with canned replies and follow-up sequence.`;
        break;
      case 'sdr_high_intent':
        specificInstructions = 'Compress timeline and push for immediate meeting due to high intent signals.';
        break;
      case 'sdr_bump':
        specificInstructions = 'Create a short nudge message to re-engage.';
        break;
      case 'sdr_reactivation':
      case 'sdr_winback':
        specificInstructions = 'Craft a "come back" campaign for long-dormant or lost deals.';
        break;
      case 'sdr_linkedin':
        specificInstructions = 'Optimize for LinkedIn messaging style and length.';
        break;
      case 'sdr_whatsapp':
        specificInstructions = 'Use WhatsApp conversational tone and shorter messages.';
        break;
      case 'sdr_event':
        specificInstructions = `Tie messaging to event: ${options.event || 'upcoming event'}.`;
        break;
      case 'sdr_referral':
        specificInstructions = 'Ask for referrals to other team members.';
        break;
      case 'sdr_newsletter':
        specificInstructions = 'Convert newsletter subscribers to qualified leads.';
        break;
      case 'sdr_cold_email':
        specificInstructions = 'Personalize cold outreach using available data and research.';
        break;
      default:
        specificInstructions = `Create a ${options.lengthDays || 7}-day ${sdrType} sequence.`;
    }

    return `Create a ${options.lengthDays || 7}-day ${sdrType} sequence for this deal.

Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Last Activities: ${JSON.stringify(lastActivities)}
Channel: ${options.channel || 'email'}
Tone: ${options.tone || 'friendly'}
${specificInstructions}

Output JSON with "sequence" array containing objects with day_offset, channel, subject, body_html.`;
  }

  // Default fallback
  return `Perform task ${task} for deal. Context: ${JSON.stringify(context)}. Options: ${JSON.stringify(options)}.`;
}

exports.handler = async (event, context) => {
  try {
    const { task, dealId, workspaceId, options = {}, contact } = JSON.parse(event.body);

    // Build context
    const context = contact
      ? await buildContactContext(contact, workspaceId)
      : await buildDealContext(dealId, workspaceId);

    // Generate prompt
    const prompt = buildPromptForTask(task, context, options);
    const model = getModelForTask(task);

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    // Parse and format the result based on task type
    let formattedResult;
    if (task.startsWith('sdr_')) {
      try {
        // Try to parse as JSON for SDR tasks
        const parsed = JSON.parse(result);
        formattedResult = parsed;
      } catch (parseError) {
        // If not valid JSON, wrap in sequence format
        formattedResult = {
          sequence: [{
            day_offset: 1,
            channel: options.channel || 'email',
            subject: 'Generated Content',
            body_html: result
          }]
        };
      }
    } else {
      formattedResult = { result };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ result: formattedResult })
    };
  } catch (error) {
    console.error('Execute deal AI failed:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};