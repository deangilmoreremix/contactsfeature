// SmartCRM-branded prompt templates: feature × format
export const SMARTCRM_STYLE = `
SmartCRM visual style:
- Palette: deep blue #1E3A8A, electric teal #14B8A6, white, dark slate #0F172A
- Aesthetic: sleek, modern, minimal grid layouts with neon-teal glow edges and holographic UI cards
- Typography cues: bold geometric sans-serif for headers; clean sans-serif for body
- Elements: subtle circuit lines, soft shadows, gradient blue→teal glows, floating UI mockups
- Finish: sharp, high-contrast, crisp, professional, futuristic, legible in print and social
`;

export type FeatureKey =
  | "Enhanced Contacts"
  | "Enhanced Pipeline Deals"
  | "AI Agency Suite"
  | "Insights AI"
  | "Product Research"
  | "Advanced AI Calendar"
  | "AI Sales Maximizer"
  | "AI Referral Maximizer"
  | "Content AI";

export const FEATURE_BENEFITS: Record<FeatureKey, string> = {
  "Enhanced Contacts": "See critical tags, notes, and attachments at a glance.",
  "Enhanced Pipeline Deals": "Move deals faster with AI win-probability and next steps.",
  "AI Agency Suite": "Run multi-client marketing with AI copy, SEO, and reports.",
  "Insights AI": "Turn raw data into clear insights and next actions.",
  "Product Research": "Spot trends, gaps, and competitors in minutes.",
  "Advanced AI Calendar": "Schedules that anticipate needs and avoid conflicts.",
  "AI Sales Maximizer": "Prioritize hot leads and hit quota faster.",
  "AI Referral Maximizer": "Automate word-of-mouth with rewards and tracking.",
  "Content AI": "Write high-converting content on demand, anywhere.",
};

export type FormatKey = "Poster" | "Flyer" | "Product Mock" | "Social 1080" | "T-Shirt";

export const FORMAT_SCAFFOLDS: Record<
  FormatKey,
  { aspect: "1:1" | "4:5" | "3:4" | "16:9" | "9:16"; scaffold: string }
> = {
  Poster: {
    aspect: "3:4",
    scaffold:
      "Design a vertical POSTER: headline area at top, hero UI in center, 3 glowing benefit callouts with icons, strong CTA at bottom. Print-ready composition with margins for bleed.",
  },
  Flyer: {
    aspect: "4:5",
    scaffold:
      "Create a single-page FLYER: header, subheader, feature visual, 3 bullet benefits with icons, footer url. High legibility, balanced whitespace.",
  },
  "Product Mock": {
    aspect: "16:9",
    scaffold:
      "Create a PRODUCT SHOWCASE: glowing laptop/phone mockups with SmartCRM dashboards (cards, charts, tags), minimal overlay text, studio lighting.",
  },
  "Social 1080": {
    aspect: "1:1",
    scaffold:
      "Create a square SOCIAL MEDIA AD (1080×1080): bold headline, minimal copy, central icon/hero UI card, crisp brand lockup.",
  },
  "T-Shirt": {
    aspect: "1:1",
    scaffold:
      "Create a T-SHIRT graphic for dark fabric: neon line-art, limited teal/blue palette, concise typographic lockup.",
  },
};

export function buildPrompt(
  feature: FeatureKey,
  format: FormatKey,
  customBenefit?: string
) {
  const benefit = customBenefit || FEATURE_BENEFITS[feature];
  const { aspect, scaffold } = FORMAT_SCAFFOLDS[format];

  const uiHintsByFeature: Record<FeatureKey, string> = {
    "Enhanced Contacts":
      "UI shows contact header with bold colored tags, rich notes panel, attachments tray with inline PDF/image preview, quick-action FAB.",
    "Enhanced Pipeline Deals":
      "UI shows kanban pipeline with stage columns, deal cards showing value and AI win-probability, side panel with timeline and tasks.",
    "AI Agency Suite":
      "UI shows multi-client dashboard tiles (KPIs, budgets), AI content composer, SEO audit widget, client report preview.",
    "Insights AI":
      "UI shows KPI tiles at top, annotated charts with AI tooltips explaining spikes, trend lines, and recommendation cards.",
    "Product Research":
      "UI shows trend graph, competitor table, word cloud from reviews, validation score widget with green arrow for opportunity.",
    "Advanced AI Calendar":
      "UI shows color-coded events, AI suggestions bar for best times, travel time overlays, follow-up prompts.",
    "AI Sales Maximizer":
      "UI shows morning brief card (hot leads, close-ready deals), priority sidebar, engagement score badges, action buttons.",
    "AI Referral Maximizer":
      "UI shows referral funnel chart, leaderboard avatars, campaign designer pane, rewards status badges.",
    "Content AI":
      "UI shows inline AI assistant bubble in editor, tone selector, template list, generated copy with CTA.",
  };

  return {
    aspect,
    text: [
      SMARTCRM_STYLE.trim(),
      `Format: ${format} | Aspect ratio: ${aspect}`,
      `Subject: SmartCRM — ${feature}`,
      `Benefit: ${benefit}`,
      scaffold,
      uiHintsByFeature[feature],
      "Avoid: blurry output, distorted text, over-cluttered layout. Ensure text is crisp and legible.",
    ].join("\n"),
  };
}