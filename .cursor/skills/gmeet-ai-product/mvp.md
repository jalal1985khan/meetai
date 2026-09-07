# MVP Cut Line

## P0 in scope

- Google OAuth sign-in; secure token storage/refresh; account deletion
- Meet URL / session association; list recent/supported conference records when available
- Chrome extension (Manifest V3) for user-authorized supported-tab capture
- Consent/disclosure before capture; persistent capture state; Stop/Pause; consent audit event
- Realtime STT with interim + final segments; persist finalized segments
- Live transcript UI with timestamps and speaker metadata separate from text
- Rolling AI summary, decisions, and action items (evidence-linked, no unsupported facts)
- Post-meeting executive summary, decisions list, action table, key discussion points
- Meeting history; open meeting details; basic search
- Edit/confirm action items; copy summary as formatted text/Markdown
- Basic privacy settings, deletion, retention
- Operational metrics and error reporting
- Manual import fallback

## Explicitly deferred

- Meet Media API as primary path
- Google Docs native export (P2)
- Slack / Teams / CRM / task-system export (P2)
- Webhook/API for downstream systems (P2)
- Advanced enterprise admin, SSO, billing
- Custom note templates / org taxonomies (SUM-06 is P2)
- Automatic scheduling / attendance agent
- Audio playback and full recording library
- Multi-language UI (language **metadata** on meetings is P1)
- Transcript keyword search is P1 (history list is P0; global search P1)

## Phases

| Phase | Capabilities | Exit |
|---|---|---|
| 0 Validation | Prototype capture, STT, AI schema, consent UX | Successful 30–60 min meetings in a controlled environment |
| 1 MVP | Web + extension + live transcript + live notes + final notes | Core KPIs; no critical privacy/security defects |
| 2 Productization | Meet API artifact sync, search, exports, better participant mapping | Reliable post-meeting history for supported Workspace cases |
| 3 Team | Sharing, admin, retention, integrations, usage/billing | Team workflows stable and auditable |
| 4 Native realtime | Evaluate Meet Media API when availability permits | Less extension dependence for eligible customers |
| 5 Intelligence | Cross-meeting memory, insights, proactive follow-up | Proven value beyond single-meeting notes |

## Launch acceptance (must all be true)

- New user signs in with Google and completes onboarding without manual support
- User starts a supported Meet session via the chosen MVP capture mode after explicit consent
- Live transcript renders with timestamps and stable segment ordering
- AI notes update during the meeting and stay synchronized with transcript state
- Post-meeting summary is generated and persisted
- Action items expose task, owner/due when confidently supported, and provenance
- Edits/confirmations persist
- Users can search and reopen historical meetings
- Deletion and retention work end-to-end
- No critical/high security vulnerabilities open
- Core performance SLOs met in load testing for launch scale
- AI benchmark passes quality thresholds; unsupported-claim rate below launch limit

## Performance SLOs

| Metric | Target |
|---|---|
| Dashboard first interaction | < 2.5s typical broadband |
| Live status update | < 1s median server event → UI |
| Transcript finalized latency | < 5s median healthy capture |
| AI note update | < 10s median from finalized context boundary |
| Post-meeting summary | < 2 min for typical ≤60 min meeting |
| Processing success | ≥ 99% supported sessions excluding provider outages |
| Realtime reconnect | Recover within 10s median after transient loss |

## Cost / monetization constraints on engineering

Meter billable meeting minutes after successful capture. Build cost controls early: max meeting duration, concurrency limits, AI update frequency, model routing, batch final synthesis. Do not stream the full transcript to the LLM on every live update.
