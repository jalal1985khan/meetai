import { auth } from "@/auth"
import { redirect } from "next/navigation"

import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist"
import { listMeetings } from "@/lib/meetings/service"

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/?auth=required")
  }
  let hasMeeting = false
  try {
    const meetings = await listMeetings(session.user.id)
    hasMeeting = meetings.length > 0
  } catch {
    hasMeeting = false
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight">Onboarding</h1>
        <p className="text-sm text-muted-foreground">
          Get to a first trusted meeting record: Google identity, a Meet URL,
          then explicit consent before any capture.
        </p>
      </div>
      <OnboardingChecklist googleConnected hasMeeting={hasMeeting} />
    </div>
  )
}
