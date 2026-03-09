# WatchBox Rebranding

## Changes Made

### 1. **App Renamed to WatchBox**
- Updated `package.json` name from `media-tracker` to `watchbox`
- Changed all references from "Shelf" to "WatchBox"
- Updated page title metadata: "WatchBox — Track Movies & TV"
- Updated README.md with new branding

### 2. **New Logo Created**
- Generated a modern logo featuring:
  - Purple rounded box/container (#8b5cf6)
  - White play button icon integrated in the center
  - Clean, minimal, flat design
  - Matches the app's purple accent color scheme
- Logo placed in `/public/watchbox-logo.png`
- Integrated into Sidebar component with Next.js Image optimization

### 3. **Improved Hover Card UX**
**Before**: "Add to list" button at the bottom
**After**: Purple plus icon in top-right corner

#### New Layout:
- **Green checkmark** (top-right) - shows for items already in collection
- **Purple plus icon** (top-right) - appears on hover for new items
  - Spinner animation when adding
- **More text space** - overview now shows up to 6 lines (was 4)
- **Removed button** - entire card is clickable, cleaner look

#### Visual Flow:
```
Hover state:
┌─────────────────┐
│            [+]  │  ← plus icon (purple circle)
│                 │
│  2026           │  ← year
│  The Bluff      │  ← title
│  When her tra-  │  ← overview (6 lines)
│  nquil life on  │
│  a remote isl-  │
│  and is shatt-  │
│  ered by...     │
└─────────────────┘
```

---

## Files Modified

1. **package.json** - renamed to `watchbox`
2. **src/app/layout.tsx** - updated metadata title
3. **src/components/Sidebar.tsx** - logo and branding
4. **src/components/DiscoverCard.tsx** - plus icon, more text
5. **README.md** - full rebrand
6. **public/watchbox-logo.png** - new logo asset

---

## Build Status
✅ Build successful  
✅ No linter errors  
✅ Type checking passed  
✅ Logo displays correctly in sidebar  
✅ Plus icon shows on hover with smooth animation

---

## Design Details

### Logo
- **Size**: 32×32px in sidebar
- **Style**: Flat, modern, icon-only
- **Colors**: Purple (#8b5cf6) box with white play button
- **Format**: PNG with transparency

### Plus Icon
- **Location**: Top-right of card
- **Background**: Purple circle (#8b5cf6)
- **Icon**: White plus (+) 14px
- **States**: 
  - Hidden by default
  - Fades in on hover (200ms)
  - Spinner when adding
  - Replaced by green checkmark when in collection

---

**Status**: ✅ Complete - WatchBox is ready!
