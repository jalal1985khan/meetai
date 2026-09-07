import { NextResponse } from "next/server"

import { isAiProcessing } from "@/lib/ai/orchestrator"
import { jsonError, requireUser } from "@/lib/api"
import { getMeeting } from "@/lib/meetings/service"
import { isLlmConfigured } from "@/lib/providers/llm"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params
    const meeting = await getMeeting(userId, id)
    return NextResponse.json({
      configured: isLlmConfigured(),
      processing: isAiProcessing(id),
      meetingStatus: meeting.status,
      state: meeting.state,
      decisions: meeting.decisions,
      actionItems: meeting.actionItems,
      evidenceLinks: meeting.evidenceLinks,
    })
  } catch (error) {
    return jsonError(error)
  }
}
