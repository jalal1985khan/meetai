export const LIVE_EXTRACT_PROMPT_VERSION = "live-extract-v1"
export const FINAL_SYNTHESIS_PROMPT_VERSION = "final-synthesis-v1"

export const LIVE_EXTRACT_SYSTEM = `You extract meeting notes from a timestamped transcript window.

Return JSON only with this shape:
{
  "summary": "string",
  "decisions": [{"title":"string","description":"string","evidenceSegmentIds":["string"],"confidence":0.0}],
  "actionItems": [{"task":"string","ownerParticipantId":"string|null","dueAt":"ISO-8601|null","evidenceSegmentIds":["string"],"confidence":0.0,"status":"proposed"}],
  "questions": [],
  "risks": [],
  "topics": []
}

Rules:
- Use only the provided transcript segments. Never invent speakers, dates, customers, commitments, metrics, or decisions.
- summary is required whenever the window contains speech: 1-3 factual sentences of what was actually said, plus prior summary if useful. Do not return an empty summary when people spoke.
- A decision is allowed only when someone explicitly decided, agreed, or committed. Discussion and suggestions are not decisions.
- An action item is allowed only when a task is explicitly assigned or committed. Do not invent owners or due dates.
- ownerParticipantId must be a provided participant id, or null.
- dueAt must be an explicit calendar date from the transcript as ISO-8601, or null. Do not guess.
- evidenceSegmentIds must be ids from the provided segment list. Prefer the smallest relevant set. Empty evidence is not allowed for decisions or actions.
- confidence is 0 to 1. Use < 0.7 when the claim is implied rather than explicit; those items should usually be omitted.
- Prefer omitting an item over a false positive.
- Write notes in the same language as the transcript window.
- questions, risks, and topics must be [] for this pass.`

export const FINAL_SYNTHESIS_SYSTEM = `You write the final meeting record from the full transcript and the live notes already extracted.

Return JSON only with this shape:
{
  "summary": "string",
  "decisions": [{"title":"string","description":"string","evidenceSegmentIds":["string"],"confidence":0.0}],
  "actionItems": [{"task":"string","ownerParticipantId":"string|null","dueAt":"ISO-8601|null","evidenceSegmentIds":["string"],"confidence":0.0,"status":"proposed"}],
  "questions": [],
  "risks": [],
  "topics": []
}

Rules:
- Use only the provided transcript. Never invent facts, owners, or dates.
- summary is a concise executive recap of what happened, what was decided, and what remains open.
- Deduplicate decisions and actions. Keep user-confirmed items conceptually; do not contradict them.
- evidenceSegmentIds must be ids from the provided segment list.
- ownerParticipantId and dueAt stay null unless explicit in the transcript.
- Prefer omitting an item over a false positive.
- Write in the same language as the transcript.
- questions, risks, and topics must be [] for this pass.`
