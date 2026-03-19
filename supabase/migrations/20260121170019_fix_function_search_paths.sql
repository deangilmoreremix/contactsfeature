/*
  # Fix Function Search Paths

  This migration fixes function search paths to prevent SQL injection vulnerabilities.
  All functions are updated with SET search_path = public for security.

  ## Functions Updated
  - rpc_compute_deal_risk
  - write_score
  - update_view_preferences_updated_at
  - update_updated_at_column
  - update_tooltip_updated_at
  - update_timestamp
  - save_activity
  - update_contact_status
*/

-- Fix rpc_compute_deal_risk function
CREATE OR REPLACE FUNCTION public.rpc_compute_deal_risk(did uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT json_build_object(
    'risk_score', risk_score,
    'updated_at', now()
  )
  INTO result
  FROM deals
  WHERE id = did;
  
  RETURN result;
END;
$$;

-- Fix write_score function
CREATE OR REPLACE FUNCTION public.write_score(cid uuid, score integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE contacts
  SET lead_score = score
  WHERE id = cid;
END;
$$;

-- Fix update_view_preferences_updated_at function
CREATE OR REPLACE FUNCTION public.update_view_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updatedAt = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_tooltip_updated_at function
CREATE OR REPLACE FUNCTION public.update_tooltip_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_timestamp function
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix save_activity function
CREATE OR REPLACE FUNCTION public.save_activity(contact_id uuid, activity jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO autopilot_logs(contact_id, state, event, details)
  VALUES (contact_id, 'activity', 'saved', activity);
END;
$$;

-- Fix update_contact_status function
CREATE OR REPLACE FUNCTION public.update_contact_status(cid uuid, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE contacts
  SET status = new_status
  WHERE id = cid;
END;
$$;
