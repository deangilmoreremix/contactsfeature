# Pre-Deployment Validation

Run a comprehensive validation before deploying SmartCRM.

**Argument: $ARGUMENTS** (optional: "quick" for build-only, or blank for full check)

## Steps

### 1. TypeScript Validation

```bash
npm run typecheck 2>&1
```

Fix any type errors before proceeding.

### 2. Lint Check

```bash
npm run lint 2>&1
```

Fix any lint errors (warnings are acceptable).

### 3. Production Build

```bash
npm run build 2>&1
```

Must complete with zero errors. Note the bundle size.

### 4. Database Consistency Check

Run these queries to verify database health:

```sql
-- Check all tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND NOT rowsecurity
ORDER BY tablename;
```

```sql
-- Check for tables with no policies (locked out after RLS enabled)
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public' AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0;
```

```sql
-- List all policies for review
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

### 5. Edge Functions Check

Run `mcp__supabase__list_edge_functions` to verify all required functions are deployed.

Cross-reference with `supabase/functions/` directory to find any undeployed functions.

### 6. Environment Variables Check

Verify all required env vars are set:
- Read `.env` file
- Run `mcp__supabase__list_edge_function_secrets` to check deployed secrets
- Confirm: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY are present

### 7. Generate Report

Produce a deployment readiness summary:

```
DEPLOYMENT READINESS REPORT
===========================

TypeScript: [PASS/FAIL] - X errors
Lint:       [PASS/FAIL] - X errors, Y warnings
Build:      [PASS/FAIL] - Bundle size: X MB
Database:   [PASS/FAIL] - X tables, Y without RLS
Edge Funcs: [PASS/FAIL] - X deployed, Y pending
Env Vars:   [PASS/FAIL] - X configured

BLOCKERS:
- [List any FAIL items]

READY TO DEPLOY: [YES/NO]
```

### 8. Fix Blockers

If any checks fail, fix the issues and re-run the failed checks until all pass.
