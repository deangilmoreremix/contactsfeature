const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed'
    };
  }

  try {
    const { contact, emailMetrics } = JSON.parse(event.body);

    console.log('Processing email engagement scoring for contact:', contact.id);

    // Calculate engagement score based on email metrics
    const engagementScore = calculateEngagementScore(emailMetrics);

    // Update contact with new engagement data
    const { error } = await supabase
      .from('contacts')
      .update({
        emailEngagementScore: engagementScore.overall,
        lastEmailEngagement: new Date().toISOString(),
        emailMetrics: emailMetrics
      })
      .eq('id', contact.id);

    if (error) throw error;

    // Trigger follow-up actions based on engagement level
    await handleEngagementActions(contact, engagementScore);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        engagementScore,
        actionsTriggered: engagementScore.recommendations
      })
    };
  } catch (error) {
    console.error('Email engagement scoring failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Email engagement scoring failed',
        details: error.message
      })
    };
  }
};

function calculateEngagementScore(metrics) {
  let score = 50; // Base score
  const recommendations = [];

  // Open rate scoring (0-30 points)
  if (metrics.openRate !== undefined) {
    if (metrics.openRate > 0.8) score += 30;
    else if (metrics.openRate > 0.6) score += 20;
    else if (metrics.openRate > 0.4) score += 10;
    else if (metrics.openRate < 0.2) score -= 10;
  }

  // Click rate scoring (0-25 points)
  if (metrics.clickRate !== undefined) {
    if (metrics.clickRate > 0.15) score += 25;
    else if (metrics.clickRate > 0.1) score += 15;
    else if (metrics.clickRate > 0.05) score += 5;
  }

  // Response rate scoring (0-20 points)
  if (metrics.responseRate !== undefined) {
    if (metrics.responseRate > 0.1) score += 20;
    else if (metrics.responseRate > 0.05) score += 10;
    else if (metrics.responseRate > 0.02) score += 5;
  }

  // Recency scoring (0-15 points)
  if (metrics.lastActivity) {
    const daysSinceActivity = (Date.now() - new Date(metrics.lastActivity)) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity < 1) score += 15;
    else if (daysSinceActivity < 3) score += 10;
    else if (daysSinceActivity < 7) score += 5;
    else if (daysSinceActivity > 30) score -= 10;
  }

  // Unsubscribe penalty
  if (metrics.unsubscribed) {
    score = Math.max(0, score - 30);
    recommendations.push('unsubscribe_penalty');
  }

  // Spam complaint penalty
  if (metrics.spamComplaints > 0) {
    score = Math.max(0, score - 50);
    recommendations.push('spam_complaint_penalty');
  }

  // Generate recommendations based on score
  if (score >= 80) {
    recommendations.push('high_engagement_followup', 'upgrade_sequence');
  } else if (score >= 60) {
    recommendations.push('medium_engagement_nurture');
  } else if (score >= 40) {
    recommendations.push('low_engagement_reengagement');
  } else {
    recommendations.push('disengage_contact', 'review_contact_strategy');
  }

  return {
    overall: Math.max(0, Math.min(100, score)),
    breakdown: {
      openRate: metrics.openRate || 0,
      clickRate: metrics.clickRate || 0,
      responseRate: metrics.responseRate || 0,
      recency: metrics.lastActivity ? Math.max(0, 15 - (Date.now() - new Date(metrics.lastActivity)) / (1000 * 60 * 60 * 24)) : 0
    },
    recommendations,
    riskLevel: score < 30 ? 'high' : score < 60 ? 'medium' : 'low'
  };
}

async function handleEngagementActions(contact, engagementScore) {
  const actions = [];

  for (const recommendation of engagementScore.recommendations) {
    switch (recommendation) {
      case 'high_engagement_followup':
        actions.push(await scheduleHighEngagementFollowup(contact));
        break;
      case 'upgrade_sequence':
        actions.push(await triggerUpgradeSequence(contact));
        break;
      case 'medium_engagement_nurture':
        actions.push(await scheduleNurtureCampaign(contact));
        break;
      case 'low_engagement_reengagement':
        actions.push(await triggerReengagementCampaign(contact));
        break;
      case 'disengage_contact':
        actions.push(await markForDisengagement(contact));
        break;
      case 'unsubscribe_penalty':
      case 'spam_complaint_penalty':
        actions.push(await handleComplianceAction(contact, recommendation));
        break;
    }
  }

  return actions;
}

async function scheduleHighEngagementFollowup(contact) {
  const followupDate = new Date();
  followupDate.setHours(followupDate.getHours() + 24); // Schedule for tomorrow

  const { error } = await supabase
    .from('scheduled_actions')
    .insert({
      contact_id: contact.id,
      action_type: 'high_engagement_followup',
      scheduled_for: followupDate.toISOString(),
      config: {
        priority: 'high',
        type: 'personalized_followup'
      }
    });

  if (error) throw error;
  return { type: 'high_engagement_followup', scheduled: followupDate };
}

async function triggerUpgradeSequence(contact) {
  const { error } = await supabase
    .from('campaign_triggers')
    .insert({
      contact_id: contact.id,
      campaign_type: 'upgrade_sequence',
      triggered_at: new Date().toISOString(),
      source: 'email_engagement'
    });

  if (error) throw error;
  return { type: 'upgrade_sequence_triggered' };
}

async function scheduleNurtureCampaign(contact) {
  const { error } = await supabase
    .from('campaign_triggers')
    .insert({
      contact_id: contact.id,
      campaign_type: 'nurture_campaign',
      triggered_at: new Date().toISOString(),
      source: 'email_engagement'
    });

  if (error) throw error;
  return { type: 'nurture_campaign_scheduled' };
}

async function triggerReengagementCampaign(contact) {
  const { error } = await supabase
    .from('campaign_triggers')
    .insert({
      contact_id: contact.id,
      campaign_type: 'reengagement_campaign',
      triggered_at: new Date().toISOString(),
      source: 'email_engagement'
    });

  if (error) throw error;
  return { type: 'reengagement_campaign_triggered' };
}

async function markForDisengagement(contact) {
  const { error } = await supabase
    .from('contacts')
    .update({
      status: 'disengaged',
      disengagementReason: 'low_email_engagement',
      disengagedAt: new Date().toISOString()
    })
    .eq('id', contact.id);

  if (error) throw error;
  return { type: 'marked_for_disengagement' };
}

async function handleComplianceAction(contact, actionType) {
  const { error } = await supabase
    .from('compliance_actions')
    .insert({
      contact_id: contact.id,
      action_type: actionType,
      triggered_at: new Date().toISOString(),
      severity: actionType.includes('spam') ? 'high' : 'medium'
    });

  if (error) throw error;
  return { type: 'compliance_action_logged', action: actionType };
}