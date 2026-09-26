# UI GUIDELINES — StockSense

Goal: look like a professional ERP (Odoo, Linear, Notion) — not like a generic AI-generated
dashboard. When in doubt, remove decoration rather than add it.

## Non-negotiables
- Background: `#FFFFFF` primary, `#FAFAFA` for subtle section separation. No dark mode default.
- Text: near-black `#1A1A1A` for primary, `#6B7280` for secondary/muted.
- **One** accent color for primary actions and active states — pick a single muted color
  (e.g. deep indigo `#3F3F9E` or forest `#2F5D50`), used sparingly. Everything else is grayscale.
- No neon, no purple-to-pink gradients, no glassmorphism/blur panels, no glowing shadows,
  no emoji in the interface copy, no illustrations or 3D icons, no stock photography.
- Font: **Inter** or **IBM Plex Sans** only. Weight scale 400/500/600 — no ultra-bold hero text.
- Spacing: 8px base scale (8/16/24/32/40...). Every panel's padding and gaps should be
  multiples of 8px so the grid reads as intentional, not arbitrary.
- Layout: symmetric — matching left/right padding, aligned column widths across list views,
  consistent card sizes on the Dashboard. No off-center hero sections.
- Icons: Lucide, line-style, single weight, same size within any given context.
- Tables (Receipts, Delivery, Move History): dense, bordered rows, right-aligned numeric
  columns, status as a small colored text label or thin pill — not a big glossy badge.
- Status colors: Draft = gray, Waiting = amber, Ready = blue, Done = green, Cancelled = muted
  red-gray, Late (Move History) = red. Keep these exact meanings consistent everywhere.

## Process rule for Antigravity
The first time any component type appears (KPI tile, table row, kanban card, modal, form group,
nav item, filter chip), stop before coding it and describe 2–3 short layout options in text.
Wait for a choice. After a component type has been approved once, reuse that exact pattern
everywhere else it appears — don't re-litigate it each time or invent variants.

## Explicitly forbidden
- Auto-generated placeholder avatars, gradient blobs, decorative background shapes
- Card shadows heavier than a 1px border + very subtle drop shadow
- Any "AI assistant" chat bubble or sparkle iconography anywhere in the product UI
- Rounded-full buttons/pills as the default button shape (use small-radius rectangles instead)
