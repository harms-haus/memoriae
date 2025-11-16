# Code Style and Conventions

## TypeScript Configuration

### Backend (`backend/tsconfig.json`)
- **Target**: ES2022
- **Module**: CommonJS
- **Strict Mode**: Enabled (all strict checks)
- **Key Settings**:
  - `noImplicitAny: true`
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `noUnusedLocals: true`
  - `noImplicitReturns: true`

### Frontend (`frontend/tsconfig.json`)
- **Target**: ES2020
- **Module**: ESNext
- **JSX**: react-jsx
- **Strict Mode**: Enabled
- **Path Aliases**:
  - `@/*` → `src/*`
  - `@mother/*` → `../mother-theme/src/*`

## Naming Conventions

- **Components**: PascalCase (`SeedEditor.tsx`)
- **Files**: kebab-case for utilities, PascalCase for components
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Database tables**: snake_case (plural)

## Code Style

### General
- **Indentation**: 2 spaces
- **Trailing commas**: Yes
- **Semicolons**: Yes
- **Line length**: Reasonable (no hard limit, but prefer readability)

### Imports
Group imports in this order:
1. External dependencies
2. Internal modules
3. Types
4. Relative imports

```typescript
// External
import React from 'react';
import axios from 'axios';

// Internal
import { SeedsService } from '../services/seeds';
import { useSeedContext } from '../contexts/SeedContext';

// Types
import type { Seed, Event } from '../types';

// Relative
import './Component.css';
```

### Comments
- **JSDoc**: For public functions
- **Inline comments**: For complex logic
- **Avoid**: Obvious comments that don't add value

## Architecture Patterns

### Frontend Patterns

**Component Structure:**
```typescript
import React, { useState, useEffect } from 'react';
import { useSeedContext } from '../contexts/SeedContext';
import './ComponentName.css';

interface ComponentNameProps {
  seedId: string;
  onUpdate?: (data: Seed) => void;
}

export function ComponentName({ seedId, onUpdate }: ComponentNameProps) {
  const { seeds, updateSeed } = useSeedContext();
  // Component logic
  return <div className="panel">{/* JSX */}</div>;
}
```

**Context Pattern:**
- Use React Context for global state
- Always provide loading and error states
- Use custom hooks for context access

**Hook Patterns:**
- Custom hooks encapsulate logic
- Use `useEffect` for side effects
- Return objects with named properties

### Backend Patterns

**Route Pattern:**
```typescript
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await Service.method(userId, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

**Service Pattern:**
- Services contain business logic
- Always validate input
- Return typed results
- Handle errors appropriately

**Database Pattern:**
- Always use parameterized queries
- Never use string concatenation for SQL
- Use Knex query builder
- Add indexes for performance

### Database Patterns

**Migration Pattern:**
- Use Knex migrations
- Always provide `up()` and `down()` functions
- Add indexes for query performance
- Use foreign keys where appropriate

**Query Pattern:**
```typescript
// ✅ Good
const seeds = await db('seeds')
  .where({ user_id: userId })
  .where('created_at', '>', since);

// ❌ Bad
const seeds = await db.raw(`SELECT * FROM seeds WHERE user_id = '${userId}'`);
```

## Testing

### Test File Naming
- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- Component tests: `*.test.tsx`

### Test Structure
```typescript
import { describe, it, expect } from 'vitest';

describe('FunctionName', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionName(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Error Handling

**Backend:**
```typescript
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.error('Operation failed', { error, context });
  throw new Error('User-friendly error message');
}
```

**Frontend:**
```typescript
try {
  const result = await api.get('/endpoint');
  setData(result);
} catch (error) {
  setError(error instanceof Error ? error.message : 'Unknown error');
}
```

## Design System

The project follows a style guide defined in `STYLE-GUIDE.md`. Key principles:
- Dark mode first design
- High contrast for accessibility
- Playful but professional aesthetic
- Mobile-first responsive design
- CSS Custom Properties for theming

All styling should use CSS classes and variables from `frontend/src/styles/theme.css`.

## Key Principles

1. **Immutability First**: All changes are events; never mutate seed base data directly
2. **Timeline-Based State**: Current seed state = base + all enabled events applied chronologically
3. **Event Sourcing**: Every change creates an event; toggling events reconstructs history
4. **Async Processing**: Automations run in background queue, not blocking user requests
5. **Type Safety**: TypeScript strict mode throughout; avoid `any`, use proper types
6. **Component Composition**: React components should be small, focused, reusable
