// Test fixture: same export shape as the real agent functions (stream(withAuth(...))), minus auth/DB.
const { stream } = require('@netlify/functions');
const { Readable } = require('stream');

exports.handler = stream(async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: '{"error":"no"}' };
  const frames = ['data: {"type":"delta","text":"hi"}\n\n', 'data: {"type":"result","data":{"ok":true}}\n\n', 'data: [DONE]\n\n'];
  return { statusCode: 200, headers: { 'Content-Type': 'text/event-stream' }, body: Readable.from(frames) };
});
