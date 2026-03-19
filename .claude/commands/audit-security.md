# Audit Security

Perform a comprehensive security audit of the SmartCRM codebase.

**Argument: $ARGUMENTS** (optional: "rls" for database only, "functions" for backend only, "frontend" for client only, or blank for full audit)

## Audit Areas

### 1. RLS Policy Audit

Query the database for all policies:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

Check for:
- Tables with RLS enabled but no policies (locked out)
- Tables with `USING (true)` policies (wide open)
- Policies missing `auth.uid()` ownership checks
- Missing INSERT WITH CHECK clauses
- Missing UPDATE USING + WITH CHECK clauses
- Tables that should have RLS but don't

Also check:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 2. Netlify Functions Audit

Scan all files in `netlify/functions/`:
- Missing CORS headers on responses
- Missing input validation (no check for required fields)
- Using `.single()` instead of `.maybeSingle()`
- Missing error handling (no try/catch)
- API keys exposed in response data
- SQL injection via string concatenation (should use parameterized queries)
- Missing HTTP method checks

### 3. Edge Functions Audit

Scan all files in `supabase/functions/`:
- Missing CORS headers (especially `X-Client-Info, Apikey` in Allow-Headers)
- Missing auth token validation
- Using service role key when anon key would suffice
- Missing try/catch wrapper
- Missing OPTIONS handling

### 4. Frontend Audit

Scan `src/` for:
- API keys or secrets in source code (grep for `sk-`, `key=`, `secret`, `password`)
- Direct OpenAI API calls from browser code (should go through serverless)
- `console.log` statements that might leak sensitive data
- XSS vulnerabilities (dangerouslySetInnerHTML without sanitization)
- Sensitive data stored in localStorage without encryption

### 5. Environment Variables Audit

Check `.env` and `.env.example`:
- Ensure no real keys are in `.env.example`
- Ensure `.env` is in `.gitignore`
- Check that VITE_ prefix is only on public-safe variables

### 6. Generate Report

Produce a prioritized report:

**CRITICAL** (fix immediately):
- Open RLS policies without ownership checks
- Exposed API keys
- Missing auth on sensitive endpoints

**HIGH** (fix soon):
- Missing input validation
- Using .single() instead of .maybeSingle()
- Missing CORS headers

**MEDIUM** (improve):
- Missing error handling
- Console.log leaking data
- Inconsistent patterns

**LOW** (nice to have):
- Code style issues
- Missing TypeScript types

### 7. Fix Critical Issues

Automatically fix any CRITICAL issues found. For RLS problems, create a migration via `mcp__supabase__apply_migration`. For code issues, edit the files directly.

### 8. Verify Fixes

Run `npm run build` to confirm fixes don't break compilation.
