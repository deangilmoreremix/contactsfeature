# Create a New React Component

Scaffold a new feature component for SmartCRM.

**Argument: $ARGUMENTS** (e.g., "ContactTimeline - shows a chronological timeline of all interactions with a contact")

## Steps

### 1. Determine Placement

Based on the component's purpose, place it in the correct directory:
- `src/components/contacts/` -- Contact-related UI
- `src/components/ai-sales-intelligence/` -- AI sales panels
- `src/components/aiTools/` -- AI tool interfaces
- `src/components/dashboard/` -- Dashboard widgets
- `src/components/deals/` -- Deal management
- `src/components/email/` -- Email features
- `src/components/sdr/` -- SDR agent UIs
- `src/components/modals/` -- Modal dialogs
- `src/components/modals/tabs/` -- Contact detail tab content
- `src/components/ui/` -- Shared primitives (buttons, cards, etc.)
- `src/components/landing/` -- Landing page demos
- `src/components/layout/` -- App layout (navbar, sidebar)

### 2. Check Existing Patterns

Before writing code, read 2-3 existing components in the same directory to match:
- Import style and ordering
- Styling approach (Tailwind CSS classes preferred; SDR components use inline styles)
- State management patterns
- Error/loading state handling
- TypeScript interface conventions

### 3. Create the Component

Follow these conventions:
- Use functional components with `React.FC<Props>`
- Define TypeScript interfaces for all props
- Import icons only from `lucide-react`
- Use Tailwind CSS for styling
- Include loading and error states where data is fetched
- Use `useState` and `useEffect` from React
- For Supabase data, import from `../../lib/supabase`
- For global state, use Zustand stores from `../../store/`

Template:
```tsx
import React, { useState } from 'react';
import { SomeIcon } from 'lucide-react';

interface ComponentNameProps {
  // Define props
}

export const ComponentName: React.FC<ComponentNameProps> = ({ /* props */ }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {/* Component content */}
    </div>
  );
};
```

### 4. Wire Up

- Import and render the component in the appropriate parent page or modal
- If it's a contact detail tab, add it to `src/components/modals/ContactDetailView.tsx`
- If it's a dashboard widget, add it to `src/pages/Dashboard.tsx`
- If it's an AI tool, add it to `src/pages/AITools.tsx`

### 5. Verify

Run `npm run build` to confirm no compilation errors.

## Key Imports to Know

```typescript
import { supabase, callEdgeFunction } from '../../lib/supabase';
import { Contact } from '../../types/contact';
import { useContactStore } from '../../store/contactStore';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
```
