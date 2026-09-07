---
name: gmeet-ai-backend
description: Backend architecture for the Google Meet AI meeting assistant. Use when implementing or changing auth, Prisma/Postgres schema, meeting session state, Chrome extension streaming, Meet REST/Events adapters, STT, AI orchestration, realtime WebSocket events, search, exports, retention/deletion, security, or provider abstractions. Enforces dual-path ingestion, evidence-linked structured AI output, and no raw transcript in logs.
---

# GMeet AI Backend

Implement the meeting memory backend. Product contract: `.cursor/skills/gmeet-ai-product/SKILL.md`. UI consumes this API; do not invert the contract for display convenience.

Also read:

- Data model: [schema.md](schema.md)
- AI pipeline: [ai-pipeline.md](ai-pipeline.md)
- Meet / STT / extension: [integrations.md](integrations.md)

## Stack

Next.js (App Router) + TypeScript for web + API · PostgreSQL + Prisma · Redis for ephemeral realtime/queues · object storage only if the user enables audio persistence · authenticated WebSocket (or managed realtime) · Google OAuth.

Workers: `stt/`, `ai/`, `exports/` as separate orchestrations, even if they start in-process.

## Architecture

```
Browser / Chrome Extension
        | HTTPS + secure realtime
        v
Next.js  (auth, dashboard APIs, WS gateway)
        |
   Meeting Adapter          Session Manager
   (Meet REST / Events /    (state, consent,
    extension handshake,     reconnect, source mode)
    manual import)
        |
        v
Audio / Transcript Bus
        |
   STT Worker          AI Orchestrator
        |                     |
        v                     v
        Meeting State Store (Postgres + Redis)
        |
        v
Search / Exports / Retention jobs
```

Keep **capture, STT, and LLM behind interfaces**. Product logic never imports a vendor SDK directly in route handlers.

## Service boundaries

| Service | Owns | State |
|---|---|---|
| Web app | Auth, meeting CRUD, settings | Stateless + DB |
| Meeting adapter | Source normalization | Source metadata only |
| Realtime gateway | Authed transcript/status transport | Ephemeral |
| STT worker | Streaming recognition, finalization | Buffers + final segments |
| AI orchestrator | Windowing, prompts, validate, merge | Meeting state |
| Meeting store | Users, meetings, transcript, notes, audit | Postgres |
| Export worker | Docs, webhooks, tasks | Queue-backed |

## Session state machine

Canonical statuses. Persist on `Meeting.status`. Emit realtime events on every transition.

```
created → awaiting_consent → connecting → live
                              ↘ paused ↗
live|paused → stopping → finalizing → ready
any active → degraded (STT/transport issues; stay in session)
any → failed (unrecoverable)
ready|failed → (retention) deleted
```

Rules:

- Capture audio/transcript only in `live`.
- `awaiting_consent` cannot be skipped. Write `ConsentEvent` before `live`.
- Pause is not stop: buffers may hold, no new STT finals, AI does not invent from silence.
- Finalize is idempotent. Repeat stop/finalize must not duplicate segments or AI revisions.
- Reconnect within 10s target must not create a second meeting row for the same live session.

## Internal API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/meetings` | Create session |
| GET | `/api/meetings` | List `?status=&from=&to=` |
| GET | `/api/meetings/:id` | Detail |
| POST | `/api/meetings/:id/start` | Start after consent |
| POST | `/api/meetings/:id/stop` | Stop |
| POST | `/api/meetings/:id/pause` | Pause |
| GET | `/api/meetings/:id/transcript` | Segments |
| GET | `/api/meetings/:id/notes` | Current/final AI state |
| PATCH | `/api/meetings/:id/actions/:actionId` | Edit/confirm action |
| POST | `/api/meetings/:id/export` | Export job |
| GET | `/api/search?q=` | Search notes/transcript |
| WS | `/realtime/meetings/:id` | Live events |

Authorization: every path checks user/org ownership. Tokens never sent to frontend JS beyond session mechanics. Provider tokens encrypted at rest (KMS or equivalent).

## Realtime events

`meeting.connected` `meeting.disconnected`
`capture.started` `capture.paused` `capture.resumed` `capture.stopped`
`participant.joined` `participant.left`
`transcript.interim` `transcript.finalized`
`ai.state.updated` `ai.decision.detected` `ai.action_item.detected`
`processing.warning` `processing.error`
`meeting.finalized`

Events are idempotent (event id + meeting id + seq). Interim transcript is **not** persisted. Only `transcript.finalized` writes `TranscriptSegment`.

## STT rules

- Interim + final; finals have timestamps; no duplicate persisted segments.
- Speaker labels mapped to `Participant`; identity is a separate field from text.
- Connection loss: bounded buffer + `degraded` + `processing.warning`.
- Adapter enforces provider audio format (~100ms frames is the documented practical tradeoff).
- Language stored on the meeting.

Latency budget (healthy path): STT 3–5s typical · normalize < 1s · extract < 4s · merge < 500ms · UI < 1s · final synthesis < 120s typical.

## Security (always)

- Least-privilege Google scopes.
- TLS; secure WebSocket.
- No raw transcript/audio in application logs.
- No secrets in source control.
- Tenant isolation: org-scoped queries; tests for IDOR.
- Deletion jobs observable and retryable.
- Default: do not persist raw audio. Transcript + notes persist. Audio only if user enables recording storage.
- Account deletion revokes Google connections and cascades per policy.
- Meet REST conference records expire (~30 days); **never** treat Google as permanent storage.

## Observability

Per-session trace id spanning capture → STT → AI → persist.

Metrics: active sessions, audio bytes, transcript lag, AI latency, token usage, errors, reconnects.

Error categories: `auth` `source` `transport` `stt` `ai` `db` `export`.

Never log payload text from transcript or model prompts that include transcript.

## Analytics events (product)

Emit: `signup_completed` `integration_connected` `extension_installed` `assistant_started` `assistant_stopped` `transcript_finalized` `ai_note_generated` `action_confirmed` `summary_exported` `meeting_revisited`.

Do not include transcript bodies in event properties.

## Engineering order (when scaffolding)

1. Schema + auth + session state machine + consent audit
2. Extension handshake + STT + persist finals + realtime
3. AI extract/merge/validate + live notes projection
4. Finalize synthesis + history
5. Meet REST artifact sync as parallel source mode
6. Search, retention jobs, export copy (Markdown)

Do not start with Docs/Slack/CRM integrations.
