import { ChevronDown, ChevronRight } from 'lucide-react';

interface ContactGroupHeaderProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}

/** Section header used when contacts are grouped (List and Table views). */
export function ContactGroupHeader({ label, count, collapsed, onToggle }: ContactGroupHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      aria-expanded={!collapsed}
    >
      {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      <span>{label}</span>
      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({count})</span>
    </button>
  );
}
