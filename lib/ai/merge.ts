import type { ActionItem, Decision, Prisma } from "@prisma/client"

import { prisma } from "@/lib/db"
import { normalizeClaim } from "@/lib/ai/validate"
import type { ExtractOutput } from "@/lib/ai/schema"
import { logEvent } from "@/lib/logger"

type MergeMeeting = {
  id: string
  decisions: Decision[]
  actionItems: ActionItem[]
}

export async function mergeExtractOutput(input: {
  meeting: MergeMeeting
  output: ExtractOutput
  promptVersion: string
  model: string
  replaceSummary: boolean
}) {
  const { meeting, output } = input

  await prisma.$transaction(async (tx) => {
    if (input.replaceSummary || output.summary) {
      const state = await tx.meetingState.findUnique({
        where: { meetingId: meeting.id },
      })
      await tx.meetingState.upsert({
        where: { meetingId: meeting.id },
        create: {
          meetingId: meeting.id,
          summary: output.summary,
          version: 1,
          decisionsJson: output.decisions as unknown as Prisma.InputJsonValue,
          actionsJson: output.actionItems as unknown as Prisma.InputJsonValue,
        },
        update: {
          summary: output.summary || state?.summary || "",
          version: { increment: 1 },
          decisionsJson: output.decisions as unknown as Prisma.InputJsonValue,
          actionsJson: output.actionItems as unknown as Prisma.InputJsonValue,
        },
      })
    }

    for (const incoming of output.decisions) {
      const existing = meeting.decisions.find(
        (item) => normalizeClaim(item.title) === normalizeClaim(incoming.title)
      )
      if (existing) {
        if (existing.status === "proposed") {
          await tx.decision.update({
            where: { id: existing.id },
            data: {
              description: incoming.description || existing.description,
              confidence: incoming.confidence,
            },
          })
          await replaceEvidence(tx, meeting.id, "decision", existing.id, incoming.evidenceSegmentIds)
        }
        continue
      }
      const created = await tx.decision.create({
        data: {
          meetingId: meeting.id,
          title: incoming.title,
          description: incoming.description,
          confidence: incoming.confidence,
          status: "proposed",
        },
      })
      await replaceEvidence(tx, meeting.id, "decision", created.id, incoming.evidenceSegmentIds)
    }

    for (const incoming of output.actionItems) {
      const existing = meeting.actionItems.find(
        (item) => normalizeClaim(item.task) === normalizeClaim(incoming.task)
      )
      if (existing) {
        if (existing.userEdited || existing.status !== "proposed") {
          continue
        }
        await tx.actionItem.update({
          where: { id: existing.id },
          data: {
            ownerParticipantId: incoming.ownerParticipantId,
            dueAt: incoming.dueAt ? new Date(incoming.dueAt) : existing.dueAt,
            confidence: incoming.confidence,
          },
        })
        await replaceEvidence(tx, meeting.id, "action", existing.id, incoming.evidenceSegmentIds)
        continue
      }
      const created = await tx.actionItem.create({
        data: {
          meetingId: meeting.id,
          task: incoming.task,
          ownerParticipantId: incoming.ownerParticipantId,
          dueAt: incoming.dueAt ? new Date(incoming.dueAt) : null,
          confidence: incoming.confidence,
          status: "proposed",
        },
      })
      await replaceEvidence(tx, meeting.id, "action", created.id, incoming.evidenceSegmentIds)
    }

    const last = await tx.aIRevision.findFirst({
      where: { meetingId: meeting.id },
      orderBy: { revisionNo: "desc" },
      select: { revisionNo: true },
    })
    await tx.aIRevision.create({
      data: {
        meetingId: meeting.id,
        revisionNo: (last?.revisionNo ?? 0) + 1,
        model: input.model,
        promptVersion: input.promptVersion,
        outputJson: {
          summaryLength: output.summary.length,
          decisionCount: output.decisions.length,
          actionCount: output.actionItems.length,
        } satisfies Prisma.InputJsonValue,
      },
    })
  })

  logEvent("info", "ai_note_generated", {
    meetingId: meeting.id,
    promptVersion: input.promptVersion,
    decisionCount: output.decisions.length,
    actionCount: output.actionItems.length,
  })
}

async function replaceEvidence(
  tx: Prisma.TransactionClient,
  meetingId: string,
  entityType: string,
  entityId: string,
  segmentIds: string[]
) {
  await tx.evidenceLink.deleteMany({
    where: { meetingId, entityType, entityId },
  })
  if (segmentIds.length === 0) {
    return
  }
  await tx.evidenceLink.createMany({
    data: segmentIds.map((transcriptSegmentId) => ({
      meetingId,
      entityType,
      entityId,
      transcriptSegmentId,
    })),
  })
}
