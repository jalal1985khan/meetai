"use client"

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Participant, TranscriptSegment } from "@prisma/client"

function formatTimestamp(startAt: Date, origin: Date) {
  const seconds = Math.max(
    0,
    Math.floor((new Date(startAt).getTime() - origin.getTime()) / 1000)
  )
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
  const ss = String(seconds % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

export function TranscriptPane({
  segments,
  participants,
  startedAt,
  highlightId,
  interim,
  listening,
  speakerFallback = "You",
}: {
  segments: TranscriptSegment[]
  participants: Participant[]
  startedAt: Date | null
  highlightId?: string | null
  interim?: string
  listening?: boolean
  speakerFallback?: string
}) {
  const origin = startedAt ?? segments[0]?.startAt ?? new Date()
  const names = new Map(participants.map((item) => [item.id, item.displayName]))

  if (segments.length === 0 && !interim) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>
              {listening ? "Listening" : "No transcript segments"}
            </EmptyTitle>
            <EmptyDescription>
              {listening
                ? "Speak clearly. Finalized lines appear here with a timestamp. Interim text stays muted until it is confirmed."
                : "Start capture to transcribe from this browser. Finalized speech is saved; nothing is invented while audio is unavailable."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <ol className="flex flex-col gap-3 p-4">
        {segments.map((segment) => (
          <li
            key={segment.id}
            id={`segment-${segment.id}`}
            className={
              highlightId === segment.id
                ? "rounded-lg bg-muted p-2"
                : "rounded-lg p-2"
            }
          >
            <div className="flex gap-2 text-xs text-muted-foreground">
              <time className="font-mono">
                {formatTimestamp(segment.startAt, origin)}
              </time>
              <span>
                {segment.participantId
                  ? (names.get(segment.participantId) ?? speakerFallback)
                  : speakerFallback}
              </span>
            </div>
            <p className="text-sm">{segment.text}</p>
          </li>
        ))}
        {interim ? (
          <li className="rounded-lg p-2 text-muted-foreground">
            <div className="text-xs">Listening</div>
            <p className="text-sm">{interim}</p>
          </li>
        ) : null}
      </ol>
    </ScrollArea>
  )
}
