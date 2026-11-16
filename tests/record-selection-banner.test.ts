// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { bannerMessage, computeSelectionBanner, resolveAllMatchingIds, stillAllMatching } from '../src/lib/records/selection';

const matching = ['a', 'b', 'c', 'd', 'e'];

describe('select-all-matching banner', () => {
  it('stays hidden with nothing selected, an empty list, or a partial visible selection', () => {
    expect(computeSelectionBanner({ visibleIds: ['a', 'b'], matchingIds: matching, selectedIds: [], allMatching: false }).kind).toBe('none');
    expect(computeSelectionBanner({ visibleIds: [], matchingIds: [], selectedIds: ['a'], allMatching: false }).kind).toBe('none');
    expect(computeSelectionBanner({ visibleIds: ['a', 'b'], matchingIds: matching, selectedIds: ['a'], allMatching: false }).kind).toBe('none');
  });
  it('offers select-all when every visible row is selected but more rows match', () => {
    const b = computeSelectionBanner({ visibleIds: ['a', 'b'], matchingIds: matching, selectedIds: new Set(['a', 'b']), allMatching: false });
    expect(b).toEqual({ kind: 'offer', visibleCount: 2, matchingCount: 5 });
    expect(bannerMessage(b)).toBe('All 2 visible selected.');
  });
  it('does not offer when visible equals matching (nothing more to select)', () => {
    expect(computeSelectionBanner({ visibleIds: matching, matchingIds: matching, selectedIds: matching, allMatching: false }).kind).toBe('none');
  });
  it('shows the all-matching state only after the user opted in', () => {
    const b = computeSelectionBanner({ visibleIds: ['a'], matchingIds: matching, selectedIds: matching, allMatching: true });
    expect(b).toEqual({ kind: 'all', matchingCount: 5 });
    expect(bannerMessage(b)).toBe('All 5 matching contacts selected.');
  });
  it('drops the all-matching banner when a row is deselected', () => {
    const sel = new Set(matching);
    sel.delete('c');
    expect(computeSelectionBanner({ visibleIds: ['a'], matchingIds: matching, selectedIds: sel, allMatching: true }).kind).toBe('none');
    expect(stillAllMatching(matching, sel)).toBe(false);
    expect(stillAllMatching(matching, new Set(matching))).toBe(true);
    expect(stillAllMatching([], new Set())).toBe(false);
  });
  it('resolves ids for the bulk action without duplicates', () => {
    expect(resolveAllMatchingIds(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });
  it('ignores selected ids that are not in the filtered list', () => {
    const b = computeSelectionBanner({ visibleIds: ['a', 'b'], matchingIds: ['a', 'b', 'c'], selectedIds: ['a', 'b', 'zzz'], allMatching: false });
    expect(b.kind).toBe('offer');
  });
});
