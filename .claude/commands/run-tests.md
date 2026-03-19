# Run Tests and Analyze Results

Run the project's test suites and provide a summary of results.

**Argument: $ARGUMENTS** (optional: "unit" for Vitest only, "e2e" for Playwright only, or blank for both)

## Steps

### 1. Run Unit Tests (Vitest)

```bash
npx vitest run --reporter=verbose 2>&1 || true
```

If specific tests are requested, run:
```bash
npx vitest run <pattern> --reporter=verbose 2>&1 || true
```

### 2. Run E2E Tests (Playwright)

Only if requested or running all:
```bash
npx playwright test --reporter=list 2>&1 || true
```

### 3. Analyze Results

For each failing test:
1. Read the test file to understand what it tests
2. Read the source file being tested
3. Identify the root cause (missing mock, changed API, broken import, logic error)
4. Propose a fix

### 4. Fix Failures

For each failure:
- If it's a broken import: fix the import path
- If it's a missing mock: add the mock to the test setup
- If it's a logic error in source: fix the source code
- If it's an outdated test expectation: update the test

### 5. Re-run and Verify

After fixes, re-run the failing tests to confirm they pass:
```bash
npx vitest run <fixed-test-files> --reporter=verbose
```

## Test Locations

- Unit tests: `src/tests/` and `src/tests/components/` and `src/tests/integration/`
- E2E tests: `tests/playwright/`
- Test setup: `src/test/setup.ts`
- Vitest config: `vitest.config.ts`
- Playwright config: `playwright.config.ts`

## Common Test Patterns

Unit tests use:
- `vitest` for test runner
- `@testing-library/react` for component tests
- `@testing-library/jest-dom` for DOM assertions

E2E tests use:
- `@playwright/test` for browser automation
- Screenshots saved to `test-results/`
