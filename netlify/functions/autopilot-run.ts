import type { Handler } from "@netlify/functions";
// import removed

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const contactId = body.contactId as string | undefined;

    if (!contactId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "contactId is required" })
      };
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error || !contact) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    const currentState = contact.autopilot_state || 'new';
    // Simple state transition
    let newState = currentState;
    if (currentState === 'new') {
      newState = 'sdr_outreach';
    }

    // Update the contact
    await supabase
      .from('contacts')
      .update({ autopilot_state: newState })
      .eq('id', contactId);

    return {
      statusCode: 200,
      body: JSON.stringify({ contactId, previousState: currentState, newState, message: 'Autopilot run completed' })
    };
  } catch (error: any) {
    console.error("[autopilot-run] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" })
    };
  }
};
