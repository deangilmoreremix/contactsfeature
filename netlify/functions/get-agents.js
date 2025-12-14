// netlify/functions/get-agents.js

// If you later move these to Supabase, just replace this with a DB query.
const SDR_AGENTS = [
  {
    id: "cold_email_sdr",
    name: "Cold Email SDR",
    description: "Sends first-touch cold emails to new prospects."
  },
  {
    id: "followup_sdr",
    name: "Follow-Up SDR",
    description: "Sends smart follow-up emails based on previous outreach or silence."
  },
  {
    id: "objection_sdr",
    name: "Objection-Handling SDR",
    description: "Handles price, timing, and 'not ready' objections."
  },
  {
    id: "bump_sdr",
    name: "Bump Message SDR",
    description: "Sends short bump messages to revive stalled conversations."
  },
  {
    id: "reactivation_sdr",
    name: "Re-Activation SDR",
    description: "Reactivates leads who showed interest but went quiet."
  },
  {
    id: "winback_sdr",
    name: "Win-Back SDR",
    description: "Win back churned customers or lost deals with tailored offers."
  },
  {
    id: "linkedin_sdr",
    name: "LinkedIn SDR",
    description: "Writes LinkedIn connection and follow-up messages."
  },
  {
    id: "whatsapp_sdr",
    name: "WhatsApp SDR",
    description: "Writes conversational WhatsApp-style sales messages."
  },
  {
    id: "event_sdr",
    name: "Event-Based SDR",
    description: "Sends messages triggered by events like webinars, trials, or demos."
  },
  {
    id: "referral_sdr",
    name: "Referral SDR",
    description: "Asks warm contacts and customers for referrals."
  },
  {
    id: "newsletter_sdr",
    name: "Newsletter Lead-In SDR",
    description: "Turns newsletter subscribers into sales conversations."
  },
  {
    id: "high_intent_sdr",
    name: "High-Intent SDR",
    description: "Handles leads showing strong interest (pricing page, demo, strong replies)."
  },
  {
    id: "data_enrichment_sdr",
    name: "Data-Enrichment SDR",
    description: "Enriches contact data and sends smarter outreach based on role, pains, and industry."
  },
  {
    id: "competitor_sdr",
    name: "Competitor-Aware SDR",
    description: "Handles 'we already use X' and positions SmartCRM against competitors."
  },
  {
    id: "social_selling_sdr",
    name: "Social Selling SDR",
    description: "Creates personalized messages based on social media activity and engagement patterns."
  }
];

exports.handler = async (event, context) => {
  // Basic CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: ""
    };
  }

  try {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ agents: SDR_AGENTS })
    };
  } catch (err) {
    console.error("[get-agents] error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Failed to load agents" })
    };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}