import { after, NextResponse } from "next/server"

import { jsonError, requireUser } from "@/lib/api"
import { finalizeStoppedMeeting, stopMeeting } from "@/lib/meetings/service"

export const maxDuration = 300

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params
    const meeting = await stopMeeting(userId, id)
    if (meeting.status === "finalizing") {
      after(() => finalizeStoppedMeeting(id))
    }
    return NextResponse.json({ meeting })
  } catch (error) {
    return jsonError(error)
  }
}
