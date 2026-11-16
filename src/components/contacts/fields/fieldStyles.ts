/**
 * Class strings shared by the composite-field controls. They are copied from the neighbouring
 * ContactSidebar rows so the new controls look like the existing ones (light + dark).
 */
export const labelClass = 'text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium';
export const valueClass = 'text-sm font-medium text-gray-900 dark:text-white';
export const inputClass =
  'w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
export const selectClass =
  'text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
export const iconButtonClass =
  'p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded';
export const errorClass = 'text-xs text-red-600 dark:text-red-400 mt-1';
export const mutedLabelClass = 'text-xs text-gray-500 dark:text-gray-400 flex-shrink-0';
export const linkClass = 'text-sm font-medium text-gray-900 dark:text-white truncate hover:underline';
/** Add/edit form panel (same tint as the existing "Add social" panel). */
export const panelClass = 'mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
/** Hidden until the row is hovered/focused or the Contact Info block is in edit mode. */
export const revealClass = (editing: boolean) =>
  editing ? 'inline-flex' : 'hidden group-hover:inline-flex group-focus-within:inline-flex';
