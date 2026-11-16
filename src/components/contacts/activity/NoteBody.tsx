import React from 'react';
import { hasMarkdown, parseNote, type InlineNode } from '../../../lib/notes/markdown';

const renderInline = (nodes: InlineNode[]): React.ReactNode[] =>
  nodes.map((n, i) => {
    switch (n.type) {
      case 'text': return <React.Fragment key={i}>{n.text}</React.Fragment>;
      case 'bold': return <strong key={i}>{renderInline(n.children)}</strong>;
      case 'italic': return <em key={i}>{renderInline(n.children)}</em>;
      case 'link':
        return (
          <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()} className="text-blue-600 dark:text-blue-400 underline">
            {renderInline(n.children)}
          </a>
        );
    }
  });

interface NoteBodyProps {
  body: string;
  className?: string;
  onDoubleClick?: () => void;
  title?: string;
}

/**
 * Renders a note. Notes without any formatting render exactly as before (one pre-wrapped paragraph);
 * formatted notes render through a whitelist tree (no raw HTML anywhere).
 */
export function NoteBody({ body, className, onDoubleClick, title }: NoteBodyProps) {
  if (!hasMarkdown(body)) {
    return <p className={className} onDoubleClick={onDoubleClick} title={title}>{body}</p>;
  }
  return (
    <div className={className} onDoubleClick={onDoubleClick} title={title} data-testid="note-rich">
      {parseNote(body).map((b, i) => {
        if (b.type === 'list') {
          return (
            <ul key={i} className="list-disc pl-5 whitespace-normal">
              {b.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ul>
          );
        }
        if (!b.children.length) return null;
        return <div key={i}>{renderInline(b.children)}</div>;
      })}
    </div>
  );
}
