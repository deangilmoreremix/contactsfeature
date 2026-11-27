/**
 * Action registry for the contact command menu (Ctrl/Cmd+K) plus the ranking used to filter it.
 * Pure: the registry only describes commands; the detail view decides how each id is executed.
 * (Idea of a record-level command menu from Twenty's command-menu-item module; implemented from scratch.)
 */
export type ContactCommandSection = 'Record' | 'Navigate' | 'Recent' | 'Go to tab' | 'Help';

export type ContactCommandId =
  | 'edit' | 'favorite' | 'duplicate' | 'export-csv' | 'export-json' | 'export-vcard' | 'export-ics' | 'copy-link' | 'merge'
  | 'company' | 'delete' | 'restore' | 'destroy' | 'prev' | 'next' | 'shortcuts' | 'customize-tabs'
  /** Not listed in the palette itself; used by the overflow menu to open it. */
  | 'palette'
  | `tab:${string}`
  /** A recently viewed contact: `recent:<contactId>`. */
  | `recent:${string}`;

export interface ContactCommand {
  id: ContactCommandId;
  title: string;
  section: ContactCommandSection;
  keywords: string[];
  /** Display-only hint, e.g. "J". */
  shortcut?: string | undefined;
  danger?: boolean;
}

export interface ContactCommandContext {
  isDeleted: boolean;
  isFavorite: boolean;
  canPrev: boolean;
  canNext: boolean;
  tabs: ReadonlyArray<{ id: string; label: string }>;
  activeTab?: string;
  /** Recently viewed contacts (most recent first); the open contact should already be excluded. */
  recent?: ReadonlyArray<{ id: string; name: string; company?: string | undefined }>;
  /** The open contact's company name; adds a "View company" command when present. */
  company?: string | undefined;
}

export function buildContactCommands(ctx: ContactCommandContext): ContactCommand[] {
  const commands: ContactCommand[] = [];
  if (ctx.isDeleted) {
    commands.push(
      { id: 'restore', title: 'Restore record', section: 'Record', keywords: ['undelete', 'recover', 'trash', 'deleted'] },
      { id: 'destroy', title: 'Delete permanently', section: 'Record', keywords: ['destroy', 'remove', 'erase', 'trash'], danger: true },
    );
  } else {
    commands.push(
      { id: 'edit', title: 'Edit contact', section: 'Record', keywords: ['change', 'update', 'modify'], shortcut: 'E' },
      {
        id: 'favorite',
        title: ctx.isFavorite ? 'Remove from favorites' : 'Add to favorites',
        section: 'Record',
        keywords: ['favourite', 'star', 'pin', 'heart'],
        shortcut: 'F',
      },
      { id: 'duplicate', title: 'Duplicate record', section: 'Record', keywords: ['copy', 'clone'] },
      { id: 'merge', title: 'Merge with…', section: 'Record', keywords: ['duplicates', 'combine', 'dedupe'] },
    );
  }
  commands.push(
    { id: 'export-csv', title: 'Export as CSV', section: 'Record', keywords: ['download', 'spreadsheet'] },
    { id: 'export-json', title: 'Export as JSON', section: 'Record', keywords: ['download', 'data'] },
    { id: 'export-vcard', title: 'Export as vCard', section: 'Record', keywords: ['download', 'vcf', 'address book', 'contact card'] },
    { id: 'export-ics', title: 'Export calendar (.ics)', section: 'Record', keywords: ['download', 'ical', 'meetings', 'events', 'calendar'] },
    { id: 'copy-link', title: 'Copy link to record', section: 'Record', keywords: ['url', 'share', 'deep link', 'permalink'] },
  );
  if (ctx.company && ctx.company.trim()) {
    commands.push({ id: 'company', title: `View company: ${ctx.company.trim()}`, section: 'Record', keywords: ['organization', 'account', 'people', 'colleagues'] });
  }
  if (!ctx.isDeleted) {
    commands.push({ id: 'delete', title: 'Delete record', section: 'Record', keywords: ['remove', 'trash', 'bin'], danger: true });
  }
  if (ctx.canPrev) commands.push({ id: 'prev', title: 'Previous record', section: 'Navigate', keywords: ['back', 'up'], shortcut: 'K' });
  if (ctx.canNext) commands.push({ id: 'next', title: 'Next record', section: 'Navigate', keywords: ['forward', 'down'], shortcut: 'J' });
  for (const r of ctx.recent ?? []) {
    commands.push({
      id: `recent:${r.id}`,
      title: r.name || 'Unnamed contact',
      section: 'Recent',
      keywords: ['recent', 'recently viewed', 'open', ...(r.company ? [r.company] : [])],
    });
  }
  ctx.tabs.forEach((tab, i) => {
    if (tab.id === ctx.activeTab) return;
    commands.push({
      id: `tab:${tab.id}`,
      title: `Go to ${tab.label}`,
      section: 'Go to tab',
      keywords: ['tab', 'open', tab.label],
      shortcut: i < 9 ? String(i + 1) : undefined,
    });
  });
  commands.push(
    { id: 'customize-tabs', title: 'Customize tabs', section: 'Help', keywords: ['layout', 'show', 'hide', 'reorder'] },
    { id: 'shortcuts', title: 'Keyboard shortcuts', section: 'Help', keywords: ['help', 'keys', 'hotkeys'], shortcut: '?' },
  );
  return commands;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) if (ch === needle[i] && ++i === needle.length) return true;
  return needle.length === 0;
}

/** Score one query token against a command (0 = no match). */
function scoreToken(cmd: ContactCommand, token: string): number {
  const title = norm(cmd.title);
  if (title === token) return 100;
  if (title.startsWith(token)) return 80;
  if (title.split(/[\s…]+/).some((w) => w.startsWith(token))) return 60;
  if (title.includes(token)) return 40;
  if (cmd.keywords.some((k) => norm(k).startsWith(token))) return 30;
  if (cmd.keywords.some((k) => norm(k).includes(token))) return 20;
  if (token.length >= 3 && isSubsequence(token, title.replace(/\s+/g, ''))) return 10;
  return 0;
}

export function scoreCommand(cmd: ContactCommand, query: string): number {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  let total = 0;
  for (const token of tokens) {
    const s = scoreToken(cmd, token);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}

/** Commands matching `query`, best match first (ties keep registry order). Empty query returns everything. */
export function filterCommands(commands: readonly ContactCommand[], query: string): ContactCommand[] {
  if (!query.trim()) return [...commands];
  return commands
    .map((cmd, index) => ({ cmd, index, score: scoreCommand(cmd, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.cmd);
}
