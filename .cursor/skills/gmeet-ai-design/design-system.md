# Design System

App surfaces: **shadcn/ui + Tailwind semantic tokens + lucide-react**.
Marketing landing: same tokens; more editorial layout allowed.

Do not introduce a custom color palette, custom CSS files, or hardcoded hex in components. If a recording-state token is needed, add it as a semantic CSS variable in the theme (`--recording`) and use it everywhere.

## Character

Calm, precise, high-trust. Closer to a professional notes tool than a generative-AI playground.

- One strong accent for primary actions (Google sign-in, Start, confirm).
- One unmistakable recording treatment (persistent indicator). Everything else is quiet.
- Density: dashboard and meeting workspace are information-dense; landing is spacious.
- Radius, border, and shadow follow shadcn defaults. Do not invent a second elevation language.

## Typography

Use the project shadcn/font setup (likely Geist or Inter). One family. No display fonts in the app shell.

| Role | Treatment |
|---|---|
| Page title | `text-2xl` / `text-3xl` tracking-tight |
| Section (Summary, Decisions) | `text-sm font-medium` uppercase tracking is allowed only for status, not for section titles |
| Body / summary | `text-sm` leading-relaxed |
| Transcript | `text-sm` tabular timestamps `font-mono text-xs text-muted-foreground` |
| Interim transcript | `text-muted-foreground` + lower contrast; never bold |
| Meta | `text-xs text-muted-foreground` |

## Color semantics

| Token | Use |
|---|---|
| `background` / `foreground` | App canvas and primary text |
| `muted` / `muted-foreground` | Interim transcript, meta, secondary |
| `border` / `input` | Hairlines, inputs |
| `primary` | Start, confirm, Google continuation (keep accessible) |
| `destructive` | Stop, delete account, irreversible |
| Recording indicator | Dedicated semantic token or `destructive` — must pass contrast on both themes |
| `secondary` / `accent` | Quiet chrome, not competing CTAs |

Dark mode from day one via semantic tokens. No `dark:` color overrides on app chrome.

## Capture indicator

Must be readable in one second, in both themes, and in the extension badge.

- Filled state + short text label (`Transcribing`), not color-only.
- Pulse/animation only if `prefers-reduced-motion: no-preference`. Reduced motion: static indicator.
- Do not reuse the recording treatment for unrelated "live" decorations (AI thinking, typing dots on summary).

## Layout

- App shell: sidebar or top nav from shadcn; meetings are the home object.
- Content width: dashboard comfortable (`max-w-6xl`); live workspace uses remaining viewport, not a narrow reading column.
- Live workspace: CSS grid two columns, transcript scroll independent of notes scroll.
- Status bar: sticky bottom or top of the live workspace, not a floating FAB that hides Stop.

Spacing: Tailwind 4px scale. Prefer `gap-*` flex/grid. No `space-y-*` / `space-x-*`.

## Motion

- Transcript append: no bounce. Optional 150ms fade if motion allowed.
- Evidence highlight: 1.5s fade of a background token, or instant under reduced motion.
- No layout jump when AI panels update; reserve structure (lists grow, they do not reshuffle chaotically). Merge/dedupe in place.

## Components to prefer (shadcn)

Button, Card, Dialog, Sheet, Alert, Badge, Tabs, Table, Sidebar, Scroll Area, Separator, Avatar, Skeleton, Empty, Tooltip, Dropdown Menu, Input, Textarea, Sonner (rare — not for every AI event).

Live transcript may use shadcn chat/message primitives if they fit a speaker lane. Do not fake a consumer chat bubble stack if it hurts scanability; a speaker + timestamp + text row is the default.

## States

Every interactive view needs: default, hover, focus-visible, disabled, loading (Skeleton), empty (Empty), error (Alert), offline, permission-denied.

## Iconography

lucide-react only. Recording, pause, stop, shield/privacy, link-2 for evidence. Do not use cartoon AI sparkles as the product mark on live capture screens.
