-- Create contact_agent_settings table for per-contact agent configuration
-- Allows customizing outbound agent behavior per contact

create table if not exists contact_agent_settings (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  persona_id text not null, -- OutboundPersonaId
  followup_mode text not null default 'manual',
  -- 'manual' | 'reply-only' | '2-step' | '5-step'
  is_enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_agent_settings_contact_id_idx
  on contact_agent_settings(contact_id);

-- Enable Row Level Security
alter table contact_agent_settings enable row level security;

-- Create policy for authenticated users
create policy "Users can view contact agent settings" on contact_agent_settings
  for select using (auth.role() = 'authenticated');

create policy "Users can manage contact agent settings" on contact_agent_settings
  for all using (auth.role() = 'authenticated');