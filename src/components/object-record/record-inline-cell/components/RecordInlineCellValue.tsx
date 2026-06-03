import { useContext } from 'react';
import { FieldContext } from '../../record-field/ui/contexts/FieldContext';
import { RecordInlineCellContext } from './RecordInlineCellContext';

export const RecordInlineCellValue = () => {
  const { readonly, loading, isCentered, onOpenEditMode } =
    useContext(RecordInlineCellContext);

  return (
    <div className="flex items-center w-full gap-1">
      <RecordInlineCellDisplayMode
        isHovered={false}
        onClick={readonly ? undefined : onOpenEditMode}
      >
        <span className="truncate">{String(readonly ? '-' : '')}</span>
      </RecordInlineCellDisplayMode>
    </div>
  );
};
