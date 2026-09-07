import { NextResponse } from "next/server"
import { z } from "zod"

import { jsonError, requireUser } from "@/lib/api"
import { meetingHealthSchema, setMeetingHealth } from "@/lib/meetings/service"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params
    const body = meetingHealthSchema.parse(await request.json())
    const meeting = await setMeetingHealth(userId, id, body.health)
    return NextResponse.json({ health: meeting.health })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid health payload." },
        { status: 400 }
      )
    }
    return jsonError(error)
  }
}
