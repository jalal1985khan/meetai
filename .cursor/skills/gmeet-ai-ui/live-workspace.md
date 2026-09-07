# Live Meeting Workspace

Canonical in-meeting UI. Requirement coverage: TR-01, AI-01–03, CONS-01–03, MEET-04.

## Layout

Desktop: CSS grid, two columns, full remaining viewport height under the app shell.

```
+------------------+------------------+
| Transcript       | Notes            |
| speaker/time/text| Summary          |
| (scroll)         | Decisions        |
|                  | Action items     |
+------------------+------------------+
| Status bar: state · source · health · Pause · Stop
```

Narrow: `Tabs` — **Notes** default, **Transcript** second. Status bar remains visible (sticky).

Do not put Stop only in the tab that is off-screen.

## Transcript pane

Each finalized row:

- Timestamp (`mm:ss` from meeting start or clock — pick one per meeting and stick to it)
- Speaker control (button): shows `Participant N` or mapped name; click to correct (Dialog or inline)
- Text

Interim: one ghost row at the bottom, muted, replaced when finalized. Never insert interim into the persisted list.

Auto-scroll to bottom while the user is pinned to live. If they scroll up, pause auto-scroll and show a `Jump to latest` button. Resume auto-scroll when they jump or scroll to bottom.

Pin moment (if implemented): stores a pointer to the current last finalized `seq`.

Search-in-transcript (P1): filter/highlight in this pane only.

## Notes pane

Sections in this order:

1. Summary (rolling paragraph)
2. Decisions (list)
3. Action items (list or compact table)

Questions and risks: hide the section when empty on MVP if P1 is not built; do not show "None detected" spam during the first minutes.

Item row:

- Title/task
- Confidence only if not high (don't badge everything)
- Owner / due if present, else omit the fields (do not show "TBD" as if the AI guessed)
- Evidence control (icon + timestamp)

Updates replace by entity id. New items append. Do not flash the whole panel.

During `Finalizing`, notes stay visible and show a non-blocking "Writing final summary…" in the status bar or section header.

## Status bar

Sticky to the live workspace.

| Control | Component | Notes |
|---|---|---|
| State | Badge + text | Includes degraded |
| Source | Badge | MEET-04 |
| Health | Muted text | Connected / Reconnecting |
| Pause | Button outline | Toggles Resume when paused |
| Stop | Button destructive | Stops capture; may confirm |

Consent is **not** in this bar. Consent is a Dialog before the first `start`.

## Consent dialog

`Dialog` with title `Start meeting assistant`. Body from design copy rules. Primary `Start transcribing` calls `POST .../start`. Cancel leaves the meeting row in `awaiting_consent` or deletes/cancels per backend rules — do not start capture.

## Realtime wiring

Subscribe to `WS /realtime/meetings/:id` after the meeting is created.

| Event | UI |
|---|---|
| `transcript.interim` | Update ghost row |
| `transcript.finalized` | Append row, clear ghost if overlapping |
| `ai.state.updated` | Replace notes snapshot by version (ignore stale versions) |
| `capture.paused/resumed/stopped` | Status bar |
| `processing.warning/error` | Alert in bar or banner, not a modal unless unrecoverable |
| `meeting.finalized` | Navigate/switch to detail mode |

Reconcile with HTTP `GET transcript` / `GET notes` on reconnect so missed events do not corrupt order. Segments keyed by `id`/`seq`.

## Evidence jump

On item activate:

1. If on narrow notes tab, switch to transcript tab
2. Scroll segment into view (`scrollIntoView({ block: "center" })`)
3. Set highlight on that `seq` until timeout or reduced-motion instant

If id missing from loaded segments, fetch that window or show `Alert`: Evidence unavailable.

## States

| State | Transcript | Notes | Bar |
|---|---|---|---|
| awaiting_consent | Empty + hint | Empty | Not recording |
| connecting | Skeleton lines | Skeleton | Connecting |
| live | Streaming | Updating | Transcribing |
| paused | Frozen | Frozen | Paused |
| degraded | May lag | May stall | Transcription degraded |
| finalizing | Frozen finals | Last snapshot + finalizing | Finalizing |
| error | Last good | Last good | Alert + retry/re-auth |

Wrong tab / not Meet is an extension/dashboard problem: `Alert` with how to open a Meet tab, not a fake live workspace.
