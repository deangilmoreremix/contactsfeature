import { useContext, useMemo, useState } from 'react';
import { Contact } from '../../../../types/contact';

import { FieldContext } from '../../record-field/ui/contexts/FieldContext';
import { useRecordInlineCellContext } from './RecordInlineCellContext';

import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/Tooltip';
import { cn } from '../../../../utils/cn';

const StyledIconContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center w-4 h-4 text-gray-400">{children}</div>
);

const StyledLabelAndIconContainer = ({ children, id }: { children: React.ReactNode; id: string }) => (
  <div id={id} className="flex items-center gap-1 self-start text-gray-400 h-6">
    {children}
  </div>
);

const StyledValueContainer = ({ children, readonly, id }: { children: React.ReactNode; readonly: boolean; id: string }) => (
  <div id={id} className="relative flex min-w-0 w-full">{children}</div>
);

const StyledLabelContainer = ({ children, width }: { children: React.ReactNode; width?: number }) => (
  <div
    className="text-gray-400 text-xs"
    style={{ width: width ? `${width}px` : 'auto' }}
  >
    {children}
  </div>
);

const StyledInlineCellBaseContainer = ({ children, readonly, onMouseEnter, onMouseLeave }: {
  children: React.ReactNode;
  readonly?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) => (
  <div
    className={cn(
      'flex items-center w-full gap-1 box-border',
      'h-fit select-none',
      readonly ? 'cursor-default' : 'cursor-pointer'
    )}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    {children}
  </div>
);

export const StyledSkeletonDiv = () => <div className="h-6 w-full animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />;

export const RecordInlineCellContainer = ({ children }: { children?: React.ReactNode }) => {
  const { readonly, IconLabel, label, labelWidth, showLabel } = useRecordInlineCellContext();
  const { recordId, fieldDefinition, onMouseEnter, onMouseLeave, anchorId } = useContext(FieldContext as any);

  const [isFocused, setIsFocused] = useState(false);

  const handleContainerMouseEnter = () => {
    if (!readonly) setIsFocused(true);
    onMouseEnter?.();
  };

  const handleContainerMouseLeave = () => {
    if (!readonly) setIsFocused(false);
    onMouseLeave?.();
  };

  const labelId = useMemo(() => {
    const fieldName = typeof fieldDefinition?.metadata?.fieldName === 'string'
      ? fieldDefinition.metadata.fieldName
      : 'field';
    return `label-${recordId}-${fieldName}`;
  }, [recordId, fieldDefinition]);

  const tooltipContent = label || '';

  return (
    <StyledInlineCellBaseContainer
      readonly={readonly ?? false}
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
    >
      {(IconLabel || label) && (
        <StyledLabelAndIconContainer id={labelId}>
          {IconLabel && (
            <StyledIconContainer>
              <IconLabel className="w-4 h-4" />
            </StyledIconContainer>
          )}
          {showLabel && (
            <StyledLabelContainer width={labelWidth}>
              <span className="truncate block">{label}</span>
            </StyledLabelContainer>
          )}
          {!showLabel && tooltipContent && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="sr-only">{tooltipContent}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          )}
        </StyledLabelAndIconContainer>
      )}
      <StyledValueContainer readonly={readonly ?? false} id={anchorId}>
        {children}
      </StyledValueContainer>
    </StyledInlineCellBaseContainer>
  );
};
