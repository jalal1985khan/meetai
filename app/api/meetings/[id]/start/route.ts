import { NextResponse } from "next/server"
import { z } from "zod"

import { jsonError, requireUser } from "@/lib/api"
import { startMeeting, startMeetingSchema } from "@/lib/meetings/service"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params
    const body = startMeetingSchema.parse(await request.json())
    const meeting = await startMeeting(userId, id, body)
    return NextResponse.json({ meeting })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Consent is required before capture." },
        { status: 400 }
      )
    }
    return jsonError(error)
  }
}
