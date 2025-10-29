/*
  # Tooltip System Database Schema

  1. New Tables
    - `tooltip_configurations`
      - `id` (uuid, primary key)
      - `feature_id` (text, unique) - Unique identifier for each feature
      - `feature_name` (text) - Human-readable feature name
      - `tooltip_title` (text) - Bold title shown in tooltip
      - `tooltip_description` (text) - Main description text
      - `tooltip_features` (text array) - Optional list of feature bullet points
      - `tooltip_category` (text) - Category for organization
      - `position_preference` (text) - Preferred tooltip position
      - `delay_ms` (integer) - Delay before showing tooltip
      - `show_arrow` (boolean) - Whether to show arrow pointer
      - `max_width` (text) - CSS max-width value
      - `is_active` (boolean) - Whether tooltip is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `tooltip_categories`
      - `id` (uuid, primary key)
      - `category_name` (text, unique)
      - `category_description` (text)
      - `display_order` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow public read access (tooltips are public information)
    - Restrict write access to authenticated users only
*/

-- Create tooltip_categories table
CREATE TABLE IF NOT EXISTS tooltip_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text UNIQUE NOT NULL,
  category_description text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create tooltip_configurations table
CREATE TABLE IF NOT EXISTS tooltip_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  tooltip_title text NOT NULL,
  tooltip_description text NOT NULL,
  tooltip_features text[] DEFAULT '{}',
  tooltip_category text REFERENCES tooltip_categories(category_name) ON DELETE SET NULL,
  position_preference text DEFAULT 'top',
  delay_ms integer DEFAULT 300,
  show_arrow boolean DEFAULT true,
  max_width text DEFAULT '320px',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tooltip_configurations_feature_id ON tooltip_configurations(feature_id);
CREATE INDEX IF NOT EXISTS idx_tooltip_configurations_category ON tooltip_configurations(tooltip_category);
CREATE INDEX IF NOT EXISTS idx_tooltip_configurations_active ON tooltip_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_tooltip_categories_order ON tooltip_categories(display_order);

-- Enable Row Level Security
ALTER TABLE tooltip_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooltip_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tooltip_categories
CREATE POLICY "Anyone can view tooltip categories"
  ON tooltip_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert tooltip categories"
  ON tooltip_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tooltip categories"
  ON tooltip_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tooltip categories"
  ON tooltip_categories FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for tooltip_configurations
CREATE POLICY "Anyone can view active tooltips"
  ON tooltip_configurations FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert tooltips"
  ON tooltip_configurations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tooltips"
  ON tooltip_configurations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tooltips"
  ON tooltip_configurations FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tooltip_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_tooltip_timestamp ON tooltip_configurations;
CREATE TRIGGER trigger_update_tooltip_timestamp
  BEFORE UPDATE ON tooltip_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_tooltip_updated_at();

-- Seed tooltip categories
INSERT INTO tooltip_categories (category_name, category_description, display_order) VALUES
  ('navigation', 'Main navigation and page links', 1),
  ('ai_features', 'AI-powered tools and automation', 2),
  ('contact_management', 'Contact CRUD and management actions', 3),
  ('data_operations', 'Import, export, and bulk operations', 4),
  ('filters_sorting', 'Search, filter, and sorting controls', 5),
  ('metrics_analytics', 'KPIs, charts, and analytics displays', 6),
  ('forms_inputs', 'Form fields and input controls', 7),
  ('settings_preferences', 'Application settings and preferences', 8)
ON CONFLICT (category_name) DO NOTHING;

-- Seed initial tooltip configurations for key features
INSERT INTO tooltip_configurations (
  feature_id,
  feature_name,
  tooltip_title,
  tooltip_description,
  tooltip_features,
  tooltip_category,
  position_preference
) VALUES
  -- Contact Management Tooltips
  (
    'contacts_new_button',
    'New Contact Button',
    'Add New Contact',
    'Create a new contact record with comprehensive information including personal details, company info, and interaction history.',
    ARRAY['Manual entry with AI assistance', 'Auto-fill from LinkedIn profiles', 'Smart field validation', 'Duplicate detection'],
    'contact_management',
    'bottom'
  ),
  (
    'contacts_import_button',
    'Import Contacts Button',
    'Import Contacts',
    'Bulk import contacts from CSV, Excel, or other CRM systems. Our smart import wizard maps fields automatically and validates data.',
    ARRAY['CSV and Excel support', 'Automatic field mapping', 'Data validation and cleanup', 'Duplicate detection and merging'],
    'data_operations',
    'bottom'
  ),
  (
    'contacts_export_button',
    'Export Contacts Button',
    'Export Contacts',
    'Export your contacts to CSV format. Export all contacts or only selected ones with all their data and custom fields.',
    ARRAY['Export selected or all contacts', 'Includes all custom fields', 'CSV format for compatibility', 'Maintains data integrity'],
    'data_operations',
    'bottom'
  ),
  (
    'contacts_settings_button',
    'Contact Settings Button',
    'Contact Settings',
    'Configure contact management preferences including default views, field visibility, AI settings, and data sync options.',
    ARRAY['Customize field visibility', 'Configure AI features', 'Set default filters', 'Manage data sync'],
    'settings_preferences',
    'bottom'
  ),

  -- AI Feature Tooltips
  (
    'ai_score_all_button',
    'AI Score All Button',
    'AI Contact Scoring',
    'Automatically analyze and score all contacts using AI to identify the most valuable leads and opportunities based on multiple data points.',
    ARRAY['Multi-factor lead scoring', 'Predictive analytics', 'Conversion probability', 'Priority recommendations'],
    'ai_features',
    'bottom'
  ),
  (
    'ai_analyze_selected_button',
    'Analyze Selected Button',
    'Analyze Selected Contacts',
    'Run AI analysis on selected contacts to update their scores and insights. Perfect for re-evaluating specific leads or updating outdated scores.',
    ARRAY['Selective analysis', 'Batch processing', 'Updated insights', 'Smart re-scoring'],
    'ai_features',
    'bottom'
  ),
  (
    'ai_toolbar_lead_score',
    'Lead Score Tool',
    'AI Lead Scoring',
    'Calculate lead quality scores using AI analysis of contact data, engagement patterns, and behavioral signals.',
    ARRAY['Predictive scoring algorithm', 'Confidence metrics', 'Conversion probability', 'Historical pattern analysis'],
    'ai_features',
    'top'
  ),
  (
    'ai_toolbar_email_ai',
    'Email AI Tool',
    'AI Email Personalization',
    'Generate personalized email content based on contact research, communication history, and relationship context.',
    ARRAY['Context-aware content', 'Tone matching', 'Personalized subject lines', 'Engagement optimization'],
    'ai_features',
    'top'
  ),
  (
    'ai_toolbar_enrich',
    'Contact Enrichment Tool',
    'Smart Contact Enrichment',
    'Expand contact profiles with additional information from multiple data sources including social media, company databases, and public records.',
    ARRAY['Social media data', 'Company insights', 'Contact verification', 'Real-time updates'],
    'ai_features',
    'top'
  ),
  (
    'ai_toolbar_insights',
    'Business Intelligence Tool',
    'AI Business Insights',
    'Analyze business relationships and opportunities using AI-powered insights to identify trends, risks, and opportunities.',
    ARRAY['Opportunity identification', 'Relationship mapping', 'Trend analysis', 'Risk assessment'],
    'ai_features',
    'top'
  ),
  (
    'ai_goals_button',
    'AI Goals Button',
    'AI Goals & Objectives',
    'Access advanced AI goal-setting and objective management tools for strategic planning and performance tracking.',
    ARRAY['Strategic goal planning', 'Progress tracking', 'AI-powered insights', 'Performance analytics'],
    'ai_features',
    'top'
  ),
  (
    'ai_research_button',
    'AI Research Button',
    'AI Contact Research',
    'Automatically research and enrich contact information using multiple AI sources and social platforms to build comprehensive profiles.',
    ARRAY['Email-based research', 'LinkedIn profile analysis', 'Company information', 'Social media research'],
    'ai_features',
    'top'
  ),
  (
    'ai_autofill_button',
    'AI Auto-Fill Button',
    'Smart Auto-Fill',
    'Intelligently fill contact forms using AI research with customizable merge strategies to save time and ensure accuracy.',
    ARRAY['Smart merge strategy', 'Conservative fill mode', 'Aggressive replace mode', 'Research source selection'],
    'ai_features',
    'top'
  ),

  -- Filter and Search Tooltips
  (
    'contacts_search_input',
    'Search Contacts Input',
    'Smart Contact Search',
    'Search contacts using fuzzy matching across names, companies, titles, emails, and industries. Works great even with partial or misspelled terms.',
    ARRAY['Fuzzy search algorithm', 'Multiple field search', 'Real-time results', 'Typo-tolerant'],
    'filters_sorting',
    'bottom'
  ),
  (
    'contacts_interest_filter',
    'Interest Level Filter',
    'Filter by Interest Level',
    'Filter contacts by their interest level (Hot Client, Medium Interest, Low Interest, Non Interest) to focus on the most engaged leads.',
    ARRAY['Four interest levels', 'Quick filtering', 'Combined with search', 'Real-time updates'],
    'filters_sorting',
    'bottom'
  ),
  (
    'contacts_status_filter',
    'Contact Status Filter',
    'Filter by Status',
    'Filter contacts by their lifecycle status (Lead, Prospect, Customer, Churned) to segment your contact list effectively.',
    ARRAY['Lifecycle stages', 'Pipeline alignment', 'Status tracking', 'Combined filtering'],
    'filters_sorting',
    'bottom'
  ),
  (
    'contacts_select_all',
    'Select All Button',
    'Select All Contacts',
    'Select or deselect all visible contacts in the current view to perform bulk actions like analysis, export, or tagging.',
    ARRAY['Bulk selection', 'Respects current filters', 'Toggle selection', 'Visual feedback'],
    'filters_sorting',
    'bottom'
  ),
  (
    'contacts_sort_control',
    'Sort Contacts Control',
    'Sort Contacts',
    'Sort your contact list by name, company, AI score, or last updated date in ascending or descending order.',
    ARRAY['Multiple sort options', 'Ascending/descending', 'Persistent preference', 'Fast sorting'],
    'filters_sorting',
    'bottom'
  ),
  (
    'contacts_view_mode',
    'View Mode Toggle',
    'Switch View Mode',
    'Toggle between card view (visual grid) and table view (detailed list) to match your workflow preference.',
    ARRAY['Card view for browsing', 'Table view for details', 'Persistent preference', 'Responsive layout'],
    'filters_sorting',
    'bottom'
  ),

  -- Navigation Tooltips
  (
    'nav_dashboard',
    'Dashboard Navigation',
    'Dashboard',
    'View your performance metrics, recent activities, and key insights in a comprehensive dashboard view.',
    ARRAY['KPI metrics', 'Recent activity feed', 'AI insights panel', 'Quick actions'],
    'navigation',
    'bottom'
  ),
  (
    'nav_contacts',
    'Contacts Navigation',
    'Contacts',
    'Manage all your contacts with powerful AI features, smart search, and bulk operations.',
    ARRAY['Contact cards', 'AI scoring', 'Import/export', 'Smart filtering'],
    'navigation',
    'bottom'
  ),
  (
    'nav_pipeline',
    'Pipeline Navigation',
    'Pipeline',
    'Visualize and manage your sales pipeline with drag-and-drop deals and stage management.',
    ARRAY['Kanban board', 'Deal tracking', 'Stage management', 'Revenue forecasting'],
    'navigation',
    'bottom'
  ),
  (
    'nav_tasks',
    'Tasks Navigation',
    'Tasks',
    'Manage your to-do list and stay on top of important follow-ups and deadlines.',
    ARRAY['Task management', 'Due date tracking', 'Priority levels', 'Contact linking'],
    'navigation',
    'bottom'
  ),
  (
    'nav_appointments',
    'Appointments Navigation',
    'Appointments',
    'Schedule and manage meetings, calls, and other appointments with integrated calendar.',
    ARRAY['Calendar integration', 'Meeting scheduling', 'Reminders', 'Contact sync'],
    'navigation',
    'bottom'
  ),
  (
    'nav_ai_tools',
    'AI Tools Navigation',
    'AI Tools',
    'Access advanced AI features including instant response generation, live deal analysis, and intelligent automation.',
    ARRAY['AI assistants', 'Smart automation', 'Real-time analysis', 'Advanced features'],
    'navigation',
    'bottom'
  ),
  (
    'contact_card',
    'Contact Card',
    'Contact Information Card',
    'View contact summary with key information, AI score, and quick actions. Click to view full details or use toolbar for AI operations.',
    ARRAY['Quick overview', 'AI score badge', 'Status indicators', 'One-click actions'],
    'contact_management',
    'top'
  ),
  (
    'contact_detail_view',
    'Contact Detail View',
    'Full Contact Profile',
    'Access comprehensive contact information including communication history, journey timeline, AI insights, and automation settings.',
    ARRAY['Complete profile', 'Activity timeline', 'AI insights', 'Communication hub'],
    'contact_management',
    'top'
  ),
  (
    'learn_more_button',
    'Learn More Button',
    'About ContactFlow',
    'Return to the landing page to learn more about ContactFlow features, watch demos, and see how AI can transform your contact management.',
    ARRAY['Feature overview', 'Interactive demos', 'AI capabilities', 'Use cases'],
    'navigation',
    'bottom'
  ),
  (
    'dark_mode_toggle',
    'Dark Mode Toggle',
    'Toggle Dark Mode',
    'Switch between light and dark theme modes for comfortable viewing in any environment. Your preference is saved automatically.',
    ARRAY['Eye-friendly themes', 'Auto-save preference', 'Instant switching', 'System sync option'],
    'settings_preferences',
    'bottom'
  )
ON CONFLICT (feature_id) DO NOTHING;
