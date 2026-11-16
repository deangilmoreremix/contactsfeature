import React from 'react';
import { Eye } from 'lucide-react';
import type { Contact } from '../../types/contact';
import { useContactPeekStore } from '../../store/contactPeekStore';

interface PeekButtonProps {
  contact: Contact;
  /** Tailwind classes that position the button and make it appear on hover of the row/card. */
  className: string;
}

/** Small icon button that opens the read-only Peek drawer. Invisible until its row/card is hovered or it has focus. */
export function PeekButton({ contact, className }: PeekButtonProps) {
  const open = useContactPeekStore((s) => s.open);
  return (
    <button
      type="button"
      aria-label="Peek record"
      title="Peek record"
      data-testid="peek-button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); open(contact.id); }}
      className={`p-1 rounded-md text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-700 opacity-0 focus:opacity-100 transition-opacity ${className}`}
    >
      <Eye className="w-4 h-4" />
    </button>
  );
}
