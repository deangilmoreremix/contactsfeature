import { useCallback, useState } from 'react';
import { Contact } from '../../../../types/contact';

import { FieldContext } from '../../record-field/ui/contexts/FieldContext';
import { useRecordInlineCellContext } from './RecordInlineCellContext';
import { RecordInlineCellContainer } from './RecordInlineCellContainer';
import { RecordInlineCellDisplayMode } from './RecordInlineCellDisplayMode';
import { RecordInlineCellEditMode } from './RecordInlineCellEditMode';
import { useUpdateOneRecord } from '../../../../hooks/useRecords';
import { useContactStore } from '../../../../hooks/useContactStore';

const StyledClickableContainer = ({ isCentered, readonly, children, onClick }: {
  readonly?: boolean;
  isCentered?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <div
    className={cn(
      'flex w-full gap-1',
      'cursor-pointer',
      isCentered ? 'justify-center' : 'justify-normal'
    )}
    onClick={readonly ? undefined : onClick}
  >
    {children}
  </div>
);

export const RecordInlineCell = ({ fieldName, recordId, value, onSave, readonly = false }: {
  fieldName: keyof Contact;
  recordId: string;
  value: any;
  onSave?: (value: any) => Promise<void>;
  readonly?: boolean;
}) => {
  const [isInEditMode, setIsInEditMode] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { updateRecord } = useUpdateOneRecord<Contact>({ tableName: 'contacts' });
  const updateContact = useContactStore((s) => s.updateContact);

  const contextValue = {
    readonly,
    label: String(fieldName),
    onOpenEditMode: () => setIsInEditMode(true),
    onCloseEditMode: () => setIsInEditMode(false),
  };

  const handleSave = useCallback(async (newValue: any) => {
    setIsInEditMode(false);
    const normalized = ['lead', 'prospect', 'customer', 'churned', 'active', 'pending', 'inactive']
      .includes(String(newValue).toLowerCase())
      ? String(newValue).toLowerCase()
      : newValue;

    if (onSave) {
      await onSave(normalized);
    } else {
      updateRecord(recordId, { [fieldName]: normalized, updatedAt: new Date().toISOString() });
      updateContact(recordId, { [fieldName]: normalized } as Partial<Contact>);
    }
  }, [fieldName, recordId, onSave, updateRecord, updateContact]);

  const displayContent = useCallback(() => {
    if (value === null || value === undefined || value === '') {
      return String(fieldName);
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }, [value, fieldName]);

  return (
    <RecordInlineCellContext.Provider value={contextValue}>
      <RecordInlineCellContainer>
        {isInEditMode ? (
          <RecordInlineCellEditMode
            value={String(value ?? '')}
            onSave={handleSave}
            onCancel={() => setIsInEditMode(false)}
          />
        ) : (
          <StyledClickableContainer isCentered={false} readonly={readonly} onClick={() => setIsInEditMode(true)}>
            <RecordInlineCellDisplayMode isHovered={isHovered}>
              <span className="truncate">{displayContent()}</span>
            </RecordInlineCellDisplayMode>
          </StyledClickableContainer>
        )}
      </RecordInlineCellContainer>
    </RecordInlineCellContext.Provider>
  );
};
