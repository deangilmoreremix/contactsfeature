/**
 * Shared sizing for the Contacts toolbars (header actions + search/filter row) so every control
 * has the same height, type size and padding, and labels never wrap.
 * Colours stay with each button; only size/spacing is shared.
 */
export const TOOLBAR_BTN =
  'h-10 px-4 text-sm font-medium whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 rounded-lg';

/** Icon-only controls (theme toggle, close) share the same height as TOOLBAR_BTN. */
export const TOOLBAR_ICON_BTN = 'h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg';

export const TOOLBAR_SELECT = 'h-10 px-3 text-sm whitespace-nowrap shrink-0 rounded-lg';
