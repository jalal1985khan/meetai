import type { SttEvent, SttOptions } from "@/lib/providers/types"

export type { SttEvent, SttOptions }

export interface SttProvider {
  stream(
    audio: AsyncIterable<Uint8Array>,
    options: SttOptions
  ): AsyncIterable<SttEvent>
}

export class UnconfiguredSttProvider implements SttProvider {
  async *stream(): AsyncIterable<SttEvent> {
    throw new Error("Speech-to-text provider is not configured.")
  }
}

export const sttProvider: SttProvider = new UnconfiguredSttProvider()
