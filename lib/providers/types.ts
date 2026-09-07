export type ExtractPacket = {
  meetingId: string
  recentSegmentIds: string[]
  participantMap: Record<string, string>
  currentVersion: number
}

export type FinalPacket = {
  meetingId: string
  revisionNo: number
}

export type JsonSchema = Record<string, unknown>

export type SttOptions = {
  language?: string
  meetingId: string
}

export type SttEvent =
  | { type: "interim"; text: string }
  | {
      type: "final"
      text: string
      startAt: string
      endAt: string
      speakerLabel?: string
    }

export interface LlmProvider {
  readonly configured: boolean
  readonly model: string
  completeJson(
    system: string,
    user: string,
    timeoutMs: number
  ): Promise<unknown>
}
