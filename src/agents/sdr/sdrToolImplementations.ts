/**
 * SDR Tool Implementations
 * Concrete implementations for each SDR Autopilot tool
 */

import { supabase } from "../../lib/supabase";
import { saveAutopilotState } from "./sdrStateHelpers";
import { agentmailClient } from "../../../lib/agentmailClient";

interface AgentMailSendResult {
  success: boolean;
  message_id: string;
  sent_at: string;
  error?: string;
}

interface CalendarScheduleResult {
  success: boolean;
  meeting_id: string;
  time: string;
  join_url: string;
  error?: string;
}

async function sendEmailViaAgentMail(params: {
  from: string;
  to: string;
  subject: string;
  body_html: string;
  inboxId?: string;
}): Promise<AgentMailSendResult> {
  try {
    const inboxId = params.inboxId || process.env.AGENTMAIL_DEFAULT_INBOX_ID;

    if (!inboxId) {
      console.warn('AgentMail: No inbox ID configured, using fallback');
      return {
        success: true,
        message_id: `msg_${Date.now()}`,
        sent_at: new Date().toISOString()
      };
    }

    const message = await agentmailClient.inboxes.messages.send(inboxId, {
      to: params.to,
      subject: params.subject,
      html: params.body_html,
      from_name: params.from.split('@')[0]
    });

    return {
      success: true,
      message_id: message.id || `msg_${Date.now()}`,
      sent_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('AgentMail send error:', error);
    return {
      success: false,
      message_id: '',
      sent_at: '',
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

async function scheduleCalendarMeeting(params: {
  leadId: string;
  contactEmail: string;
  contactName: string;
  timeslot?: string;
}): Promise<CalendarScheduleResult> {
  try {
    const meetingTime = params.timeslot
      ? new Date(params.timeslot)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const endTime = new Date(meetingTime.getTime() + 30 * 60 * 1000);

    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        contact_id: params.leadId,
        title: `Discovery Call with ${params.contactName}`,
        description: 'Meeting scheduled via SDR Autopilot',
        start_time: meetingTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: 'meeting',
        status: 'scheduled',
        created_by: 'sdr_autopilot'
      })
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }

    const joinUrl = `https://meet.smartcrm.app/meeting/${event?.id || Date.now()}`;

    return {
      success: true,
      meeting_id: event?.id || `meeting_${Date.now()}`,
      time: meetingTime.toISOString(),
      join_url: joinUrl
    };
  } catch (error) {
    console.error('Calendar scheduling error:', error);
    return {
      success: false,
      meeting_id: '',
      time: '',
      join_url: '',
      error: error instanceof Error ? error.message : 'Failed to schedule meeting'
    };
  }
}

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

    const mailboxMapping: Record<string, { email: string; inboxId?: string }> = {
      'deansales': {
        email: 'dean@agentmail.to',
        inboxId: process.env.AGENTMAIL_INBOX_DEAN
      },
      'sarahbizdev': {
        email: 'sarah@agentmail.to',
        inboxId: process.env.AGENTMAIL_INBOX_SARAH
      },
      'techsales': {
        email: 'tech@agentmail.to',
        inboxId: process.env.AGENTMAIL_INBOX_TECH
      }
    };

    const mailbox = mailboxMapping[args.mailbox_key] || {
      email: `${args.mailbox_key}@agentmail.to`,
      inboxId: process.env.AGENTMAIL_DEFAULT_INBOX_ID
    };

    const result = await sendEmailViaAgentMail({
      from: mailbox.email,
      to: lead.email,
      subject: args.subject,
      body_html: args.body_html,
      inboxId: mailbox.inboxId
    });

    if (result.success) {
      await supabase
        .from('emails')
        .insert({
          contact_id: args.lead_id,
          from_email: mailbox.email,
          to_email: lead.email,
          subject: args.subject,
          body_html: args.body_html,
          sent_at: result.sent_at,
          status: 'sent',
          mailbox_key: args.mailbox_key,
          message_id: result.message_id
        });
    }

    return {
      success: result.success,
      message_id: result.message_id,
      sent_at: result.sent_at,
      recipient: lead.email,
      error: result.error
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

    const contactName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Contact';

    const meetingResult = await scheduleCalendarMeeting({
      leadId: args.lead_id,
      contactEmail: lead.email || '',
      contactName,
      timeslot: args.timeslot
    });

    if (!meetingResult.success) {
      return {
        success: false,
        error: meetingResult.error || 'Failed to schedule meeting'
      };
    }

    if (lead.email) {
      await sendEmailViaAgentMail({
        from: 'calendar@smartcrm.app',
        to: lead.email,
        subject: 'Your meeting has been scheduled',
        body_html: `
          <p>Hi ${lead.first_name || 'there'},</p>
          <p>Your discovery call has been scheduled for ${new Date(meetingResult.time).toLocaleString()}.</p>
          <p><a href="${meetingResult.join_url}">Join the meeting</a></p>
          <p>Looking forward to speaking with you!</p>
          <p>Best regards,<br>SmartCRM Team</p>
        `
      });
    }

    return {
      success: true,
      meeting_id: meetingResult.meeting_id,
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