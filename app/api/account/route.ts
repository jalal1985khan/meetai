import { NextResponse } from "next/server"
import { z } from "zod"

import { jsonError, requireUser } from "@/lib/api"
import { deleteAccount, privacySchema, updatePrivacy } from "@/lib/meetings/service"

export async function PATCH(request: Request) {
  try {
    const { userId } = await requireUser()
    const body = privacySchema.parse(await request.json())
    const user = await updatePrivacy(userId, body)
    return NextResponse.json({
      retentionDays: user.retentionDays,
      storeAudio: user.storeAudio,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid privacy settings." },
        { status: 400 }
      )
    }
    return jsonError(error)
  }
}

export async function DELETE() {
  try {
    const { userId } = await requireUser()
    await deleteAccount(userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
