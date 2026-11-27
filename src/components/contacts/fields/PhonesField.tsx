import React from 'react';
import {
  PHONE_LABELS, DEFAULT_PHONE_LABEL, addPhone, editPhone, makePrimaryPhone, removePhone, updatePhoneLabel,
  type LabeledValue, type PhoneState, type Result,
} from '../../../lib/fields/compositeFields';
import { ValueListView, type FieldResult } from './ValueListView';

interface PhonesFieldProps {
  phone: string;
  additionalPhones: LabeledValue[] | undefined;
  editing: boolean;
  adding: boolean;
  onCancelAdd: () => void;
  onChange: (next: PhoneState) => Promise<void>;
}

/** Extra phone numbers shown under the primary one; primary stays in `phone`. */
export const PhonesField: React.FC<PhonesFieldProps> = ({ phone, additionalPhones, editing, adding, onCancelAdd, onChange }) => {
  const state: PhoneState = { phone, additionalPhones: additionalPhones ?? [] };
  const commit = async (r: Result<PhoneState>): FieldResult => {
    if (!r.ok) return r.error;
    await onChange(r.value);
    return null;
  };
  return (
    <ValueListView
      kind="phone"
      entries={state.additionalPhones}
      labels={PHONE_LABELS}
      defaultLabel={DEFAULT_PHONE_LABEL}
      editing={editing}
      adding={adding}
      onCancelAdd={onCancelAdd}
      hrefFor={(v) => `tel:${v.replace(/[^\d+]/g, '')}`}
      onAdd={(e) => commit(addPhone(state, e))}
      onRemove={(v) => commit({ ok: true, value: removePhone(state, v) })}
      onMakePrimary={(v) => commit({ ok: true, value: makePrimaryPhone(state, v) })}
      onEdit={(o, n) => commit(editPhone(state, o, n))}
      onLabel={(v, l) => commit({ ok: true, value: updatePhoneLabel(state, v, l) })}
    />
  );
};
