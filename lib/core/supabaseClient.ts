import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

const SUPABASE_URL = requireEnv("VITE_SUPABASE_URL");
const SUPABASE_SERVICE_KEY = requireEnv("VITE_SUPABASE_ANON_KEY");

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  }
});
