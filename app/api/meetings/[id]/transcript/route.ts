import { after, NextResponse } from "next/server"
import { z } from "zod"

import { jsonError, requireUser } from "@/lib/api"
import {
  appendFinalSegment,
  appendSegmentSchema,
  getMeeting,
} from "@/lib/meetings/service"
import { logEvent } from "@/lib/logger"

export const maxDuration = 300

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params
    const meeting = await getMeeting(userId, id)
    return NextResponse.json({
      segments: meeting.segments.filter((segment) => segment.isFinal),
    })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params
    const body = appendSegmentSchema.parse(await request.json())
    const segment = await appendFinalSegment(userId, id, body)
    if (segment) {
      const { scheduleLiveExtract } = await import("@/lib/ai/orchestrator")
      after(() => scheduleLiveExtract(id))
    }
    return NextResponse.json({ segment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid transcript segment." },
        { status: 400 }
      )
    }
    logEvent("stt", "append_segment_failed")
    return jsonError(error)
  }
}
