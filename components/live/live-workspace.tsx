"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ConsentDialog } from "@/components/live/consent-dialog"
import { NotesPane } from "@/components/live/notes-pane"
import { StatusBar } from "@/components/live/status-bar"
import { TranscriptPane } from "@/components/live/transcript-pane"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBrowserStt } from "@/hooks/use-browser-stt"
import {
  preferenceFromMeetingLanguage,
  type LanguagePreference,
} from "@/lib/meetings/languages"
import type {
  ActionItem,
  Decision,
  EvidenceLink,
  Meeting,
  MeetingState,
  MeetingStatus,
  Participant,
  TranscriptSegment,
} from "@prisma/client"

type LiveMeeting = Meeting & {
  participants: Participant[]
  segments: TranscriptSegment[]
  decisions: Decision[]
  actionItems: ActionItem[]
  state: MeetingState | null
  evidenceLinks: EvidenceLink[]
}

type NotesSnapshot = {
  configured: boolean
  processing: boolean
  meetingStatus?: MeetingStatus
  state: MeetingState | null
  decisions: Decision[]
  actionItems: ActionItem[]
  evidenceLinks: Pick<
    EvidenceLink,
    "entityType" | "entityId" | "transcriptSegmentId"
  >[]
}

export function LiveWorkspace({
  meeting,
  speakerName,
  aiConfigured = true,
}: {
  meeting: LiveMeeting
  speakerName: string
  aiConfigured?: boolean
}) {
  const router = useRouter()
  const needsConsent = meeting.status === "awaiting_consent"
  const [status, setStatus] = useState<MeetingStatus>(meeting.status)
  const [health, setHealth] = useState(meeting.health)
  const [languagePreference, setLanguagePreference] =
    useState<LanguagePreference>(() =>
      preferenceFromMeetingLanguage(meeting.language)
    )

  const [notes, setNotes] = useState<NotesSnapshot>({
    configured: aiConfigured,
    processing: false,
    meetingStatus: meeting.status,
    state: meeting.state,
    decisions: meeting.decisions,
    actionItems: meeting.actionItems,
    evidenceLinks: meeting.evidenceLinks,
  })
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    setStatus(meeting.status)
    setHealth(meeting.health)
  }, [meeting.status, meeting.health])

  useEffect(() => {
    if (status === "ready") {
      router.refresh()
    }
  }, [router, status])

  useEffect(() => {
    let cancelled = false
    async function pullNotes() {
      const response = await fetch(`/api/meetings/${meeting.id}/notes`)
      if (!response.ok) {
        return
      }
      const payload = (await response.json()) as NotesSnapshot
      if (!cancelled) {
        setNotes({
          configured: payload.configured,
          processing: payload.processing,
          meetingStatus: payload.meetingStatus,
          state: payload.state,
          decisions: payload.decisions ?? [],
          actionItems: payload.actionItems ?? [],
          evidenceLinks: payload.evidenceLinks ?? [],
        })
        if (
          payload.meetingStatus === "finalizing" ||
          payload.meetingStatus === "stopping"
        ) {
          setStatus(payload.meetingStatus)
        }
        if (payload.meetingStatus === "ready") {
          setStatus("ready")
        }
      }
    }
    void pullNotes()
    const timer = window.setInterval(() => {
      void pullNotes()
    }, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [meeting.id])

  useEffect(() => {
    if (!highlightId) {
      return
    }
    document
      .getElementById(`segment-${highlightId}`)
      ?.scrollIntoView({ block: "center" })
  }, [highlightId])

  const sttActive = status === "live" || status === "degraded"
  const stt = useBrowserStt({
    meetingId: meeting.id,
    speakerLabel: speakerName || "You",
    languagePreference,
    active: sttActive,
    initialSegments: meeting.segments,
    onLanguageResolved: (next) => {
      void fetch(`/api/meetings/${meeting.id}/language`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: next }),
      })
    },
  })

  const segments = useMemo(() => {
    const byId = new Map<string, TranscriptSegment>()
    for (const segment of meeting.segments) {
      byId.set(segment.id, segment)
    }
    for (const segment of stt.segments) {
      byId.set(segment.id, segment)
    }
    return [...byId.values()].sort((a, b) => a.seq - b.seq)
  }, [meeting.segments, stt.segments])

  const participants = meeting.participants

  const displayHealth = stt.listening ? "connected" : health

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConsentDialog
        meetingId={meeting.id}
        sourceMode={meeting.sourceMode}
        open={needsConsent}
      />
      {sttActive && !stt.listening ? (
        <div className="px-4 pt-3">
          <Alert>
            <AlertTitle>Start live transcription</AlertTitle>
            <AlertDescription>
              Click start and allow the microphone. Language is detected from
              your speech. Other Meet participants are not captured until
              tab-share is added. Audio is not stored.
            </AlertDescription>
          </Alert>
          <div className="pt-3">
            <Button onClick={() => stt.start()} disabled={stt.unsupported}>
              Start capturing audio
            </Button>
          </div>
        </div>
      ) : null}
      {stt.error ? (
        <div className="px-4 pt-3">
          <Alert variant="destructive">
            <AlertTitle>Transcription issue</AlertTitle>
            <AlertDescription>{stt.error}</AlertDescription>
          </Alert>
        </div>
      ) : null}
      <div className="hidden min-h-0 flex-1 md:flex">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={55} minSize={35}>
            <TranscriptPane
              segments={segments}
              participants={participants}
              startedAt={meeting.startedAt}
              interim={stt.interim}
              listening={stt.listening}
              speakerFallback={speakerName || "You"}
              highlightId={highlightId}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={45} minSize={30}>
            <NotesPane
              state={notes.state}
              decisions={notes.decisions}
              actionItems={notes.actionItems}
              evidenceLinks={notes.evidenceLinks}
              configured={notes.configured}
              processing={notes.processing}
              onJumpToEvidence={setHighlightId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <Tabs defaultValue="notes" className="flex min-h-0 flex-1">
          <div className="px-4 pt-3">
            <TabsList>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="notes" className="min-h-0">
            <NotesPane
              state={notes.state}
              decisions={notes.decisions}
              actionItems={notes.actionItems}
              evidenceLinks={notes.evidenceLinks}
              configured={notes.configured}
              processing={notes.processing}
              onJumpToEvidence={setHighlightId}
            />
          </TabsContent>
          <TabsContent value="transcript" className="min-h-0">
            <TranscriptPane
              segments={segments}
              participants={participants}
              startedAt={meeting.startedAt}
              interim={stt.interim}
              listening={stt.listening}
              speakerFallback={speakerName || "You"}
              highlightId={highlightId}
            />
          </TabsContent>
        </Tabs>
      </div>
      <StatusBar
        meetingId={meeting.id}
        status={status}
        sourceMode={meeting.sourceMode}
        health={displayHealth}
        languagePreference={languagePreference}
        detectedLanguage={stt.resolvedLanguage}
        onLanguagePreference={(next) => {
          setLanguagePreference(next)
          void fetch(`/api/meetings/${meeting.id}/language`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language: next }),
          })
        }}
        onStatus={(next) => {
          setStatus(next.status)
          setHealth(next.health)
          if (
            next.status === "paused" ||
            next.status === "stopping" ||
            next.status === "finalizing" ||
            next.status === "ready"
          ) {
            stt.stop()
          }
          if (next.status === "ready") {
            router.refresh()
          }
        }}
      />
    </div>
  )
}
