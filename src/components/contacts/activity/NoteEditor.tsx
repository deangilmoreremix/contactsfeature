import { useRef } from 'react';
import { Bold, Italic, Link2, List } from 'lucide-react';
import { applyNoteFormat, type NoteFormat } from '../../../lib/notes/formatting';

const TOOLS: Array<{ format: NoteFormat; label: string; Icon: typeof Bold }> = [
  { format: 'bold', label: 'Bold', Icon: Bold },
  { format: 'italic', label: 'Italic', Icon: Italic },
  { format: 'bullet', label: 'Bulleted list', Icon: List },
  { format: 'link', label: 'Link', Icon: Link2 },
];

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  ariaLabel: string;
  className: string;
  autoFocus?: boolean;
}

/**
 * Plain textarea storing Markdown, with a tiny formatting toolbar that only shows while the surrounding
 * form (a `group/note` ancestor) has focus or is hovered, so the resting look of the notes form is unchanged.
 * The ancestor is the whole form, so the toolbar does not vanish (and shift the buttons) mid-click.
 */
export function NoteEditor({ value, onChange, rows = 3, placeholder, ariaLabel, className, autoFocus }: NoteEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply = (format: NoteFormat) => {
    const el = ref.current;
    if (!el) return;
    const edit = applyNoteFormat(value, el.selectionStart, el.selectionEnd, format);
    onChange(edit.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  };

  return (
    <div className="space-y-1">
      <div className="hidden group-focus-within/note:flex group-hover/note:flex items-center gap-1" role="toolbar" aria-label="Note formatting">
        {TOOLS.map(({ format, label, Icon }) => (
          <button
            key={format}
            type="button"
            title={label}
            aria-label={label}
            // Keep the caret/selection in the textarea while clicking a tool.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(format)}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
        autoFocus={autoFocus}
      />
    </div>
  );
}
