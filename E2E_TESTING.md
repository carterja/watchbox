# E2E Testing Guide

## Quick Start

```bash
# First time setup
npm run test:e2e:setup

# After that, just run tests
npm run test:e2e

# See tests running in browser
npm run test:e2e:ui

# Debug a failing test
npm run test:e2e:debug
```

## Best Practices for E2E Testing

### The Standard Workflow

```
1. Write code or modify feature
2. Run: npm run test:e2e
3. Tests fail ❌ → Read error message
4. Fix code based on what test shows is broken
5. Run: npm run test:e2e again
6. Tests pass ✅ → Commit your changes
```

This is the **recommended approach** because:
- **Fast feedback**: You know immediately what's broken
- **Clear errors**: Test failures tell you exactly what's wrong
- **Confidence**: Passing tests mean the feature actually works
- **Documentation**: Tests show how the feature should behave

### Why This is Better Than "Let Tests Run in CI"

❌ **Bad approach**: Only running E2E tests in CI/CD
- Problems discovered too late (after pushing)
- Requires waiting for full CI pipeline
- Takes longer to fix issues (context loss)
- Tests might be flaky in CI environment

✅ **Good approach**: Run E2E tests locally before committing
- Fast feedback during development
- You see the actual error immediately
- You fix it while context is fresh
- CI tests become a safety net, not the discovery mechanism

## Available Commands

### Run Tests
```bash
# Run all tests (headless)
npm run test:e2e

# Run tests in UI mode (see browser, interactive)
npm run test:e2e:ui

# Run tests in debug mode (step through each action)
npm run test:e2e:debug

# Run specific test file
npm run test:e2e -- e2e/api.spec.ts

# Run specific test by name
npm run test:e2e -- -g "health check"

# Run with headed browser (see it happening)
npm run test:e2e -- --headed
```

### Setup & Maintenance
```bash
# Install/update Playwright browsers (required first time)
npm run test:e2e:setup

# Just install browsers without running tests
npm run playwright:install

# Clear test results
rm -rf test-results/
```

## Test Files & What They Cover

### `e2e/smoke.spec.ts` (9 tests)
- **Quick health check** for basic functionality
- Tests that all pages load
- Verifies API health endpoint
- **Run first**: Fast, catches obvious breaks

### `e2e/api.spec.ts` (27 tests)
- **API layer testing** without browser
- CRUD operations (Create, Read, Update, Delete)
- Error handling and validation
- Status codes (201, 409, 404, 400, etc.)
- **No UI required**: Uses Playwright's request fixture

### `e2e/library.spec.ts` (17 tests)
- **Library page functionality**
- Page routing (/all, /movies, /series)
- Status filtering (Unwatched, In progress, Finished)
- Item edit modal (save/cancel)
- Item deletion
- **Browser required**: Full page interaction

### `e2e/discover.spec.ts` (13 tests)
- **Discover page functionality**
- Browse and search tabs
- TMDB integration (if configured)
- Add to library flow
- **Slowest tests**: TMDB API calls can be slow

## Understanding Test Results

### ✅ All Tests Pass
```
Running 66 tests using 1 worker

····························√√√√√√√ ...

66 passed (2.5m)
```
→ Good to commit!

### ❌ Some Tests Fail
```
Running 66 tests using 1 worker

····························F √ × F ...

3 failed, 63 passed (2.5m)
```
→ See failure details below results
→ Fix the code
→ Run again

### ⚠️ Tests Don't Start
```
❌ Playwright browsers not found at: /path/to/.pw-browsers
Run: npm run playwright:install
```
→ Run the setup command
→ Some environments (shared CI) need this

## Debugging Failed Tests

### 1. Use UI Mode (Easiest)
```bash
npm run test:e2e:ui
```
- See test running step-by-step
- Rewind/forward through actions
- See exact element it's looking for
- Check the DOM at each step

### 2. Check Error Message
Tests show:
- What it was looking for
- Why it couldn't find it
- HTML context of what it found instead
- Screenshot/trace of the failure

### 3. Common Issues

**"element(s) not found"**
→ Page didn't load fully or element not visible
→ Check: `waitUntil: "networkidle"` and element visibility waits

**"Timeout waiting for..."**
→ Element didn't appear within timeout
→ Increase timeout or check if page is actually loading that element

**"browserType.launch: Executable doesn't exist"**
→ Browsers not installed
→ Run: `npm run playwright:install`

**"Port already in use"**
→ Another dev server running on that port
→ Kill it with: `lsof -ti :3333 | xargs kill -9`

## Running in CI/CD

The config automatically adjusts for CI:
- Runs with `--headed` (renders browser)
- Retries once on failure (network flakes)
- Reports to GitHub Actions
- Uses single worker (avoids race conditions)

Just run: `npm run test:e2e`

## Test Organization Philosophy

Tests are organized by **what they test**:
- **Smoke**: Happy path, basic functionality
- **API**: Data layer, business logic
- **UI**: User interactions, page flows
- **Discovery**: Advanced features (TMDB integration)

Each test suite can run independently, so you can test specific areas during development.

## Tips for Fast Feedback Loop

1. **Start with smoke tests** while developing
   ```bash
   npm run test:e2e -- e2e/smoke.spec.ts
   ```

2. **Run specific test** if you're focused on one feature
   ```bash
   npm run test:e2e -- -g "your feature name"
   ```

3. **Use --headed** to see what's happening
   ```bash
   npm run test:e2e -- --headed
   ```

4. **Combine with dev server**
   - Terminal 1: `npm run dev`
   - Terminal 2: `npm run test:e2e:ui`
   - Make changes, watch tests re-run

## When to Run Full Suite vs Individual Tests

**Full suite** (`npm run test:e2e`):
- Before committing
- Before pushing to main
- In CI/CD pipeline
- ~2-3 minutes

**Individual test file** (`npm run test:e2e -- e2e/library.spec.ts`):
- While developing that feature
- ~30 seconds

**Single test** (`npm run test:e2e -- -g "specific test name"`):
- Debugging a specific issue
- ~5 seconds
