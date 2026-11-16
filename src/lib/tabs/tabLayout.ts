/** Show / hide / reorder the contact detail tabs. Pure reducer; persistence lives in useContactTabLayout. */
export interface TabLayout {
  /** Tab ids in display order. */
  order: string[];
  /** Hidden tab ids (never contains a locked tab). */
  hidden: string[];
}

/** Tabs that can never be hidden. */
export const LOCKED_TAB_IDS: readonly string[] = ['overview', 'activity'];

export type TabLayoutAction =
  | { type: 'toggle'; id: string }
  | { type: 'move'; id: string; direction: -1 | 1 }
  | { type: 'reset' };

export const defaultTabLayout = (allIds: readonly string[]): TabLayout => ({ order: [...allIds], hidden: [] });

/** Drop unknown ids, append tabs added since the layout was saved, and un-hide locked tabs. */
export function normalizeTabLayout(layout: Partial<TabLayout> | null | undefined, allIds: readonly string[]): TabLayout {
  const known = new Set(allIds);
  const order: string[] = [];
  for (const id of layout?.order ?? []) if (known.has(id) && !order.includes(id)) order.push(id);
  for (const id of allIds) if (!order.includes(id)) order.push(id);
  const hidden = (layout?.hidden ?? []).filter((id, i, a) => known.has(id) && !LOCKED_TAB_IDS.includes(id) && a.indexOf(id) === i);
  return { order, hidden };
}

export function tabLayoutReducer(state: TabLayout, action: TabLayoutAction, allIds: readonly string[]): TabLayout {
  const current = normalizeTabLayout(state, allIds);
  switch (action.type) {
    case 'toggle': {
      if (LOCKED_TAB_IDS.includes(action.id) || !allIds.includes(action.id)) return current;
      const hidden = current.hidden.includes(action.id)
        ? current.hidden.filter((id) => id !== action.id)
        : [...current.hidden, action.id];
      return { ...current, hidden };
    }
    case 'move': {
      const i = current.order.indexOf(action.id);
      const j = i + action.direction;
      if (i === -1 || j < 0 || j >= current.order.length) return current;
      const order = current.order.slice();
      [order[i], order[j]] = [order[j]!, order[i]!];
      return { ...current, order };
    }
    case 'reset':
      return defaultTabLayout(allIds);
  }
}

/** Tabs in layout order, without hidden ones. */
export function resolveVisibleTabs<T extends { id: string }>(tabs: readonly T[], layout: TabLayout): T[] {
  const normalized = normalizeTabLayout(layout, tabs.map((t) => t.id));
  const byId = new Map(tabs.map((t) => [t.id, t]));
  return normalized.order.filter((id) => !normalized.hidden.includes(id)).map((id) => byId.get(id)!);
}

/** All tabs in layout order (used by the customize popover, which also lists hidden tabs). */
export function resolveOrderedTabs<T extends { id: string }>(tabs: readonly T[], layout: TabLayout): T[] {
  const normalized = normalizeTabLayout(layout, tabs.map((t) => t.id));
  const byId = new Map(tabs.map((t) => [t.id, t]));
  return normalized.order.map((id) => byId.get(id)!);
}
