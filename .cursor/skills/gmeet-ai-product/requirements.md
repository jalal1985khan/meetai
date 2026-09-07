# Functional Requirements

Priority: P0 = MVP, P1 = soon after, P2 = later. Implement P0 unless the user explicitly asks for P1/P2.

## Auth and account

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| AUTH-01 | Google OAuth sign-in | P0 | Sign in to dashboard; no local password |
| AUTH-02 | Store provider tokens securely; refresh/revocation | P0 | Expired tokens refresh or user gets re-auth |
| AUTH-03 | Account deletion | P0 | Removes or schedules removal per policy |
| AUTH-04 | Workspace membership model | P1 | User can belong to an org/workspace |

## Meeting discovery and connection

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| MEET-01 | List recent/supported conference records | P0 | Dashboard shows authorized meetings |
| MEET-02 | Paste/enter Meet URL as fallback | P0 | Session associated with a meeting URL |
| MEET-03 | Detect eligible active Meet tab in extension | P0 | Supported Meet pages offer Start Assistant |
| MEET-04 | Show source mode | P0 | User always knows Meet API / browser capture / manual import |
| MEET-05 | Handle unsupported configs explicitly | P0 | Explains limitation; offers permitted fallback |

## Consent and recording state

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| CONS-01 | Disclosure before audio/transcript capture | P0 | Capture starts only after disclosure is visible and user confirms |
| CONS-02 | Persistent recording/transcribing indicator | P0 | Visible throughout capture |
| CONS-03 | Stop/Pause | P0 | Capture halts within target latency |
| CONS-04 | Store consent/audit event | P0 | Who initiated capture, when, session ID |
| CONS-05 | Privacy settings and retention controls | P1 | User can view current retention behavior |

## Transcript

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| TR-01 | Live transcript segments with timestamps | P0 | Updates continuously in realtime mode |
| TR-02 | Persist finalized segments | P0 | Reload restores finalized transcript |
| TR-03 | Speaker identity separate from raw text | P0 | Correct speaker without rewriting text |
| TR-04 | Transcript search | P1 | Keyword search returns timestamped segments |
| TR-05 | Manual text correction | P1 | Edits recorded as modified |
| TR-06 | Language metadata | P1 | Stored per meeting; optional override |

## Live AI notes

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| AI-01 | Rolling summary | P0 | Refreshes after sufficient new context |
| AI-02 | Detect decisions | P0 | Only with explicit or high-confidence commitment evidence |
| AI-03 | Detect action items | P0 | Task, owner when inferable, due when inferable, status, evidence |
| AI-04 | Detect questions/open issues | P1 | Separate from confirmed decisions |
| AI-05 | Detect blockers/risks | P1 | Reason/evidence and confidence |
| AI-06 | Prevent unsupported hallucinated facts | P0 | Omit or flag uncertain items |
| AI-07 | Evidence link/timestamp | P1 | Click opens transcript region |

P0 implementation should still attach evidence IDs in data even if the click-through UI is P1.

## Post-meeting summary

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| SUM-01 | Executive summary | P0 | Readable without transcript |
| SUM-02 | Decisions list | P0 | Distinct from discussion topics |
| SUM-03 | Action item table | P0 | Owner/task/due/status structured |
| SUM-04 | Key discussion points | P0 | Grouped, de-duplicated |
| SUM-05 | Follow-ups / next-meeting suggestions | P1 | Labeled suggestions, not facts |
| SUM-06 | Regeneration with note style | P2 | Optional templates |

## History and search

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| HIST-01 | List meetings | P0 | Date, duration, title, participants, status |
| HIST-02 | Search transcript and notes | P1 | Across user-authorized meetings |
| HIST-03 | Filter by date and status | P1 | Correct records |
| HIST-04 | Open details from result | P0 | Navigates to summary + evidence |

## Export

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| EXP-01 | Copy summary as formatted text/Markdown | P0 | One-click clean output |
| EXP-02 | Export to Google Docs | P2 | Creates a document |
| EXP-03 | Export actions to task systems | P2 | Retains owner/due when supported |
| EXP-04 | Webhook/API | P2 | Finalized meeting event payload |
