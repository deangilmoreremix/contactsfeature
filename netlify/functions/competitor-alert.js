const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Competitor companies - in production, load from database or config file
const COMPETITOR_COMPANIES = process.env.COMPETITOR_COMPANIES
  ? process.env.COMPETITOR_COMPANIES.split(',').map(company => company.trim().toLowerCase())
  : [
      // Default competitors - replace with actual company names
      'competitor1', 'competitor2', 'competitor3',
      'rivalcorp', 'competitivetech', 'marketleader'
    ];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed'
    };
  }

  try {
    const { contact } = JSON.parse(event.body);

    console.log('Checking competitor alert for contact:', contact.id, contact.company);

    // Check if contact is from a competitor
    const isCompetitor = checkCompetitorStatus(contact.company);

    if (isCompetitor) {
      console.log('Competitor contact detected:', contact.company);

      // Create competitor alert
      await createCompetitorAlert(contact);

      // Notify sales leadership
      await notifySalesLeadership(contact);

      // Update contact with competitor flag
      await supabase
        .from('contacts')
        .update({
          isCompetitor: true,
          competitorAlertTriggered: new Date().toISOString(),
          competitorRisk: calculateRiskLevel(contact)
        })
        .eq('id', contact.id);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          alertTriggered: true,
          competitorDetected: contact.company,
          riskLevel: calculateRiskLevel(contact),
          notificationsSent: ['sales_leadership', 'account_management']
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        alertTriggered: false,
        message: 'Contact is not from a competitor company'
      })
    };
  } catch (error) {
    console.error('Competitor alert processing failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Competitor alert processing failed',
        details: error.message
      })
    };
  }
};

function checkCompetitorStatus(companyName) {
  if (!companyName) return false;

  const normalizedCompany = companyName.toLowerCase().trim();

  return COMPETITOR_COMPANIES.some(competitor =>
    normalizedCompany.includes(competitor.toLowerCase()) ||
    competitor.toLowerCase().includes(normalizedCompany)
  );
}

function calculateRiskLevel(contact) {
  let riskScore = 50; // Base risk

  // Title-based risk assessment
  if (contact.title) {
    const title = contact.title.toLowerCase();
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo')) {
      riskScore += 30;
    } else if (title.includes('vp') || title.includes('director')) {
      riskScore += 20;
    } else if (title.includes('manager') || title.includes('lead')) {
      riskScore += 10;
    }
  }

  // Industry-based risk
  if (contact.industry === 'Technology' || contact.industry === 'SaaS') {
    riskScore += 15;
  }

  // Company size risk (if available)
  if (contact.companySize) {
    if (contact.companySize > 1000) riskScore += 20;
    else if (contact.companySize > 100) riskScore += 10;
  }

  // Interest level risk
  if (contact.interestLevel === 'hot') {
    riskScore += 25;
  } else if (contact.interestLevel === 'medium') {
    riskScore += 10;
  }

  if (riskScore >= 80) return 'critical';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 40) return 'medium';
  return 'low';
}

async function createCompetitorAlert(contact) {
  const { error } = await supabase
    .from('competitor_alerts')
    .insert({
      contact_id: contact.id,
      competitor_company: contact.company,
      detected_at: new Date().toISOString(),
      risk_level: calculateRiskLevel(contact),
      contact_title: contact.title,
      contact_industry: contact.industry,
      alert_status: 'active'
    });

  if (error) throw error;
}

async function notifySalesLeadership(contact) {
  const alertMessage = {
    type: 'competitor_alert',
    priority: 'high',
    title: `Competitor Contact Detected: ${contact.name}`,
    message: `${contact.name} from ${contact.company} has been added to our contact database. Risk Level: ${calculateRiskLevel(contact).toUpperCase()}`,
    contact: {
      id: contact.id,
      name: contact.name,
      company: contact.company,
      title: contact.title,
      email: contact.email
    },
    actions: [
      'Review contact strategy',
      'Monitor competitive intelligence',
      'Consider defensive positioning'
    ]
  };

  // Create notification for sales leadership
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      type: 'competitor_alert',
      priority: 'high',
      title: alertMessage.title,
      message: alertMessage.message,
      recipient_role: 'sales_leadership',
      metadata: alertMessage,
      created_at: new Date().toISOString()
    });

  if (notificationError) throw notificationError;

  // Also notify account management if high risk
  if (calculateRiskLevel(contact) === 'critical' || calculateRiskLevel(contact) === 'high') {
    const { error: accountNotificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'competitor_alert',
        priority: 'urgent',
        title: `URGENT: High-Risk Competitor Contact - ${contact.name}`,
        message: `Critical competitor contact detected. Immediate attention required.`,
        recipient_role: 'account_management',
        metadata: { ...alertMessage, urgent: true },
        created_at: new Date().toISOString()
      });

    if (accountNotificationError) throw accountNotificationError;
  }

  // Log the alert for audit purposes
  console.log('Competitor alert notifications sent:', {
    contact: contact.id,
    company: contact.company,
    riskLevel: calculateRiskLevel(contact),
    notifications: ['sales_leadership', calculateRiskLevel(contact) === 'critical' || calculateRiskLevel(contact) === 'high' ? 'account_management' : null].filter(Boolean)
  });
}