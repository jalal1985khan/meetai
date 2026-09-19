import { ShieldIcon, Link2Icon, ListChecksIcon } from "lucide-react"

import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isGoogleAuthConfigured } from "@/lib/auth-config"

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; error?: string }>
}) {
  const params = await searchParams
  const googleReady = isGoogleAuthConfigured()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-12 px-6 py-16">
      <div className="flex flex-col gap-6">
        <Badge variant="outline" className="w-fit">
          Google Meet
        </Badge>
        <h1 className="max-w-3xl text-3xl font-medium tracking-tight">
          Leave every meeting with decisions, owners, and a transcript you can
          trust.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          This assistant turns live Google Meet conversation into a searchable
          system of record. The transcript is evidence. AI notes are a
          structured interpretation. Every major claim should be traceable to a
          timestamp.
        </p>
        {params.auth === "required" ? (
          <Alert>
            <AlertTitle>Sign in required</AlertTitle>
            <AlertDescription>
              Continue with Google to open your meetings.
            </AlertDescription>
          </Alert>
        ) : null}
        {params.error ? (
          <Alert variant="destructive">
            <AlertTitle>Sign-in did not complete</AlertTitle>
            <AlertDescription>
              {params.error === "Configuration"
                ? "Configuration error. Verify that AUTH_SECRET, Google OAuth Client ID/Secret, and DATABASE_URL are set correctly in your deployment environment."
                : `Authentication error (${params.error}). Check Google OAuth credentials and try again.`}
            </AlertDescription>
          </Alert>
        ) : null}
        {!googleReady ? (
          <Alert>
            <AlertTitle>Google OAuth is not configured</AlertTitle>
            <AlertDescription>
              Set AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET in
              .env.local. The dashboard stays locked until then.
            </AlertDescription>
          </Alert>
        ) : null}
        <GoogleSignInButton disabled={!googleReady} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <ShieldIcon />
            <CardTitle>Explicit capture</CardTitle>
            <CardDescription>
              Disclosure first. Persistent Transcribing / Paused / Finalizing
              status. Audio is not stored by default.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Link2Icon />
            <CardTitle>Evidence-linked notes</CardTitle>
            <CardDescription>
              Decisions and actions require transcript support. Owners and due
              dates stay empty unless they were said.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <ListChecksIcon />
            <CardTitle>Outcome-first record</CardTitle>
            <CardDescription>
              After the meeting: summary, decisions, action list, then the full
              transcript — not a raw dump first.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Meeting content may be processed to produce a transcript and notes. A
        UI banner is not legal sufficiency for recording laws. You choose when
        capture starts and when it stops.
      </p>
    </main>
  )
}
