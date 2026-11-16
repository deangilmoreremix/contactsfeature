// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
import zlib from 'zlib';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test';
const require = createRequire(import.meta.url);
const d = require('../netlify/functions/document-analyze.js');

function crc32(buf: Buffer) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Build a tiny zip (deflate) in memory. */
function makeZip(files: Record<string, string>, method = 8) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name);
    const raw = Buffer.from(content);
    const data = method === 8 ? zlib.deflateRawSync(raw) : raw;
    const crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(method, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    const local = Buffer.concat([lh, nameBuf, data]);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(method, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([ch, nameBuf]));
    locals.push(local);
    offset += local.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(centrals.length, 8); eocd.writeUInt16LE(centrals.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

const DOC_XML =
  '<?xml version="1.0"?><w:document xmlns:w="x"><w:body>' +
  '<w:p><w:r><w:t>Hello</w:t></w:r><w:r><w:t xml:space="preserve"> World &amp; Co</w:t></w:r></w:p>' +
  '<w:p><w:r><w:t>Line</w:t><w:tab/><w:t>two</w:t><w:br/><w:t>wrapped</w:t></w:r></w:p>' +
  '<w:p><w:pPr/></w:p><w:p><w:r><w:t>&#169; 2026 &lt;done&gt;</w:t></w:r></w:p>' +
  '</w:body></w:document>';

describe('docx extraction', () => {
  it('extracts paragraphs, tabs, breaks and entities from a generated docx', () => {
    const docx = makeZip({ '[Content_Types].xml': '<x/>', 'word/document.xml': DOC_XML });
    expect(d.extractDocxText(docx)).toBe('Hello World & Co\nLine\ttwo\nwrapped\n\n© 2026 <done>');
  });

  it('works with stored (uncompressed) entries', () => {
    const docx = makeZip({ 'word/document.xml': DOC_XML }, 0);
    expect(d.extractDocxText(docx)).toContain('Hello World & Co');
  });

  it('rejects non-zip data and zips without document.xml', () => {
    expect(() => d.extractDocxText(Buffer.from('not a zip at all, definitely not'))).toThrow(/valid zip/);
    expect(() => d.extractDocxText(makeZip({ 'other.xml': '<x/>' }))).toThrow(/Word/);
  });
});

describe('detectKind', () => {
  it('maps extension and mime', () => {
    expect(d.detectKind('a.PDF', '')).toBe('pdf');
    expect(d.detectKind('a.docx', '')).toBe('docx');
    expect(d.detectKind('x', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
    expect(d.detectKind('notes.txt', 'text/plain')).toBe('text');
    expect(d.detectKind('a.exe', 'application/octet-stream')).toBeNull();
  });
});

describe('storage-path flow', () => {
  const UID = '11111111-1111-1111-1111-111111111111';
  const mk = (over: Record<string, unknown> = {}) => {
    const remove = vi.fn(async () => ({ error: null }));
    const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: 'https://x.supabase.co/storage/v1/object/sign/contact-documents/a.pdf?token=t' }, error: null }));
    const download = vi.fn(async () => ({ data: new Blob([Buffer.from('Hello team. Next steps: send quote.')]), error: null }));
    const from = vi.fn(() => ({ remove, createSignedUrl, download }));
    const createResponse = vi.fn(async () => ({
      json: { documentType: 'note', summary: 's', keyPoints: ['k'], actionItems: [], sentiment: 'neutral', confidence: 80 },
      response: { model: 'm' },
    }));
    const handler = d.createHandler({ supabase: { storage: { from } }, createResponse, ...over });
    return { handler, remove, createSignedUrl, download, from, createResponse };
  };
  const send = (handler: any, body: unknown, id = UID) =>
    handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }, { id });
  it('isOwnedPath accepts only the caller uid prefix without traversal', () => {
    expect(d.isOwnedPath(`${UID}/abc/f.pdf`, UID)).toBe(true);
    expect(d.isOwnedPath(`other/abc/f.pdf`, UID)).toBe(false);
    expect(d.isOwnedPath(`${UID}/../other/f.pdf`, UID)).toBe(false);
    expect(d.isOwnedPath(`${UID}//f.pdf`, UID)).toBe(false);
    expect(d.isOwnedPath(`${UID}`, UID)).toBe(false);
  });

  it("rejects another user's storage path before touching storage or OpenAI", async () => {
    const m = mk();
    const res = await send(m.handler, { storagePath: 'someone-else/abc/f.pdf', filename: 'f.pdf' });
    expect(res.statusCode).toBe(403);
    expect(m.from).not.toHaveBeenCalled();
    expect(m.createResponse).not.toHaveBeenCalled();
  });

  it('passes a signed URL to OpenAI as input_file.file_url for PDFs and deletes the object', async () => {
    const m = mk();
    const path = `${UID}/abc/report.pdf`;
    const res = await send(m.handler, { storagePath: path, filename: 'report.pdf', mimeType: 'application/pdf' });
    expect(res.statusCode).toBe(200);
    expect(m.createSignedUrl).toHaveBeenCalledWith(path, expect.any(Number));
    const input = m.createResponse.mock.calls[0][0].input;
    expect(input[0].content[0]).toEqual({ type: 'input_file', file_url: expect.stringContaining('token=t') });
    expect(JSON.parse(res.body).data.extraction).toBe('openai-input-file');
    expect(m.remove).toHaveBeenCalledWith([path]);
  });

  it('keeps the object when keep:true', async () => {
    const m = mk();
    await send(m.handler, { storagePath: `${UID}/abc/report.pdf`, filename: 'report.pdf', keep: true });
    expect(m.remove).not.toHaveBeenCalled();
  });

  it('downloads text files server-side and extracts them', async () => {
    const m = mk();
    const res = await send(m.handler, { storagePath: `${UID}/abc/notes.txt`, filename: 'notes.txt' });
    expect(res.statusCode).toBe(200);
    expect(m.download).toHaveBeenCalled();
    expect(m.createResponse.mock.calls[0][0].input).toContain('Hello team');
    expect(m.remove).toHaveBeenCalled();
  });

  it('reports a missing upload honestly and still cleans up', async () => {
    const m = mk({});
    m.createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'nf' } } as any);
    const res = await send(m.handler, { storagePath: `${UID}/abc/report.pdf`, filename: 'report.pdf' });
    expect(res.statusCode).toBe(404);
  });

  it('still accepts the legacy base64 request', async () => {
    const m = mk();
    const res = await send(m.handler, { fileName: 'a.txt', dataBase64: Buffer.from('hi there').toString('base64') });
    expect(res.statusCode).toBe(200);
    expect(m.from).not.toHaveBeenCalled();
  });
});
