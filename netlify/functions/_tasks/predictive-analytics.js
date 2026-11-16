/**
 * Predictive analytics. Old contract (edge fn): { inputData, predictionType, timeFrame, forecasts{metric:{predicted,trend,confidence,…}},
 * probabilities{metric:{confidence,probability,range}}, trends{overall,significantChanges[],emergingPatterns[],seasonalTrends[]},
 * recommendations[], confidence(0-100), generatedAt }. Grounded ONLY in the series the client sent + the caller's own deals.
 */
const { maybeContact, userDeals, capJson, obj } = require('./_ctxAnalysis');
const { recentEmails } = require('./_ctx');

const TYPES = ['sales', 'engagement', 'churn', 'lifetime_value', 'conversion', 'general'];
const DIRECTIONS = ['up', 'down', 'stable', 'insufficient_data'];

module.exports = {
  id: 'predictive-analytics',
  role: 'default',
  effort: 'medium',
  maxOutputTokens: 4000,
  schema: {
    type: 'object',
    properties: {
      forecasts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            metric: { type: 'string', description: 'snake_case metric name, e.g. revenue, deal_velocity, churn_risk' },
            predicted: { type: ['number', 'null'], description: 'predicted value for the time frame; null when the data cannot support one' },
            unit: { type: ['string', 'null'] },
            trend: { type: 'string', enum: DIRECTIONS },
            change: { type: ['number', 'null'], description: 'expected relative change, e.g. 0.12 = +12%' },
            confidence: { type: 'integer', description: '0-100; low when little data' },
            probability: { type: ['number', 'null'], description: '0-1 chance the forecast holds' },
            rangeLow: { type: ['number', 'null'] },
            rangeHigh: { type: ['number', 'null'] },
            basis: { type: 'string', description: 'the input data points this is based on' },
          },
        },
      },
      trends: {
        type: 'object',
        properties: {
          overall: { type: 'string', enum: DIRECTIONS },
          significantChanges: { type: 'array', items: { type: 'object', properties: { metric: { type: 'string' }, trend: { type: 'string' }, magnitude: { type: ['number', 'null'] } } } },
          emergingPatterns: { type: 'array', items: { type: 'string' } },
          seasonalTrends: { type: 'array', items: { type: 'string' } },
        },
      },
      recommendations: { type: 'array', items: { type: 'string' } },
      dataQuality: { type: 'string', description: 'one sentence on what data was missing or thin' },
    },
  },
  async load({ user, params }) {
    const contact = await maybeContact(user, params);
    return {
      contact,
      emails: contact && contact.id ? await recentEmails(user, contact.id, 20) : [],
      deals: await userDeals(user, 100),
    };
  },
  buildInput(ctx, params) {
    const type = TYPES.includes(params.predictionType) ? params.predictionType : 'general';
    const timeFrame = String(params.timeFrame || obj(params.data).timeFrame || '30days').slice(0, 20);
    return {
      instructions: 'You are a sales analytics forecaster. Forecast ONLY from the data provided (client series and the user\'s own deals). Never invent history. '
        + 'If a metric has fewer than 3 data points, set predicted to null, trend to insufficient_data and confidence below 30. Keep numbers consistent with the inputs; confidence reflects data volume.',
      input: `Prediction type: ${type}\nTime frame: ${timeFrame}\n\nClient-supplied data:\n${capJson(params.data, 9000)}\n\n`
        + `The user's deals (stage, value, dates): ${capJson(ctx.deals, 6000)}\n`
        + (ctx.contact ? `Contact in focus: ${capJson(ctx.contact, 1500)}\nRecent emails: ${capJson(ctx.emails, 2000)}\n` : ''),
    };
  },
  finalize(parsed, ctx, params) {
    const type = TYPES.includes(params.predictionType) ? params.predictionType : 'general';
    const forecasts = {};
    const probabilities = {};
    const confs = [];
    for (const f of parsed.forecasts || []) {
      const key = String(f.metric || '').trim() || `metric_${Object.keys(forecasts).length + 1}`;
      const confidence = Math.max(0, Math.min(100, Math.round(f.confidence || 0)));
      forecasts[key] = { predicted: f.predicted, unit: f.unit, trend: f.trend, change: f.change, confidence, basis: f.basis };
      probabilities[key] = { confidence, probability: f.probability, range: f.rangeLow === null && f.rangeHigh === null ? null : { low: f.rangeLow, high: f.rangeHigh } };
      confs.push(confidence);
    }
    return {
      inputData: params.data === undefined ? null : params.data,
      predictionType: type,
      timeFrame: String(params.timeFrame || obj(params.data).timeFrame || '30days'),
      forecasts, probabilities,
      trends: parsed.trends || { overall: 'insufficient_data', significantChanges: [], emergingPatterns: [], seasonalTrends: [] },
      recommendations: parsed.recommendations || [],
      confidence: confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : 0,
      dataQuality: parsed.dataQuality || '',
      generatedAt: new Date().toISOString(),
    };
  },
};
