# Data Model

Prisma/Postgres. IDs are opaque (cuid/uuid). Soft-delete only if retention policy requires a recoverable window; otherwise hard-delete on policy.

## Entities

| Entity | Key fields | Purpose |
|---|---|---|
| User | id, googleSubject, email, name, createdAt | Account |
| Organization | id, name, plan, createdAt | Workspace boundary |
| Membership | orgId, userId, role | AuthZ |
| IntegrationAccount | id, userId, provider, accessTokenRef, refreshTokenRef, scopes | Encrypted token refs, never raw tokens in this table plaintext |
| Meeting | id, userId, orgId, provider, externalMeetingId, meetUrl, title, startedAt, endedAt, status, sourceMode | Canonical meeting |
| Participant | id, meetingId, externalParticipantRef, displayName, email, speakerLabel | Mapping; speakerLabel is correctable |
| TranscriptSegment | id, meetingId, participantId, seq, text, startAt, endAt, language, isFinal, source, modifiedAt? | Atomic evidence |
| MeetingState | meetingId, version, summary, topicsJson, decisionsJson, actionsJson, questionsJson, risksJson | Current snapshot |
| Decision | id, meetingId, title, description, confidence, status | Structured decision |
| ActionItem | id, meetingId, task, ownerParticipantId, dueAt, confidence, status | Commitment |
| EvidenceLink | id, entityType, entityId, transcriptSegmentId | Provenance |
| AIRevision | id, meetingId, revisionNo, model, promptVersion, outputJson, createdAt | Reproducible history |
| ConsentEvent | id, meetingId, userId, eventType, timestamp, metadataJson | Audit |
| ExportJob | id, meetingId, destination, status, resultRef | Async export |
| AuditEvent | id, orgId, userId, actorId, action, resourceType, resourceId, createdAt | Security audit |

## Meeting.sourceMode

`meet_api` | `browser_capture` | `manual_import`

(Future: `meet_media` — do not use for MVP.)

## Meeting.status

`created` `awaiting_consent` `connecting` `live` `paused` `stopping` `finalizing` `ready` `degraded` `failed` `deleted`

## ActionItem.status

`proposed` | `confirmed` | `completed`

User PATCH may set confirmed/completed and correct task/owner/due. Record that the row was user-edited.

## Decision.status

`proposed` | `confirmed` | `withdrawn` (withdrawn if later transcript contradicts and validator flags it)

## TranscriptSegment.source

`stt_stream` | `meet_api` | `import` | `user_edit`

User text edits (P1) set source `user_edit` and keep prior text in revision/audit if required — do not silently overwrite evidence history.

## Lifecycle

1. Create meeting + session metadata **before** processing.
2. Consent event before capture.
3. Stream audio; do not persist audio by default.
4. Persist segment only when `isFinal`.
5. Version `MeetingState` on each accepted AI merge (`version` monotonic).
6. Final synthesis writes a new `AIRevision` and snapshot.
7. Index for search after ready.
8. Retention job deletes transcript, notes, artifacts per policy. Derived metadata must not survive a full-deletion policy.
9. Account deletion: revoke integrations, cascade or anonymize per legal requirements.

## Google artifact caveat

Conference records on Meet REST expire (documented ~30 days after end). Copy anything we need into our store. Track transcript source and version; Google Docs transcripts and API `TranscriptEntry` can differ.

## Indexes (minimum)

- Meeting: `(userId, startedAt desc)`, `(orgId, startedAt desc)`, `status`
- TranscriptSegment: `(meetingId, seq)`, `(meetingId, startAt)`
- ActionItem / Decision: `meetingId`
- EvidenceLink: `(entityType, entityId)`, `transcriptSegmentId`

## Authorization

Queries always scoped by `userId` or `orgId` via membership. Never fetch meeting by id alone.
