import React from 'react';
import { createRoot } from 'react-dom/client';
import type { SmartCRMRemoteProps } from './SmartCRMApp';
import SmartCRMApp from './SmartCRMApp';

let mountedRoots = new Map<HTMLElement, ReturnType<typeof createRoot>>();

export function mount(element: HTMLElement, props?: SmartCRMRemoteProps) {
  console.log('[SmartCRM Remote] mount() called', { element, props });
  if (!element) throw new Error('mount(element) requires a valid HTMLElement');
  if (mountedRoots.has(element)) {
    console.warn('[SmartCRM Remote] mount() called on an element that is already mounted. Unmounting previous root.');
    const existing = mountedRoots.get(element);
    try { existing?.unmount(); } catch (e) {}
  }
  const root = createRoot(element);
  root.render(
    <React.StrictMode>
      <SmartCRMApp {...(props || {})} />
    </React.StrictMode>
  );
  mountedRoots.set(element, root as any);
  return function unmount() {
    const r = mountedRoots.get(element);
    if (r) {
      try { r.unmount(); console.log('[SmartCRM Remote] unmounted'); } catch (e) { console.error(e); }
      mountedRoots.delete(element);
    }
  };
}

export default mount;
