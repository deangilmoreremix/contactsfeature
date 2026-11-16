/**
 * Image generation bridge for edge functions.
 * Images are produced by the Netlify function `generate-image` (OpenAI Images; model ids in
 * src/config/models.json). Requires the SITE_URL env var (e.g. https://app.example.com).
 * Returns [] plus an error string instead of fake data when unavailable.
 */
export interface GeneratedImage {
  url: string; // data: URL
  mime_type: string;
}

export async function generateImages(
  authHeader: string | null,
  prompt: string,
  n = 1,
  size = "1536x1024",
): Promise<{ images: GeneratedImage[]; error: string | null }> {
  const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("URL") || "").replace(/\/$/, "");
  if (!siteUrl) return { images: [], error: "SITE_URL is not configured; image generation skipped" };
  try {
    const res = await fetch(`${siteUrl}/.netlify/functions/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader || "" },
      body: JSON.stringify({ prompt, n, size, fast: true }),
    });
    if (!res.ok) return { images: [], error: `Image generation failed (${res.status})` };
    const data = await res.json();
    const images: GeneratedImage[] = (data.images || []).map((i: { b64_json: string; mime_type?: string }) => ({
      url: `data:${i.mime_type || "image/png"};base64,${i.b64_json}`,
      mime_type: i.mime_type || "image/png",
    }));
    return { images, error: null };
  } catch (e) {
    return { images: [], error: `Image generation failed: ${(e as Error).message}` };
  }
}
