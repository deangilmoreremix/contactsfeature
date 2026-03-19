const { getUserClient } = require('./_supabaseClient');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Content-Type': 'application/json',
};

function errorResponse(statusCode, message) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: message }),
  };
}

async function authenticateRequest(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: errorResponse(401, 'Missing or invalid Authorization header') };
  }

  try {
    const userClient = getUserClient(authHeader);
    const { data: { user }, error } = await userClient.auth.getUser();

    if (error || !user) {
      return { user: null, error: errorResponse(401, 'Invalid or expired token') };
    }

    return { user, error: null };
  } catch {
    return { user: null, error: errorResponse(401, 'Authentication failed') };
  }
}

function withAuth(handler) {
  return async (event) => {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
      return errorResponse(405, 'Method not allowed');
    }

    const { user, error } = await authenticateRequest(event);
    if (error) return error;

    return handler(event, user);
  };
}

module.exports = { authenticateRequest, withAuth, CORS_HEADERS, errorResponse };
