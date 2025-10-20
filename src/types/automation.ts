export interface ContactAutomation {
  id: string;
  name: string;
  type: 'scoring' | 'followup' | 'enrichment' | 'transition' | 'notification' | 'integration';
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationTrigger {
  type: 'contact_created' | 'contact_updated' | 'field_changed' | 'score_changed' | 'scheduled' | 'manual';
  field?: string; // For field_changed triggers
  schedule?: string; // Cron expression for scheduled
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface AutomationAction {
  type: 'update_field' | 'send_email' | 'send_notification' | 'create_task' | 'webhook' | 'api_call';
  config: Record<string, any>;
}

export interface AutomationExecution {
  id: string;
  automationId: string;
  contactId: string;
  trigger: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: any;
  executedAt: string;
  error?: string;
}