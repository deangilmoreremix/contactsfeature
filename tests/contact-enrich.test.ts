// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

process.env['SUPABASE_URL'] = 'http://localhost:54321';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-key';
const require = createRequire(import.meta.url);
const { _internals } = require('../netlify/functions/contact-enrich.js');
const { buildParams } = require('../netlify/functions/_responses.js');

const found = {
  matched: true,
  confidence: 90,
  profile: { jobTitle: 'VP Sales', company: 'Acme', industry: 'SaaS', linkedinUrl: 'https://linkedin.com/in/x', website: 'javascript:alert(1)', businessPhone: null },
  company: { name: 'Acme', industry: 'SaaS' },
};

describe('contact-enrich', () => {
  it('only fills empty fields and never overwrites existing data', () => {
    const u = _internals.suggestUpdates(found, { title: 'Founder', company: '', industry: undefined });
    expect(u.title).toBeUndefined();
    expect(u.company).toBe('Acme');
    expect(u.industry).toBe('SaaS');
  });

  it('rejects non-http urls and merges social profiles', () => {
    const u = _internals.suggestUpdates(found, { socialProfiles: { twitter: 'https://x.com/y' } });
    expect(u.socialProfiles).toEqual({ twitter: 'https://x.com/y', linkedin: 'https://linkedin.com/in/x' });
  });

  it('suggests nothing for unmatched or low-confidence results', () => {
    expect(_internals.suggestUpdates({ ...found, matched: false }, {})).toEqual({});
    expect(_internals.suggestUpdates({ ...found, confidence: 40 }, {})).toEqual({});
  });

  it('builds a strict web_search request', () => {
    const p = buildParams({ role: 'thinking', input: 'x', schema: _internals.ENRICHMENT_SCHEMA, schemaName: 'contact_enrichment', tools: [{ type: 'web_search' }], toolChoice: 'required', background: true });
    expect(p.background).toBe(true);
    expect(p.store).toBe(true);
    expect(p.tool_choice).toBe('required');
    expect(p.text.format.schema.required).toContain('profile');
    expect(p.text.format.schema.properties.profile.additionalProperties).toBe(false);
    expect(p.include).toContain('web_search_call.action.sources');
  });

  it('includes identity clues in the prompt', () => {
    const c = _internals.clue({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@acme.com', company: 'Acme' });
    expect(c).toContain('Ada Lovelace');
    expect(c).toContain('domain: acme.com');
  });
});
