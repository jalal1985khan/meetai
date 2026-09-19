"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { SpeechLanguageSelect } from "@/components/meetings/speech-language-field"
import { STATUS_LABEL, SOURCE_LABEL } from "@/lib/meetings/labels"
import { speechLanguageLabel, type LanguagePreference } from "@/lib/meetings/languages"
import type { Meeting, MeetingStatus, SourceMode } from "@prisma/client"

export function StatusBar({
  meetingId,
  status,
  sourceMode,
  health,
  languagePreference = "auto",
  detectedLanguage,
  elevenLabsActive,
  elevenLabsEnhancing,
  onLanguagePreference,
  onStatus,
}: {
  meetingId: string
  status: MeetingStatus
  sourceMode: SourceMode
  health: string
  languagePreference?: LanguagePreference
  detectedLanguage?: string | null
  elevenLabsActive?: boolean
  elevenLabsEnhancing?: boolean
  onLanguagePreference?: (language: LanguagePreference) => void
  onStatus?: (meeting: Pick<Meeting, "status" | "health">) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState<"pause" | "resume" | "stop" | null>(
    null
  )
  const [confirmStop, setConfirmStop] = useState(false)

  const canPause = status === "live" || status === "degraded"
  const canResume = status === "paused"
  const canStop = status !== "ready" && status !== "deleted"

  async function pause(resume = false) {
    setPending(resume ? "resume" : "pause")
    try {
      const response = await fetch(`/api/meetings/${meetingId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      })
      const payload = (await response.json()) as {
        meeting?: Pick<Meeting, "status" | "health">
      }
      if (payload.meeting) {
        onStatus?.(payload.meeting)
      }
    } finally {
      setPending(null)
    }
  }

  async function stop() {
    setPending("stop")
    try {
      const response = await fetch(`/api/meetings/${meetingId}/stop`, {
        method: "POST",
      })
      const payload = (await response.json()) as {
        meeting?: Pick<Meeting, "status" | "health">
      }
      setConfirmStop(false)
      if (payload.meeting) {
        onStatus?.(payload.meeting)
      } else {
        router.refresh()
      }
    } finally {
      setPending(null)
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t bg-background px-4 py-2"
      aria-live="polite"
    >
      <Badge
        variant={
          status === "live" || status === "degraded" ? "destructive" : "outline"
        }
      >
        {STATUS_LABEL[status]}
      </Badge>
      <Badge variant="outline">{SOURCE_LABEL[sourceMode]}</Badge>
      {onLanguagePreference ? (
        <SpeechLanguageSelect
          id="status-speech-language"
          value={languagePreference}
          onChange={onLanguagePreference}
        />
      ) : null}
      {languagePreference === "auto" && detectedLanguage ? (
        <span className="text-xs text-muted-foreground">
          {speechLanguageLabel(detectedLanguage)}
        </span>
      ) : null}
      <span className="text-xs text-muted-foreground">
        {health === "degraded"
          ? "Degraded"
          : health === "connected"
            ? "Connected"
            : health === "connecting"
              ? "Connecting"
              : "Disconnected"}
      </span>
      {elevenLabsActive ? (
        <Badge variant="secondary" className="gap-1.5 text-[11px] font-normal">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              elevenLabsEnhancing
                ? "bg-amber-500 animate-ping"
                : "bg-emerald-500"
            }`}
          />
          {elevenLabsEnhancing ? "ElevenLabs enhancing..." : "ElevenLabs Scribe"}
        </Badge>
      ) : null}
      <div className="ml-auto flex gap-2">
        {canResume ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => pause(true)}
            disabled={pending !== null}
          >
            {pending === "resume" ? <Spinner data-icon="inline-start" /> : null}
            Resume
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => pause(false)}
            disabled={!canPause || pending !== null}
          >
            {pending === "pause" ? <Spinner data-icon="inline-start" /> : null}
            Pause
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmStop(true)}
          disabled={!canStop || pending !== null}
        >
          {pending === "stop" ? <Spinner data-icon="inline-start" /> : null}
          Stop
        </Button>
      </div>
      <AlertDialog open={confirmStop} onOpenChange={setConfirmStop}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop capturing this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              Capture will halt and the assistant will finalize whatever
              transcript exists. You can reopen the record afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep capturing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={stop}>
              Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
