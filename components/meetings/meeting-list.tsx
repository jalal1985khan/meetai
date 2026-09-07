import Link from "next/link"
import type { Meeting, Participant } from "@prisma/client"

import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge"
import { SourceModeBadge } from "@/components/meetings/source-mode-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type MeetingRow = Meeting & {
  participants: Participant[]
  _count: { segments: number; actionItems: number }
}

function formatWhen(meeting: Meeting) {
  const date = meeting.startedAt ?? meeting.createdAt
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function MeetingList({ meetings }: { meetings: MeetingRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Meeting</TableHead>
          <TableHead>When</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((meeting) => (
          <TableRow key={meeting.id}>
            <TableCell>
              <Link href={`/meetings/${meeting.id}`} className="font-medium">
                {meeting.title}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatWhen(meeting)}
            </TableCell>
            <TableCell>
              <MeetingStatusBadge status={meeting.status} />
            </TableCell>
            <TableCell>
              <SourceModeBadge sourceMode={meeting.sourceMode} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {meeting._count.actionItems}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
