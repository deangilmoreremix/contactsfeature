/** Keyboard shortcuts of the contact detail view (pure, so they can be unit tested). */
export type ContactShortcutAction =
  | { type: 'palette' }
  | { type: 'help' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'edit' }
  | { type: 'favorite' }
  | { type: 'tab'; index: number };

export interface KeyLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface TargetLike {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
}

const NON_TEXT_INPUTS = ['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'];

/** True while the user is typing (text input, textarea, select, contenteditable): single-key shortcuts must not fire. */
export function isTypingTarget(target: TargetLike | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = (target.tagName ?? '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !NON_TEXT_INPUTS.includes((target.type ?? 'text').toLowerCase());
  return false;
}

/** Map a key event to a shortcut action. Ctrl/Cmd+K works while typing; everything else does not. */
export function resolveContactShortcut(e: KeyLike, target: TargetLike | null | undefined): ContactShortcutAction | null {
  const mod = !!(e.ctrlKey || e.metaKey);
  const key = e.key;
  if (mod && !e.altKey && key.toLowerCase() === 'k') return { type: 'palette' };
  if (mod || e.altKey) return null;
  if (isTypingTarget(target)) return null;
  if (key === '?') return { type: 'help' };
  if (e.shiftKey) return null;
  switch (key.toLowerCase()) {
    case 'j': return { type: 'next' };
    case 'k': return { type: 'prev' };
    case 'e': return { type: 'edit' };
    case 'f': return { type: 'favorite' };
  }
  if (/^[1-9]$/.test(key)) return { type: 'tab', index: Number(key) - 1 };
  return null;
}

export const CONTACT_SHORTCUT_LIST: ReadonlyArray<{ keys: string[]; label: string }> = [
  { keys: ['Ctrl/⌘', 'K'], label: 'Open the command menu' },
  { keys: ['J'], label: 'Next record' },
  { keys: ['K'], label: 'Previous record' },
  { keys: ['E'], label: 'Edit contact' },
  { keys: ['F'], label: 'Toggle favorite' },
  { keys: ['1', '–', '9'], label: 'Go to the 1st – 9th tab' },
  { keys: ['?'], label: 'Show this help' },
  { keys: ['Esc'], label: 'Close menu or contact' },
];
