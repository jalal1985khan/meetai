import { NextResponse } from "next/server"
import { z } from "zod"

import { jsonError, requireUser } from "@/lib/api"
import {
  meetingLanguageSchema,
  setMeetingLanguage,
} from "@/lib/meetings/service"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params
    const body = meetingLanguageSchema.parse(await request.json())
    const meeting = await setMeetingLanguage(userId, id, body.language)
    return NextResponse.json({ language: meeting.language })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid language payload." },
        { status: 400 }
      )
    }
    return jsonError(error)
  }
}
