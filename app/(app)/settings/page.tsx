import { auth } from "@/auth"
import { redirect } from "next/navigation"

import { DangerZone } from "@/components/settings/danger-zone"
import { PrivacyForm } from "@/components/settings/privacy-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { prisma } from "@/lib/db"
import { isLlmConfigured } from "@/lib/providers/llm"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/?auth=required")
  }

  let retentionDays = 30
  let databaseUnavailable = false
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })
    if (user) {
      retentionDays = user.retentionDays
    }
  } catch {
    databaseUnavailable = true
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Profile comes from Google. Privacy controls and deletion live here.
        </p>
      </div>
      {databaseUnavailable ? (
        <Alert variant="destructive">
          <AlertTitle>Database unavailable</AlertTitle>
          <AlertDescription>
            Retention and deletion need PostgreSQL. Start it with docker compose,
            then `pnpm db:push`.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{session.user.name ?? "Google account"}</CardTitle>
          <CardDescription>{session.user.email}</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>AI notes</CardTitle>
          <CardDescription>
            {isLlmConfigured()
              ? "Live extract and the post-meeting summary are enabled."
              : "Set GEMINI_API_KEY or OPENAI_API_KEY in the server environment, then restart the app."}
          </CardDescription>
        </CardHeader>
      </Card>
      {!databaseUnavailable ? (
        <>
          <PrivacyForm retentionDays={retentionDays} />
          <DangerZone />
        </>
      ) : null}
    </div>
  )
}
