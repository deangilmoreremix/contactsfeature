import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Edit, Heart, Copy, GitMerge, Download, Link2, Trash2, ArchiveRestore, ChevronUp, ChevronDown,
  ArrowRight, Keyboard, Settings2, Trash,
} from 'lucide-react';
import { filterCommands, type ContactCommand, type ContactCommandId } from '../../lib/commands/contactCommands';
import { useOverlayEscape } from '../../hooks/useOverlayEscape';

interface ContactCommandMenuProps {
  open: boolean;
  commands: ContactCommand[];
  onRun: (id: ContactCommandId) => void;
  onClose: () => void;
}

const ICONS: Record<string, React.ElementType> = {
  edit: Edit, favorite: Heart, duplicate: Copy, merge: GitMerge, 'export-csv': Download, 'export-json': Download,
  'copy-link': Link2, delete: Trash2, restore: ArchiveRestore, destroy: Trash, prev: ChevronUp, next: ChevronDown,
  shortcuts: Keyboard, 'customize-tabs': Settings2,
};

/** Searchable action palette for the open contact (Ctrl/Cmd+K). */
export const ContactCommandMenu: React.FC<ContactCommandMenuProps> = ({ open, commands, onRun, onClose }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useOverlayEscape(open, onClose);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
    return () => returnFocus.current?.focus?.();
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [active, results]);

  if (!open) return null;

  const run = (cmd: ContactCommand | undefined) => {
    if (cmd) onRun(cmd.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(Math.max(0, results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // keep focus inside the palette
    }
  };

  const showSections = query.trim() === '';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-start justify-center p-4 pt-[12vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Contact actions"
        onKeyDown={onKeyDown}
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="relative p-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-4 h-4" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="contact-command-list"
            aria-activedescendant={results[active] ? `contact-command-${results[active]!.id}` : undefined}
            aria-label="Search actions"
            placeholder="Search actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pl-10 pr-4 text-sm w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div ref={listRef} id="contact-command-list" role="listbox" aria-label="Actions" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-6 text-sm text-center text-gray-600 dark:text-gray-400">No matching actions</p>
          )}
          {results.map((cmd, i) => {
            const Icon = ICONS[cmd.id] ?? ArrowRight;
            const isActive = i === active;
            const showHeading = showSections && (i === 0 || results[i - 1]!.section !== cmd.section);
            return (
              <React.Fragment key={cmd.id}>
                {showHeading && (
                  <div role="presentation" className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    {cmd.section}
                  </div>
                )}
                <div
                  id={`contact-command-${cmd.id}`}
                  role="option"
                  aria-selected={isActive}
                  data-active={isActive}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(cmd)}
                  className={`h-10 px-3 flex items-center gap-3 rounded-lg cursor-pointer text-sm ${
                    isActive ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  } ${cmd.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{cmd.title}</span>
                  {cmd.shortcut && (
                    <kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-xs font-mono text-gray-700 dark:text-gray-200">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 flex gap-4">
          <span>↑↓ navigate</span>
          <span>Enter select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
};
