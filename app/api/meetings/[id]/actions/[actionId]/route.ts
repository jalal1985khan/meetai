import { NextResponse } from "next/server"
import { z } from "zod"

import { jsonError, requireUser } from "@/lib/api"
import { patchActionSchema, updateAction } from "@/lib/meetings/service"

type RouteContext = { params: Promise<{ id: string; actionId: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id, actionId } = await context.params
    const body = patchActionSchema.parse(await request.json())
    const action = await updateAction(userId, id, actionId, body)
    return NextResponse.json({ action })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid action update." },
        { status: 400 }
      )
    }
    return jsonError(error)
  }
}
