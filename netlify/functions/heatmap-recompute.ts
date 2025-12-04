import type { Handler } from "@netlify/functions";
import { updateDealRisk, recomputeAllDealRisks } from "../../lib/heatmap";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const dealId = body.dealId as string | undefined;

    if (dealId) {
      const result = await updateDealRisk(dealId);
      return {
        statusCode: 200,
        body: JSON.stringify({ mode: "single", result })
      };
    }

    const results = await recomputeAllDealRisks(50);
    return {
      statusCode: 200,
      body: JSON.stringify({ mode: "all", count: results.length, results })
    };
  } catch (error: any) {
    console.error("[heatmap-recompute] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" })
    };
  }
};
