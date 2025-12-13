/**
 * SDR Tools Specification
 * Defines the function tools that GPT-5.2 can call for SDR Autopilot operations
 */

export const sdrTools = [
  {
    type: "function",
    function: {
      name: "get_lead_context",
      description: "Fetch full CRM data (profile, emails, tasks, deals, notes) for a lead.",
      parameters: {
        type: "object",
        properties: {
          lead_id: {
            type: "string",
            description: "SmartCRM lead ID"
          }
        },
        required: ["lead_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_sdr_email",
      description: "Send an SDR email via AgentMail using the correct SDR mailbox/persona.",
      parameters: {
        type: "object",
        properties: {
          lead_id: {
            type: "string",
            description: "SmartCRM lead ID"
          },
          mailbox_key: {
            type: "string",
            description: "Which SDR inbox (e.g. 'deansales')."
          },
          subject: {
            type: "string",
            description: "Email subject line"
          },
          body_html: {
            type: "string",
            description: "Email body in HTML format"
          }
        },
        required: ["lead_id", "mailbox_key", "subject", "body_html"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_followup_task",
      description: "Create a follow-up task in SmartCRM for this lead.",
      parameters: {
        type: "object",
        properties: {
          lead_id: {
            type: "string",
            description: "SmartCRM lead ID"
          },
          description: {
            type: "string",
            description: "Task description"
          },
          due_date: {
            type: "string",
            description: "ISO 8601 date string for task due date"
          }
        },
        required: ["lead_id", "description", "due_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_pipeline_stage",
      description: "Update the deal's pipeline stage and reason.",
      parameters: {
        type: "object",
        properties: {
          deal_id: {
            type: "string",
            description: "SmartCRM deal ID"
          },
          new_stage: {
            type: "string",
            description: "New pipeline stage (e.g., 'discovery', 'proposal', 'closed-won')"
          },
          reason: {
            type: "string",
            description: "Optional reason for the stage change"
          }
        },
        required: ["deal_id", "new_stage"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_meeting",
      description: "Book a meeting with the lead on the connected calendar.",
      parameters: {
        type: "object",
        properties: {
          lead_id: {
            type: "string",
            description: "SmartCRM lead ID"
          },
          timeslot: {
            type: "string",
            description: "Preferred time window or constraints (e.g., 'next Tuesday 2-4pm')"
          }
        },
        required: ["lead_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_autopilot_state",
      description: "Store the current SDR Autopilot state for this lead.",
      parameters: {
        type: "object",
        properties: {
          lead_id: {
            type: "string",
            description: "SmartCRM lead ID"
          },
          state_json: {
            type: "string",
            description: "Serialized JSON state of plan and progress"
          }
        },
        required: ["lead_id", "state_json"]
      }
    }
  }
];