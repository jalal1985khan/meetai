# AI Pipeline

Separate deterministic processing from generative synthesis. **The model never writes to the database.** Application code validates, applies business rules, attaches evidence IDs, then persists.

## Stages

| Stage | Input | Output | Latency |
|---|---|---|---|
| Audio acquisition | User-authorized audio or Meet artifact | Frames / transcript records | Continuous |
| Speech-to-text | Audio stream | Interim + final segments | < 3–5s typical |
| Normalization | STT segments | Stable speaker/timestamp segments | < 1s |
| Context windowing | Recent finals + meeting state | AI context packet | < 1s |
| Structured extraction | Context packet | JSON events | < 4s / update |
| State merge | Previous state + events | Updated meeting state | < 500ms |
| UI projection | Meeting state | Realtime `ai.state.updated` | < 1s |
| Final synthesis | Full transcript + merged state | Final summary package | < 120s typical |

Do **not** send the entire transcript on every live update. Maintain compact state + a rolling window of recent finalized segments.

## Structured output contract

Strict JSON (schema-validated). Repair once on schema failure; if still invalid, emit `processing.warning` and keep last good state.

```json
{
  "summary": "string",
  "decisions": [
    {
      "title": "string",
      "description": "string",
      "evidenceSegmentIds": ["string"],
      "confidence": 0.0
    }
  ],
  "actionItems": [
    {
      "task": "string",
      "ownerParticipantId": "string|null",
      "dueAt": "ISO-8601|null",
      "evidenceSegmentIds": ["string"],
      "confidence": 0.0,
      "status": "proposed|confirmed|completed"
    }
  ],
  "questions": [],
  "risks": [],
  "topics": []
}
```

Live MVP may populate `summary`, `decisions`, `actionItems` only. Still validate the same schema (empty arrays allowed). Questions/risks/topics are P1.

## Trustworthiness rules (enforce in prompt AND validator)

- Never invent a speaker, date, customer requirement, commitment, metric, or decision not in the source.
- Distinguish explicit decisions from suggestions and unresolved discussion.
- Owner not explicit → `ownerParticipantId: null`. Do not guess.
- Due date not explicit → `dueAt: null`. Do not infer a calendar date.
- Represent uncertainty with `confidence` / `status`. Do not hide it in prose.
- Prefer the smallest relevant transcript window for evidence.
- Deterministic post-processing: validate dates, participant IDs, duplicate actions.
- Regenerated summaries are versioned (`AIRevision.revisionNo`) so users can compare.

Validator rejects or flags items with empty `evidenceSegmentIds` unless confidence is clearly uncertain and the UI will show that. P0 quality gate: **low false-positive decisions/actions over maximal extraction**.

## Prompting

Two prompts, versioned strings stored with `AIRevision.promptVersion`:

1. **Live extract** — system: meeting-note ontology + non-hallucination rules. Payload: recent finalized transcript, current meeting state, participant map, user corrections.
2. **Final synthesis** — complete meeting + merged state → executive summary, de-duplicated decisions/actions/topics.

User corrections always win over model output on merge.

## Merge / dedupe

- Match new actions/decisions to existing by normalized task/title + overlapping evidence.
- Do not flip `confirmed` or `completed` items back to `proposed`.
- Do not overwrite user-edited fields.
- Bump `MeetingState.version` once per accepted merge.

## Evaluation (do not skip when changing prompts)

Keep a de-identified golden set: decisions, actions, owners, dues, questions, risks, summaries.

Score: precision, recall, unsupported-claim rate, evidence-link accuracy, edit distance after user corrections.

Ship prompt changes only if unsupported-claim rate does not regress.
