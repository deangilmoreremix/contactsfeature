import { Building2 } from 'lucide-react';

interface CompanyChipProps {
  company: string | null | undefined;
  /** Receives the company name as written on the contact. */
  onOpen: (company: string) => void;
  className?: string;
}

/** Small clickable company name for contact surfaces; renders nothing when the contact has no company. */
export function CompanyChip({ company, onOpen, className = '' }: CompanyChipProps) {
  const name = company?.trim();
  if (!name) return null;
  return (
    <button
      type="button"
      data-testid="company-chip"
      onClick={(e) => { e.stopPropagation(); onOpen(name); }}
      title={`Open ${name}`}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors max-w-full ${className}`}
    >
      <Building2 className="w-3 h-3 shrink-0" />
      <span className="truncate">{name}</span>
    </button>
  );
}
