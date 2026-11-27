import { useCallback, useMemo, useState } from 'react';
import { ModernButton } from '../ui/ModernButton';
import {
  TIMELINE_KIND_LABELS,
  availableKinds,
  loadStoredKinds,
  pruneSelection,
  saveStoredKinds,
  toggleKind,
  type TimelineKind,
} from '../../lib/timeline/filterEvents';

/** Multi-select kind selection, remembered for the browser session. Empty = All. */
export function useTimelineKindFilter(counts: Partial<Record<TimelineKind, number>>) {
  const [stored, setStored] = useState<TimelineKind[]>(() => loadStoredKinds());
  // Ignore remembered kinds that this contact has no events for, so the list never looks empty by accident.
  const selected = useMemo(() => pruneSelection(stored, counts), [stored, counts]);
  const update = useCallback((next: TimelineKind[]) => {
    setStored(next);
    saveStoredKinds(next);
  }, []);
  return {
    selected,
    toggle: (k: TimelineKind) => update(toggleKind(selected, k)),
    clear: () => update([]),
  };
}

interface Props {
  counts: Partial<Record<TimelineKind, number>>;
  selected: TimelineKind[];
  onToggle: (kind: TimelineKind) => void;
  onClear: () => void;
}

/** Chip row: "All" plus one toggle per event kind present, each with its count. */
export function TimelineKindFilter({ counts, selected, onToggle, onClear }: Props) {
  const kinds = availableKinds(counts);
  const total = kinds.reduce((n, k) => n + (counts[k] ?? 0), 0);
  if (kinds.length < 2) return null;

  return (
    <div role="group" aria-label="Filter events by type" className="flex flex-wrap items-center gap-2">
      <ModernButton
        size="toolbar"
        variant={selected.length === 0 ? 'primary' : 'outline'}
        onClick={onClear}
      >
        All <span className="opacity-80">{total}</span>
      </ModernButton>
      {kinds.map((k) => (
        <ModernButton
          key={k}
          size="toolbar"
          variant={selected.includes(k) ? 'primary' : 'outline'}
          onClick={() => onToggle(k)}
          title={`${selected.includes(k) ? 'Hide' : 'Show only'} ${TIMELINE_KIND_LABELS[k].toLowerCase()}`}
        >
          {TIMELINE_KIND_LABELS[k]} <span className="opacity-80">{counts[k]}</span>
        </ModernButton>
      ))}
    </div>
  );
}
