import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('supabase/functions/_shared/openai.ts model map', () => {
  const root = resolve(__dirname, '..');
  const models = JSON.parse(readFileSync(resolve(root, 'src/config/models.json'), 'utf8'));
  const source = readFileSync(resolve(root, 'supabase/functions/_shared/openai.ts'), 'utf8');

  const block = source.match(/MODEL_ROLES[^=]*=\s*\{([\s\S]*?)\n\};/);

  it('declares a MODEL_ROLES map', () => {
    expect(block).not.toBeNull();
  });

  it('matches role -> model/effort in src/config/models.json', () => {
    const entries = [...(block?.[1] ?? '').matchAll(/(\w+):\s*\{\s*model:\s*"([^"]+)",\s*effort:\s*"([^"]+)"\s*\}/g)];
    const map = Object.fromEntries(entries.map((m) => [m[1], { model: m[2], effort: m[3] }]));
    expect(Object.keys(map).sort()).toEqual(Object.keys(models.text).sort());
    for (const role of Object.keys(models.text)) {
      expect(map[role]).toEqual(models.text[role]);
    }
  });

  it('uses the Responses API only', () => {
    expect(source).toContain('/v1/responses');
    expect(source).not.toMatch(/chat\/completions|max_tokens/);
  });
});
