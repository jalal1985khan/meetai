import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"

import { LiveWorkspace } from "@/components/live/live-workspace"
import { MeetingDetail } from "@/components/meeting-detail/meeting-detail"
import { isLiveStatus } from "@/lib/meetings/labels"
import { getMeeting } from "@/lib/meetings/service"
import { isLlmConfigured } from "@/lib/providers/llm"

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/?auth=required")
  }
  const { id } = await params
  let meeting
  try {
    meeting = await getMeeting(session.user.id, id)
  } catch {
    notFound()
  }

  if (isLiveStatus(meeting.status)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <LiveWorkspace
          meeting={meeting}
          speakerName={session.user.name ?? session.user.email ?? "You"}
          aiConfigured={isLlmConfigured()}
        />
      </div>
    )
  }

  return <MeetingDetail meeting={meeting} aiConfigured={isLlmConfigured()} />
}
