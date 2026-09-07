import { NextResponse } from "next/server"

import { jsonError, requireUser } from "@/lib/api"
import { getMeeting } from "@/lib/meetings/service"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params
    const meeting = await getMeeting(userId, id)
    return NextResponse.json({ meeting })
  } catch (error) {
    return jsonError(error)
  }
}
