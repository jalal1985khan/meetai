"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

export function PrivacyForm({
  retentionDays,
}: {
  retentionDays: number
}) {
  const router = useRouter()
  const [days, setDays] = useState(String(retentionDays))
  const [pending, setPending] = useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        retentionDays: Number(days),
        storeAudio: false,
      }),
    })
    setPending(false)
    if (!response.ok) {
      toast.error("Could not save privacy settings.")
      return
    }
    toast.success("Privacy settings saved")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy and retention</CardTitle>
        <CardDescription>
          Transcript and notes are kept for a limited time. Raw audio is off
          unless you later enable recording storage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="retention">Retention (days)</FieldLabel>
              <Input
                id="retention"
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(event) => setDays(event.target.value)}
              />
              <FieldDescription>
                After this window, meeting content is scheduled for deletion.
              </FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Switch id="store-audio" checked={false} disabled />
              <FieldLabel htmlFor="store-audio">Store raw audio</FieldLabel>
            </Field>
            <FieldDescription>
              Audio storage is disabled for the MVP. Only transcript and derived
              notes persist.
            </FieldDescription>
            <Button type="submit" disabled={pending}>
              Save
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
