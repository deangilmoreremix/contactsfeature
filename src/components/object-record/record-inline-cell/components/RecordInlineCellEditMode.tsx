import { useState, useRef, useEffect } from 'react';
import { Button } from '../../../../components/ui/Button';
import { X, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/Tooltip';
import { cn } from '../../../../utils/cn';

interface RecordInlineCellEditModeProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  multiline?: boolean;
  inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
}

export const RecordInlineCellEditMode = ({
  value,
  onSave,
  onCancel,
  placeholder,
  multiline = false,
  inputRef,
}: RecordInlineCellEditModeProps) => {
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(true);
  const internalRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const ref = inputRef || internalRef;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (isFocused && ref && 'current' in ref && ref.current) {
      ref.current.focus();
      if ('select' in ref.current) {
        ref.current.select();
      }
    }
  }, [isFocused, ref]);

  const handleSave = () => {
    if (draft !== value) {
      onSave(draft.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1',
        'bg-white dark:bg-gray-800',
        'border border-blue-500 rounded-md shadow-lg',
        'z-50 relative'
      )}
      onKeyDown={handleKeyDown}
    >
      <InputComponent
        ref={ref as any}
        type={multiline ? undefined : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleSave}
        placeholder={placeholder}
        className={cn(
          'flex-1 min-w-0 px-2 py-1 text-sm',
          'bg-transparent border-none outline-none',
          'text-gray-900 dark:text-gray-100',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          multiline ? 'resize-none' : ''
        )}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <Check className="w-3 h-3 text-green-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onMouseDown={(e) => {
                e.preventDefault();
                onCancel();
              }}
            >
              <X className="w-3 h-3 text-gray-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cancel</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
