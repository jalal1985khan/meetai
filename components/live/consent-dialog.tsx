"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { SOURCE_LABEL } from "@/lib/meetings/labels"

export function ConsentDialog({
  meetingId,
  sourceMode,
  open,
}: {
  meetingId: string
  sourceMode: keyof typeof SOURCE_LABEL
  open: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consented: true }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(payload.error ?? "Could not start capture.")
        return
      }
      router.refresh()
    } catch {
      setError("Network error. Try again.")
    } finally {
      setPending(false)
    }
  }

  async function cancel() {
    await fetch(`/api/meetings/${meetingId}/stop`, { method: "POST" })
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start meeting assistant</DialogTitle>
          <DialogDescription>
            Capture starts only after you confirm. The first live path uses this
            browser&apos;s microphone. This product is not legal advice, and
            this dialog is not a substitute for participant consent required in
            your jurisdiction.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p>
            <span className="font-medium">What is captured:</span> your
            microphone in this browser for the Meet session (
            {SOURCE_LABEL[sourceMode]}). Other participants are not included
            yet.
          </p>
          <p>
            <span className="font-medium">Why:</span> a timestamped transcript
            and structured notes (summary, decisions, action items).
          </p>
          <p>
            <span className="font-medium">Where it is stored:</span> on this
            app&apos;s servers. Raw audio is not stored by default.
          </p>
          <p>
            <span className="font-medium">Who can see it:</span> your account.
            Workspace sharing is not enabled yet.
          </p>
          <p>
            <span className="font-medium">How to stop:</span> use Stop in the
            status bar. Capture does not start on page load.
          </p>
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={start} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Start transcribing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
