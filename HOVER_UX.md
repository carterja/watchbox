# Discover Page - Hover Card UX

## Changes Made

### 1. **Removed Title Below Poster**
- Titles no longer show below cards in browse view
- Cleaner, more visual grid
- Poster-only view like Netflix/Overseerr

### 2. **Rich Hover Overlay**
On hover, cards show:
- **Year** (top, gray text)
- **Title** (bold, white, 2 lines max)
- **Overview/Synopsis** (4 lines max, white/90%)
- **"Add to list" button** (purple, centered)
  - Shows "Adding..." with spinner when in progress
  - Hidden if item already in collection

### 3. **Visual Improvements**
- **Gradient overlay**: Black 95% → 80% → 60% (top to bottom)
- **Green checkmark**: Stays visible on hover for collected items (z-index 20)
- **Smooth transition**: 200ms fade-in
- **Better readability**: White text on dark gradient

### 4. **New Component**
Created `DiscoverCard` component (`src/components/DiscoverCard.tsx`):
- Reusable across all browse sections
- Memoized for performance
- Consistent hover behavior everywhere
- Props: id, type, title, overview, posterPath, releaseDate, inCollection, adding, onAdd

---

## ✨ User Experience

**Before hover**: Clean grid of posters only

**On hover**: 
```
┌─────────────────┐
│   [✓ green]     │  ← checkmark if in collection
│                 │
│                 │
│  2026           │  ← year
│  R.J. Decker    │  ← title
│  Ex-con photo...│  ← overview
│  [Add to list]  │  ← button (or "Adding..." with spinner)
└─────────────────┘
```

---

## 🎯 Sections Using New Hover Cards

✅ Popular movies
✅ Popular TV shows  
✅ Trending (mixed)
✅ Top Rated movies
✅ Top Rated TV shows
✅ Now Playing

All browse sections now use the unified `DiscoverCard` component.

---

## 🚀 Performance

- Component memoized (prevents unnecessary re-renders)
- Lazy loading images (scroll-triggered)
- Quality 75 (optimized)
- Smooth 60 FPS hover transitions

---

## 🔧 Technical Details

### Files Modified
1. **src/app/(dashboard)/discover/page.tsx**
   - Replaced all inline card markup with `<DiscoverCard />` component
   - Removed title paragraphs below posters
   - Fixed lint error (escaped quotes in "No results found")

2. **src/components/DiscoverCard.tsx** (new)
   - Centralized card logic
   - Accepts `releaseDate: string | null | undefined` for flexibility

3. **src/components/MediaCard.tsx**
   - Fixed TypeScript type for `onUpdate` callback (uses `SeasonProgressItem[]`)

4. **src/app/api/media/[id]/route.ts**
   - Fixed Prisma types for `seasonProgress` field
   - Uses `Prisma.MediaUpdateInput` and `Prisma.InputJsonValue`

### Build Status
✅ Build successful
✅ Type checking passed
✅ Linting passed
✅ No errors

---

**Status**: ✅ Complete
