import { NextResponse } from "next/server"
import { z } from "zod"

import { HttpError, jsonError, requireUser } from "@/lib/api"
import { createMeeting, createMeetingSchema, listMeetings } from "@/lib/meetings/service"
import { logEvent } from "@/lib/logger"

export async function GET() {
  try {
    const { userId } = await requireUser()
    const meetings = await listMeetings(userId)
    return NextResponse.json({ meetings })
  } catch (error) {
    logEvent("auth", "list_meetings_failed")
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser()
    const body = createMeetingSchema.parse(await request.json())
    const meeting = await createMeeting(userId, body)
    return NextResponse.json({ meeting }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid meeting payload." },
        { status: 400 }
      )
    }
    if (!(error instanceof HttpError)) {
      logEvent("db", "create_meeting_failed")
    }
    return jsonError(error)
  }
}
