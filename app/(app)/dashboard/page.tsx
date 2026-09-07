import { auth } from "@/auth"
import { redirect } from "next/navigation"

import { MeetingList } from "@/components/meetings/meeting-list"
import { StartMeetingForm } from "@/components/meetings/start-meeting-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { listMeetings } from "@/lib/meetings/service"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/?auth=required")
  }

  let meetings: Awaited<ReturnType<typeof listMeetings>> = []
  let databaseUnavailable = false
  try {
    meetings = await listMeetings(session.user.id)
  } catch {
    databaseUnavailable = true
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight">Meetings</h1>
        <p className="text-sm text-muted-foreground">
          Associate a Google Meet URL, confirm disclosure, then capture. Source
          mode stays visible on every session.
        </p>
      </div>
      {databaseUnavailable ? (
        <Alert variant="destructive">
          <AlertTitle>Database unavailable</AlertTitle>
          <AlertDescription>
            Start PostgreSQL with `docker compose up -d`, then run `pnpm db:push`.
            Meeting records are not mocked.
          </AlertDescription>
        </Alert>
      ) : (
        <StartMeetingForm />
      )}
      {!databaseUnavailable && meetings.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No meetings yet</EmptyTitle>
            <EmptyDescription>
              Paste a Meet URL to create a session. Capture will not start until
              you confirm the disclosure checkpoint.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            Live capture uses this browser&apos;s microphone in Chrome or Edge.
            Tab audio for other Meet participants comes later.
          </EmptyContent>
        </Empty>
      ) : null}
      {meetings.length > 0 ? <MeetingList meetings={meetings} /> : null}
    </div>
  )
}
