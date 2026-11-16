/**
 * agent-runner — generic runner behind AgentButton.
 * POST { agentId | functionName, contactId?, dealId?, input? } (+ stream:true / Accept: text/event-stream)
 * Dispatches to an existing dual-mode agent function through a server-side allow-list (_lib/agentTargets.js); the
 * target's JSON or SSE answer is streamed straight through, so the caller sees the agent's own `result`.
 * Before delegating it verifies, for the CALLER, that the contact / deal exist and are theirs (404 otherwise) — some
 * targets (run-ae-agent) do not check ownership themselves. Agents without a runnable function answer 501.
 */
const { stream } = require('@netlify/functions');
const { authenticateRequest, CORS_HEADERS, errorResponse } = require('./_auth');
const { underRateLimit } = require('./_aiProxy');
const { isValidUUID } = require('./_validation');
const { isStreamRequested } = require('./_stream/dual');
const { resolveTarget, FUNCTIONS } = require('./_lib/agentTargets');
const { loadShimmed, invokeStreamed } = require('./_lib/invoke');
const { ownedContact, ownedDeal, TaskError } = require('./_lib/ctx');

function createHandler(deps = {}) {
  return async function handle(event, context) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    if (event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');

    const { user, error } = await (deps.authenticateRequest || authenticateRequest)(event);
    if (error) return error;

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return errorResponse(400, 'Invalid JSON body');

    const target = resolveTarget({ agentId: body.agentId, functionName: body.functionName });
    if (!target) return errorResponse(400, 'Unknown agent');
    if (target.unsupported) return errorResponse(501, 'This agent has no runnable server function yet.');

    let { contactId, dealId } = body;
    try {
      if (dealId !== undefined && dealId !== null && dealId !== '') {
        if (!isValidUUID(dealId)) return errorResponse(400, 'dealId must be a valid UUID');
        const deal = await (deps.ownedDeal || ownedDeal)(user, dealId);
        if (!contactId && deal.contact_id) contactId = deal.contact_id;
      } else dealId = undefined;
      if (contactId !== undefined && contactId !== null && contactId !== '') {
        if (!isValidUUID(contactId)) return errorResponse(400, 'contactId must be a valid UUID');
        await (deps.ownedContact || ownedContact)(user, contactId);
      } else contactId = undefined;
    } catch (err) {
      if (err instanceof TaskError) return errorResponse(err.status, err.message);
      return errorResponse(500, 'Could not verify the request');
    }
    if (!contactId && !dealId) return errorResponse(400, 'contactId or dealId is required');

    if (!(await (deps.underRateLimit || underRateLimit)(user.id))) return errorResponse(429, 'Too many AI requests. Please wait a moment.');

    const input = body.input && typeof body.input === 'object' && !Array.isArray(body.input) ? body.input : {};
    const delegateBody = { ...input, ...(contactId && { contactId }), ...(dealId && { dealId }), ...(isStreamRequested(event, body) && { stream: true }) };
    const delegateEvent = { ...event, body: JSON.stringify(delegateBody) };

    try {
      const mod = deps.loadTarget ? deps.loadTarget(target.name) : loadShimmed(target.name, FUNCTIONS[target.name]);
      return await (deps.invoke || invokeStreamed)(mod, delegateEvent, context);
    } catch (err) {
      console.error('agent-runner failed:', target.name, err && err.message);
      return errorResponse(502, 'The agent could not be started');
    }
  };
}

exports.createHandler = createHandler;
exports.handler = stream(createHandler());
