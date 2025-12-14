import type { Handler } from "@netlify/functions";
import { getDealsWithRisk } from "../../../src/lib/heatmap";

export const handler: Handler = async () => {
  try {
    const deals = await getDealsWithRisk();

    return {
      statusCode: 200,
      body: JSON.stringify({ deals })
    };
  } catch (error: any) {
    console.error("[heatmap-list] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" })
    };
  }
};
