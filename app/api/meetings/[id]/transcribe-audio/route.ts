import { after, NextResponse } from "next/server"

import { jsonError, requireUser } from "@/lib/api"
import { transcribeWithElevenLabs } from "@/lib/elevenlabs/scribe"
import { logEvent } from "@/lib/logger"
import { saveEnhancedAudioSegment } from "@/lib/meetings/service"

export const maxDuration = 300

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireUser()
    const { id } = await context.params

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const startAt = formData.get("startAt") as string | null
    const endAt = formData.get("endAt") as string | null
    const speakerLabel = (formData.get("speakerLabel") as string | null) || "You"

    if (!file) {
      return NextResponse.json({ error: "Missing audio file." }, { status: 400 })
    }

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: "Missing segment timestamps." },
        { status: 400 }
      )
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Call ElevenLabs Scribe STT
    const result = await transcribeWithElevenLabs(buffer, file.type || "audio/webm")

    if (!result.text) {
      return NextResponse.json({
        enhanced: false,
        message: "No speech detected in audio chunk.",
      })
    }

    // Save/update segment in database
    const segment = await saveEnhancedAudioSegment(userId, id, {
      text: result.text,
      startAt,
      endAt,
      speakerLabel,
      language: result.languageCode,
    })

    if (segment) {
      const { scheduleLiveExtract } = await import("@/lib/ai/orchestrator")
      after(() => scheduleLiveExtract(id))
    }

    logEvent("stt", "elevenlabs_segment_enhanced")

    return NextResponse.json({
      enhanced: true,
      segment,
      transcriptionId: result.transcriptionId,
    })
  } catch (error) {
    logEvent("stt", "elevenlabs_enhancement_failed")
    return jsonError(error)
  }
}
