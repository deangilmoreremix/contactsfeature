/*
  # Add Missing Foreign Key Indexes

  This migration adds indexes on foreign key columns that were missing indexes,
  which improves JOIN performance significantly.

  ## New Indexes
  - autopilot_logs.contact_id
  - contact_journey_events.file_id
  - video_jobs.contact_id
  - voice_jobs.contact_id
*/

CREATE INDEX IF NOT EXISTS idx_autopilot_logs_contact_id 
ON public.autopilot_logs(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_journey_events_file_id 
ON public.contact_journey_events(file_id);

CREATE INDEX IF NOT EXISTS idx_video_jobs_contact_id 
ON public.video_jobs(contact_id);

CREATE INDEX IF NOT EXISTS idx_voice_jobs_contact_id 
ON public.voice_jobs(contact_id);
