---
name: gmeet-ai-design
description: Product and UX design for the Google Meet AI meeting assistant. Use when designing, redesigning, or reviewing landing, onboarding, dashboard, live meeting workspace, meeting detail, search, settings, consent/disclosure, capture status, evidence linking, empty/error states, or visual direction. Researches comparable meeting products, then defines a trust-first design system before UI implementation.
---

# GMeet AI Design

Act as senior product designer for this meeting assistant. Do not jump to code. Design for **trust and outcomes**, not for "AI chrome."

Product contract: `.cursor/skills/gmeet-ai-product/SKILL.md`
UI implementation (after this skill): `.cursor/skills/gmeet-ai-ui/SKILL.md`

Also read:

- Journeys, pages, states: [ux-spec.md](ux-spec.md)
- Visual system: [design-system.md](design-system.md)

## Workflow

```
- [ ] 1. Understand the job and constraint
- [ ] 2. Research comparable products
- [ ] 3. Lock information architecture and states
- [ ] 4. Define visual direction
- [ ] 5. Specify interaction details
- [ ] 6. Hand off to UI skill / implement
- [ ] 7. Critique and elevate
```

### 1. Understand the job

Identify: which persona, which journey (first-run / in-meeting / post-meeting), which requirement IDs, what must never be ambiguous (capture state, source mode, consent).

Default: knowledge worker in a live Meet, splitting attention between conversation and the assistant.

### 2. Research comparable products

Search current UI of 3–5 products before inventing layout. Capture what to borrow and what to reject.

Study at least:

- Google Meet native recording/transcription indicators (status must feel as serious as Meet's own)
- Otter, Fireflies, Grain, Fathom, Notion AI Meeting Notes, Zoom AI Companion

Borrow: outcome-first summaries, evidence timestamps, quiet live updates, speaker lanes, post-meeting action tables.
Reject: playful AI mascots, celebratory toasts on every extraction, hidden recording state, unverifiable "insights," surveillance-coded language.

Cite sources with links in the design writeup.

### 3. Lock IA and states

Primary pages: Landing, Onboarding, Dashboard, Live Meeting, Meeting Detail, Search, Settings.

Every screen that can capture or process meeting content must answer:

- Are we capturing right now?
- How is data being obtained? (Meet API / browser capture / import)
- How do I stop?
- What will other participants be able to infer?

Required capture states — never invent extra cute names:

`Not recording` · `Transcribing` · `Paused` · `Finalizing` · `Transcription degraded`

### 4. Visual direction

Follow [design-system.md](design-system.md). App/dashboard surfaces use shadcn/ui + Tailwind semantic tokens. Marketing/landing may be more editorial but must share trust language and Google sign-in.

This product should feel like a **calm system of record** (closer to Linear/Notion discipline) with one loud signal: recording/transcription status.

### 5. Interaction principles

**Outcome-first.** When space is tight, decisions and action items outrank the raw transcript.

**Traceability.** Every major AI claim is a control that jumps to its transcript evidence. If evidence is missing, the item is omitted or marked uncertain — never decorative.

**Calm realtime.** No animation or alert for every generated change. Update in place. Use subtle presence (timestamp, "Updated just now"), not toasts.

**Editable by default.** AI outputs are suggestions until the user confirms ambiguous items. Correction of speaker or action is a first-class in-meeting action, not a buried settings task.

**Visible state.** Capture source, network health, and Stop are always reachable in the live workspace. Do not hide Stop behind a menu.

**Consent is a checkpoint, not a tooltip.** Disclosure is readable, blocking, and records an audit event. User must explicitly start.

**Accessible.** Keyboard, contrast, focus, screen-reader names for live regions, `prefers-reduced-motion`. Live transcript is a polite live region, not an assertive flood.

### 6. Hand off / implement

Specify before building: layout, component map, empty/loading/error/offline/permission-denied, evidence jump behavior, and what happens on pause/stop/reconnect.

Then implement with the UI skill. Do not custom-paint primitives that shadcn already provides.

### 7. Critique

After a pass, check:

- Does the eye land on capture status and primary outcomes?
- Can a new user tell they are (or are not) recording in under one second?
- Can they get from an action item to the quote that justified it?
- Are failure states specific (wrong tab, denied mic, unsupported meeting, expired Google token)?
- Does reduced-motion still communicate live vs paused?

## Copy rules

- Say what is captured, why it is processed, where it is stored, how to stop.
- Do not claim the product is legally sufficient because a banner is shown.
- Do not use surveillance, scoring, or "we listen for you" framing.
- Label suggestions as suggestions (especially follow-ups / next-meeting ideas).
- Source mode is user-visible: `Meet API` / `Browser capture` / `Manual import`.

## Live meeting layout (canonical)

Two-column workspace:

- **Left:** live transcript — speaker, timestamp, interim text visually de-emphasized, finalized text stable.
- **Right:** AI state — Summary, Decisions, Action Items; Questions and Risks when those features are in scope.
- **Persistent status bar:** source mode, recording/transcription state, network health, Pause, Stop.

On narrow viewports: outcome column first, transcript in a tab or sheet. Status bar remains visible.

## What not to design

- Speaking bot / "join as a participant" avatar
- Emotion, sentiment heatmaps, talk-time rankings for MVP
- Audio waveform playground or recording studio chrome
- Confetti, streak, or gamified meeting scores
