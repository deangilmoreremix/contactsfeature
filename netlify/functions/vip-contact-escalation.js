const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// VIP criteria definitions
const VIP_CRITERIA = {
  titles: [
    'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CIO', 'CDO',
    'President', 'Founder', 'Managing Director', 'Partner',
    'VP', 'Vice President', 'Chief', 'Head of'
  ],
  companies: process.env.VIP_COMPANIES
    ? process.env.VIP_COMPANIES.split(',').map(company => company.trim())
    : [
        'fortune500', 'tech_giants', 'industry_leaders' // Configure with actual company names
      ],
  industries: [
    'Technology', 'SaaS', 'Finance', 'Healthcare', 'Manufacturing'
  ],
  companySize: {
    min: 100, // Minimum company size for VIP consideration
    vip: 1000 // Company size that automatically triggers VIP
  },
  dealSize: {
    vip: 50000 // Deal value that triggers VIP status
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed'
    };
  }

  try {
    const { contact } = JSON.parse(event.body);

    console.log('Checking VIP escalation for contact:', contact.id, contact.name);

    // Evaluate VIP status
    const vipEvaluation = evaluateVIPStatus(contact);

    if (vipEvaluation.isVIP) {
      console.log('VIP contact detected:', contact.name, vipEvaluation.reasons);

      // Escalate to VIP handling
      await escalateToVIP(contact, vipEvaluation);

      // Update contact with VIP status
      await supabase
        .from('contacts')
        .update({
          isVIP: true,
          vipStatus: vipEvaluation.level,
          vipReasons: vipEvaluation.reasons,
          vipEscalatedAt: new Date().toISOString(),
          priority: 'high'
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
          vipEscalated: true,
          vipLevel: vipEvaluation.level,
          reasons: vipEvaluation.reasons,
          notificationsSent: ['executives', 'account_team'],
          actions: vipEvaluation.recommendedActions
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        vipEscalated: false,
        evaluation: vipEvaluation,
        message: 'Contact does not meet VIP criteria'
      })
    };
  } catch (error) {
    console.error('VIP escalation processing failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'VIP escalation processing failed',
        details: error.message
      })
    };
  }
};

function evaluateVIPStatus(contact) {
  const reasons = [];
  let vipScore = 0;
  const recommendedActions = [];

  // Title-based evaluation
  if (contact.title) {
    const title = contact.title.toUpperCase();
    const isExecutive = VIP_CRITERIA.titles.some(vipTitle =>
      title.includes(vipTitle.toUpperCase())
    );

    if (isExecutive) {
      reasons.push(`Executive title: ${contact.title}`);
      vipScore += 50;
      recommendedActions.push('executive_briefing');
    }
  }

  // Company size evaluation
  if (contact.companySize) {
    if (contact.companySize >= VIP_CRITERIA.companySize.vip) {
      reasons.push(`Large company (${contact.companySize} employees)`);
      vipScore += 40;
      recommendedActions.push('enterprise_protocol');
    } else if (contact.companySize >= VIP_CRITERIA.companySize.min) {
      reasons.push(`Mid-sized company (${contact.companySize} employees)`);
      vipScore += 20;
    }
  }

  // Industry evaluation
  if (contact.industry) {
    const isPriorityIndustry = VIP_CRITERIA.industries.some(industry =>
      contact.industry.toLowerCase().includes(industry.toLowerCase())
    );

    if (isPriorityIndustry) {
      reasons.push(`Priority industry: ${contact.industry}`);
      vipScore += 25;
      recommendedActions.push('industry_expertise_engagement');
    }
  }

  // Deal size evaluation
  if (contact.dealValue) {
    if (contact.dealValue >= VIP_CRITERIA.dealSize.vip) {
      reasons.push(`High-value deal ($${contact.dealValue})`);
      vipScore += 35;
      recommendedActions.push('c_level_engagement');
    }
  }

  // Company reputation - check against known reputable company lists
  if (contact.company) {
    // In production, check against configurable lists or external APIs
    const reputableCompanies = process.env.REPUTABLE_COMPANIES
      ? process.env.REPUTABLE_COMPANIES.split(',').map(company => company.trim())
      : ['Microsoft', 'Google', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Uber', 'Airbnb'];

    const isReputableCompany = reputableCompanies.some(company =>
      contact.company.toLowerCase().includes(company.toLowerCase())
    );

    if (isReputableCompany) {
      reasons.push(`Reputable company: ${contact.company}`);
      vipScore += 30;
      recommendedActions.push('executive_sponsor_assignment');
    }
  }

  // Determine VIP level
  let level = 'standard';
  if (vipScore >= 80) {
    level = 'platinum';
    recommendedActions.push('immediate_executive_attention', 'custom_solution_development');
  } else if (vipScore >= 60) {
    level = 'gold';
    recommendedActions.push('senior_account_team_assignment');
  } else if (vipScore >= 40) {
    level = 'silver';
    recommendedActions.push('priority_support', 'dedicated_account_manager');
  }

  return {
    isVIP: vipScore >= 40, // Threshold for VIP status
    level,
    score: vipScore,
    reasons,
    recommendedActions
  };
}

async function escalateToVIP(contact, vipEvaluation) {
  const escalationData = {
    contactId: contact.id,
    contactName: contact.name,
    company: contact.company,
    title: contact.title,
    vipLevel: vipEvaluation.level,
    vipScore: vipEvaluation.score,
    reasons: vipEvaluation.reasons,
    escalatedAt: new Date().toISOString(),
    recommendedActions: vipEvaluation.recommendedActions
  };

  // Create VIP escalation record
  const { error: escalationError } = await supabase
    .from('vip_escalations')
    .insert({
      contact_id: contact.id,
      vip_level: vipEvaluation.level,
      vip_score: vipEvaluation.score,
      reasons: vipEvaluation.reasons,
      recommended_actions: vipEvaluation.recommendedActions,
      escalated_at: new Date().toISOString(),
      status: 'active'
    });

  if (escalationError) throw escalationError;

  // Notify executives
  await notifyExecutives(contact, vipEvaluation, escalationData);

  // Notify account team
  await notifyAccountTeam(contact, vipEvaluation, escalationData);

  // Create VIP action items
  await createVIPActionItems(contact, vipEvaluation);

  console.log('VIP escalation completed for contact:', contact.id, vipEvaluation.level);
}

async function notifyExecutives(contact, vipEvaluation, escalationData) {
  const executiveNotification = {
    type: 'vip_escalation',
    priority: vipEvaluation.level === 'platinum' ? 'urgent' : 'high',
    title: `VIP Contact Escalation: ${contact.name}`,
    message: `${vipEvaluation.level.toUpperCase()} VIP contact detected: ${contact.name} from ${contact.company}. ${vipEvaluation.reasons.join(', ')}`,
    recipient_role: 'executives',
    metadata: escalationData,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('notifications')
    .insert(executiveNotification);

  if (error) throw error;
}

async function notifyAccountTeam(contact, vipEvaluation, escalationData) {
  // Find account team members for this contact's territory/company
  const { data: accountTeam, error: teamError } = await supabase
    .from('sales_reps')
    .select('id, name, email')
    .eq('territory', contact.territory || 'default')
    .eq('is_active', true);

  if (teamError) {
    console.error('Account team lookup failed:', teamError);
    return;
  }

  if (accountTeam && accountTeam.length > 0) {
    const notifications = accountTeam.map(rep => ({
      type: 'vip_assignment',
      priority: 'high',
      title: `VIP Contact Assigned: ${contact.name}`,
      message: `You have been assigned a ${vipEvaluation.level.toUpperCase()} VIP contact: ${contact.name} from ${contact.company}. Please review and engage immediately.`,
      recipient_id: rep.id,
      metadata: {
        ...escalationData,
        assignedRep: rep.id
      },
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) throw error;
  }
}

async function createVIPActionItems(contact, vipEvaluation) {
  const actionItems = [];

  // Base VIP actions
  actionItems.push({
    contact_id: contact.id,
    action_type: 'vip_onboarding',
    title: 'Complete VIP Onboarding Process',
    description: `Perform comprehensive onboarding for ${vipEvaluation.level} VIP contact ${contact.name}`,
    priority: 'high',
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    assigned_to: 'account_manager',
    metadata: { vipLevel: vipEvaluation.level }
  });

  // Level-specific actions
  if (vipEvaluation.level === 'platinum') {
    actionItems.push({
      contact_id: contact.id,
      action_type: 'executive_sponsor',
      title: 'Assign Executive Sponsor',
      description: `Assign C-level executive sponsor for platinum VIP ${contact.name}`,
      priority: 'urgent',
      due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
      assigned_to: 'executives',
      metadata: { vipLevel: vipEvaluation.level }
    });
  }

  if (vipEvaluation.recommendedActions.includes('custom_solution_development')) {
    actionItems.push({
      contact_id: contact.id,
      action_type: 'custom_solution',
      title: 'Develop Custom Solution',
      description: `Develop tailored solution for VIP contact ${contact.name} based on their specific needs`,
      priority: 'high',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      assigned_to: 'solutions_team',
      metadata: { vipLevel: vipEvaluation.level }
    });
  }

  // Insert action items
  if (actionItems.length > 0) {
    const { error } = await supabase
      .from('action_items')
      .insert(actionItems);

    if (error) throw error;
  }
}