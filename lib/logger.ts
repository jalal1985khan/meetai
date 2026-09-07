const REDACT_KEYS = new Set([
  "text",
  "transcript",
  "audio",
  "prompt",
  "outputJson",
  "summary",
  "access_token",
  "refresh_token",
  "id_token",
])

export type ErrorCategory =
  | "auth"
  | "source"
  | "transport"
  | "stt"
  | "ai"
  | "db"
  | "export"

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitize)
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, nested]) => {
        if (REDACT_KEYS.has(key)) {
          return [key, "[redacted]"] as const
        }
        return [key, sanitize(nested)] as const
      }
    )
    return Object.fromEntries(entries)
  }
  return value
}

export function logEvent(
  category: ErrorCategory | "info",
  message: string,
  meta?: Record<string, unknown>
) {
  const payload = {
    category,
    message,
    ...(meta ? (sanitize(meta) as Record<string, unknown>) : {}),
  }
  if (category === "info") {
    console.info(JSON.stringify(payload))
    return
  }
  console.error(JSON.stringify(payload))
}
