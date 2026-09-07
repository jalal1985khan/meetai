import { Badge } from "@/components/ui/badge"

import { STATUS_LABEL } from "@/lib/meetings/labels"

type Status = keyof typeof STATUS_LABEL

export function MeetingStatusBadge({ status }: { status: Status }) {
  const label = STATUS_LABEL[status]
  const variant =
    status === "live"
      ? "destructive"
      : status === "degraded"
        ? "destructive"
        : status === "ready"
          ? "secondary"
          : "outline"

  return (
    <Badge variant={variant} aria-label={label}>
      {label}
    </Badge>
  )
}
