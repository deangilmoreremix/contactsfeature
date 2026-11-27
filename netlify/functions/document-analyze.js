/**
 * Document analysis: extract text (TXT/MD/CSV, DOCX) or hand the PDF straight to OpenAI as a Responses
 * `input_file`, then return a strict-schema summary.
 *
 * Two request shapes:
 *  1. Storage path (preferred, up to 25 MB):
 *     POST { storagePath: '<uid>/<uuid>/<filename>', filename?, mimeType?, keep?: boolean, context? }
 *     The browser uploads straight to the private `contact-documents` bucket first (no Netlify body limit).
 *     The path must start with the caller's uid. For PDFs a short-lived signed URL is passed to OpenAI as
 *     `{ type: 'input_file', file_url }`; DOCX/TXT/MD/CSV bytes are downloaded server-side and run through
 *     the extraction code below. The stored object is deleted afterwards unless `keep: true`.
 *  2. Legacy inline (small files only):
 *     POST { fileName, mimeType?, dataBase64, context?: { contactName?, companyName? } }
 *     Limit 10 MB decoded, but Netlify rejects request bodies above ~6 MB, so in practice ~4.5 MB.
 *
 * Dual mode: same URL returns JSON, or SSE (Accept: text/event-stream / body.stream:true) with `partial` events that
 * fill documentType/summary/keyPoints/actionItems live and a final `result` event = the JSON payload. In stream mode the
 * stored object is deleted when the stream ends (it must outlive the model call), exactly once.
 *
 * DOCX is read with Node built-ins only (minimal zip central-directory reader + zlib inflateRaw).
 */
const zlib = require('zlib');
const { stream } = require('@netlify/functions');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { createResponse } = require('./_responses');
const { runDual, isStreamRequested } = require('./_stream/dual');

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_STORAGE_BYTES = 25 * 1024 * 1024;
const BUCKET = 'contact-documents';
const SIGNED_URL_TTL_SECONDS = 10 * 60;
const MAX_INFLATED = 25 * 1024 * 1024;
const MAX_TEXT_CHARS = 120000;

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    documentType: { type: 'string', description: 'e.g. proposal, contract, meeting notes, resume, invoice, other' },
    summary: { type: 'string', description: '2-5 sentence summary' },
    keyPoints: { type: 'array', items: { type: 'string' } },
    actionItems: { type: 'array', items: { type: 'string' } },
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    confidence: { type: 'number', description: '0-100 confidence that the summary is faithful and complete' },
  },
};

// ---------------------------------------------------------------- zip / docx
function findEocd(buf) {
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

/** Return the (decompressed) bytes of one entry of a zip buffer, or null if absent. */
function readZipEntry(buf, wanted) {
  const eocd = findEocd(buf);
  if (eocd < 0) throw new Error('Not a valid zip/DOCX file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || p === 0xffffffff) throw new Error('Zip64 archives are not supported');
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Corrupt zip directory');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name !== wanted) continue;
    if (localOff + 30 > buf.length || buf.readUInt32LE(localOff) !== 0x04034b50) throw new Error('Corrupt zip entry');
    const dataStart = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
    const raw = buf.subarray(dataStart, dataStart + csize);
    if (method === 0) return Buffer.from(raw);
    if (method === 8) return zlib.inflateRawSync(raw, { maxOutputLength: MAX_INFLATED });
    throw new Error(`Unsupported zip compression method ${method}`);
  }
  return null;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decodeXml(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Plain text of a WordprocessingML document.xml string (paragraphs separated by newlines). */
function wordXmlToText(xml) {
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:(?:br|cr)\b[^>]*\/>|<\/w:p>/g;
  let out = '';
  let m;
  while ((m = re.exec(xml))) {
    if (m[1] !== undefined) out += decodeXml(m[1]);
    else if (m[0].startsWith('<w:tab')) out += '\t';
    else out += '\n';
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

function extractDocxText(buf) {
  const xml = readZipEntry(buf, 'word/document.xml');
  if (!xml) throw new Error('This file does not look like a Word (.docx) document');
  return wordXmlToText(xml.toString('utf8'));
}

// ---------------------------------------------------------------- type detection
function detectKind(fileName, mimeType) {
  const ext = String(fileName || '').toLowerCase().split('.').pop();
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.includes('wordprocessingml') || ext === 'docx') return 'docx';
  if (mime.startsWith('text/') || ['txt', 'md', 'csv', 'log', 'json'].includes(ext)) return 'text';
  return null;
}

const wordCount = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** True when `path` is `<uid>/…` with no traversal or empty segments. */
function isOwnedPath(path, userId) {
  if (typeof path !== 'string' || !userId || path.length > 512) return false;
  const parts = path.split('/');
  if (parts.length < 2 || parts[0] !== userId) return false;
  return parts.every((p) => p && p !== '.' && p !== '..') && !path.includes('\\') && !/[\u0000-\u001f]/.test(path);
}

function createHandler(deps = {}) {
  const getSupabase = () => deps.supabase || require('./_supabaseClient').supabase;
  const create = deps.createResponse || createResponse;

  return async function handle(event, user) {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }
  const { mimeType, dataBase64, context, storagePath } = body;
  const fileName = typeof body.fileName === 'string' && body.fileName ? body.fileName
    : typeof body.filename === 'string' ? body.filename : '';
  const usingStorage = storagePath !== undefined;

  let buf = null;       // bytes (inline upload, or downloaded for non-PDF storage files)
  let signedUrl = null; // PDF via storage
  let kind;

  if (usingStorage) {
    if (!isOwnedPath(storagePath, user.id)) return errorResponse(403, 'You do not have access to this file');
    const name = fileName || storagePath.split('/').pop();
    kind = detectKind(name, mimeType);
    if (!kind) return errorResponse(415, 'Unsupported file type. Use PDF, DOCX or plain text.');
    body.__name = name;
  } else {
    if (typeof dataBase64 !== 'string' || !dataBase64) return errorResponse(400, 'dataBase64 or storagePath is required');
    if (!fileName) return errorResponse(400, 'fileName is required');
    // 4 base64 chars -> 3 bytes; reject before decoding anything large
    if (Math.floor((dataBase64.length * 3) / 4) > MAX_BYTES) return errorResponse(413, 'File is larger than the 10 MB limit');
    buf = Buffer.from(dataBase64.replace(/^data:[^,]*,/, ''), 'base64');
    if (buf.length === 0) return errorResponse(400, 'File is empty');
    if (buf.length > MAX_BYTES) return errorResponse(413, 'File is larger than the 10 MB limit');
    kind = detectKind(fileName, mimeType);
    if (!kind) return errorResponse(415, 'Unsupported file type. Use PDF, DOCX or plain text.');
    body.__name = fileName;
  }
  const displayName = body.__name;

  let cleaned = false;
  const cleanup = async () => {
    if (cleaned || !usingStorage || body.keep === true) return;
    cleaned = true;
    try { await getSupabase().storage.from(BUCKET).remove([storagePath]); }
    catch (e) { console.error('document-analyze cleanup failed:', e && e.message); }
  };
  let deferCleanup = false; // stream mode: the stream's onEnd deletes the object

  try {
    if (usingStorage) {
      const storage = getSupabase().storage.from(BUCKET);
      if (kind === 'pdf') {
        const { data, error } = await storage.createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
        if (error || !data || !data.signedUrl) return errorResponse(404, 'Uploaded file not found. Please upload it again.');
        signedUrl = data.signedUrl;
      } else {
        const { data, error } = await storage.download(storagePath);
        if (error || !data) return errorResponse(404, 'Uploaded file not found. Please upload it again.');
        const ab = await data.arrayBuffer();
        if (ab.byteLength > MAX_STORAGE_BYTES) return errorResponse(413, 'File is larger than the 25 MB limit');
        buf = Buffer.from(ab);
        if (buf.length === 0) return errorResponse(400, 'File is empty');
      }
    }
    return await analyse();
  } finally {
    if (!deferCleanup) await cleanup();
  }

  async function analyse() {
  const ctx = [context?.contactName && `Contact: ${context.contactName}`, context?.companyName && `Company: ${context.companyName}`].filter(Boolean).join('; ');
  const instructions =
    'You summarise business documents for a CRM user. Use ONLY what is in the document; never invent facts, names, numbers or dates. ' +
    'If the document is empty, unreadable or mostly images, say so in the summary and set confidence below 30. ' +
    (ctx ? `Context about who this is for: ${ctx}.` : '');

  let input;
  let words = 0;
  let truncated = false;
  try {
    if (kind === 'pdf') {
      let filePart;
      if (signedUrl) {
        filePart = { type: 'input_file', file_url: signedUrl };
      } else {
        if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') return errorResponse(400, 'File is not a valid PDF');
        filePart = { type: 'input_file', filename: displayName.slice(0, 120), file_data: `data:application/pdf;base64,${buf.toString('base64')}` };
      }
      input = [{ role: 'user', content: [filePart, { type: 'input_text', text: 'Summarise this document.' }] }];
    } else {
      let text = kind === 'docx' ? extractDocxText(buf) : buf.toString('utf8');
      text = text.replace(/\u0000/g, '').trim();
      if (!text) return errorResponse(422, 'No readable text found in this document');
      words = wordCount(text);
      if (text.length > MAX_TEXT_CHARS) { text = text.slice(0, MAX_TEXT_CHARS); truncated = true; }
      input = `Document "${displayName}"${truncated ? ' (truncated to the first part)' : ''}:\n\n${text}`;
    }
  } catch (err) {
    return errorResponse(422, `Could not read this file: ${err.message}`);
  }

  const options = {
    role: 'default',
    effort: 'low',
    schemaName: 'document_summary',
    schema: SUMMARY_SCHEMA,
    instructions,
    input,
    user: user.id,
    store: false,
  };
  const buildData = (j, model) => ({
    documentType: String(j.documentType || 'other'),
    summary: String(j.summary || ''),
    keyPoints: (j.keyPoints || []).map(String).slice(0, 12),
    actionItems: (j.actionItems || []).map(String).slice(0, 12),
    sentiment: ['positive', 'neutral', 'negative'].includes(j.sentiment) ? j.sentiment : 'neutral',
    confidence: Math.round(Math.min(100, Math.max(0, Number(j.confidence) || 0))),
    wordCount: words || null,
    truncated,
    extraction: kind === 'pdf' ? 'openai-input-file' : kind === 'docx' ? 'docx-xml' : 'plain-text',
    model: model || null,
  });

  try {
    if (isStreamRequested(event, body)) {
      deferCleanup = true;
      const finalize = (text, r) => {
        let j = r && r.json;
        if (!j) { try { j = JSON.parse(text); } catch { j = null; } }
        if (!j) throw new Error('Model returned no structured output');
        return { success: true, data: buildData(j, (r && r.response && r.response.model) || null) };
      };
      return await runDual({
        event, body, options, finalize, deps: deps.dual,
        onEnd: cleanup,
      });
    }
    const out = await create(options);
    if (!out.json) throw new Error('Model returned no structured output');
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, data: buildData(out.json, out.response && out.response.model) }),
    };
  } catch (err) {
    console.error('document-analyze failed:', err && err.message);
    if (deferCleanup) await cleanup(); // the stream never started
    if (signedUrl && err && err.status === 400) return errorResponse(422, 'The AI service could not read this PDF. It may be encrypted, corrupted or too large.');
    return errorResponse(502, 'AI document analysis is unavailable right now. Please try again.');
  }
  }
  };
}

const handler = stream(withAuth(createHandler()));

module.exports = { handler, createHandler, isOwnedPath, MAX_STORAGE_BYTES, BUCKET, extractDocxText, readZipEntry, wordXmlToText, detectKind, SUMMARY_SCHEMA, MAX_BYTES };
