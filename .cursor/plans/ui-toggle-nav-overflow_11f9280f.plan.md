---
name: ui-toggle-nav-overflow
overview: Convert mockup and ticket queue variant selectors into a horizontally-scrollable toggle navigation with consistent Button styling, remove chevron arrows, and harden layout overflow so transcript/ticket queue scroll internally without expanding their cards.
todos:
  - id: mockup-toggle-nav
    content: "Update MockupPreview variant selector: remove arrows, use Button toggles, enable horizontal scroll + nowrap."
    status: pending
  - id: ticketqueue-variant-buttons
    content: Update TicketQueue variant selector to use Button toggles matching MockupPreview; make it horizontally scrollable (no wrap).
    status: pending
  - id: overflow-minh0
    content: Add min-h-0/overflow constraints to TicketQueue + TranscriptFeed scroll regions so cards don’t expand on overflow.
    status: pending
---

## Goals

- Replace the mockup variant selector (currently chevrons + pills) with a **toggle-nav row** that **horizontally scrolls only when needed** (`overflow-x-auto`) and **never wraps**.
- Remove the left/right arrow buttons entirely.
- Make Ticket Queue “Variant” chips use the **same `Button` styling + size** as the mockup selector and other app buttons.
- Ensure **Ticket Queue list** and **Transcript feed** never force their parent cards to grow when content overflows; instead, the **scrollbars appear inside** the cards.

## What I’m changing

### 1) Mockup Preview: toggle navigation + horizontal scroll (no arrows)

- File: [`client/src/components/MockupPreview.tsx`](/Users/danielkumlin/Projects/oncall/client/src/components/MockupPreview.tsx)
- Current behavior to replace:
  - The selector uses chevrons:
```112:147:/Users/danielkumlin/Projects/oncall/client/src/components/MockupPreview.tsx
{variants.length > 1 && (
  <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-muted/30">
    <Button variant="ghost" size="sm" ...>
      <ChevronLeft ... />
    </Button>
    <div className="flex items-center gap-2"> ... </div>
    <Button variant="ghost" size="sm" ...>
      <ChevronRight ... />
    </Button>
  </div>
)}
```

- New implementation:
  - Remove `ChevronLeft`/`ChevronRight` imports and the two arrow `Button`s.
  - Make the selector row a left-aligned “tabs/toggles” strip:
    - Container: `overflow-x-auto`, `overflow-y-hidden`, `whitespace-nowrap`, `[-webkit-overflow-scrolling:touch]` (optional), and `flex-nowrap`.
    - Buttons: use shared `Button` component for every variant.
      - **Selected**: `variant="default"` (filled)
      - **Unselected**: `variant="link"` (your selection; avoids “ghost”) + same `size="sm"` so height/padding matches app buttons.
      - Add `className="rounded-full"` if we want the pill look to remain.

### 2) Ticket Queue: variants use the same Button styling + size and don’t wrap

- File: [`client/src/components/TicketQueue.tsx`](/Users/danielkumlin/Projects/oncall/client/src/components/TicketQueue.tsx)
- Current variant chips are plain `<button>` and will wrap (growing the ticket card):
```123:143:/Users/danielkumlin/Projects/oncall/client/src/components/TicketQueue.tsx
{ticket.mockupVariants.length > 0 && (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-xs text-muted-foreground">Variant:</span>
    {ticket.mockupVariants.map((variant, index) => (
      <button ... className={`px-2 py-0.5 rounded text-xs ...`}>...</button>
    ))}
  </div>
)}
```

- New implementation:
  - Replace those `<button>`s with `<Button size="sm">` using the same selected/unselected mapping as MockupPreview.
  - Make the variants region **horizontally scrollable** instead of wrapping:
    - Wrap the chips in a `div` like: `flex-1 min-w-0 overflow-x-auto`.
    - Chips container: `flex items-center gap-2 flex-nowrap`.
    - This keeps the TicketItem height stable and introduces a horizontal scrollbar only when needed.

### 3) Overflow hardening: keep card sizes fixed; scroll inside

- Files:
  - [`client/src/components/TicketQueue.tsx`](/Users/danielkumlin/Projects/oncall/client/src/components/TicketQueue.tsx)
  - [`client/src/components/TranscriptFeed.tsx`](/Users/danielkumlin/Projects/oncall/client/src/components/TranscriptFeed.tsx)
- Adjustments:
  - Ensure scroll regions have `min-h-0` so they can shrink inside flex parents:
    - TicketQueue list area: change `className="flex-1 overflow-y-auto"` → `className="flex-1 min-h-0 overflow-y-auto"`.
    - TranscriptFeed scroll area: change `className="flex-1 overflow-y-auto ..."` → `className="flex-1 min-h-0 overflow-y-auto ..."`.
  - If needed, add `overflow-hidden` on card roots (they already behave well, but this prevents any accidental bleed when children overflow).

## Acceptance checks

- Mockup variants show as a single-row toggle nav; no chevrons; scroll horizontally when there are many variants.
- Ticket Queue variant toggles match the mockup toggles and are the same height as other small buttons (`size="sm"`).
- Long variant lists don’t wrap and don’t increase card height; they scroll horizontally.
- Transcript and Ticket Queue remain the same card size inside the main grid; their content scrolls internally.