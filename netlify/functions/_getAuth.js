/** Auth helper for GET endpoints (withAuth in _auth.js is POST-only). */
const { authenticateRequest, CORS_HEADERS, errorResponse } = require('./_auth');

function withGetAuth(handler) {
  return async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    if (event.httpMethod !== 'GET') return errorResponse(405, 'Method not allowed');
    const { user, error } = await authenticateRequest(event);
    if (error) return error;
    return handler(event, user);
  };
}

module.exports = { withGetAuth };
