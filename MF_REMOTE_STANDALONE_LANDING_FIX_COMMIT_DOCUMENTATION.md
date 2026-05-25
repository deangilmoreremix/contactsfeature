# Module Federation Remote - Standalone vs Embedded Landing Fix

**Date**: 2026-05-25  
**Branch**: `session/agent_39a2ca7e-47c3-48ff-a124-780d39a112d5`  
**Status**: Ready for deployment to `contacts.smartcrm.vip`

---

## Problem Statement

When accessing the Contacts remote directly at `https://contacts.smartcrm.vip/`, users were seeing the marketing-style SmartCRM Landing Page instead of the actual full application.

This broke the expected behavior for a deployed Module Federation remote:
- Direct/standalone access should load the **full functional application**.
- The rich landing page should only appear when explicitly requested by the host.

---

## Root Cause

In `src/SmartCRMApp.tsx`, the internal navigation default was unconditionally set to `'landing'`:

```ts
const [currentSection, setCurrentSection] = useState<AppSection>('landing');
```

The route mapper also forced landing when no `initialRoute` was provided:

```ts
if (!route || route === '/' || route === '/landing') return 'landing';
```

This logic was applied the same whether the remote was:
- Loaded standalone (direct browser visit)
- Loaded via Module Federation inside the main host (`app.smartcrm.vip`)

---

## Solution Implemented

### 1. Strict Standalone vs Embedded Detection

Added clear detection logic:

```ts
const isStandalone = !sharedData && !onEvent && !initialRoute;
```

This powers:
- Correct default behavior
- Runtime console diagnostics
- Visual mode banner in the UI

### 2. Updated Default Behavior

- Standalone (direct URL) now defaults to the full application (`'contacts'` for this subdomain).
- The `LandingPage` is now **opt-in only** — shown only when `initialRoute` explicitly contains `landing`, `overview`, or `welcome`.
- The host can still request the landing experience by passing `initialRoute: "/landing"`.

### 3. Visual & Diagnostic Improvements

- Added prominent mode indicator banner (green = standalone, blue = embedded in host).
- Clear runtime logs distinguishing the two modes.
- Updated `onClose` handlers from landing to go to the most relevant functional view.

### 4. Test Harness Improvements

Completely revamped `test-host.html` with dedicated quick-test buttons:
- **Standalone (direct URL)**
- **Host → Landing First**
- **Host → Deep link /contacts**
- **Host → /dashboard**
- Custom mode with live fields

This makes future verification of MF behavior trivial.

### 5. Bug Fixes Surfaced During Work

While wiring the full `SmartCRMApp`, several pre-existing broken relative imports in `src/pages/GTMPromptHub.tsx` were discovered and fixed (`../../` → `../`).

---

## Files Changed

### Core Application
- `src/SmartCRMApp.tsx` — Major refactor of navigation defaults, props handling, detection logic, and UI indicator
- `src/main.tsx` — Updated exports and diagnostics for full root
- `vite.config.ts` — Federation configuration (already in place from earlier work)

### Supporting
- `src/pages/GTMPromptHub.tsx` — Import path corrections
- `test-host.html` — Significantly enhanced MF testing harness

---

## Deployment Impact

After this change is deployed to `contacts.smartcrm.vip`:

- Direct visits to the subdomain will now correctly show the full Contacts application.
- The main host (`app.smartcrm.vip`) can still choose to show the landing experience for this remote by passing the appropriate `initialRoute`.
- No changes required on the host side for normal deep-linked usage.

---

## Verification

Local verification performed:
- `npm run typecheck` — Clean
- `npm run build` — Successful (remoteEntry.js generated correctly)
- `test-host.html` used extensively to validate all four loading modes

---

## Commit History (relevant)

- `b9f4b08` — feat(ui): implement standalone vs embedded mode detection
- `dda2f55` — refactor(ui): change default entry point from landing to contacts
- `e72b0ce` — feat(ui): add landing page as default entry point (earlier iteration)
- `2757e1a` — refactor(ui): fix import paths and export types
- `4457902` — feat(ui): expose full application shell via SmartCRMApp

---

## Next Steps

1. Push this session branch.
2. Deploy to Netlify (`contacts.smartcrm.vip`).
3. Hard refresh and verify direct subdomain access loads full app.
4. Test host embedding scenarios (especially default vs explicit landing).

---

**This fix ensures correct Module Federation semantics while preserving the ability for the host to request rich landing experiences when desired.**
