import React from 'react';
import {
  EMAIL_LABELS, DEFAULT_EMAIL_LABEL, addEmail, editEmail, makePrimaryEmail, removeEmail, updateEmailLabel,
  type EmailState, type LabeledValue, type Result,
} from '../../../lib/fields/compositeFields';
import { ValueListView, type FieldResult } from './ValueListView';

interface EmailsFieldProps {
  email: string;
  additionalEmails: LabeledValue[] | undefined;
  editing: boolean;
  adding: boolean;
  onCancelAdd: () => void;
  /** Persist new primary + extras (rejects when saving fails). */
  onChange: (next: EmailState) => Promise<void>;
}

/** Extra emails shown under the primary one; primary stays in `email`. */
export const EmailsField: React.FC<EmailsFieldProps> = ({ email, additionalEmails, editing, adding, onCancelAdd, onChange }) => {
  const state: EmailState = { email, additionalEmails: additionalEmails ?? [] };
  const commit = async (r: Result<EmailState>): FieldResult => {
    if (!r.ok) return r.error;
    await onChange(r.value);
    return null;
  };
  return (
    <ValueListView
      kind="email"
      entries={state.additionalEmails}
      labels={EMAIL_LABELS}
      defaultLabel={DEFAULT_EMAIL_LABEL}
      editing={editing}
      adding={adding}
      onCancelAdd={onCancelAdd}
      hrefFor={(v) => `mailto:${v}`}
      onAdd={(e) => commit(addEmail(state, e))}
      onRemove={(v) => commit({ ok: true, value: removeEmail(state, v) })}
      onMakePrimary={(v) => commit({ ok: true, value: makePrimaryEmail(state, v) })}
      onEdit={(o, n) => commit(editEmail(state, o, n))}
      onLabel={(v, l) => commit({ ok: true, value: updateEmailLabel(state, v, l) })}
    />
  );
};
