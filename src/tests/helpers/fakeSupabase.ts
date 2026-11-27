/**
 * A small in-memory stand-in for the Supabase client, keyed by table and operation.
 *
 *   const db = createFakeSupabase();
 *   db.respond('agent_metadata', 'select', { data: agent, error: null });
 *   db.respond('agent_runs', 'insert', ({ payload }) => ({ data: { id: 'run-1', ...payload }, error: null }));
 *
 * Every query builder method (select / eq / order / limit / single / maybeSingle ...) returns the same
 * chainable, awaitable builder, so the code under test can chain in any order and `await` at any point.
 * Unconfigured queries resolve with `{ data: null, error: null }`. All calls are recorded in `db.calls`.
 */
export type FakeOp = 'select' | 'insert' | 'update' | 'delete' | 'upsert';
export interface FakeResult { data?: unknown; error?: unknown }
export type FakeResponder = FakeResult | ((ctx: { table: string; op: FakeOp; payload: unknown; filters: Array<[string, unknown]> }) => FakeResult | Promise<FakeResult>);

export interface FakeCall { table: string; op: FakeOp; payload: unknown; filters: Array<[string, unknown]> }

export function createFakeSupabase() {
  const responders = new Map<string, FakeResponder>();
  const calls: FakeCall[] = [];
  const auth = {
    getSession: async () => ({ data: { session: null as unknown }, error: null }),
    getUser: async () => ({ data: { user: null as unknown }, error: null })
  };

  const from = (table: string) => {
    let op: FakeOp = 'select';
    let payload: unknown;
    const filters: Array<[string, unknown]> = [];

    const settle = async (): Promise<FakeResult> => {
      calls.push({ table, op, payload, filters: [...filters] });
      const responder = responders.get(`${table}.${op}`);
      if (!responder) return { data: null, error: null };
      return typeof responder === 'function' ? responder({ table, op, payload, filters: [...filters] }) : responder;
    };

    const builder: Record<string, unknown> = {
      select: () => builder,
      insert: (p: unknown) => { op = 'insert'; payload = p; return builder; },
      update: (p: unknown) => { op = 'update'; payload = p; return builder; },
      upsert: (p: unknown) => { op = 'upsert'; payload = p; return builder; },
      delete: () => { op = 'delete'; return builder; },
      single: () => builder,
      maybeSingle: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      then: (resolve: (v: FakeResult) => unknown, reject?: (e: unknown) => unknown) => settle().then(resolve, reject)
    };
    for (const name of ['eq', 'neq', 'in', 'is', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'or', 'not', 'match']) {
      builder[name] = (column: string, value: unknown) => { filters.push([`${name}:${column}`, value]); return builder; };
    }
    return builder;
  };

  return {
    auth,
    from,
    calls,
    /** Configure what `table`'s `op` queries resolve with. */
    respond(table: string, op: FakeOp, responder: FakeResponder) { responders.set(`${table}.${op}`, responder); },
    /** Drop every responder and recorded call. */
    reset() { responders.clear(); calls.length = 0; },
    /** Recorded calls for one table / operation. */
    callsFor(table: string, op?: FakeOp) { return calls.filter(c => c.table === table && (!op || c.op === op)); }
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
