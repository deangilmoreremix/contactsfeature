-- Outbound email agents for SmartCRM + AgentMail

create table if not exists outbound_agents (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,                         -- e.g. 'authority_outreach'
  name text not null,                               -- human-readable name
  inbox_email text not null unique,                 -- AgentMail inbox email
  target_type text not null check (
    target_type in ('contact', 'deal', 'both')
  ),
  persona text,                                     -- short description of tone/role
  system_prompt text,                               -- base prompt for AI generation
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_outbound_agents_inbox_email
  on outbound_agents (inbox_email);

create index if not exists idx_outbound_agents_key
  on outbound_agents (key);

create index if not exists idx_outbound_agents_enabled
  on outbound_agents (enabled);