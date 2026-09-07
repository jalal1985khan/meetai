import { NextResponse } from "next/server"

import { jsonError, requireUser } from "@/lib/api"
import { pauseMeeting, resumeMeeting } from "@/lib/meetings/service"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { resume?: boolean }
    const meeting = body.resume
      ? await resumeMeeting(userId, id)
      : await pauseMeeting(userId, id)
    return NextResponse.json({ meeting })
  } catch (error) {
    return jsonError(error)
  }
}
