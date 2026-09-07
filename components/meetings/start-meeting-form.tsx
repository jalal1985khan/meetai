"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export function StartMeetingForm() {
  const router = useRouter()
  const [meetUrl, setMeetUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetUrl,
          sourceMode: "browser_capture",
          language: "auto",
        }),
      })
      const payload = (await response.json()) as {
        meeting?: { id: string }
        error?: string
      }
      if (!response.ok || !payload.meeting) {
        setError(payload.error ?? "Could not create the meeting session.")
        return
      }
      router.push(`/meetings/${payload.meeting.id}`)
      router.refresh()
    } catch {
      setError("Network error. Check your connection and try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={Boolean(error) || undefined}>
          <FieldLabel htmlFor="meet-url">Google Meet URL</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="meet-url"
              name="meetUrl"
              value={meetUrl}
              onChange={(event) => setMeetUrl(event.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              aria-invalid={Boolean(error) || undefined}
              required
            />
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Start assistant
            </Button>
          </div>
          <FieldDescription>
            Associates this session with a Meet URL. Capture starts only after
            you confirm disclosure.
          </FieldDescription>
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </FieldGroup>
    </form>
  )
}
