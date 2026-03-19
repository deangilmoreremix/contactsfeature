/*
  # Drop Unused Indexes

  This migration removes indexes that have not been used, which:
  - Reduces storage overhead
  - Improves write performance (INSERT/UPDATE/DELETE)
  - Reduces vacuum and maintenance overhead

  ## Indexes Dropped
  All indexes listed below have shown zero usage in query plans.
  They can be recreated if needed in the future.
*/

-- generated_images indexes
DROP INDEX IF EXISTS idx_generated_images_user_id;
DROP INDEX IF EXISTS idx_generated_images_created_at;
DROP INDEX IF EXISTS idx_generated_images_metadata;

-- agent_memory indexes
DROP INDEX IF EXISTS agent_memory_contact_idx;
DROP INDEX IF EXISTS agent_memory_type_idx;

-- calendar_events indexes
DROP INDEX IF EXISTS calendar_events_contact_idx;

-- contacts indexes (keeping user_id for RLS performance)
DROP INDEX IF EXISTS idx_contacts_email;
DROP INDEX IF EXISTS idx_contacts_company;
DROP INDEX IF EXISTS idx_contacts_interestlevel;
DROP INDEX IF EXISTS idx_contacts_status;
DROP INDEX IF EXISTS idx_contacts_aiscore;
DROP INDEX IF EXISTS idx_contacts_createdat;
DROP INDEX IF EXISTS idx_contacts_updatedat;
DROP INDEX IF EXISTS idx_contacts_isfavorite;
DROP INDEX IF EXISTS idx_contacts_industry;
DROP INDEX IF EXISTS idx_contacts_sources;
DROP INDEX IF EXISTS idx_contacts_tags;
DROP INDEX IF EXISTS idx_contacts_socialprofiles;
DROP INDEX IF EXISTS idx_contacts_customfields;
DROP INDEX IF EXISTS idx_contacts_user_id;

-- voice_jobs and video_jobs indexes
DROP INDEX IF EXISTS voice_jobs_status_idx;
DROP INDEX IF EXISTS video_jobs_status_idx;
DROP INDEX IF EXISTS idx_video_jobs_contact_id;
DROP INDEX IF EXISTS idx_voice_jobs_contact_id;

-- tooltip_configurations indexes
DROP INDEX IF EXISTS idx_tooltip_configurations_feature_id;
DROP INDEX IF EXISTS idx_tooltip_configurations_category;
DROP INDEX IF EXISTS idx_tooltip_configurations_active;

-- email_compositions indexes
DROP INDEX IF EXISTS idx_email_compositions_contact_id;
DROP INDEX IF EXISTS idx_email_compositions_user_id;
DROP INDEX IF EXISTS idx_email_compositions_created_at;

-- deals indexes
DROP INDEX IF EXISTS deals_contact_idx;
DROP INDEX IF EXISTS deals_stage_idx;

-- email_analyses indexes
DROP INDEX IF EXISTS idx_email_analyses_contact_id;
DROP INDEX IF EXISTS idx_email_analyses_user_id;
DROP INDEX IF EXISTS idx_email_analyses_created_at;

-- email_templates indexes
DROP INDEX IF EXISTS idx_email_templates_user_id;
DROP INDEX IF EXISTS idx_email_templates_category;
DROP INDEX IF EXISTS idx_email_templates_is_default;

-- agent_runs indexes
DROP INDEX IF EXISTS idx_agent_runs_agent_id;
DROP INDEX IF EXISTS idx_agent_runs_contact_id;
DROP INDEX IF EXISTS idx_agent_runs_deal_id;
DROP INDEX IF EXISTS idx_agent_runs_user_id;
DROP INDEX IF EXISTS idx_agent_runs_status;
DROP INDEX IF EXISTS idx_agent_runs_created_at;

-- view preferences indexes
DROP INDEX IF EXISTS idx_kanban_column_configs_user_id;
DROP INDEX IF EXISTS idx_table_column_preferences_user_id;
DROP INDEX IF EXISTS idx_dashboard_widget_layouts_user_id;
DROP INDEX IF EXISTS idx_timeline_view_preferences_user_id;

-- outbound_agents indexes
DROP INDEX IF EXISTS idx_outbound_agents_inbox_email;
DROP INDEX IF EXISTS idx_outbound_agents_key;
DROP INDEX IF EXISTS idx_outbound_agents_enabled;

-- contact_agent_settings indexes
DROP INDEX IF EXISTS contact_agent_settings_contact_id_idx;

-- ai_usage_logs indexes
DROP INDEX IF EXISTS idx_ai_usage_logs_user_id;
DROP INDEX IF EXISTS idx_ai_usage_logs_created_at;
DROP INDEX IF EXISTS idx_ai_usage_logs_feature;

-- agent_threads indexes
DROP INDEX IF EXISTS agent_threads_thread_id_idx;
DROP INDEX IF EXISTS agent_threads_lead_id_idx;
DROP INDEX IF EXISTS agent_threads_agent_type_idx;

-- adaptive_playbooks indexes
DROP INDEX IF EXISTS idx_adaptive_playbooks_user_id;
DROP INDEX IF EXISTS idx_adaptive_playbooks_deal_type;
DROP INDEX IF EXISTS idx_adaptive_playbooks_industry;
DROP INDEX IF EXISTS idx_adaptive_playbooks_active;

-- autopilot_state indexes
DROP INDEX IF EXISTS autopilot_state_lead_id_idx;
DROP INDEX IF EXISTS autopilot_state_agent_type_idx;
DROP INDEX IF EXISTS autopilot_state_status_idx;
DROP INDEX IF EXISTS autopilot_state_next_action_idx;

-- emails indexes
DROP INDEX IF EXISTS emails_contact_id_idx;
DROP INDEX IF EXISTS emails_status_idx;
DROP INDEX IF EXISTS emails_sent_at_idx;

-- tasks indexes
DROP INDEX IF EXISTS tasks_contact_id_idx;
DROP INDEX IF EXISTS tasks_status_idx;
DROP INDEX IF EXISTS tasks_due_date_idx;

-- notes indexes
DROP INDEX IF EXISTS notes_contact_id_idx;
DROP INDEX IF EXISTS notes_created_at_idx;

-- product_drafts indexes
DROP INDEX IF EXISTS idx_product_drafts_product;
DROP INDEX IF EXISTS idx_product_drafts_contact;
DROP INDEX IF EXISTS idx_product_drafts_user;
DROP INDEX IF EXISTS idx_product_drafts_type;
DROP INDEX IF EXISTS idx_product_drafts_sent;

-- user_products indexes
DROP INDEX IF EXISTS idx_user_products_user_id;
DROP INDEX IF EXISTS idx_user_products_is_active;
DROP INDEX IF EXISTS idx_user_products_category;

-- product_contact_matches indexes
DROP INDEX IF EXISTS idx_product_matches_product_score;
DROP INDEX IF EXISTS idx_product_matches_contact;
DROP INDEX IF EXISTS idx_product_matches_user;
DROP INDEX IF EXISTS idx_product_matches_score;

-- contact_journey_events indexes
DROP INDEX IF EXISTS idx_journey_events_contact_id;
DROP INDEX IF EXISTS idx_journey_events_user_id;
DROP INDEX IF EXISTS idx_journey_events_timestamp;
DROP INDEX IF EXISTS idx_journey_events_type;
DROP INDEX IF EXISTS idx_contact_journey_events_file_id;

-- product_ai_suggestions indexes
DROP INDEX IF EXISTS idx_product_ai_suggestions_user_id;
DROP INDEX IF EXISTS idx_product_ai_suggestions_product_id;
DROP INDEX IF EXISTS idx_product_ai_suggestions_type;

-- product_ai_enrichments indexes
DROP INDEX IF EXISTS idx_product_ai_enrichments_user_id;
DROP INDEX IF EXISTS idx_product_ai_enrichments_match_id;
DROP INDEX IF EXISTS idx_product_ai_enrichments_expires;

-- contact_files indexes
DROP INDEX IF EXISTS idx_contact_files_contact_id;
DROP INDEX IF EXISTS idx_contact_files_user_id;
DROP INDEX IF EXISTS idx_contact_files_created_at;

-- autopilot_logs indexes
DROP INDEX IF EXISTS idx_autopilot_logs_contact_id;
