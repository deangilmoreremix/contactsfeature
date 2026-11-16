/**
 * Feature analysis studio (src/components/ai-sales-intelligence/FeatureAnalysisStudio.tsx).
 * Old contract the UI renders: { analysis: { productName, analysis: { summary, keyFeatures[], competitiveLandscape{directCompetitors[],
 * indirectCompetitors[], marketGaps[]}, marketInsights{totalAddressableMarket,…, growthRate(0-1), keyTrends[]}, recommendations[] } } }.
 * Uses web_search for fresh public facts (product pages, competitors, market size); unknown figures are null/"Unknown", never guessed.
 */
const { TaskError } = require('./_ctx');
const { capJson, obj } = require('./_ctxAnalysis');

const FRAC = { type: ['number', 'null'], description: '0-1 fraction; null when no source supports a number' };

module.exports = {
  id: 'feature-analysis',
  role: 'thinking',
  effort: 'medium',
  tools: [{ type: 'web_search' }],
  maxOutputTokens: 6000,
  schema: {
    type: 'object',
    properties: {
      productName: { type: 'string' },
      summary: { type: 'string' },
      keyFeatures: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' }, description: { type: 'string' }, competitiveAdvantage: { type: 'string' },
            marketPosition: { type: 'string', enum: ['leader', 'challenger', 'parity', 'lagging', 'unknown'] },
            adoptionRate: FRAC,
          },
        },
      },
      directCompetitors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' }, strengths: { type: 'array', items: { type: 'string' } }, weaknesses: { type: 'array', items: { type: 'string' } },
            marketShare: { type: ['number', 'null'], description: 'percent 0-100 only if a source states it, else null' },
          },
        },
      },
      indirectCompetitors: { type: 'array', items: { type: 'string' } },
      marketGaps: { type: 'array', items: { type: 'string' } },
      marketInsights: {
        type: 'object',
        properties: {
          totalAddressableMarket: { type: ['string', 'null'] }, serviceableAvailableMarket: { type: ['string', 'null'] }, serviceableObtainableMarket: { type: ['string', 'null'] },
          growthRate: FRAC, keyTrends: { type: 'array', items: { type: 'string' } },
        },
      },
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['feature', 'pricing', 'positioning', 'go_to_market'] },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            recommendation: { type: 'string' }, rationale: { type: 'string' }, expectedImpact: { type: 'string' },
          },
        },
      },
      sources: { type: 'array', items: { type: 'string' }, description: 'URLs relied on' },
    },
  },
  async load({ params }) {
    const pd = obj(params.productData);
    const subject = String(params.productUrl || pd.name || '').trim().slice(0, 2000);
    if (!subject) throw new TaskError(400, 'productUrl (a URL or description) is required');
    return { subject, productData: pd };
  },
  buildInput(ctx, params) {
    return {
      instructions: 'You are a product-intelligence analyst for a seller. Research the product with web search when the input is a URL or a named product, and cite only what sources support. '
        + 'Never invent competitors, market sizes, shares or adoption figures: use null (or "Unknown" is applied for you) when no source gives one. Be concrete and sales-relevant; 3-8 key features, 2-5 direct competitors.',
      input: `Analyse this product (URL or description): ${ctx.subject}\n`
        + (Object.keys(ctx.productData).length ? `Additional product data: ${capJson(ctx.productData, 3000)}\n` : '')
        + `Depth: ${String(params.analysisDepth || 'comprehensive').slice(0, 30)}. Competitor research: ${params.competitorResearch === false ? 'skip' : 'yes'}. Market analysis: ${params.marketAnalysis === false ? 'skip' : 'yes'}.`,
    };
  },
  finalize(p) {
    const mi = p.marketInsights || {};
    return {
      analysis: {
        productName: p.productName,
        analysis: {
          summary: p.summary,
          keyFeatures: (p.keyFeatures || []).map((f) => ({ ...f, adoptionRate: f.adoptionRate })),
          competitiveLandscape: { directCompetitors: p.directCompetitors || [], indirectCompetitors: p.indirectCompetitors || [], marketGaps: p.marketGaps || [] },
          marketInsights: {
            totalAddressableMarket: mi.totalAddressableMarket || 'Unknown',
            serviceableAvailableMarket: mi.serviceableAvailableMarket || 'Unknown',
            serviceableObtainableMarket: mi.serviceableObtainableMarket || 'Unknown',
            growthRate: mi.growthRate, keyTrends: mi.keyTrends || [],
          },
          recommendations: p.recommendations || [],
        },
        sources: p.sources || [],
      },
    };
  },
};
