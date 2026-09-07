import { Badge } from "@/components/ui/badge"

import { SOURCE_LABEL } from "@/lib/meetings/labels"

type Source = keyof typeof SOURCE_LABEL

export function SourceModeBadge({ sourceMode }: { sourceMode: Source }) {
  return <Badge variant="outline">{SOURCE_LABEL[sourceMode]}</Badge>
}
