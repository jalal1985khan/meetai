---
name: gmeet-ai-ui
description: UI implementation for the Google Meet AI meeting assistant. Use when building or changing Next.js pages, shadcn components, landing, onboarding, dashboard, live meeting workspace, transcript viewer, AI notes panels, meeting detail, search, settings, Chrome extension popup/indicator, capture status bar, evidence jump, or loading/empty/error/offline/permission-denied states. Follows the design skill and shadcn rules; verifies in the browser.
---

# GMeet AI UI

Implement the interface. Do not invent product behavior — read product + design first.

1. `.cursor/skills/gmeet-ai-product/SKILL.md`
2. `.cursor/skills/gmeet-ai-design/SKILL.md` and its references
3. This skill
4. Backend contracts when wiring data: `.cursor/skills/gmeet-ai-backend/SKILL.md`

Also read:

- Page and component map: [pages.md](pages.md)
- Live workspace: [live-workspace.md](live-workspace.md)

## Stack

- Next.js App Router, React, TypeScript, Tailwind
- shadcn/ui for all app/dashboard UI (and follow the shadcn skill when adding components)
- lucide-react icons
- React Hook Form + Zod for forms
- TanStack Query for server state; realtime via WebSocket subscription for live meetings
- Chrome extension UI: Manifest V3 popup + in-tab indicator, same visual tokens as the web app as far as extension constraints allow

Target structure (match unless the repo already differs):

```
apps/web/app/(auth)/ dashboard/ meetings/[id]/ search/ settings/ api/
apps/web/components/ lib/
extension/ manifest.json src/background content/ capture/ popup/
packages/contracts schemas ui providers
```

## shadcn hard rules

- Semantic tokens only (`bg-background`, `text-muted-foreground`). No raw `bg-blue-500`.
- `className` for layout, not re-styling component colors/type.
- `flex`/`grid` + `gap-*`. No `space-x-*` / `space-y-*`.
- `cn()` for conditionals.
- Compose existing components before custom markup. Empty → `Empty`. Loading → `Skeleton`. Callout → `Alert`. Toast → `sonner` (sparingly).
- Dialog/Sheet/Drawer always have a Title (sr-only if needed).
- Check `npx shadcn@latest info` / `docs` / `search` before inventing a component.
- Dark mode via tokens. No manual `dark:` chrome colors.

## Implementation workflow

```
- [ ] 1. Read design spec for the screen
- [ ] 2. Map to shadcn primitives and existing components
- [ ] 3. Wire real API/realtime — no fake meeting data in production paths
- [ ] 4. Build all states (loading, empty, error, offline, permission-denied)
- [ ] 5. Keyboard, focus, live-region, reduced-motion
- [ ] 6. Verify in the browser end-to-end
```

If the backend is not ready, still type against the real contract (`packages/contracts`). Do not invent a second shape. Feature-flag UI that cannot yet be backed.

## UX invariants (code-level)

- Capture state label is always visible during a session and is not color-only.
- Stop and Pause are reachable without opening a menu on the live page and in the extension while capturing.
- Consent dialog is blocking; Start is the only path into capture.
- Interim transcript is visually de-emphasized; it must not persist as a duplicate once finalized.
- AI panel updates in place. No toast per decision/action.
- Evidence control on an AI item scrolls/highlights the segment. Missing evidence → explicit message.
- Source mode is shown: Meet API / Browser capture / Manual import.
- User can edit/confirm action items; optimistic update then reconcile.

## Accessibility

- Semantic HTML, labeled controls, visible `focus-visible`.
- Status bar and transcript: polite aria-live. Do not aria-live the entire growing transcript as one assertive dump; announce state changes, not every word.
- Contrast AA. Recording indicator has text + icon.
- `prefers-reduced-motion`: no pulse on the recording dot; instant evidence highlight.
- Extension indicator must have an accessible name (`Transcribing`, not "red dot").

## Performance

- Independent scroll panes for transcript vs notes.
- Virtualize transcript if it can grow long (30–60 min meetings).
- Do not re-render the full notes tree on every interim STT token; interim updates stay in the transcript column.

## Browser verification (required for UI work)

Before calling UI done:

1. Exercise the flow as a user (click, type, start/stop, navigate). A screenshot is not verification.
2. Check every route that shares the state you touched.
3. Hunt regressions on dashboard ↔ live ↔ detail.
4. Empty, error, permission-denied, reconnect/degraded.
5. Desktop and a narrow viewport for live meeting (outcomes first).

If browser tools are unavailable, use the closest substitute and say what was not verified.

## Do not

- Mock Google as signed-in without using the real auth path in production code
- Auto-start capture on Meet page load
- Hide Stop
- Render hallucinated sample decisions as placeholder copy in production empty states
- Build a custom modal/dropdown/tabs primitive
