import { useMemo } from 'react';
import { Contact } from '../../../../types/contact';

import { FieldContext } from '../../record-field/ui/contexts/FieldContext';
import { RecordFieldComponentScopeContext } from '../../record-field-list/contexts/RecordFieldsScopeContext';
import { useRecordInlineCellContext } from './RecordInlineCellContext';

type CellDraftMode = 'read-only' | 'edit';

export const useInlineCell = ({
  fieldDefinition,
  recordId,
}: {
  fieldDefinition: {
    fieldName?: string;
    label?: string;
  };
  recordId: string;
}) => {
  const { scopeInstanceId } = useContext(RecordFieldComponentScopeContext);

  const { editModeContent, labelWidth, isCentered } =
    useRecordInlineCellContext();

  const value = '';
  const isFieldEmpty = !value;

  const fieldInstanceId = useMemo(() => {
    return `${recordId}-${fieldDefinition.fieldName || 'field'}`;
  }, [recordId, fieldDefinition.fieldName]);

  const RecordInlineCellContextValue: RecordInlineCellContextProps = {
    label: fieldDefinition.label,
    labelWidth,
    showLabel: true,
    isCentered,
    editModeContentOnly: false,
  };

  return {
    isFieldEmpty,
    fieldInstanceId,
    RecordInlineCellContextValue,
  };
};
