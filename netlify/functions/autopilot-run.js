const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { fetchWithTimeout } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('autopilot-run');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId } = body;
  const idErr = validateContactId(contactId);
  if (idErr) return errorResponse(400, idErr);

  const authHeader = event.headers?.authorization || event.headers?.Authorization;

  try {
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    const response = await fetchWithTimeout(
      `${baseUrl}/.netlify/functions/trigger-autopilot`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ contactId }),
      },
      30000
    );

    const result = await response.json();

    if (!response.ok) {
      log.warn('Autopilot trigger returned error', { contactId, status: response.status });
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify(result),
      };
    }

    log.info('Autopilot run completed', { contactId });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ contactId, result, message: 'Autopilot run completed' }),
    };
  } catch (error) {
    log.error('Autopilot run failed', { contactId, error: error.message });
    return errorResponse(500, 'Autopilot run failed');
  }
});
