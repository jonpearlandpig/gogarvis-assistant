

# Mobile-First UI Overhaul

Shane's feedback is clear: text boxes are hard to see and fill on a phone, and the layout doesn't format well for mobile. The current UI uses small text (`text-xs`, `text-[10px]`), dense top bars with many buttons, and a desktop-first sidebar layout. Here's the fix.

## Problem Areas

1. **Top bar**: Crammed with 6-8 small text buttons that overflow or become invisible on a 393px viewport
2. **Chat composer**: Textarea uses `text-sm font-mono` with `min-h-[44px]` — too small on phones; the plus/send buttons crowd it
3. **Example chips**: `text-[10px]` — nearly unreadable on mobile
4. **Conversation sidebar**: Always rendered as a side column, takes space on narrow screens
5. **Message bubbles**: `max-w-[85%]` with `text-sm` — acceptable but action buttons below are tiny (`h-7 px-2 text-xs`)

## Changes

### 1. Top bar — mobile-friendly collapse (`Workspace.tsx`)
- On mobile (`< md`): Show only the logo, AKB progress pill, and a hamburger/menu icon
- Move Profile, AKB, Artifacts, Integrity, Sign Out into a slide-down mobile menu or Sheet
- Keep AKB Builder button visible but icon-only on mobile

### 2. Conversation sidebar — drawer on mobile (`Workspace.tsx`)
- On mobile: Hide the sidebar column entirely; render it inside a Sheet (slide-from-left) triggered by the hamburger icon
- On desktop: Keep current behavior

### 3. Chat composer — larger touch targets (`ChatPanel.tsx`)
- Increase textarea `min-h` to `56px` on mobile, use `text-base` (16px — prevents iOS zoom)
- Make Send/Stop buttons taller: `h-11` on mobile
- Make Plus button `h-11 w-11` on mobile
- Increase example chip text to `text-xs` (from `text-[10px]`) and padding to `px-3 py-1.5`

### 4. Message action buttons — bigger tap targets (`ChatPanel.tsx`)
- Increase Copy/Save buttons from `h-7` to `h-9` on mobile with `text-sm`

### 5. Textarea base component — prevent iOS zoom (`textarea.tsx`)
- Add `text-base md:text-sm` to prevent Safari auto-zoom on focus (triggered when font < 16px)

### 6. Input base component — same iOS zoom fix (`input.tsx`)
- Already has `text-base md:text-sm` — no change needed

## Files Modified

| File | What changes |
|------|-------------|
| `src/pages/Workspace.tsx` | Mobile menu sheet for top bar; sidebar as drawer on mobile |
| `src/components/workspace/ChatPanel.tsx` | Larger composer, chips, action buttons for touch |
| `src/components/ui/textarea.tsx` | Add `text-base md:text-sm` default |
| `src/index.css` | Minor touch-target utility if needed |

No new dependencies. No new pages. Uses existing `Sheet` and `useIsMobile` hook.

