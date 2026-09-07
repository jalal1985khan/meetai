---
name: gmeet-ai-product
description: Product source of truth for the Google Meet AI meeting assistant (gmeet-ai). Use when planning, implementing, scoping, reviewing, or deciding what to build — auth, Meet capture, Chrome extension, transcription, live AI notes, post-meeting summary, search, export, privacy, consent, or roadmap. Enforces north star, MVP vs deferred, dual-path ingestion, and trust-first requirements.
---

# GMeet AI Product

This skill is the product contract. Other skills implement it; they do not override it.

Also read:

- Design / UX: `.cursor/skills/gmeet-ai-design/SKILL.md`
- Backend: `.cursor/skills/gmeet-ai-backend/SKILL.md`
- UI implementation: `.cursor/skills/gmeet-ai-ui/SKILL.md`
- Requirement IDs: [requirements.md](requirements.md)
- MVP cut line: [mvp.md](mvp.md)

## Product thesis

Turn live meeting conversations into a reliable, searchable system of record that helps people remember what was said, understand what matters, and leave every meeting with explicit decisions and accountable next steps.

## North star

Every meeting should end with a concise, evidence-linked record of what happened, what was decided, what remains unresolved, and who owns the next action.

The core value is **not transcription**. It is converting unstructured conversation into an actionable meeting record.

## Memory layer model

Treat these as three distinct layers. Never collapse them.

| Layer | Role |
|---|---|
| Transcript | Evidence base. Timestamped. Speaker-separated. User-correctable. |
| AI notes | Structured interpretation of that evidence (summary, decisions, actions, questions, risks). |
| UI | Makes every major claim traceable to a transcript segment. |

If a claim cannot be linked to evidence, omit it or mark it uncertain. Do not present it as fact.

## Dual-path ingestion (non-negotiable)

| Mode | Mechanism | Status |
|---|---|---|
| A. Meet REST artifact | Meet REST API + Workspace Events | Preferred production path when Workspace/permissions allow |
| B. Meet Media API | Real-time Meet media | Future only. Developer Preview with enrollment. **Never the sole MVP dependency.** |
| C. Chrome extension | User-authorized tab audio on a Meet tab | Primary live MVP path |
| D. Manual import | Audio/transcript upload | P0 fallback / recovery |

Always show the user the **source mode**. Handle unsupported configurations explicitly and offer a permitted fallback.

## Goals

- Google sign-in and process a Meet meeting with minimal setup.
- Near-real-time transcript during supported meetings.
- Live structured notes while the meeting is in progress.
- Polished post-meeting summary: decisions, actions, questions, risks, follow-ups.
- Timestamps / source references on AI claims where feasible.
- Edit, correct, export, search, revisit meeting records.
- Explicit consent, least-privilege access, encryption, configurable retention.
- Architecture that can later add native Meet media without rewriting the product.

## Non-goals (MVP)

Do not build:

- Autonomous meeting participation or speaking on the user's behalf
- Emotion recognition, lie detection, personality scoring, employee surveillance
- Automatic legal, medical, or financial advice
- Full recording distribution or media editing
- Platforms other than Google Meet
- Enterprise compliance certifications unless separately scoped

## Personas (build for these jobs)

| Persona | Job | Primary value |
|---|---|---|
| Knowledge worker | Capture decisions, remember context, get follow-ups | Time and memory |
| Manager / team lead | Track decisions, owners, risks, commitments | Accountability |
| Sales / CS | Requirements, objections, commitments, next steps | Follow-up hygiene |
| Product / eng | Rationale, decisions, blockers | Less re-litigation |
| Executive | Outcome-first summaries | Fast context switch |
| Enterprise admin (later) | Data, permissions, retention | Risk and adoption |

Optimize MVP UX for the knowledge worker and manager. Keep admin as a data-model primitive, not a launch surface.

## Trust rules (product, not polish)

1. Explicit user action before capture. Disclosure visible first.
2. Persistent recording/transcribing indicator while active. Status is never ambiguous: `Not recording` / `Transcribing` / `Paused` / `Finalizing`.
3. AI outputs are suggestions until confirmed where ambiguity exists.
4. Never invent speaker, date, customer requirement, commitment, metric, or decision not in the source.
5. Owner and due date are `null` unless explicit in the transcript.
6. Distinguish decisions from suggestions and unresolved discussion.
7. Copy must say what is captured, why it is processed, where it is stored, and how to stop.
8. UI banners are not legal sufficiency. Do not claim they are.

## Working rules for every task

1. Restate the requirement against [requirements.md](requirements.md) IDs. If it is not P0 and not requested, do not expand MVP.
2. Prefer the smallest change that preserves transcript correctness, evidence links, consent, and session-state integrity.
3. Capture, STT, and LLM stay behind provider interfaces. Do not hard-wire a single vendor into product logic.
4. Do not persist raw audio by default. Transcript + derived notes persist; audio only if the user explicitly enables recording storage.
5. Logs must never contain raw transcript or audio.
6. Every protected path checks user/org ownership.
7. Happy path **and** failure path need UI states and observability.
8. When scope is unclear, choose the live Chrome-extension path + post-meeting artifact path, not Media API.

## Success targets (do not silently trade these away)

| Outcome | Launch target |
|---|---|
| Activation | ≥ 60% of signed-in users connect and process a first meeting |
| Transcript availability | ≥ 95% of supported meetings produce a usable transcript |
| AI notes quality | ≥ 90% sampled decisions/actions judged materially correct |
| Live note freshness | Median < 10s from finalized segment to note update |
| Post-meeting readiness | Final summary within 2 minutes of transcript completion |
| Retention | ≥ 35% of activated users process a second meeting within 14 days |

## Definition of done

A feature is done only if:

- Implemented with tests and authorization on every protected endpoint
- Logs contain no raw transcript/audio
- Happy and failure paths are observable
- UX has loading, empty, error, offline, and permission-denied states where relevant
- AI prompts and model versions are stored with generated outputs
- Migrations are reversible or have a documented rollback
- Accessibility and supported-browser checks pass for UI work
