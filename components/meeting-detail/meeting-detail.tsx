"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge"
import { SourceModeBadge } from "@/components/meetings/source-mode-badge"
import { NotesPane } from "@/components/live/notes-pane"
import { TranscriptPane } from "@/components/live/transcript-pane"
import type {
  ActionItem,
  Decision,
  EvidenceLink,
  Meeting,
  MeetingState,
  Participant,
  TranscriptSegment,
} from "@prisma/client"

type DetailMeeting = Meeting & {
  participants: Participant[]
  segments: TranscriptSegment[]
  decisions: Decision[]
  actionItems: ActionItem[]
  state: MeetingState | null
  evidenceLinks: EvidenceLink[]
}

function toMarkdown(meeting: DetailMeeting) {
  const lines = [
    `# ${meeting.title}`,
    "",
    "## Summary",
    meeting.state?.summary || "_No summary. Transcript evidence was insufficient._",
    "",
    "## Decisions",
    meeting.decisions.length
      ? meeting.decisions.map((item) => `- ${item.title}: ${item.description}`).join("\n")
      : "_None_",
    "",
    "## Action items",
    meeting.actionItems.length
      ? meeting.actionItems.map((item) => `- ${item.task} (${item.status})`).join("\n")
      : "_None_",
  ]
  return lines.join("\n")
}

export function MeetingDetail({
  meeting,
  aiConfigured = true,
}: {
  meeting: DetailMeeting
  aiConfigured?: boolean
}) {
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    if (!highlightId) {
      return
    }
    document
      .getElementById(`segment-${highlightId}`)
      ?.scrollIntoView({ block: "center" })
  }, [highlightId])

  async function copySummary() {
    await navigator.clipboard.writeText(toMarkdown(meeting))
    toast.success("Summary copied")
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight">{meeting.title}</h1>
          <div className="flex flex-wrap gap-2">
            <MeetingStatusBadge status={meeting.status} />
            <SourceModeBadge sourceMode={meeting.sourceMode} />
          </div>
          <p className="text-sm text-muted-foreground">{meeting.meetUrl}</p>
        </div>
        <Button variant="outline" onClick={copySummary}>
          Copy summary
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outcomes</CardTitle>
            <CardDescription>
              Decisions and actions are suggestions until you confirm them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotesPane
              state={meeting.state}
              decisions={meeting.decisions}
              actionItems={meeting.actionItems}
              evidenceLinks={meeting.evidenceLinks}
              configured={aiConfigured}
              onJumpToEvidence={setHighlightId}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>Evidence base for this meeting.</CardDescription>
          </CardHeader>
          <CardContent className="h-[32rem]">
            <TranscriptPane
              segments={meeting.segments}
              participants={meeting.participants}
              startedAt={meeting.startedAt}
              highlightId={highlightId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
