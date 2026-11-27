/**
 * Column aggregates for the Table footer ("Show totals").
 * Pure functions: given the raw cell values of a column, compute count / empty / sum / avg / min / max.
 * Inspired by Twenty's "Calculate" footer (AGPL) - reimplemented.
 */
export type AggregateOp =
  | 'none'
  | 'count'
  | 'countEmpty'
  | 'percentEmpty'
  | 'countUnique'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max';

/** How a column's values are interpreted. */
export type AggregateKind = 'number' | 'date' | 'text';

export const AGGREGATE_LABELS: Record<AggregateOp, string> = {
  none: 'None',
  count: 'Count',
  countEmpty: 'Empty',
  percentEmpty: '% empty',
  countUnique: 'Unique',
  sum: 'Sum',
  avg: 'Average',
  min: 'Min',
  max: 'Max',
};

const COMMON: AggregateOp[] = ['none', 'count', 'countEmpty', 'percentEmpty'];

/** Operations offered per column kind. */
export const AGGREGATE_OPS: Record<AggregateKind, AggregateOp[]> = {
  number: [...COMMON, 'sum', 'avg', 'min', 'max'],
  date: [...COMMON, 'min', 'max'],
  text: [...COMMON, 'countUnique'],
};

export type AggregateResult = number | string | null;

export const isEmptyCell = (v: unknown): boolean =>
  v === null ||
  v === undefined ||
  (typeof v === 'string' && v.trim() === '') ||
  (typeof v === 'number' && Number.isNaN(v)) ||
  (Array.isArray(v) && v.length === 0);

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toTime = (v: unknown): number | null => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const t = Date.parse(v) || Date.parse(v.replace(/\s+at\s+/i, ' '));
    return Number.isNaN(t) ? null : t;
  }
  return null;
};

const keyOf = (v: unknown): string =>
  Array.isArray(v) ? v.map((x) => String(x).toLowerCase()).sort().join('\u0001') : String(v).trim().toLowerCase();

/**
 * Compute one aggregate. Returns null when the operation has no result
 * (op 'none', or min/max/avg over no usable values). Dates are returned as ISO strings.
 */
export function computeAggregate(op: AggregateOp, values: readonly unknown[], kind: AggregateKind): AggregateResult {
  switch (op) {
    case 'none':
      return null;
    case 'count':
      return values.length;
    case 'countEmpty':
      return values.filter(isEmptyCell).length;
    case 'percentEmpty':
      return values.length === 0 ? 0 : (values.filter(isEmptyCell).length / values.length) * 100;
    case 'countUnique':
      return new Set(values.filter((v) => !isEmptyCell(v)).map(keyOf)).size;
    case 'sum':
    case 'avg':
    case 'min':
    case 'max': {
      if (kind === 'date') {
        if (op !== 'min' && op !== 'max') return null;
        const times = values.map(toTime).filter((t): t is number => t !== null);
        if (!times.length) return null;
        return new Date(op === 'min' ? Math.min(...times) : Math.max(...times)).toISOString();
      }
      if (kind !== 'number') return null;
      const nums = values.map(toNumber).filter((n): n is number => n !== null);
      if (!nums.length) return op === 'sum' ? 0 : null;
      if (op === 'sum') return nums.reduce((a, b) => a + b, 0);
      if (op === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length;
      return op === 'min' ? Math.min(...nums) : Math.max(...nums);
    }
    default:
      return null;
  }
}

const round = (n: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/** Text shown in the footer cell for a result. */
export function formatAggregate(op: AggregateOp, result: AggregateResult): string {
  if (op === 'none') return '';
  if (result === null) return '-';
  if (op === 'percentEmpty' && typeof result === 'number') return `${round(result)}%`;
  if (typeof result === 'string') return result.slice(0, 10); // ISO date -> YYYY-MM-DD
  return String(round(result, 2));
}

/** Keeps a saved choice only if it is still valid for the column kind. */
export function normalizeAggregateOp(op: unknown, kind: AggregateKind): AggregateOp {
  return typeof op === 'string' && (AGGREGATE_OPS[kind] as string[]).includes(op) ? (op as AggregateOp) : 'none';
}
