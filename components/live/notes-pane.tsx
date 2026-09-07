"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import type { ActionItem, Decision, EvidenceLink, MeetingState } from "@prisma/client"

export function NotesPane({
  state,
  decisions,
  actionItems,
  evidenceLinks = [],
  configured = true,
  processing = false,
  onJumpToEvidence,
}: {
  state: MeetingState | null
  decisions: Decision[]
  actionItems: ActionItem[]
  evidenceLinks?: Pick<EvidenceLink, "entityType" | "entityId" | "transcriptSegmentId">[]
  configured?: boolean
  processing?: boolean
  onJumpToEvidence?: (segmentId: string) => void
}) {
  const hasContent =
    Boolean(state?.summary) || decisions.length > 0 || actionItems.length > 0

  function evidenceFor(entityType: string, entityId: string) {
    return evidenceLinks.find(
      (item) => item.entityType === entityType && item.entityId === entityId
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-4">
        {!configured ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>AI notes are off</EmptyTitle>
              <EmptyDescription>
                Add GEMINI_API_KEY or OPENAI_API_KEY to the server environment
                and restart the app. Transcript still saves; notes will not run
                without a key.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Summary</h2>
          {processing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Writing notes… this can take about a minute.
            </div>
          ) : null}
          {state?.summary ? (
            <p className="text-sm leading-relaxed">{state.summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Rolling summary appears after enough finalized transcript exists.
            </p>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Decisions</h2>
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Decisions appear only with explicit or high-confidence evidence.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {decisions.map((decision) => {
                const evidence = evidenceFor("decision", decision.id)
                return (
                  <li key={decision.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{decision.title}</p>
                      <Badge variant="outline">{decision.status}</Badge>
                      {decision.confidence < 0.85 ? (
                        <Badge variant="secondary">
                          {Math.round(decision.confidence * 100)}%
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {decision.description}
                    </p>
                    {onJumpToEvidence && evidence ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => onJumpToEvidence(evidence.transcriptSegmentId)}
                      >
                        Evidence
                      </Button>
                    ) : onJumpToEvidence ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No evidence link
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Action items</h2>
          {actionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tasks show owner and due date only when they are explicit in the
              transcript.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {actionItems.map((item) => {
                const evidence = evidenceFor("action", item.id)
                return (
                  <li key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{item.task}</p>
                      <Badge variant="secondary">{item.status}</Badge>
                      {item.confidence < 0.85 ? (
                        <Badge variant="outline">
                          {Math.round(item.confidence * 100)}%
                        </Badge>
                      ) : null}
                    </div>
                    {onJumpToEvidence && evidence ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => onJumpToEvidence(evidence.transcriptSegmentId)}
                      >
                        Evidence
                      </Button>
                    ) : onJumpToEvidence ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No evidence link
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        {configured && processing && !hasContent ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Writing notes</EmptyTitle>
              <EmptyDescription>
                Speak a bit more if needed, then wait. The model is slow and
                does not invent decisions or owners.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : configured && !hasContent ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No AI notes yet</EmptyTitle>
              <EmptyDescription>
                Notes stay empty until transcript evidence exists. The model
                does not invent decisions or owners.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
      </div>
    </ScrollArea>
  )
}
