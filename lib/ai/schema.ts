import { z } from "zod"

const confidenceSchema = z.coerce.number().min(0).max(1)
const evidenceIdsSchema = z.array(z.coerce.string().min(1)).default([])

function emptyToNull(value: unknown) {
  if (value === "" || value === undefined) {
    return null
  }
  return value
}

export const extractedDecisionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.preprocess((value) => value ?? "", z.string().trim().max(2000)),
  evidenceSegmentIds: evidenceIdsSchema,
  confidence: confidenceSchema,
})

export const extractedActionSchema = z.object({
  task: z.string().trim().min(1).max(400),
  ownerParticipantId: z.preprocess(
    emptyToNull,
    z.string().min(1).nullable()
  ).default(null),
  dueAt: z.preprocess(emptyToNull, z.string().nullable()).default(null),
  evidenceSegmentIds: evidenceIdsSchema,
  confidence: confidenceSchema,
  status: z.enum(["proposed", "confirmed", "completed"]).default("proposed"),
})

export const extractOutputSchema = z.object({
  summary: z.preprocess((value) => value ?? "", z.string().trim().max(4000)),
  decisions: z.array(extractedDecisionSchema).default([]),
  actionItems: z.array(extractedActionSchema).default([]),
  questions: z.array(z.unknown()).default([]),
  risks: z.array(z.unknown()).default([]),
  topics: z.array(z.unknown()).default([]),
})

export type ExtractOutput = z.infer<typeof extractOutputSchema>

export const MIN_DECISION_CONFIDENCE = 0.7
export const MIN_ACTION_CONFIDENCE = 0.7
