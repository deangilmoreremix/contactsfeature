const { withGetAuth } = require('./_getAuth');
const { CORS_HEADERS } = require('./_auth');
const personas = require('./_agents/personas.json');

/** GET -> { personas: [{ id, name, label, description, defaultTone }] } — all 30 outbound personas. */
exports.handler = withGetAuth(async () => ({
  statusCode: 200,
  headers: CORS_HEADERS,
  body: JSON.stringify({
    personas: personas.map(({ id, name, label, description, defaultTone }) => ({ id, name, label, description, defaultTone })),
  }),
}));
