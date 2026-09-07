# Pages and Components

## Route map

| Route | Page | Notes |
|---|---|---|
| `/` | Landing | Value, privacy summary, Continue with Google |
| `/onboarding` | Onboarding | Checklist after first auth |
| `/dashboard` | Dashboard | Recent meetings, paste URL, processing status, install extension CTA |
| `/meetings/[id]` | Live **or** detail | If `live`/`paused`/`connecting`/`finalizing` → live workspace; if `ready` → detail. Same route is fine with a mode switch. |
| `/search` | Search | P1 feature; scaffold later unless requested |
| `/settings` | Settings | Profile, integrations, privacy/retention, deletion |

Auth group: unauthenticated users never see dashboard/meetings.

## Component inventory (compose, don't monolith)

```
components/
  marketing/          landing sections
  onboarding/         checklist steps
  meetings/
    meeting-list.tsx
    meeting-status-badge.tsx
    source-mode-badge.tsx
  live/
    live-workspace.tsx
    status-bar.tsx
    transcript-pane.tsx
    transcript-segment.tsx
    notes-pane.tsx
    decision-item.tsx
    action-item.tsx
    consent-dialog.tsx
  meeting-detail/
    summary-section.tsx
    action-table.tsx
    evidence-link.tsx
  settings/
    privacy-form.tsx
    danger-zone.tsx
```

Reuse `MeetingStatusBadge` and `SourceModeBadge` on dashboard, live bar, and detail.

## Landing

- Outcome-first headline aligned with the product thesis (system of record, decisions, owners) — not "AI that joins your calls."
- Trust block: what is captured, that capture is explicit, audio not stored by default.
- Single primary CTA: Continue with Google.
- Do not bury privacy in footer-only legalese; put a short summary on the page.

## Onboarding checklist

Ordered, skippable only where technically optional:

1. Google connected (done if OAuth succeeded)
2. Install Chrome extension (required for live capture path)
3. Open a Meet and run consent → first transcript

Empty dashboard is the same job as onboarding if the user skipped it.

## Dashboard

- List: title, date, duration, participants, status, source mode
- Quick start: Meet URL field → create session
- Processing status for in-flight meetings (finalizing)
- CTA to resume a live session
- States: loading skeletons, empty (how to start), error, signed-out redirect

## Meeting detail (ready)

Order: header → executive summary → decisions → action table → discussion points → transcript.

Action table columns: task, owner, due, status, evidence.

Confirm/edit inline or in a Dialog. PATCH the backend action. Confirmed items should look confirmed (badge), not identical to proposed.

Copy summary: one button, Markdown/plain text to clipboard, `sonner` success once.

## Search (P1)

Query + date/status filters. Snippets with meeting title and timestamp. Result click → detail with evidence hash/query so the segment can be focused.

## Settings

- Profile (from Google): read-mostly
- Integrations: Google connection, re-auth
- Privacy: retention explanation (CONS-05), audio storage off by default
- Delete account: Dialog with consequence copy, then AUTH-03 flow

## Extension popup

- If not Meet tab: explain to open a meeting
- If Meet tab and idle: Start Assistant → opens consent in web app or in-page checkpoint, then capture
- If capturing: state, Pause, Stop, link to live workspace
- Health: connected / reconnecting

In-tab indicator: compact, persistent, accessible name matching status bar state.

## Shared status vocabulary

Use these strings in UI (do not paraphrase per page):

- Not recording
- Transcribing
- Paused
- Finalizing
- Transcription degraded

Source: `Meet API` · `Browser capture` · `Manual import`
