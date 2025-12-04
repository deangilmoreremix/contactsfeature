import type { Handler } from "@netlify/functions";
import { processPendingVideoJobs } from "../lib/video/processVideoJobs";

export const handler: Handler = async () => {
  try {
    const processed = await processPendingVideoJobs(5);

    return {
      statusCode: 200,
      body: JSON.stringify({
        processed_count: processed.length,
        processed_ids: processed.map((j) => j.id)
      })
    };
  } catch (error: any) {
    console.error("[video-process] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" })
    };
  }
};
