/**
 * Pure logic for the "Select all N matching" banner (Twenty-style).
 *
 * "visible" = rows currently rendered (e.g. excluding collapsed groups); "matching" = every contact the
 * active search / filters return. The Contacts lists are not paginated, so the two only differ when rows
 * are hidden (collapsed groups). The helpers work for any pagination/virtualisation too.
 */
export type SelectionBanner =
  | { kind: 'none' }
  /** Every visible row is selected but more rows match: offer "Select all M matching". */
  | { kind: 'offer'; visibleCount: number; matchingCount: number }
  /** All matching rows are selected via the banner: offer "Clear selection". */
  | { kind: 'all'; matchingCount: number };

export interface SelectionBannerInput {
  visibleIds: readonly string[];
  matchingIds: readonly string[];
  selectedIds: Iterable<string>;
  /** True after the user clicked "Select all M matching". */
  allMatching: boolean;
}

export function countSelectedMatching(matchingIds: readonly string[], selected: ReadonlySet<string>): number {
  let n = 0;
  for (const id of matchingIds) if (selected.has(id)) n++;
  return n;
}

export function computeSelectionBanner(input: SelectionBannerInput): SelectionBanner {
  const selected = input.selectedIds instanceof Set ? (input.selectedIds as Set<string>) : new Set(input.selectedIds);
  const matching = input.matchingIds;
  if (matching.length === 0 || selected.size === 0) return { kind: 'none' };
  const selectedMatching = countSelectedMatching(matching, selected);
  if (selectedMatching === matching.length) {
    return input.allMatching ? { kind: 'all', matchingCount: matching.length } : { kind: 'none' };
  }
  if (input.allMatching) return { kind: 'none' };
  const visible = input.visibleIds;
  if (visible.length > 0 && visible.every((id) => selected.has(id))) {
    return { kind: 'offer', visibleCount: visible.length, matchingCount: matching.length };
  }
  return { kind: 'none' };
}

/** Banner text, e.g. "All 25 visible selected." / "All 120 matching contacts selected." */
export function bannerMessage(banner: SelectionBanner): string {
  if (banner.kind === 'offer') return `All ${banner.visibleCount} visible selected.`;
  if (banner.kind === 'all') return `All ${banner.matchingCount} matching contacts selected.`;
  return '';
}

/** Ids to act on in "all matching" mode: the current matching list (kept in sync with filters). */
export function resolveAllMatchingIds(matchingIds: readonly string[]): string[] {
  return Array.from(new Set(matchingIds));
}

/** All-matching mode is only valid while the selection still equals the matching set. */
export function stillAllMatching(matchingIds: readonly string[], selected: ReadonlySet<string>): boolean {
  return matchingIds.length > 0 && countSelectedMatching(matchingIds, selected) === matchingIds.length;
}
