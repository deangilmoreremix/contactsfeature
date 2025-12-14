import type { Handler } from "@netlify/functions";
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export const handler: Handler = async () => {
  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .select(
        `
        id,
        contact_id,
        datetime,
        status,
        contacts:contact_id (
          id,
          name,
          email
        )
      `
      )
      .gte("datetime", new Date().toISOString())
      .order("datetime", { ascending: true })
      .limit(50);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ events: data })
    };
  } catch (error: any) {
    console.error("[calendar-list] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" })
    };
  }
};
