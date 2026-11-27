import type { Contact } from '../../types/contact';
import { TasksSection } from './activity/TasksSection';
import { NotesSection } from './activity/NotesSection';
import { FilesSection } from './activity/FilesSection';
import { RelatedSection } from './activity/RelatedSection';
import { HistorySection } from './activity/HistorySection';
import { CustomFieldsSection } from './activity/CustomFieldsSection';

/** Tasks, notes, files, related records and change history for one contact. */
export function ContactActivityTab({ contact }: { contact: Contact }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CustomFieldsSection contact={contact} />
      <TasksSection contactId={contact.id} />
      <NotesSection contactId={contact.id} />
      <FilesSection contactId={contact.id} />
      <RelatedSection contact={contact} />
      <HistorySection contactId={contact.id} />
    </div>
  );
}
