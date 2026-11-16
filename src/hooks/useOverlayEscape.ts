import { useEffect, useRef } from 'react';

/**
 * While `active`, Escape runs `onEscape` and is swallowed in the capture phase so it does not also
 * close the screens underneath (ContactsModal closes the open contact on Esc).
 */
export function useOverlayEscape(active: boolean, onEscape: () => void): void {
  const handler = useRef(onEscape);
  handler.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handler.current();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active]);
}
