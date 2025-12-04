import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { outboundAgentsSeed } from "./outbound_agents.seed";

// Load environment variables
config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function seedOutboundAgents() {
  console.log("🌱 Seeding outbound_agents...");

  for (const agent of outboundAgentsSeed) {
    const { data, error } = await supabase
      .from("outbound_agents")
      .upsert(agent, { onConflict: "key" })
      .select();

    if (error) {
      console.error(`❌ Failed to seed ${agent.key}:`, error);
    } else {
      console.log(`✅ Seeded ${agent.key}`);
    }
  }

  console.log("🎉 Seeding completed!");
}

seedOutboundAgents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  });