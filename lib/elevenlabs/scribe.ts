export type ElevenLabsTranscriptionResult = {
  text: string
  languageCode?: string
  languageProbability?: number
  words?: Array<{
    text: string
    start: number
    end: number
    type: string
  }>
  transcriptionId?: string
}

export async function transcribeWithElevenLabs(
  audioBuffer: Buffer,
  mimeType = "audio/webm"
): Promise<ElevenLabsTranscriptionResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured.")
  }

  const formData = new FormData()
  // Determine file extension from mimeType
  const ext = mimeType.includes("wav")
    ? "wav"
    : mimeType.includes("mp4") || mimeType.includes("m4a")
      ? "m4a"
      : mimeType.includes("ogg")
        ? "ogg"
        : "webm"

  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType })
  formData.append("file", blob, `audio.${ext}`)
  formData.append("model_id", "scribe_v2")
  formData.append("tag_audio_events", "true")

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `ElevenLabs STT failed with status ${response.status}: ${errorText}`
    )
  }

  const data = (await response.json()) as {
    text: string
    language_code?: string
    language_probability?: number
    words?: Array<{
      text: string
      start: number
      end: number
      type: string
    }>
    transcription_id?: string
  }

  return {
    text: data.text?.trim() ?? "",
    languageCode: data.language_code,
    languageProbability: data.language_probability,
    words: data.words,
    transcriptionId: data.transcription_id,
  }
}
