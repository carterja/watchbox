# Code Audit: Best Practices Review

## Current State Analysis

### ✅ What's Working Well

#### 1. **Component Reusability**
- `DiscoverCard`, `MediaCard`, `StatusToggle`, `SeasonProgressEditor` - all properly componentized
- `memo()` used on key components for performance
- Components accept props instead of hardcoding values

#### 2. **Tailwind Usage**
- Consistent design system with CSS variables
- Responsive grids with Tailwind breakpoints
- No inline styles, all utility classes

#### 3. **Performance Optimizations**
- `useCallback` properly used for functions passed as dependencies
- `memo()` on frequently re-rendered components
- Image optimization with Next.js Image component
- Database indexes on frequently queried fields

### ⚠️ Issues Found & Fixes Needed

#### 1. **Security Issues**

**CRITICAL: API Key Exposure**
```typescript
// ❌ BAD - API key in URL (visible in logs, browser history)
fetch(`${TMDB_BASE}/search/movie?api_key=${key}&query=...`)
```

**Fix**: Use Authorization header instead
```typescript
// ✅ GOOD - API key in header
fetch(`${TMDB_BASE}/search/movie?query=...`, {
  headers: { 'Authorization': `Bearer ${key}` }
})
```

**Missing Input Validation**
- API routes accept raw JSON without schema validation
- No sanitization of user input (TMDB IDs, titles, etc.)
- No rate limiting on API endpoints

**Missing Security Headers**
- No CSRF protection
- No rate limiting
- No request size limits

#### 2. **useEffect Dependencies**

**Discover Page - Line 86-87**
```typescript
// ⚠️ ISSUE: loadLists in dependency array causes extra checks
useEffect(() => {
  if (tab === "browse" && !lists && !loading) loadLists();
}, [tab, lists, loading, loadLists]); // loadLists changes every render
```

**Movies Page - Line 21-23**
```typescript
// ✅ GOOD: Proper use of useCallback
const fetchList = useCallback(async () => {
  const res = await fetch("/api/media");
  const data = await res.json();
  setList(Array.isArray(data) ? data : []);
}, []); // No dependencies
```

#### 3. **Code Duplication**

**Repeated Button Patterns**
Discover page has 4+ buttons with identical styling:
```typescript
<button
  type="button"
  onClick={() => setCategory("popular")}
  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
    category === "popular" ? "bg-shelf-accent text-white" : "text-shelf-muted hover:bg-shelf-card hover:text-white"
  }`}
>
  Popular
</button>
```

**Solution**: Create reusable `TabButton` component

**Repeated Loading States**
Movies and Series pages have identical loading skeleton code

**Solution**: Extract `LoadingSkeleton` component

#### 4. **Error Handling**

**Inconsistent Error Display**
- Some errors use `alert()` (blocking, bad UX)
- Some use state-based error messages (good)
- No error boundaries for runtime errors

**Missing Error Cases**
- Network failures not handled gracefully
- No retry logic for failed API calls
- No offline detection

#### 5. **Type Safety**

**Loose Typing**
```typescript
// ⚠️ Could be more specific
const body = await request.json(); // any type
```

**Missing Runtime Validation**
- No validation that TMDB responses match expected types
- No zod/yup schemas for API payloads

---

## Recommended Fixes (Priority Order)

### 🔴 Critical (Security)

1. **Move TMDB API key to Authorization header**
2. **Add input validation with zod schemas**
3. **Add rate limiting middleware**
4. **Sanitize user inputs**

### 🟡 High (Performance)

1. **Fix useEffect dependency in discover page**
2. **Add React.memo to remaining components**
3. **Extract duplicated components**

### 🟢 Medium (Code Quality)

1. **Create reusable button components**
2. **Add error boundaries**
3. **Improve error messages**
4. **Add loading skeleton component**

### 🔵 Low (Nice to Have)

1. **Add request/response logging**
2. **Add analytics/monitoring**
3. **Add stale-while-revalidate for API calls**

---

## Files to Update

1. `src/lib/tmdb.ts` - Fix API key exposure
2. `src/app/(dashboard)/discover/page.tsx` - Fix useEffect, extract components
3. `src/app/api/media/route.ts` - Add validation
4. `src/app/api/media/[id]/route.ts` - Add validation
5. `src/components/Button.tsx` (new) - Reusable button
6. `src/components/LoadingSkeleton.tsx` (new) - Reusable skeleton
7. `src/lib/validation.ts` (new) - Zod schemas
8. `middleware.ts` (new) - Rate limiting

---

## Next Steps

I will now implement the critical and high priority fixes.
