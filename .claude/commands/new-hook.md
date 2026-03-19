# Create a New Custom React Hook

Scaffold a reusable React hook for SmartCRM.

**Argument: $ARGUMENTS** (e.g., "useContactScoring - fetches and manages AI scoring data for a contact")

## Steps

### 1. Check Existing Hooks

Read 2-3 hooks in `src/hooks/` to match the project's patterns. Key hooks to reference:
- `src/hooks/useContactAI.ts` -- AI operations on contacts
- `src/hooks/useContactActions.ts` -- Contact CRUD operations
- `src/hooks/useContactDetail.ts` -- Fetching contact detail data
- `src/hooks/useSDRExecution.ts` -- SDR agent execution
- `src/hooks/useSmartAI.ts` -- Smart AI feature integration
- `src/hooks/useDebounce.ts` -- Simple utility hook

### 2. Create the Hook

Place at `src/hooks/use<Name>.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Use<Name>Options {
  // Configuration options
}

interface Use<Name>Return {
  data: <DataType> | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Additional methods
}

export function use<Name>(options: Use<Name>Options): Use<Name>Return {
  const [data, setData] = useState<<DataType> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch logic (Supabase query or Edge Function call)
      const { data: result, error: queryError } = await supabase
        .from('table')
        .select('*')
        .eq('id', options.id)
        .maybeSingle();

      if (queryError) throw new Error(queryError.message);
      setData(result);
    } catch (err: any) {
      console.error('[use<Name>] error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [/* dependencies */]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
```

### Conventions

- Always return `{ data, loading, error, refetch }` at minimum
- Use `useCallback` for async functions to avoid re-render loops
- Use `.maybeSingle()` for Supabase queries returning 0-1 rows
- Prefix hook name with `use`
- Define clear TypeScript interfaces for options and return type
- Handle cleanup in useEffect if needed (abort controllers, subscriptions)
- Log errors with a `[hookName]` prefix for debugging

### 3. Use the Hook

Import and use in the target component:

```typescript
import { use<Name> } from '../../hooks/use<Name>';

const { data, loading, error, refetch } = use<Name>({ id: contactId });
```

### 4. Verify

Run `npm run build` to confirm TypeScript compiles.
