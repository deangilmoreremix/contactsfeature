const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("[Supabase] Missing required SUPABASE_URL environment variable");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("[Supabase] Missing required SUPABASE_SERVICE_ROLE_KEY environment variable");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function getUserClient(authHeader) {
  const anonKey = process.env.SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
  return createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

module.exports = { supabase, getUserClient };
