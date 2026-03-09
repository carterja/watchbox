# Testing

This project uses [Vitest](https://vitest.dev/) for unit and component testing.

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test -- --run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Structure

Tests are located in `src/__tests__/` and mirror the project structure:

- `__tests__/lib/` - Library/utility tests
- `__tests__/components/` - React component tests
- `__tests__/api/` - API route logic tests
- `__tests__/types/` - Type validation tests

## Writing Tests

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Utility Tests

```typescript
import { myUtility } from '@/lib/myUtility';

describe('myUtility', () => {
  it('should do something', () => {
    expect(myUtility('input')).toBe('output');
  });
});
```

## Coverage

Test coverage reports are generated in `coverage/` when running `npm run test:coverage`.

Current test coverage focuses on:
- ✅ TMDB utilities
- ✅ Media types and validation
- ✅ StatusToggle component
- ✅ MediaCard component
- ✅ SeasonProgressEditor component
- ✅ API route logic

## CI/CD

Tests are run automatically on:
- Pull requests
- Push to main branch
- Pre-commit hooks (future)

## Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names**: "should do X when Y"
3. **Keep tests isolated**: No shared state between tests
4. **Mock external dependencies**: Next.js Image, fetch, etc.
5. **Test edge cases**: Null values, empty arrays, error states
