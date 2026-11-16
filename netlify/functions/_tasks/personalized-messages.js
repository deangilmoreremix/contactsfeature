/** Exemplar task: personalised outreach message. Keeps { message, channel, generatedAt, contactId } from the old function. */
const { loadContact, describeContact } = require('./_ctx');

module.exports = {
  id: 'personalized-messages',
  role: 'default',
  effort: 'low',
  moderate: true, // outbound copy
  schema: {
    type: 'object',
    properties: {
      subject: { type: ['string', 'null'], description: 'subject line for email channel, else null' },
      message: { type: 'string', description: 'the message, ready to send' },
      personalizationNotes: { type: 'array', items: { type: 'string' }, description: 'which contact details were used' },
    },
  },
  async load({ user, params }) {
    return { contact: await loadContact(user, params) };
  },
  buildInput(ctx, params) {
    const c = params.context || {};
    const channel = String(params.channel || c.channel || 'email').slice(0, 30);
    return {
      instructions: 'You write short, human, specific outreach. Use only facts in the contact data; never invent achievements, mutual contacts or numbers. One clear call to action. No placeholders like [Name].',
      input: `Write a ${channel} message to this contact.\n\n${describeContact(ctx.contact)}\n\nSender: ${[c.senderName, c.senderCompany].filter(Boolean).join(' at ') || 'the user'}\nPurpose: ${c.purpose || 'start a conversation'}\nTone: ${c.tone || 'friendly, professional'}`,
    };
  },
  finalize(parsed, ctx, params) {
    return {
      message: parsed.message, subject: parsed.subject || null, channel: String(params.channel || (params.context && params.context.channel) || 'email'),
      personalizationNotes: parsed.personalizationNotes || [], generatedAt: new Date().toISOString(), contactId: ctx.contact.id || null,
    };
  },
  outboundText: (payload) => [payload.subject, payload.message],
};
