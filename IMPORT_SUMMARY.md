# Watchlist Import & Filtering Feature

## ✅ Completed Tasks

### 1. Database Schema Updates
Added two new fields to the `Media` model:
- **`streamingService`**: String (e.g., "Apple TV", "Netflix", "Plex", "HBO", "Prime", "Comedy Specials")
- **`viewer`**: Enum ("wife" | "both" | "me")
- Added database indexes for efficient filtering

### 2. Watchlist Import
**Created**: `scripts/import-list.ts`

**Imported 67 shows from your list:**
- ✅ 64 successfully imported
- ⏭️  1 skipped (already existed)
- ❌ 2 errors (not found on TMDB):
  - "Stranger Things Doc"
  - "WWDITS" (What We Do in the Shadows - try adding manually)

**Breakdown by streaming service:**
- Apple TV: 8 shows (all wife)
- Netflix: 19 shows (all wife)
- Plex: 29 shows (all both)
- HBO: 8 shows (all both)
- Prime: 4 shows (all both)
- Comedy Specials: 2 movies (all both)

### 3. Filtering UI
**Created**: `src/components/FilterBar.tsx`

Features:
- **Streaming Service Filter**: Dynamically shows only services in your collection
- **Viewer Filter**: Color-coded buttons
  - 🔴 Red = Wife
  - 🟣 Purple = Both
  - 🔵 Light Blue = Me
- Filters apply in addition to status filter (Yet to start / In progress / Finished)

### 4. Updated Pages
**Movies Page** (`movies/page.tsx`):
- Added FilterBar component
- useMemo for efficient filtering
- Shows "Nothing matches the selected filters" when empty

**Series Page** (`series/page.tsx`):
- Same filtering capabilities as Movies
- Both pages share the FilterBar component

### 5. Type Safety & Validation
Updated validation schemas in `src/lib/validation.ts`:
- Added `ViewerSchema` enum validation
- Added `streamingService` to CreateMediaSchema
- Added `viewer` to CreateMediaSchema
- Both fields optional and nullable

---

## 🎯 How to Use

### Filtering Your Shows
1. Go to **Movies** or **Series** page
2. Select status (Yet to start / In progress / Finished)
3. Filter by **Streaming Service** (e.g., only Netflix shows)
4. Filter by **Viewer** (e.g., only shows you both watch)
5. Filters stack - you can combine all three!

### Color Coding
When adding new shows manually, you can set the viewer:
- **Red** (Wife): Shows only she watches
- **Purple** (Both): Shows you watch together  
- **Light Blue** (Me): Shows only you watch

---

## 📊 Your Current Collection

**Total Imported: 64 shows**

**By Viewer:**
- Wife only: 27 shows (Apple TV + Netflix)
- Both: 37 shows (Plex + HBO + Prime + Comedy Specials)
- Me: 0 shows (you can add some later!)

**Status: All set to "Yet to start"**
You can now move them to "In progress" or "Finished" as you watch!

---

## 🚀 Technical Details

### Performance
- Filters use `useMemo` to prevent unnecessary re-calculations
- FilterBar is memoized with React.memo
- Database indexes on streaming Service and viewer fields
- Efficient filtering on client-side after initial fetch

### Data Structure
```typescript
{
  streamingService: "Netflix" | "Apple TV" | "Plex" | "HBO" | "Prime" | "Comedy Specials" | null,
  viewer: "wife" | "both" | "me" | null
}
```

### Build Status
✅ Build successful  
✅ All type checks passed  
✅ Bundle sizes:
- Movies page: +0.13 kB (filtering logic)
- Series page: +0.13 kB (filtering logic)

---

## 📝 Missing Shows (Manual Add Recommended)

These 2 shows weren't found on TMDB:
1. **"Stranger Things Doc"** - Try searching for the full title
2. **"WWDITS"** - Search for "What We Do in the Shadows"

You can add them manually via the Discover page!

---

## ✨ Next Steps

You can now:
1. Browse your imported shows in Movies/Series pages
2. Filter by streaming service to see what's on each platform
3. Filter by viewer to separate wife's shows, shared shows, and your shows
4. Update statuses as you watch
5. Add more content and it will automatically appear in filters!

**Your watchlist is ready to go! 🎬**
