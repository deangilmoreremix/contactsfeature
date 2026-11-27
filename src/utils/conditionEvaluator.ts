/**
 * Pure condition evaluator + workflow walker (browser mirror of netlify/functions/_automation.js;
 * tests/automation-core.test.ts runs the same cases against both).
 */
export type Condition =
  | string
  | boolean
  | Condition[]
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { field: string; operator: string; value?: unknown };

const OPS: Record<string, string> = {
  equals: 'equals', eq: 'equals', '==': 'equals', '=': 'equals',
  not_equals: 'not_equals', ne: 'not_equals', '!=': 'not_equals',
  contains: 'contains', not_contains: 'not_contains', starts_with: 'starts_with',
  greater_than: 'gt', gt: 'gt', '>': 'gt', less_than: 'lt', lt: 'lt', '<': 'lt',
  gte: 'gte', '>=': 'gte', lte: 'lte', '<=': 'lte',
  is_empty: 'is_empty', is_not_empty: 'is_not_empty', in: 'in',
};

export function getPath(obj: unknown, path: string): unknown {
  return String(path).split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), obj);
}
const isEmpty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const isNum = (v: unknown) => v !== '' && v !== null && v !== undefined && typeof v !== 'boolean' && Number.isFinite(Number(v));
function looseEq(a: unknown, b: unknown): boolean {
  if (isNum(a) && isNum(b)) return Number(a) === Number(b);
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export function parseExpression(expr: string): { literal: boolean } | { field: string; operator: string; value: string } {
  const s = String(expr).trim();
  if (/^true$/i.test(s)) return { literal: true };
  if (/^false$/i.test(s)) return { literal: false };
  const m = s.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<|=|\bcontains\b|\bnot_contains\b|\bstarts_with\b|\bis_empty\b|\bis_not_empty\b)\s*(.*)$/i);
  if (!m) throw new Error(`Cannot parse condition: "${s}"`);
  let value = m[3]!.trim();
  if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
  return { field: m[1]!, operator: m[2]!.toLowerCase(), value };
}

export function evaluateCondition(cond: Condition | null | undefined, data: unknown = {}): boolean {
  if (cond == null || cond === '') return true;
  if (typeof cond === 'boolean') return cond;
  if (typeof cond === 'string') {
    const p = parseExpression(cond);
    return 'literal' in p ? p.literal : evaluateCondition(p, data);
  }
  if (Array.isArray(cond)) return cond.every((c) => evaluateCondition(c, data));
  const c = cond as any;
  if (c.all) return c.all.every((x: Condition) => evaluateCondition(x, data));
  if (c.any) return c.any.some((x: Condition) => evaluateCondition(x, data));
  if (c.not) return !evaluateCondition(c.not, data);
  const op = OPS[String(c.operator || '').toLowerCase()];
  if (!op || !c.field) throw new Error(`Unknown condition operator: ${c.operator}`);
  const v = getPath(data, c.field);
  const t = c.value;
  switch (op) {
    case 'equals': return !isEmpty(v) && looseEq(v, t);
    case 'not_equals': return isEmpty(v) || !looseEq(v, t);
    case 'contains': return Array.isArray(v) ? v.some((x) => looseEq(x, t)) : String(v ?? '').toLowerCase().includes(String(t).toLowerCase());
    case 'not_contains': return !evaluateCondition({ field: c.field, operator: 'contains', value: t }, data);
    case 'starts_with': return String(v ?? '').toLowerCase().startsWith(String(t).toLowerCase());
    case 'gt': return isNum(v) && isNum(t) && Number(v) > Number(t);
    case 'lt': return isNum(v) && isNum(t) && Number(v) < Number(t);
    case 'gte': return isNum(v) && isNum(t) && Number(v) >= Number(t);
    case 'lte': return isNum(v) && isNum(t) && Number(v) <= Number(t);
    case 'is_empty': return isEmpty(v);
    case 'is_not_empty': return !isEmpty(v);
    case 'in': return (Array.isArray(t) ? t : String(t).split(',')).some((x) => looseEq(v, x));
    default: return false;
  }
}

export interface WfNode { id: string; type: string; config?: any; [k: string]: unknown }
export interface WfEdge { id?: string; sourceId: string; targetId: string; condition?: string; [k: string]: unknown }
export interface WalkResult {
  status: 'completed' | 'paused' | 'error' | 'no_trigger';
  path: Array<{ nodeId: string; type: string; result?: boolean; error?: string }>;
  actions: WfNode[];
  pausedAt: string[];
  error?: string;
}

/** Walk a workflow from its trigger node(s); condition nodes follow the 'true'/'false' edges. */
export function walkWorkflow(wf: { nodes: WfNode[]; edges: WfEdge[] }, ctx: unknown = {}, maxSteps = 200): WalkResult {
  const nodes = wf.nodes || []; const edges = wf.edges || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const starts = nodes.filter((n) => n.type === 'trigger');
  if (!starts.length) return { status: 'no_trigger', path: [], actions: [], pausedAt: [] };
  const path: WalkResult['path'] = []; const actions: WfNode[] = []; const pausedAt: string[] = []; const seen = new Set<string>();
  const queue = starts.map((n) => n.id);
  let steps = 0;
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (++steps > maxSteps) return { status: 'error', path, actions, pausedAt, error: 'Workflow exceeded step limit' };
    const node = byId.get(id);
    if (!node) continue;
    const entry: WalkResult['path'][number] = { nodeId: id, type: node.type };
    let out = edges.filter((e) => e.sourceId === id);
    if (node.type === 'condition') {
      try {
        entry.result = evaluateCondition(node.config?.condition, ctx);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        path.push({ ...entry, error: message });
        return { status: 'error', path, actions, pausedAt, error: message };
      }
      out = out.filter((e) => e.condition == null || e.condition === '' || e.condition === String(entry.result));
    } else if (node.type === 'action') {
      actions.push(node);
    } else if (node.type === 'delay') {
      pausedAt.push(id); path.push(entry); continue;
    } else if (node.type === 'end') {
      path.push(entry); continue;
    }
    path.push(entry);
    out.forEach((e) => queue.push(e.targetId));
  }
  return { status: pausedAt.length ? 'paused' : 'completed', path, actions, pausedAt };
}
