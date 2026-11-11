import { Plus, X, Trash2, Layers } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useContactFilterStore } from '../../store/contactFilterStore';
import type { ContactFilterField } from '../../lib/filters/contactFilterFields';
import type { RecordFilter, RecordFilterGroup } from '../../lib/filters/filterContacts';
import { RecordFilterGroupLogicalOperator } from '../../vendor/twenty-shared/types/RecordFilterGroupLogicalOperator';
import { ViewFilterOperand } from '../../vendor/twenty-shared/types/ViewFilterOperand';
import { getFilterTypeFromFieldType } from '../../vendor/twenty-shared/utils/filter/utils/getFilterTypeFromFieldType';
import { getFilterOperandsForFilterableFieldType } from '../../vendor/twenty-shared/utils/filter/utils/getFilterOperandsForFilterableFieldType';
import { isRecordFilterOperandExpectingValue } from '../../vendor/twenty-shared/utils/filter/isRecordFilterOperandExpectingValue';

const OPERAND_LABELS: Record<string, string> = {
  IS: 'is',
  IS_NOT: 'is not',
  IS_NOT_NULL: 'is not null',
  LESS_THAN_OR_EQUAL: 'at most',
  GREATER_THAN_OR_EQUAL: 'at least',
  IS_BEFORE: 'is before',
  IS_AFTER: 'is after',
  CONTAINS: 'contains',
  DOES_NOT_CONTAIN: 'does not contain',
  IS_EMPTY: 'is empty',
  IS_NOT_EMPTY: 'is not empty',
  IS_RELATIVE: 'is relative',
  IS_IN_PAST: 'is in the past',
  IS_IN_FUTURE: 'is in the future',
  IS_TODAY: 'is today',
};

// Same control styling as the existing search/filter bar inputs.
const controlClass =
  'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all';

function operandsFor(field: ContactFilterField): readonly ViewFilterOperand[] {
  const filterType = getFilterTypeFromFieldType(field.type);
  return getFilterOperandsForFilterableFieldType({ filterType: filterType as never });
}

const parseList = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

interface ValueInputProps {
  field: ContactFilterField;
  filter: RecordFilter;
  onChange: (value: string) => void;
}

function ValueInput({ field, filter, onChange }: ValueInputProps) {
  const type = getFilterTypeFromFieldType(field.type);
  if (!isRecordFilterOperandExpectingValue(filter.operand)) return <div className="flex-1" />;

  if ((type === 'SELECT' || type === 'MULTI_SELECT') && field.options) {
    const selected = parseList(filter.value);
    return (
      <div className="flex-1 flex flex-wrap gap-1.5">
        {field.options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(JSON.stringify(on ? selected.filter((v) => v !== o.value) : [...selected, o.value]))}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                on
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === 'MULTI_SELECT' || type === 'SELECT') {
    // Free-form tags/sources: comma separated list stored as a JSON array.
    return (
      <input
        className={`${controlClass} flex-1`}
        placeholder="value1, value2"
        value={parseList(filter.value).join(', ')}
        onChange={(e) =>
          onChange(JSON.stringify(e.target.value.split(',').map((v) => v.trim()).filter(Boolean)))
        }
      />
    );
  }

  if (type === 'BOOLEAN') {
    return (
      <select className={`${controlClass} flex-1`} value={filter.value || 'true'} onChange={(e) => onChange(e.target.value)}>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (type === 'DATE' || type === 'DATE_TIME') {
    return (
      <input
        type="date"
        className={`${controlClass} flex-1`}
        value={filter.value ? filter.value.slice(0, 10) : ''}
        onChange={(e) => onChange(e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : '')}
      />
    );
  }

  return (
    <input
      type={type === 'NUMBER' || type === 'RATING' ? 'number' : 'text'}
      className={`${controlClass} flex-1`}
      placeholder="Value"
      value={filter.value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

interface GroupProps {
  group: RecordFilterGroup;
  depth: number;
  fields: ContactFilterField[];
}

function GroupView({ group, depth, fields }: GroupProps) {
  const store = useContactFilterStore();
  const filters = store.recordFilters
    .filter((f) => f.recordFilterGroupId === group.id)
    .map((f) => ({ kind: 'filter' as const, pos: f.positionInRecordFilterGroup ?? 0, f }));
  const children = store.recordFilterGroups
    .filter((g) => g.parentRecordFilterGroupId === group.id)
    .map((g) => ({ kind: 'group' as const, pos: g.positionInRecordFilterGroup ?? 0, g }));
  const items = [...filters, ...children].sort((a, b) => a.pos - b.pos);
  const fieldById = new Map(fields.map((f) => [f.id, f]));
  const firstField = fields[0];

  return (
    <div
      className={
        depth > 0
          ? 'ml-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800 space-y-2'
          : 'space-y-2'
      }
    >
      {items.map((item, index) => (
        <div key={item.kind === 'filter' ? item.f.id : item.g.id} className="flex items-start gap-2">
          <div className="w-16 pt-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {index === 0 ? (
              'Where'
            ) : index === 1 ? (
              <select
                className="px-1 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs"
                value={group.logicalOperator}
                onChange={(e) => store.setGroupOperator(group.id, e.target.value as RecordFilterGroupLogicalOperator)}
              >
                <option value={RecordFilterGroupLogicalOperator.AND}>And</option>
                <option value={RecordFilterGroupLogicalOperator.OR}>Or</option>
              </select>
            ) : (
              group.logicalOperator === RecordFilterGroupLogicalOperator.AND ? 'And' : 'Or'
            )}
          </div>

          {item.kind === 'filter' ? (
            (() => {
              const field = fieldById.get(item.f.fieldMetadataId);
              if (!field) return null;
              const operands = operandsFor(field);
              return (
                <div className="flex-1 flex flex-wrap items-start gap-2">
                  <select
                    className={controlClass}
                    value={item.f.fieldMetadataId}
                    onChange={(e) => {
                      const next = fieldById.get(e.target.value);
                      if (!next) return;
                      store.updateFilter(item.f.id, {
                        fieldMetadataId: next.id,
                        operand: operandsFor(next)[0] as ViewFilterOperand,
                        value: '',
                      });
                    }}
                  >
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    className={controlClass}
                    value={item.f.operand}
                    onChange={(e) => store.updateFilter(item.f.id, { operand: e.target.value as ViewFilterOperand })}
                  >
                    {operands.map((o) => (
                      <option key={o} value={o}>{OPERAND_LABELS[o] ?? o}</option>
                    ))}
                  </select>
                  <ValueInput field={field} filter={item.f} onChange={(value) => store.updateFilter(item.f.id, { value })} />
                  <button
                    type="button"
                    onClick={() => store.removeFilter(item.f.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Remove filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="flex-1 flex items-start gap-2">
              <div className="flex-1">
                <GroupView group={item.g} depth={depth + 1} fields={fields} />
              </div>
              <button
                type="button"
                onClick={() => store.removeGroup(item.g.id)}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Remove group"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={!firstField}
          onClick={() => firstField && store.addFilter(firstField.id, operandsFor(firstField)[0] as ViewFilterOperand, group.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add filter
        </button>
        {depth < 2 && (
          <button
            type="button"
            onClick={() => store.addGroup(group.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Layers className="w-4 h-4" /> Add group
          </button>
        )}
      </div>
    </div>
  );
}

interface AdvancedFilterPanelProps {
  fields: ContactFilterField[];
  matchCount: number;
  totalCount: number;
  onClose?: () => void;
}

export function AdvancedFilterPanel({ fields, matchCount, totalCount, onClose }: AdvancedFilterPanelProps) {
  const groups = useContactFilterStore((s) => s.recordFilterGroups);
  const filterCount = useContactFilterStore((s) => s.recordFilters.length);
  const clear = useContactFilterStore((s) => s.clear);
  const addFilter = useContactFilterStore((s) => s.addFilter);
  const root = groups.find((g) => !g.parentRecordFilterGroupId);
  const firstField = fields[0];

  return (
    <GlassCard className="mx-6 mt-4 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Advanced filters</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {filterCount === 0 ? 'Combine conditions with And / Or and groups.' : `${matchCount} of ${totalCount} contacts match`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filterCount > 0 && (
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear all
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg"
              aria-label="Close advanced filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {root ? (
        <GroupView group={root} depth={0} fields={fields} />
      ) : (
        <button
          type="button"
          disabled={!firstField}
          onClick={() => firstField && addFilter(firstField.id, operandsFor(firstField)[0] as ViewFilterOperand)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add filter
        </button>
      )}
    </GlassCard>
  );
}
