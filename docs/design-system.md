# Design System — Interactive Analytics Dashboard

> Principle: **data first, decoration second**. Glassmorphism is used only on the sticky header, popovers and the mobile drawer — never on data cards.

## 1. Colour tokens

Implemented as CSS variables on `:root` / `.dark` and exposed to Tailwind as `bg-surface`, `text-muted`, `bg-brand`, etc. Because they are variables, theme switching is instant and does not require duplicated class names.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#F4F7FE` | `#0B1437` | page background |
| `--surface` | `#FFFFFF` | `#111C44` | cards, tables, sidebar |
| `--surface-2` | `#F7F9FC` | `#1B254B` | inputs, table stripes, hover |
| `--border` | `#E2E8F0` | `#2A3A6B` | dividers, card borders |
| `--text` | `#1B2559` | `#F4F7FE` | primary text |
| `--text-muted` | `#697A9B` | `#A3AED0` | labels, secondary text |
| `--brand` | `#4318FF` | `#7551FF` | primary actions, active nav, main chart series |
| `--brand-hover` | `#3311DB` | `#8B6DFF` | |
| `--brand-soft` | `#EEEBFF` | `#2A2560` | tinted icon backgrounds |
| `--success` | `#05CD99` | `#05CD99` | positive delta, delivered |
| `--warning` | `#FFB547` | `#FFB547` | pending, low stock |
| `--danger` | `#EE5D50` | `#EE5D50` | negative delta, cancelled |
| `--info` | `#3965FF` | `#3965FF` | processing, links |

**Chart palette (categorical, 6 series, colour-blind tested):**
`#4318FF` violet · `#39B8FF` sky · `#05CD99` teal · `#FFB547` amber · `#EE5D50` rose · `#A3AED0` slate.
Sequential palette for the activity heatmap: brand at 8 % → 100 % opacity.

## 2. Typography

- Font: **Plus Jakarta Sans** (Google Fonts), fallback `Inter, system-ui`.
- Scale: 12 (captions) · 14 (body / table) · 16 (inputs) · 18 (card titles) · 24 (page titles) · 30 (KPI numbers, `font-variant-numeric: tabular-nums`).
- Weights: 400 body, 500 labels, 600 titles, 700 KPI numbers.

## 3. Spacing & radius

- Grid gap: 24 px desktop, 16 px mobile. Card padding 20–24 px.
- Radius: cards 20 px, inputs/buttons 12 px, chips 999 px.
- Shadow: light `0 18px 40px rgba(112,144,176,.12)`; dark: none (borders carry hierarchy).

## 4. Components

| Component | Spec |
|---|---|
| **Sidebar** | 260 px, logo block, grouped nav (Dashboards · Data · System), active item = brand text + left accent bar + `brand-soft` background. Collapses to 76 px icon rail at `lg`, becomes a glass overlay drawer below `md`. User card w/ role badge at bottom. |
| **Header** | Sticky, `backdrop-blur-xl` + 75 % surface. Page title left; global date-range picker, theme toggle, avatar menu right. |
| **KPI card** | Tinted icon circle, muted label, 30 px tabular number, delta chip (▲/▼ + %, green/red) vs previous period, sparkline right. Skeleton while loading. |
| **Chart card** | Title + subtitle, right-side controls (granularity segmented control, series toggles). Fixed 320 px height, `ResponsiveContainer`. Themed tooltip; clickable legend toggles series. |
| **Data table** | Sticky header, sortable columns with direction arrow, avatar cells, status badges, row actions, footer "Showing 1–20 of 2,514" + page-size select + pager. Empty / error / loading states. Horizontal scroll on mobile. |
| **Filter bar** | Debounced search, select dropdowns, active-filter chips with ×, Clear all, Export button. |
| **Buttons** | primary (brand), secondary (surface-2 + border), ghost, danger. Sizes sm/md. Loading spinner state. |
| **Badges** | status → colour map: delivered=success, shipped=info, processing=brand, pending=warning, cancelled/refunded=danger. |
| **Modal / Drawer** | Glass backdrop, 200 ms scale/fade. Drawer from the right for detail views. |

## 5. Theme behaviour

- `darkMode: 'class'`; class applied to `<html>`.
- Order of precedence: localStorage → `prefers-color-scheme`.
- Inline script in `index.html` applies the class **before** first paint (no flash).
- 150 ms colour transition on `background-color, border-color, color`.

## 6. Responsive breakpoints

| Width | Sidebar | KPI grid | Charts |
|---|---|---|---|
| ≥ 1280 | full 260 px | 3–4 columns | side-by-side (2:1) |
| 1024–1279 | icon rail 76 px | 3 columns | side-by-side |
| 768–1023 | hidden → drawer | 2 columns | stacked |
| < 768 | hidden → drawer | 1–2 columns | stacked, fewer ticks, tables scroll |

## 7. Motion

- 150–200 ms `ease-out` for hover / focus / enter.
- Route change: content fades in and rises 8 px (`animate-fade-up`).
- Charts animate on first mount only, not on refetch.
- `prefers-reduced-motion` disables all non-essential animation.
