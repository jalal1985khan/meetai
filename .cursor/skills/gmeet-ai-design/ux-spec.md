# UX Spec

## Journeys

### First-time setup

1. Landing states value and that meeting content may be processed.
2. Continue with Google. Least-privilege scopes. No local password.
3. Dashboard with onboarding checklist: Google connected, extension installed (if live capture enabled), permissions, test capture.
4. User opens Meet, activates assistant.
5. Consent/disclosure checkpoint **before** capture.
6. Assistant connects, shows health, starts transcript/notes when supported.

### In-meeting

1. Status → `Transcribing`.
2. Finalized segments append; interim is de-emphasized and must not look like a second copy of the same line.
3. Speakers: `Participant 1/2` until reliable identity exists; user can correct labels.
4. AI updates summary/decisions/actions on rolling windows — in place, not as a notification stream.
5. User can pin a moment, correct an item, pause, or stop.
6. Connection quality and latency stay visible without dominating the page.

### Post-meeting

1. Capture stops on meeting end or user Stop.
2. Status → `Finalizing`. Transcript normalized.
3. Final synthesis over complete context.
4. Summary page: outcomes first, then discussion, then full transcript.
5. Actions editable, assignable, copy/exportable.
6. Any note item → jump to evidence.
7. Record indexed for later search.

## Page inventory

| Page | Job | Primary components |
|---|---|---|
| Landing | Convert + set privacy expectation | Value, trust summary, Google sign-in |
| Onboarding | Make first successful capture likely | Checklist: Google, extension, permissions, test |
| Dashboard | Resume work / start next meeting | Recent/upcoming, processing status, paste Meet URL, quick start |
| Live meeting | Split attention safely | Transcript, notes, status bar, Pause/Stop |
| Meeting detail | Outcome-first record | Summary, decisions, actions, risks, speakers, transcript, evidence |
| Search | Retrieve past evidence | Query, filters, snippets, jump to meeting |
| Settings | Trust controls | Profile, integrations, privacy, retention, AI prefs |
| Admin (later) | Governance | Members, policies, audit, usage, billing |

## Consent checkpoint (required)

Blocking dialog or full-page step, not a toast.

Must include:

- What is captured (tab audio and/or transcript artifacts — match actual source mode)
- Why (transcript + AI notes)
- Where stored (product servers; audio not stored by default)
- Who can see it (this user / future workspace policy)
- How to stop (Stop in the status bar; closing Meet)
- Primary action: `Start transcribing`
- Secondary: `Cancel`

Confirm writes `ConsentEvent` (CONS-04). Never start capture on page load.

## Status bar (live + extension)

Always visible during a session.

| Slot | Content |
|---|---|
| State | Not recording / Transcribing / Paused / Finalizing / Transcription degraded |
| Source | Meet API / Browser capture / Manual import |
| Health | Connected · Reconnecting · Degraded |
| Actions | Pause/Resume, Stop |

Stop is destructive to the live stream but expected; confirm only if needed to prevent misclick, never hide it.

## Evidence interaction

- Each decision/action stores `evidenceSegmentIds`.
- Click/keyboard activates the left transcript (or detail transcript), scrolls the segment into view, and highlights it briefly (honor reduced motion: static highlight).
- If the segment is missing, show "Evidence unavailable" rather than jumping nowhere.

## Empty / error catalog (minimum)

| Situation | User sees |
|---|---|
| No meetings yet | How to start: paste URL, open Meet, install extension |
| Wrong tab / not Meet | Unsupported page; how to open a Meet tab |
| Permission denied | What was denied and how to retry |
| Token expired | Re-authenticate with Google |
| Unsupported meeting config | Limitation + fallback (import or artifact mode) |
| STT/provider outage | Degraded state; transcript may lag; do not fake notes |
| Reconnect | Buffered; recover without duplicate finalized segments |
| Finalizing | Progress, not a blank page |
| Search no hits | Clear empty; do not invent meetings |

## Extension UX

Narrow, permissioned, Manifest V3.

- Detect supported Meet tabs only.
- Offer Start Assistant on those tabs.
- Request tab media only on explicit start.
- Compact capture indicator while active.
- Pause/Stop in popup and in-page indicator.
- Never capture unrelated tabs or persist background audio after Stop.

## Content hierarchy on meeting detail

1. Title, time, duration, participants, source mode, processing status
2. Executive summary
3. Decisions
4. Action items (task, owner, due, status, evidence)
5. Key discussion points
6. Questions / risks (when in scope)
7. Follow-ups labeled as suggestions
8. Full transcript
