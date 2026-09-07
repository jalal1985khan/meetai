export const MEET_URL_PATTERN =
  /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(?:\?.*)?$/i

export function isMeetUrl(value: string) {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      url.hostname === "meet.google.com" &&
      MEET_URL_PATTERN.test(url.origin + url.pathname)
    )
  } catch {
    return false
  }
}

export function titleFromMeetUrl(meetUrl: string) {
  try {
    const path = new URL(meetUrl).pathname.replace(/^\//, "")
    return path ? `Google Meet ${path}` : "Google Meet"
  } catch {
    return "Google Meet"
  }
}

export const LIVE_STATUSES = [
  "awaiting_consent",
  "connecting",
  "live",
  "paused",
  "stopping",
  "finalizing",
  "degraded",
] as const

export type LiveStatus = (typeof LIVE_STATUSES)[number]

export function isLiveStatus(status: string): status is LiveStatus {
  return LIVE_STATUSES.includes(status as LiveStatus)
}

export const STATUS_LABEL = {
  created: "Not recording",
  awaiting_consent: "Not recording",
  connecting: "Not recording",
  live: "Transcribing",
  paused: "Paused",
  stopping: "Finalizing",
  finalizing: "Finalizing",
  ready: "Not recording",
  degraded: "Transcription degraded",
  failed: "Not recording",
  deleted: "Not recording",
} as const

export const SOURCE_LABEL = {
  meet_api: "Meet API",
  browser_capture: "Browser capture",
  manual_import: "Manual import",
} as const
