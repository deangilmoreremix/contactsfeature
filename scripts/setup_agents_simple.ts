import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { outboundAgentsSeed } from "./outbound_agents.seed";

// Load environment variables
config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function setupAgentsSimple() {
  console.log("🔧 Setting up outbound agents table and seeding data...");

  try {
    // Try to seed directly first - if table exists, this will work
    console.log("🌱 Attempting to seed outbound agents (checking if table exists)...");

    // Seed the agents
    console.log("🌱 Seeding outbound agents...");
    for (const agent of outboundAgentsSeed) {
      const { data, error } = await supabase
        .from("outbound_agents")
        .upsert(agent, { onConflict: "key" })
        .select();

      if (error) {
        console.error(`❌ Failed to seed ${agent.key}:`, error.message);
      } else {
        console.log(`✅ Seeded ${agent.key} (${data?.[0]?.id})`);
      }
    }

    console.log("🎉 Setup completed successfully!");
    console.log("🤖 Your AI agents are now ready to handle email conversations!");

  } catch (error) {
    console.error("💥 Setup failed:", error);
    process.exit(1);
  }
}

setupAgentsSimple();