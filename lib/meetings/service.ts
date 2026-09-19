import {
  ActionStatus,
  MeetingStatus,
  type Meeting,
  type Prisma,
} from "@prisma/client"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { logEvent } from "@/lib/logger"
import { isMeetUrl, titleFromMeetUrl } from "@/lib/meetings/labels"
import { speechLanguageSchema, languagePreferenceSchema } from "@/lib/meetings/languages"
import { HttpError } from "@/lib/api"

const ACTIVE = new Set<MeetingStatus>([
  "created",
  "awaiting_consent",
  "connecting",
  "live",
  "paused",
  "stopping",
  "finalizing",
  "degraded",
])

export const createMeetingSchema = z.object({
  meetUrl: z
    .string()
    .trim()
    .url()
    .refine(isMeetUrl, "Enter a Google Meet URL such as https://meet.google.com/xxx-xxxx-xxx."),
  sourceMode: z
    .enum(["meet_api", "browser_capture", "manual_import"])
    .default("browser_capture"),
  language: languagePreferenceSchema.optional(),
})

export const startMeetingSchema = z.object({
  consented: z.literal(true),
})

export const patchActionSchema = z.object({
  task: z.string().min(1).optional(),
  ownerParticipantId: z.string().nullable().optional(),
  dueAt: z.iso.datetime().nullable().optional(),
  status: z.nativeEnum(ActionStatus).optional(),
})

export const privacySchema = z.object({
  retentionDays: z.number().int().min(1).max(365),
  storeAudio: z.literal(false),
})

function ownedMeeting(userId: string, id: string) {
  return prisma.meeting.findFirst({
    where: { id, userId, status: { not: "deleted" } },
  })
}

async function requireMeeting(userId: string, id: string) {
  const meeting = await ownedMeeting(userId, id)
  if (!meeting) {
    throw new HttpError(404, "Meeting not found.")
  }
  return meeting
}

async function writeAudit(input: {
  userId: string
  action: string
  resourceType: string
  resourceId: string
}) {
  await prisma.auditEvent.create({
    data: {
      actorId: input.userId,
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    },
  })
}

export async function listMeetings(userId: string) {
  return prisma.meeting.findMany({
    where: { userId, status: { not: "deleted" } },
    orderBy: { createdAt: "desc" },
    include: {
      participants: true,
      _count: { select: { segments: true, actionItems: true } },
    },
  })
}

export async function getMeeting(userId: string, id: string) {
  const meeting = await prisma.meeting.findFirst({
    where: { id, userId, status: { not: "deleted" } },
    include: {
      participants: true,
      segments: { orderBy: { seq: "asc" } },
      decisions: { orderBy: { createdAt: "asc" } },
      actionItems: { orderBy: { createdAt: "asc" } },
      state: true,
      evidenceLinks: true,
      consentEvents: { orderBy: { timestamp: "desc" }, take: 5 },
    },
  })
  if (!meeting) {
    throw new HttpError(404, "Meeting not found.")
  }
  return meeting
}

export async function createMeeting(
  userId: string,
  input: z.infer<typeof createMeetingSchema>
) {
  const meeting = await prisma.meeting.create({
    data: {
      userId,
      meetUrl: input.meetUrl,
      title: titleFromMeetUrl(input.meetUrl),
      sourceMode: input.sourceMode,
      language: input.language ?? null,
      status: "awaiting_consent",
      state: { create: {} },
    },
  })
  await writeAudit({
    userId,
    action: "meeting.created",
    resourceType: "meeting",
    resourceId: meeting.id,
  })
  logEvent("info", "meeting.created", {
    meetingId: meeting.id,
    sourceMode: meeting.sourceMode,
  })
  return meeting
}

const START_FROM = new Set<MeetingStatus>(["created", "awaiting_consent", "failed"])

export async function startMeeting(
  userId: string,
  id: string,
  input: z.infer<typeof startMeetingSchema>
) {
  if (!input.consented) {
    throw new HttpError(400, "Consent is required before capture.")
  }
  const meeting = await requireMeeting(userId, id)
  if (!START_FROM.has(meeting.status) && meeting.status !== "paused") {
    if (meeting.status === "live" || meeting.status === "degraded") {
      return meeting
    }
    throw new HttpError(409, "This meeting cannot be started from its current state.")
  }

  const next: Meeting = await prisma.$transaction(async (tx) => {
    await tx.consentEvent.create({
      data: {
        meetingId: meeting.id,
        userId,
        eventType: "capture.started",
        metadataJson: {
          sourceMode: meeting.sourceMode,
          disclosure: "user_confirmed",
        } satisfies Prisma.JsonObject,
      },
    })
    return tx.meeting.update({
      where: { id: meeting.id },
      data: {
        status: "live",
        health: "connecting",
        startedAt: meeting.startedAt ?? new Date(),
      },
    })
  })

  await writeAudit({
    userId,
    action: "capture.started",
    resourceType: "meeting",
    resourceId: meeting.id,
  })
  logEvent("info", "assistant_started", {
    meetingId: meeting.id,
    sourceMode: meeting.sourceMode,
  })
  return next
}

export async function pauseMeeting(userId: string, id: string) {
  const meeting = await requireMeeting(userId, id)
  if (meeting.status === "paused") {
    return meeting
  }
  if (meeting.status !== "live" && meeting.status !== "degraded") {
    throw new HttpError(409, "Only a live session can be paused.")
  }
  const next = await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: "paused" },
  })
  await writeAudit({
    userId,
    action: "capture.paused",
    resourceType: "meeting",
    resourceId: meeting.id,
  })
  return next
}

export async function resumeMeeting(userId: string, id: string) {
  const meeting = await requireMeeting(userId, id)
  if (meeting.status !== "paused") {
    throw new HttpError(409, "Only a paused session can be resumed.")
  }
  return prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: "live", health: "connecting" },
  })
}

export async function stopMeeting(userId: string, id: string) {
  const meeting = await requireMeeting(userId, id)
  if (meeting.status === "ready") {
    return meeting
  }
  if (!ACTIVE.has(meeting.status)) {
    throw new HttpError(409, "This meeting cannot be stopped from its current state.")
  }

  const segmentCount = await prisma.transcriptSegment.count({
    where: { meetingId: meeting.id, isFinal: true },
  })

  await prisma.$transaction(async (tx) => {
    await tx.meeting.update({
      where: { id: meeting.id },
      data: { status: "finalizing", endedAt: meeting.endedAt ?? new Date() },
    })
    if (segmentCount === 0) {
      await tx.meetingState.upsert({
        where: { meetingId: meeting.id },
        create: { meetingId: meeting.id, summary: "" },
        update: {},
      })
    }
  })

  await writeAudit({
    userId,
    action: "capture.stopped",
    resourceType: "meeting",
    resourceId: meeting.id,
  })

  if (segmentCount === 0) {
    const ready = await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: "ready", health: "disconnected" },
    })
    logEvent("info", "assistant_stopped", { meetingId: meeting.id })
    return ready
  }

  return prisma.meeting.findFirstOrThrow({
    where: { id: meeting.id },
  })
}

export async function finalizeStoppedMeeting(meetingId: string) {
  const { runFinalSynthesis } = await import("@/lib/ai/orchestrator")
  await runFinalSynthesis(meetingId)
  const ready = await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "ready", health: "disconnected" },
  })
  logEvent("info", "assistant_stopped", { meetingId })
  return ready
}

export const appendSegmentSchema = z.object({
  text: z.string().trim().min(1).max(8000),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  speakerLabel: z.string().trim().min(1).max(80).default("You"),
  language: speechLanguageSchema.optional(),
})

export const meetingLanguageSchema = z.object({
  language: languagePreferenceSchema,
})

export const meetingHealthSchema = z.object({
  health: z.enum(["connected", "degraded", "disconnected", "connecting"]),
})

export async function appendFinalSegment(
  userId: string,
  meetingId: string,
  input: z.infer<typeof appendSegmentSchema>
) {
  const meeting = await requireMeeting(userId, meetingId)
  if (meeting.status !== "live" && meeting.status !== "degraded") {
    throw new HttpError(409, "Transcript can only be appended while live.")
  }

  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new HttpError(400, "Invalid segment timestamps.")
  }

  return prisma.$transaction(async (tx) => {
    let participant = await tx.participant.findFirst({
      where: { meetingId, speakerLabel: input.speakerLabel },
    })
    if (!participant) {
      participant = await tx.participant.create({
        data: {
          meetingId,
          displayName: input.speakerLabel,
          speakerLabel: input.speakerLabel,
        },
      })
    }

    const last = await tx.transcriptSegment.findFirst({
      where: { meetingId },
      orderBy: { seq: "desc" },
      select: { seq: true, text: true },
    })

    if (last && last.text === input.text) {
      return null
    }

    const language =
      input.language ??
      (meeting.language && meeting.language !== "auto" ? meeting.language : null)

    const segment = await tx.transcriptSegment.create({
      data: {
        meetingId,
        participantId: participant.id,
        seq: (last?.seq ?? 0) + 1,
        text: input.text,
        startAt,
        endAt,
        language,
        isFinal: true,
        source: "stt_stream",
      },
    })

    await tx.meeting.update({
      where: { id: meetingId },
      data: {
        health: "connected",
        ...(input.language ? { language: input.language } : {}),
      },
    })

    return segment
  })
}

export async function saveEnhancedAudioSegment(
  userId: string,
  meetingId: string,
  input: {
    text: string
    startAt: string
    endAt: string
    speakerLabel: string
    language?: string | null
  }
) {
  const meeting = await requireMeeting(userId, meetingId)
  if (meeting.status !== "live" && meeting.status !== "degraded") {
    throw new HttpError(409, "Transcript can only be appended while live.")
  }

  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new HttpError(400, "Invalid segment timestamps.")
  }

  return prisma.$transaction(async (tx) => {
    let participant = await tx.participant.findFirst({
      where: { meetingId, speakerLabel: input.speakerLabel },
    })
    if (!participant) {
      participant = await tx.participant.create({
        data: {
          meetingId,
          displayName: input.speakerLabel,
          speakerLabel: input.speakerLabel,
        },
      })
    }

    // Check if there is an overlapping recent segment created in the last 20 seconds to enhance
    const recent = await tx.transcriptSegment.findFirst({
      where: {
        meetingId,
        startAt: { gte: new Date(startAt.getTime() - 8000) },
      },
      orderBy: { seq: "desc" },
    })

    if (recent) {
      const updated = await tx.transcriptSegment.update({
        where: { id: recent.id },
        data: {
          text: input.text,
          modifiedAt: new Date(),
          ...(input.language ? { language: input.language } : {}),
        },
      })
      return updated
    }

    const last = await tx.transcriptSegment.findFirst({
      where: { meetingId },
      orderBy: { seq: "desc" },
      select: { seq: true },
    })

    const segment = await tx.transcriptSegment.create({
      data: {
        meetingId,
        participantId: participant.id,
        seq: (last?.seq ?? 0) + 1,
        text: input.text,
        startAt,
        endAt,
        language: input.language ?? null,
        isFinal: true,
        source: "stt_stream",
        modifiedAt: new Date(),
      },
    })

    await tx.meeting.update({
      where: { id: meetingId },
      data: {
        health: "connected",
        ...(input.language ? { language: input.language } : {}),
      },
    })

    return segment
  })
}

export async function setMeetingHealth(
  userId: string,
  meetingId: string,
  health: z.infer<typeof meetingHealthSchema>["health"]
) {
  const meeting = await requireMeeting(userId, meetingId)
  if (
    meeting.status !== "live" &&
    meeting.status !== "paused" &&
    meeting.status !== "degraded"
  ) {
    throw new HttpError(409, "Health can only be updated on an active session.")
  }
  return prisma.meeting.update({
    where: { id: meeting.id },
    data: { health },
  })
}

export async function setMeetingLanguage(
  userId: string,
  meetingId: string,
  language: z.infer<typeof languagePreferenceSchema>
) {
  const meeting = await requireMeeting(userId, meetingId)
  if (meeting.status === "deleted") {
    throw new HttpError(409, "Language cannot be updated on a deleted meeting.")
  }
  return prisma.meeting.update({
    where: { id: meeting.id },
    data: { language },
  })
}

export async function updateAction(
  userId: string,
  meetingId: string,
  actionId: string,
  input: z.infer<typeof patchActionSchema>
) {
  await requireMeeting(userId, meetingId)
  const action = await prisma.actionItem.findFirst({
    where: { id: actionId, meetingId },
  })
  if (!action) {
    throw new HttpError(404, "Action item not found.")
  }
  const next = await prisma.actionItem.update({
    where: { id: action.id },
    data: {
      task: input.task ?? action.task,
      ownerParticipantId:
        input.ownerParticipantId === undefined
          ? action.ownerParticipantId
          : input.ownerParticipantId,
      dueAt:
        input.dueAt === undefined
          ? action.dueAt
          : input.dueAt
            ? new Date(input.dueAt)
            : null,
      status: input.status ?? action.status,
      userEdited: true,
    },
  })
  logEvent("info", "action_confirmed", { meetingId, actionId })
  return next
}

export async function updatePrivacy(
  userId: string,
  input: z.infer<typeof privacySchema>
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      retentionDays: input.retentionDays,
      storeAudio: false,
    },
  })
}

export async function deleteAccount(userId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.auditEvent.create({
      data: {
        actorId: userId,
        userId,
        action: "account.delete_requested",
        resourceType: "user",
        resourceId: userId,
      },
    })
    await tx.user.delete({ where: { id: userId } })
  })
  logEvent("info", "account.deleted", { userId })
}

export async function completeOnboarding(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { onboardingCompletedAt: new Date() },
  })
}
