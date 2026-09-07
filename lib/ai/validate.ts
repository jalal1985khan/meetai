import { parseJsonFromText } from "@/lib/ai/json"
import {
  MIN_ACTION_CONFIDENCE,
  MIN_DECISION_CONFIDENCE,
  extractOutputSchema,
  type ExtractOutput,
} from "@/lib/ai/schema"

export function parseExtractOutput(value: unknown): ExtractOutput | null {
  let candidate = value
  if (typeof value === "string") {
    try {
      candidate = parseJsonFromText(value)
    } catch {
      return null
    }
  }
  const parsed = extractOutputSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

function uniqueIds(ids: string[], allowed: Set<string>) {
  return [...new Set(ids.filter((id) => allowed.has(id)))]
}

export function sanitizeExtractOutput(
  output: ExtractOutput,
  allowedSegmentIds: Set<string>,
  allowedParticipantIds: Set<string>
): ExtractOutput {
  return {
    summary: output.summary,
    decisions: output.decisions
      .filter((item) => item.confidence >= MIN_DECISION_CONFIDENCE)
      .map((item) => ({
        ...item,
        evidenceSegmentIds: uniqueIds(item.evidenceSegmentIds, allowedSegmentIds),
      }))
      .filter((item) => item.evidenceSegmentIds.length > 0),
    actionItems: output.actionItems
      .filter((item) => item.confidence >= MIN_ACTION_CONFIDENCE)
      .map((item) => ({
        ...item,
        ownerParticipantId:
          item.ownerParticipantId && allowedParticipantIds.has(item.ownerParticipantId)
            ? item.ownerParticipantId
            : null,
        dueAt: parseDueAt(item.dueAt),
        evidenceSegmentIds: uniqueIds(item.evidenceSegmentIds, allowedSegmentIds),
        status: "proposed" as const,
      }))
      .filter((item) => item.evidenceSegmentIds.length > 0),
    questions: [],
    risks: [],
    topics: [],
  }
}

function parseDueAt(value: string | null) {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toISOString()
}

export function normalizeClaim(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}
