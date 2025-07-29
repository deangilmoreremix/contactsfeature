export interface Deal {
  id: string;
  customer_id: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  stage_id: string;
  probability: number;
  expected_close_date?: string;
  actual_close_date?: string;
  contact_id?: string;
  assigned_to?: string;
  created_by?: string;
  status: 'open' | 'won' | 'lost' | 'cancelled';
  deal_type?: string;
  lead_source?: string;
  competitors?: string[];
  tags: string[];
  custom_fields: Record<string, any>;
  attachments: any[];
  created_at: string;
  updated_at: string;

  // Additional properties that might be used in the UI
  company?: string;
  contact?: {
    name: string;
    email: string;
  };
  dueDate?: string;
}

export interface DealStage {
  id: string;
  customer_id: string;
  name: string;
  description?: string;
  stage_order: number;
  default_probability: number;
  color: string;
  is_active: boolean;
  is_closed_stage: boolean;
  created_at: string;
  updated_at: string;
}

export interface DealCreateRequest {
  title: string;
  description?: string;
  value: number;
  currency?: string;
  stage_id: string;
  probability?: number;
  expected_close_date?: string;
  contact_id?: string;
  assigned_to?: string;
  deal_type?: string;
  lead_source?: string;
  competitors?: string[];
  tags?: string[];
  custom_fields?: Record<string, any>;
  attachments?: any[];
}

export interface DealUpdateRequest {
  title?: string;
  description?: string;
  value?: number;
  currency?: string;
  stage_id?: string;
  probability?: number;
  expected_close_date?: string;
  actual_close_date?: string;
  contact_id?: string;
  assigned_to?: string;
  status?: Deal['status'];
  deal_type?: string;
  lead_source?: string;
  competitors?: string[];
  tags?: string[];
  custom_fields?: Record<string, any>;
  attachments?: any[];
}