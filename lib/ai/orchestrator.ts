import { prisma } from "@/lib/db"
import { logEvent } from "@/lib/logger"
import { mergeExtractOutput } from "@/lib/ai/merge"
import {
  FINAL_SYNTHESIS_PROMPT_VERSION,
  FINAL_SYNTHESIS_SYSTEM,
  LIVE_EXTRACT_PROMPT_VERSION,
  LIVE_EXTRACT_SYSTEM,
} from "@/lib/ai/prompts"
import { parseExtractOutput, sanitizeExtractOutput } from "@/lib/ai/validate"
import { getLlmProvider } from "@/lib/providers/llm"

const LIVE_WINDOW = 24
const MIN_LIVE_CHARS = 80
const MIN_LIVE_SEGMENTS = 2
const LIVE_DEBOUNCE_MS = 4000
const LIVE_TIMEOUT_MS = 180_000
const FINAL_TIMEOUT_MS = 180_000

type DebouncedExtract = {
  timer: ReturnType<typeof setTimeout>
  resolve: () => void
}

const debounceTimers = new Map<string, DebouncedExtract>()
const inflight = new Set<string>()
const dirty = new Set<string>()

export function isAiProcessing(meetingId: string) {
  return inflight.has(meetingId) || debounceTimers.has(meetingId)
}

function formatSegmentLine(input: {
  id: string
  seq: number
  text: string
  startAt: Date
  participantId: string | null
  names: Map<string, string>
}) {
  const speaker = input.participantId
    ? (input.names.get(input.participantId) ?? "Speaker")
    : "Speaker"
  return `[${input.id} | seq ${input.seq} | ${speaker} | ${input.startAt.toISOString()}] ${input.text}`
}

export function scheduleLiveExtract(meetingId: string) {
  if (!getLlmProvider().configured) {
    return Promise.resolve()
  }
  const previous = debounceTimers.get(meetingId)
  if (previous) {
    clearTimeout(previous.timer)
    previous.resolve()
    debounceTimers.delete(meetingId)
  }
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      debounceTimers.delete(meetingId)
      void runLiveExtract(meetingId).finally(resolve)
    }, LIVE_DEBOUNCE_MS)
    debounceTimers.set(meetingId, { timer, resolve })
  })
}

export async function runLiveExtract(meetingId: string) {
  if (!getLlmProvider().configured) {
    return
  }
  if (inflight.has(meetingId)) {
    dirty.add(meetingId)
    return
  }
  inflight.add(meetingId)
  try {
    await extractAndMerge(meetingId, "live")
  } catch (error) {
    logEvent("ai", "live_extract_failed", {
      meetingId,
      reason: error instanceof Error && error.name === "AbortError" ? "timeout" : "error",
    })
  } finally {
    inflight.delete(meetingId)
    if (dirty.delete(meetingId)) {
      await runLiveExtract(meetingId)
    }
  }
}

export async function runFinalSynthesis(meetingId: string) {
  if (!getLlmProvider().configured) {
    return
  }
  try {
    await extractAndMerge(meetingId, "final")
  } catch (error) {
    logEvent("ai", "final_synthesis_failed", {
      meetingId,
      reason: error instanceof Error && error.name === "AbortError" ? "timeout" : "error",
    })
  }
}

async function extractAndMerge(meetingId: string, mode: "live" | "final") {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, status: { not: "deleted" } },
    include: {
      participants: true,
      segments: { where: { isFinal: true }, orderBy: { seq: "asc" } },
      decisions: true,
      actionItems: true,
      state: true,
    },
  })
  if (!meeting) {
    return
  }
  if (mode === "live" && meeting.status !== "live" && meeting.status !== "degraded") {
    return
  }

  const names = new Map(
    meeting.participants.map((item) => [item.id, item.displayName])
  )
  const window =
    mode === "live" ? meeting.segments.slice(-LIVE_WINDOW) : meeting.segments
  const charCount = window.reduce((sum, item) => sum + item.text.length, 0)
  if (window.length < MIN_LIVE_SEGMENTS || charCount < MIN_LIVE_CHARS) {
    logEvent("ai", "extract_skipped", { meetingId, mode, reason: "thin_window" })
    return
  }

  const allowedSegmentIds = new Set(window.map((item) => item.id))
  const allowedParticipantIds = new Set(meeting.participants.map((item) => item.id))

  const user = [
    `Meeting id: ${meeting.id}`,
    `Mode: ${mode}`,
    `Participants: ${
      meeting.participants
        .map((item) => `${item.id}=${item.displayName}`)
        .join("; ") || "(none)"
    }`,
    `Prior summary: ${meeting.state?.summary || "(none)"}`,
    `Prior decisions: ${
      meeting.decisions.map((item) => item.title).join("; ") || "(none)"
    }`,
    `Prior actions: ${
      meeting.actionItems.map((item) => item.task).join("; ") || "(none)"
    }`,
    "Transcript window:",
    ...window.map((item) =>
      formatSegmentLine({
        id: item.id,
        seq: item.seq,
        text: item.text,
        startAt: item.startAt,
        participantId: item.participantId,
        names,
      })
    ),
  ].join("\n")

  const provider = getLlmProvider()
  const system = mode === "live" ? LIVE_EXTRACT_SYSTEM : FINAL_SYNTHESIS_SYSTEM
  const timeout = mode === "live" ? LIVE_TIMEOUT_MS : FINAL_TIMEOUT_MS
  logEvent("ai", "extract_started", { meetingId, mode, model: provider.model })
  let raw = await provider.completeJson(system, user, timeout)
  let parsed = parseExtractOutput(raw)
  if (!parsed) {
    raw = await provider.completeJson(
      system,
      `${user}\n\nYour previous reply was not valid JSON. Return only the JSON object.`,
      timeout
    )
    parsed = parseExtractOutput(raw)
  }
  if (!parsed) {
    logEvent("ai", "extract_invalid_json", { meetingId, mode })
    return
  }

  const sanitized = sanitizeExtractOutput(
    parsed,
    allowedSegmentIds,
    allowedParticipantIds
  )
  await mergeExtractOutput({
    meeting,
    output: sanitized,
    promptVersion:
      mode === "live" ? LIVE_EXTRACT_PROMPT_VERSION : FINAL_SYNTHESIS_PROMPT_VERSION,
    model: provider.model,
    replaceSummary: true,
  })
}
