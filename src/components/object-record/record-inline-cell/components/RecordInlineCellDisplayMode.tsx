import { useContext, useMemo } from 'react';

import { useRecordInlineCellContext } from './RecordInlineCellContext';

import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/Tooltip';
import { cn } from '../../../../utils/cn';

const StyledRecordInlineCellNormalModeOuterContainer = ({
  children,
  isHovered,
  readonly,
  onClick,
}: {
  children: React.ReactNode;
  isHovered?: boolean;
  readonly?: boolean;
  onClick?: () => void;
}) => (
  <div
    className={cn(
      'flex items-center',
      'rounded-sm',
      'h-fit min-h-4 overflow-hidden px-1',
      isHovered && !readonly ? 'bg-gray-100 dark:bg-gray-800' : 'bg-transparent',
      readonly && isHovered ? 'outline outline-1 outline-gray-300 dark:outline-gray-700' : 'outline-transparent',
      'whitespace-nowrap text-ellipsis overflow-hidden'
    )}
    onClick={readonly ? undefined : onClick}
  >
    {children}
  </div>
);

const StyledRecordInlineCellNormalModeInnerContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center text-gray-900 dark:text-gray-100 h-fit overflow-hidden py-0.5 text-ellipsis whitespace-nowrap">
    {children}
  </div>
);

const StyledEmptyField = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center h-5 text-gray-400 dark:text-gray-600">{children}</div>
);

export const RecordInlineCellDisplayMode = ({
  children,
  onClick,
  isHovered,
}: {
  children: React.ReactNode;
  isHovered?: boolean;
  onClick?: () => void;
}) => {
  const { editModeContentOnly, label } = useRecordInlineCellContext();

  const shouldShowValue = editModeContentOnly;

  const emptyPlaceholder = label || 'Empty';

  return (
    <>
      <StyledRecordInlineCellNormalModeOuterContainer
        isHovered={isHovered}
        onClick={onClick}
      >
        <StyledRecordInlineCellNormalModeInnerContainer>
          {shouldShowValue ? (
            children
          ) : (
            <StyledEmptyField>{emptyPlaceholder}</StyledEmptyField>
          )}
        </StyledRecordInlineCellNormalModeInnerContainer>
      </StyledRecordInlineCellNormalModeOuterContainer>
    </>
  );
};
