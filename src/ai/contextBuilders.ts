/**
 * SmartCRM AI Context Builders
 * Functions to gather and format CRM data for AI processing
 */

import { supabase } from '../services/supabaseClient';
import type { CrmContext } from './types';

export async function buildContactSnapshot(contactId: string): Promise<CrmContext> {
  try {
    // Fetch contact with related data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(`
        *,
        activity_log,
        custom_fields,
        social_profiles,
        gamification_stats
      `)
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      throw new Error(`Contact not found: ${contactId}`);
    }

    // Fetch recent emails (last 10)
    const { data: emails } = await supabase
      .from('emails')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent tasks (last 5)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch related deals
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(3);

    // Fetch recent notes
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(3);

    return {
      contact,
      emails: emails || [],
      tasks: tasks || [],
      deals: deals || [],
      notes: notes || []
    };
  } catch (error) {
    console.error('Error building contact snapshot:', error);
    throw new Error(`Failed to build contact context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function buildDealSnapshot(dealId: string): Promise<CrmContext> {
  try {
    // Fetch deal with related data
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      throw new Error(`Deal not found: ${dealId}`);
    }

    // Fetch related contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', deal.contact_id)
      .single();

    // Fetch company info if available
    let company = null;
    if (contact?.company) {
      // This would need a companies table or similar
      // For now, we'll use contact company field
    }

    // Fetch recent emails related to this deal
    const { data: emails } = await supabase
      .from('emails')
      .select('*')
      .eq('contact_id', deal.contact_id)
      .gte('created_at', deal.created_at) // Emails since deal creation
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch tasks related to this deal
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      deal,
      contact,
      company,
      emails: emails || [],
      tasks: tasks || []
    };
  } catch (error) {
    console.error('Error building deal snapshot:', error);
    throw new Error(`Failed to build deal context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function buildPipelineSnapshot(workspaceId: string): Promise<CrmContext> {
  try {
    // Fetch all open deals grouped by stage
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    // Group by stage and calculate stats
    const stages: Record<string, any[]> = {};
    const stats = {
      totalDeals: deals?.length || 0,
      totalValue: 0,
      avgDealSize: 0,
      stageCounts: {} as Record<string, number>
    };

    deals?.forEach(deal => {
      const stage = deal.stage || 'unknown';
      if (!stages[stage]) {
        stages[stage] = [];
      }
      stages[stage].push(deal);

      stats.totalValue += deal.value || 0;
      stats.stageCounts[stage] = (stats.stageCounts[stage] || 0) + 1;
    });

    if (stats.totalDeals > 0) {
      stats.avgDealSize = stats.totalValue / stats.totalDeals;
    }

    return {
      pipeline: {
        stages,
        stats
      }
    };
  } catch (error) {
    console.error('Error building pipeline snapshot:', error);
    throw new Error(`Failed to build pipeline context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function buildWorkspaceAnalyticsSnapshot(workspaceId: string): Promise<CrmContext> {
  try {
    // This would aggregate various metrics across the workspace
    // For now, we'll provide a basic structure

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Fetch contact metrics
    const { data: contacts } = await supabase
      .from('contacts')
      .select('created_at, status, interest_level')
      .gte('created_at', ninetyDaysAgo.toISOString());

    // Fetch deal metrics
    const { data: deals } = await supabase
      .from('deals')
      .select('created_at, status, value, stage')
      .gte('created_at', ninetyDaysAgo.toISOString());

    // Calculate metrics
    const metrics = {
      contacts: {
        total: contacts?.length || 0,
        newLast30Days: contacts?.filter(c => new Date(c.created_at) > thirtyDaysAgo).length || 0,
        byStatus: {} as Record<string, number>,
        byInterestLevel: {} as Record<string, number>
      },
      deals: {
        total: deals?.length || 0,
        newLast30Days: deals?.filter(d => new Date(d.created_at) > thirtyDaysAgo).length || 0,
        totalValue: deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0,
        byStage: {} as Record<string, number>,
        byStatus: {} as Record<string, number>
      },
      conversionRates: {
        leadToDeal: 0,
        dealToWin: 0
      }
    };

    // Calculate distributions
    contacts?.forEach(contact => {
      metrics.contacts.byStatus[contact.status] = (metrics.contacts.byStatus[contact.status] || 0) + 1;
      metrics.contacts.byInterestLevel[contact.interest_level] = (metrics.contacts.byInterestLevel[contact.interest_level] || 0) + 1;
    });

    deals?.forEach(deal => {
      metrics.deals.byStage[deal.stage || 'unknown'] = (metrics.deals.byStage[deal.stage || 'unknown'] || 0) + 1;
      metrics.deals.byStatus[deal.status] = (metrics.deals.byStatus[deal.status] || 0) + 1;
    });

    // Calculate conversion rates
    if (metrics.contacts.total > 0 && metrics.deals.total > 0) {
      metrics.conversionRates.leadToDeal = (metrics.deals.total / metrics.contacts.total) * 100;
    }

    const wonDeals = deals?.filter(d => d.status === 'won').length || 0;
    if (metrics.deals.total > 0) {
      metrics.conversionRates.dealToWin = (wonDeals / metrics.deals.total) * 100;
    }

    return {
      analytics: {
        metrics,
        timeSeries: {
          period: '90_days',
          startDate: ninetyDaysAgo.toISOString(),
          endDate: now.toISOString()
        }
      }
    };
  } catch (error) {
    console.error('Error building workspace analytics snapshot:', error);
    throw new Error(`Failed to build analytics context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}