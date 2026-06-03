import React, { useState, useEffect } from 'react';

interface InlineEditCellProps {
  value: string | number | null;
  onSave: (value: string | number) => void;
  onCancel: () => void;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  className?: string;
}

export function InlineEditCell({ value, onSave, onCancel, type = 'text', options, className = '' }: InlineEditCellProps) {
  const [editValue, setEditValue] = useState(String(value ?? ''));

  useEffect(() => {
    setEditValue(String(value ?? ''));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = type === 'number' ? Number(editValue) : editValue;
      onSave(parsed);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    const parsed = type === 'number' ? Number(editValue) : editValue;
    onSave(parsed);
  };

  if (type === 'select' && options) {
    return (
      <select
        autoFocus
        value={editValue}
        onChange={(e) => {
          onSave(e.target.value);
        }}
        onBlur={handleBlur}
        className={`w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      autoFocus
      type={type}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
