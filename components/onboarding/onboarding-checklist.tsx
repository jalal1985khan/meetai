import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function OnboardingChecklist({
  googleConnected,
  hasMeeting,
}: {
  googleConnected: boolean
  hasMeeting: boolean
}) {
  const steps = [
    {
      title: "Google connected",
      done: googleConnected,
      body: "You signed in with Google. Meet API scopes are requested later, only when artifact sync is enabled.",
    },
    {
      title: "Associate a Meet URL",
      done: hasMeeting,
      body: "Paste a Meet link on the dashboard. Capture still requires an explicit consent step.",
    },
    {
      title: "Live browser capture",
      done: hasMeeting,
      body: "On a live meeting in Chrome or Edge, click Start capturing audio and allow the microphone. Tab audio for other participants is still later.",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {steps.map((step) => (
        <Card key={step.title}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{step.title}</CardTitle>
              <Badge variant={step.done ? "secondary" : "outline"}>
                {step.done ? "Done" : "Next"}
              </Badge>
            </div>
            <CardDescription>{step.body}</CardDescription>
          </CardHeader>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Open the dashboard</CardTitle>
          <CardDescription>
            Start a session from a Meet URL when you are ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Go to meetings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
