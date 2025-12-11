// netlify/functions/get-personas.js

const PERSONAS = [
  // Sales Style Personas
  { id: "direct_closer", name: "Direct Closer", group: "Sales Style" },
  { id: "challenger_seller", name: "Challenger Seller", group: "Sales Style" },
  { id: "consultative_advisor", name: "Consultative Advisor", group: "Sales Style" },
  { id: "insight_seller", name: "Insight Seller", group: "Sales Style" },
  { id: "relationship_builder", name: "Relationship Builder", group: "Sales Style" },
  { id: "problem_solver", name: "Problem Solver", group: "Sales Style" },
  { id: "strategic_advisor", name: "Strategic Advisor", group: "Sales Style" },

  // Tone & Style Personas
  { id: "friendly", name: "Friendly", group: "Tone & Style" },
  { id: "professional", name: "Professional", group: "Tone & Style" },
  { id: "humorous", name: "Humorous", group: "Tone & Style" },
  { id: "urgent", name: "Urgent", group: "Tone & Style" },
  { id: "calm", name: "Calm", group: "Tone & Style" },
  { id: "inspirational", name: "Inspirational", group: "Tone & Style" },
  { id: "analytical", name: "Analytical", group: "Tone & Style" },

  // Industry Personas
  { id: "saas", name: "SaaS", group: "Industry" },
  { id: "ecommerce", name: "E-Commerce", group: "Industry" },
  { id: "professional_services", name: "Professional Services", group: "Industry" },
  { id: "coaching_consulting", name: "Coaching & Consulting", group: "Industry" },
  { id: "real_estate", name: "Real Estate", group: "Industry" },
  { id: "finance_insurance", name: "Finance & Insurance", group: "Industry" },
  { id: "local_business", name: "Local Business", group: "Industry" },

  // Buyer Personas
  { id: "founder", name: "Founder", group: "Buyer" },
  { id: "ceo", name: "CEO", group: "Buyer" },
  { id: "marketing_director", name: "Marketing Director", group: "Buyer" },
  { id: "sales_director", name: "Sales Director", group: "Buyer" },
  { id: "operations_manager", name: "Operations Manager", group: "Buyer" },
  { id: "freelancer", name: "Freelancer", group: "Buyer" },
  { id: "agency_owner", name: "Agency Owner", group: "Buyer" },

  // Use-Case Personas
  { id: "onboarding_specialist", name: "Onboarding Specialist", group: "Use-Case" },
  { id: "support_retention_advocate", name: "Support / Retention Advocate", group: "Use-Case" }
];

exports.handler = async (event, context) => {
  // CORS preflight
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
      body: JSON.stringify({ personas: PERSONAS })
    };
  } catch (err) {
    console.error("[get-personas] error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Failed to load personas" })
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