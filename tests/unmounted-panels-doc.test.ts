// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { UNMOUNTED } from './playwright/helpers/aiSweepControls';

const doc = readFileSync(resolve(__dirname, '../docs/UNMOUNTED_PANELS.md'), 'utf8');
const rows = [...doc.matchAll(/^\|\s*`([A-Za-z0-9_]+)`\s*\|(.*)$/gm)];
const docNames = rows.map((m) => m[1]!);

describe('docs/UNMOUNTED_PANELS.md', () => {
  it('lists exactly the panels in UNMOUNTED (aiSweepControls.ts)', () => {
    expect([...docNames].sort()).toEqual(UNMOUNTED.map((u) => u.name).sort());
    expect(new Set(docNames).size).toBe(docNames.length);
  });
  it('names every endpoint prefix and is linked from STREAMING.md', () => {
    for (const row of rows) expect(row[2]!.trim().length).toBeGreaterThan(5);
    expect(readFileSync(resolve(__dirname, '../docs/STREAMING.md'), 'utf8')).toContain('UNMOUNTED_PANELS.md');
    expect(doc).toContain('AIEnhancedContactCard');
    expect(doc).toMatch(/intentionally not mounted/);
  });
});
