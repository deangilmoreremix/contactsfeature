import React, { useEffect, useRef, useState } from 'react';
import {
  Settings2, MoreHorizontal, ChevronUp, ChevronDown, Copy, GitMerge, Download, Link2, Trash2,
  ArchiveRestore, Trash, Command, Keyboard,
} from 'lucide-react';
import { TOOLBAR_ICON_BTN } from './toolbarStyles';
import { LOCKED_TAB_IDS } from '../../lib/tabs/tabLayout';
import { useOverlayEscape } from '../../hooks/useOverlayEscape';
import type { ContactCommandId } from '../../lib/commands/contactCommands';

const ICON_BTN = `${TOOLBAR_ICON_BTN} text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors`;
const POPOVER = 'absolute top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20';

/** Closes on outside click / Esc. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOverlayEscape(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return { open, setOpen, ref };
}

interface TabCustomizerProps {
  tabs: ReadonlyArray<{ id: string; label: string; icon: React.ElementType }>;
  hiddenIds: readonly string[];
  onToggle: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onReset: () => void;
}

/** Show / hide / reorder the detail tabs (Overview and Activity are always shown). */
export const TabCustomizer: React.FC<TabCustomizerProps> = ({ tabs, hiddenIds, onToggle, onMove, onReset }) => {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid="customize-tabs-button"
        aria-haspopup="true"
        aria-expanded={open}
        title="Customize tabs"
        aria-label="Customize tabs"
        onClick={() => setOpen(!open)}
        className={ICON_BTN}
      >
        <Settings2 className="w-4 h-4" />
      </button>
      {open && (
        <div role="group" aria-label="Customize tabs" className={`${POPOVER} right-0 w-72 max-w-[calc(100vw-2rem)] p-2`}>
          <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Tabs</div>
          <ul className="max-h-96 overflow-y-auto">
            {tabs.map((tab, i) => {
              const Icon = tab.icon;
              const locked = LOCKED_TAB_IDS.includes(tab.id);
              const hidden = hiddenIds.includes(tab.id);
              return (
                <li key={tab.id} className="h-10 flex items-center gap-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    id={`tab-vis-${tab.id}`}
                    checked={!hidden}
                    disabled={locked}
                    title={locked ? 'Always shown' : undefined}
                    onChange={() => onToggle(tab.id)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={`tab-vis-${tab.id}`} className="flex-1 min-w-0 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </label>
                  <button
                    type="button"
                    aria-label={`Move ${tab.label} up`}
                    disabled={i === 0}
                    onClick={() => onMove(tab.id, -1)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${tab.label} down`}
                    disabled={i === tabs.length - 1}
                    onClick={() => onMove(tab.id, 1)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={onReset}
            className="mt-1 w-full h-10 text-sm text-left px-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Reset to default
          </button>
        </div>
      )}
    </div>
  );
};

interface OverflowItem {
  id: ContactCommandId;
  label: string;
  icon: React.ElementType;
  hint?: string;
  danger?: boolean;
}

interface ContactOverflowMenuProps {
  isDeleted: boolean;
  onRun: (id: ContactCommandId) => void;
}

/** "More actions" menu next to Edit: the record actions that are not primary buttons. */
export const ContactOverflowMenu: React.FC<ContactOverflowMenuProps> = ({ isDeleted, onRun }) => {
  const { open, setOpen, ref } = usePopover();
  const items: OverflowItem[] = [
    { id: 'palette', label: 'Command menu', icon: Command, hint: 'Ctrl K' },
    ...(isDeleted
      ? [{ id: 'restore' as const, label: 'Restore record', icon: ArchiveRestore }]
      : [
          { id: 'duplicate' as const, label: 'Duplicate record', icon: Copy },
          { id: 'merge' as const, label: 'Merge with…', icon: GitMerge },
        ]),
    { id: 'copy-link', label: 'Copy link', icon: Link2 },
    { id: 'export-csv', label: 'Export as CSV', icon: Download },
    { id: 'export-json', label: 'Export as JSON', icon: Download },
    { id: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard, hint: '?' },
    isDeleted
      ? { id: 'destroy', label: 'Delete permanently', icon: Trash, danger: true }
      : { id: 'delete', label: 'Delete record', icon: Trash2, danger: true },
  ];
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid="contact-overflow-button"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        aria-label="More actions"
        onClick={() => setOpen(!open)}
        className={ICON_BTN}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div role="menu" aria-label="More actions" className={`${POPOVER} right-0 w-56 py-1`}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); onRun(item.id); }}
                className={`w-full h-10 px-4 flex items-center gap-3 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  item.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-xs text-gray-500 dark:text-gray-400">{item.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
