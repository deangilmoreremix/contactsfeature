import type { Handler } from '@netlify/functions';
import { getContactAgentSettings, upsertContactAgentSettings } from '../../src/server/contactAgentSettings';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const contactId = event.queryStringParameters?.contactId;
      if (!contactId) return { statusCode: 400, body: 'Missing contactId' };
      const settings = await getContactAgentSettings(contactId);
      return { statusCode: 200, body: JSON.stringify(settings) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { contactId, personaId, followupMode, isEnabled } = body;

      if (!contactId || !personaId) {
        return { statusCode: 400, body: 'Missing required fields' };
      }

      await upsertContactAgentSettings({
        contactId,
        personaId,
        followupMode,
        isEnabled,
      });

      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('contact-agent-settings error', err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
