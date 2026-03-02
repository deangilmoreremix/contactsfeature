# Fix Build Errors

Diagnose and fix all build errors in the SmartCRM project.

**Argument: $ARGUMENTS** (optional: specific error message or file to focus on)

## Steps

### 1. Run the Build

```bash
npm run build 2>&1
```

Capture all output including errors and warnings.

### 2. Categorize Errors

Group errors by type:
- **Type errors**: Missing types, wrong types, incompatible types
- **Import errors**: Missing modules, wrong paths, circular dependencies
- **Syntax errors**: Invalid JSX, missing brackets, etc.
- **Missing dependencies**: Packages not installed
- **Dead references**: Imports of deleted/moved files

### 3. Fix Each Error

For each error:
1. Read the file at the error line
2. Read surrounding context (imports, related files)
3. Determine the fix:
   - Type error: Add proper type annotation or fix the type mismatch
   - Import error: Fix the path or install missing package
   - Dead reference: Remove the import or redirect to the correct file
   - Missing export: Add the export to the source file

### 4. Re-run Build

After fixing all errors:
```bash
npm run build 2>&1
```

Repeat steps 2-4 until the build succeeds with zero errors.

### 5. Check for Warnings

Review build warnings and fix any that indicate real problems (unused imports, deprecated APIs).

## Common Issues in This Project

- AgentMail references (removed but may have lingering imports)
- Twilio references (not used but may have lingering imports)
- Missing type exports from `src/types/`
- Circular dependency between services
- Netlify function imports using wrong module format (ESM vs CommonJS)

## Build Command Reference

- `npm run build` -- Full Vite production build
- `npm run typecheck` -- TypeScript only (faster, catches type errors)
- `npm run lint` -- ESLint (catches code quality issues)
