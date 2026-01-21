/**
 * SDR Tool Implementations
 * Concrete implementations for each SDR Autopilot tool
 */

import { supabase } from "../../lib/supabase";
import { saveAutopilotState } from "./sdrStateHelpers";

// Mock AgentMail client - replace with actual implementation
const agentMailClient = {
  async sendEmail(params: {
    from: string;
    to: string;
    subject: string;
    body_html: string;
  }) {
    // Mock implementation - replace with actual AgentMail API call
    console.log('Sending email via AgentMail:', params);
    return {
      success: true,
      message_id: `msg_${Date.now()}`,
      sent_at: new Date().toISOString()
    };
  }
};

// Mock calendar client - replace with actual calendar integration
const calendarClient = {
  async scheduleMeeting(params: {
    leadId: string;
    timeslot?: string;
  }) {
    // Mock implementation - replace with actual calendar API
    console.log('Scheduling meeting:', params);
    return {
      success: true,
      meeting_id: `meeting_${Date.now()}`,
      time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      join_url: 'https://meet.example.com/meeting123'
    };
  }
};

export async function getLeadContextFromSmartCRM(leadId: string): Promise<any> {
  try {
    // Fetch lead profile
    const { data: lead, error: leadError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (leadError) {
      throw new Error(`Failed to fetch lead: ${leadError.message}`);
    }

    if (!lead) {
      throw new Error(`Lead not found with id: ${leadId}`);
    }

    // Fetch related emails
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('*')
      .eq('contact_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('contact_id', leadId)
      .order('due_date', { ascending: true });

    // Fetch deals
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', leadId);

    // Fetch notes
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('contact_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      lead: lead || {},
      emails: emails || [],
      tasks: tasks || [],
      deals: deals || [],
      notes: notes || [],
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in getLeadContextFromSmartCRM:', error);
    throw error;
  }
}

export async function sendViaAgentMail(args: {
  lead_id: string;
  mailbox_key: string;
  subject: string;
  body_html: string;
}): Promise<any> {
  try {
    // Get lead email from CRM
    const { data: lead, error: leadError } = await supabase
      .from('contacts')
      .select('email, first_name, last_name')
      .eq('id', args.lead_id)
      .maybeSingle();

    if (leadError) {
      throw new Error(`Failed to fetch lead: ${leadError.message}`);
    }

    if (!lead || !lead.email) {
      throw new Error(`Lead not found or missing email for id: ${args.lead_id}`);
    }

    // Map mailbox_key to actual email address
    const mailboxMapping: Record<string, string> = {
      'deansales': 'dean@agentmail.to',
      'sarahbizdev': 'sarah@agentmail.to',
      'techsales': 'tech@agentmail.to'
    };

    const fromEmail = mailboxMapping[args.mailbox_key] || `${args.mailbox_key}@agentmail.to`;

    // Send email via AgentMail
    const result = await agentMailClient.sendEmail({
      from: fromEmail,
      to: lead.email,
      subject: args.subject,
      body_html: args.body_html
    });

    // Log the sent email in CRM
    await supabase
      .from('emails')
      .insert({
        contact_id: args.lead_id,
        from_email: fromEmail,
        to_email: lead.email,
        subject: args.subject,
        body_html: args.body_html,
        sent_at: result.sent_at,
        status: 'sent',
        mailbox_key: args.mailbox_key
      });

    return {
      success: true,
      message_id: result.message_id,
      sent_at: result.sent_at,
      recipient: lead.email
    };
  } catch (error) {
    console.error('Error in sendViaAgentMail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function createTaskInSmartCRM(args: {
  lead_id: string;
  description: string;
  due_date: string;
}): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        contact_id: args.lead_id,
        description: args.description,
        due_date: args.due_date,
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    if (!data) {
      throw new Error('Task was not created');
    }

    return {
      success: true,
      task_id: data.id,
      status: 'created'
    };
  } catch (error) {
    console.error('Error in createTaskInSmartCRM:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function updateDealStageInSmartCRM(args: {
  deal_id: string;
  new_stage: string;
  reason?: string;
}): Promise<any> {
  try {
    const updateData: any = {
      stage: args.new_stage,
      updated_at: new Date().toISOString()
    };

    if (args.reason) {
      updateData.last_stage_change_reason = args.reason;
    }

    const { data, error } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', args.deal_id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update deal stage: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Deal not found with id: ${args.deal_id}`);
    }

    return {
      success: true,
      deal_id: data.id,
      new_stage: args.new_stage,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error in updateDealStageInSmartCRM:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function scheduleMeetingForLead(args: {
  lead_id: string;
  timeslot?: string;
}): Promise<any> {
  try {
    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('contacts')
      .select('email, first_name, last_name, company')
      .eq('id', args.lead_id)
      .maybeSingle();

    if (leadError) {
      throw new Error(`Failed to fetch lead: ${leadError.message}`);
    }

    if (!lead) {
      throw new Error(`Lead not found with id: ${args.lead_id}`);
    }

    // Schedule meeting via calendar integration
    const meetingResult = await calendarClient.scheduleMeeting({
      leadId: args.lead_id,
      timeslot: args.timeslot
    });

    // Create calendar event record in CRM
    const { data: eventData, error: eventError } = await supabase
      .from('calendar_events')
      .insert({
        contact_id: args.lead_id,
        title: `Meeting with ${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        description: `Discovery call scheduled via SDR Autopilot`,
        start_time: meetingResult.time,
        end_time: new Date(new Date(meetingResult.time).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour
        event_type: 'meeting',
        status: 'scheduled',
        join_url: meetingResult.join_url,
        created_by: 'sdr_autopilot'
      })
      .select()
      .maybeSingle();

    if (eventError) {
      throw new Error(`Failed to create calendar event: ${eventError.message}`);
    }

    if (!eventData) {
      throw new Error('Calendar event was not created');
    }

    return {
      success: true,
      meeting_id: eventData.id,
      scheduled_time: meetingResult.time,
      join_url: meetingResult.join_url
    };
  } catch (error) {
    console.error('Error in scheduleMeetingForLead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function saveAutopilotStateWrapper(args: {
  lead_id: string;
  state_json: string;
}): Promise<any> {
  try {
    await saveAutopilotState({
      leadId: args.lead_id,
      stateJson: args.state_json
    });

    return {
      success: true,
      saved_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in saveAutopilotStateWrapper:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}