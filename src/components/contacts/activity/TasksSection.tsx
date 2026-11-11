import { useState } from 'react';
import { CalendarClock, CheckSquare, Mail, Phone, Plus, StickyNote, Trash2, Video, Square } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useContactTasks } from '../../../hooks/useContactActivity';
import type { TaskType } from '../../../services/contactTasksService';

const TYPE_META: Record<TaskType, { label: string; Icon: typeof Phone }> = {
  todo: { label: 'To-do', Icon: CheckSquare },
  call: { label: 'Call', Icon: Phone },
  email: { label: 'Email', Icon: Mail },
  meeting: { label: 'Meeting', Icon: Video },
  note: { label: 'Note', Icon: StickyNote },
};

const controlClass =
  'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all';

const formatDue = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function TasksSection({ contactId }: { contactId: string }) {
  const { tasks, error, add, toggle, remove } = useContactTasks(contactId);
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('todo');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const open = tasks.filter((t) => t.status === 'open');
  const done = tasks.filter((t) => t.status === 'done');

  const renderTask = (task: (typeof tasks)[number]) => {
    const { Icon } = TYPE_META[task.taskType];
    const overdue = task.status === 'open' && task.dueAt && new Date(task.dueAt).getTime() < Date.now();
    return (
      <li key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        <button
          type="button"
          onClick={() => run(() => toggle(task))}
          aria-label={task.status === 'done' ? 'Mark as open' : 'Mark as done'}
          className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
        >
          {task.status === 'done' ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
        </button>
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${task.status === 'done' ? 'line-through text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
            {task.title}
          </p>
          {task.dueAt && (
            <p className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
              <CalendarClock className="w-3 h-3" /> {formatDue(task.dueAt)}{overdue ? ' · overdue' : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => run(() => remove(task))}
          aria-label={`Delete task ${task.title}`}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </li>
    );
  };

  return (
    <GlassCard className="p-5">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Tasks {open.length > 0 && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({open.length} open)</span>}
      </h4>

      <form
        className="flex flex-wrap items-center gap-2 mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          void run(async () => {
            await add({ title, taskType, dueAt: due ? new Date(due).toISOString() : null });
            setTitle('');
            setDue('');
          });
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          aria-label="Task title"
          className={`${controlClass} flex-1 min-w-[10rem]`}
        />
        <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className={controlClass} aria-label="Task type">
          {Object.entries(TYPE_META).map(([k, m]) => (
            <option key={k} value={k}>{m.label}</option>
          ))}
        </select>
        <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={controlClass} aria-label="Due date" />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {(error || actionError) && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{actionError ?? error}</p>}

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No tasks yet.</p>
      ) : (
        <ul>
          {open.map(renderTask)}
          {done.length > 0 && <li className="pt-3 pb-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Done</li>}
          {done.map(renderTask)}
        </ul>
      )}
    </GlassCard>
  );
}
