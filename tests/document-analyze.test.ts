// @vitest-environment node
import { describe, it, expect } from 'vitest';
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
